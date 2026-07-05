import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress,
  LinearProgress, Typography, Stack, Box, Alert,
} from '@mui/material';
import { BRAND } from '../theme';
import type { UpdateCheckResult, UpdateProgress, InstallResult } from '../../shared/contract';

// @ts-ignore - PNG import is handled by Vite asset loading
import appIcon from '../../../assets/icons/chrono-chime-icon-192.png';

interface Props {
  open: boolean;
  onClose: () => void;
}

type DialogState = 'checking' | 'available' | 'up-to-date' | 'downloading' | 'downloaded' | 'error';

export function UpdateDialog({ open, onClose }: Props) {
  const [state, setState] = useState<DialogState>('checking');
  const [latestVersion, setLatestVersion] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [assetUrl, setAssetUrl] = useState<string>('');
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!open) return;

    setState('checking');
    setProgress(null);
    setErrorMsg('');

    // Trigger update check
    window.chrono.update.check()
      .then((res: UpdateCheckResult) => {
        if (res.available) {
          setLatestVersion(res.latestVersion || 'Unknown');
          setNotes(res.notes || '');
          setAssetUrl(res.assetUrl || '');
          setState('available');
        } else {
          setState('up-to-date');
        }
      })
      .catch((err: Error) => {
        setErrorMsg(err.message || 'Failed to check for updates.');
        setState('error');
      });

    // Listen to download progress
    const offProgress = window.chrono.update.onDownloadProgress((p: UpdateProgress) => {
      setProgress(p);
      if (p.percent === 100) {
        setState('downloaded');
      }
    });

    // Listen to installation errors/results
    const offInstall = window.chrono.update.onInstallResult((res: InstallResult) => {
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to launch installer.');
        setState('error');
      }
    });

    return () => {
      offProgress();
      offInstall();
    };
  }, [open]);

  const handleDownload = () => {
    setState('downloading');
    window.chrono.update.download().catch((err: Error) => {
      setErrorMsg(err.message || 'Failed to start download.');
      setState('error');
    });
  };

  const handleCancel = () => {
    window.chrono.update.cancelDownload()
      .then(() => {
        setState('available');
        setProgress(null);
      })
      .catch((err: Error) => {
        setErrorMsg(err.message || 'Failed to cancel download.');
        setState('error');
      });
  };

  const handleInstall = () => {
    window.chrono.update.install().catch((err: Error) => {
      setErrorMsg(err.message || 'Failed to launch installer.');
      setState('error');
    });
  };

  const formatNotes = (notesText: string) => {
    const lines = notesText.split('\n');
    return (
      <Box sx={{ mt: 2, maxHeight: 200, overflowY: 'auto', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.default' }}>
        {lines.map((line, idx) => {
          if (line.startsWith('#')) {
            const depth = (line.match(/^#+/) || ['#'])[0].length;
            const text = line.replace(/^#+\s*/, '');
            return (
              <Typography key={idx} variant={depth === 1 ? 'h6' : 'subtitle2'} sx={{ fontWeight: 'bold', mt: idx > 0 ? 2 : 0, mb: 1, color: BRAND.rose }}>
                {text}
              </Typography>
            );
          }
          if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
            const text = line.replace(/^\s*[-*]\s*/, '');
            return (
              <Typography key={idx} variant="body2" sx={{ display: 'list-item', ml: 3, mb: 0.5, listStyleType: 'disc' }}>
                {text}
              </Typography>
            );
          }
          return (
            <Typography key={idx} variant="body2" sx={{ mb: 1, minHeight: line.trim() === '' ? '0.5em' : 'auto' }}>
              {line}
            </Typography>
          );
        })}
      </Box>
    );
  };

  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onClose={state === 'downloading' ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold', color: BRAND.rose }}>
        {state === 'checking' && 'Checking for Updates'}
        {state === 'available' && 'Update Available!'}
        {state === 'downloading' && 'Downloading Update'}
        {state === 'downloaded' && 'Ready to Install'}
        {state === 'up-to-date' && 'Up to Date'}
        {state === 'error' && 'Update Failed'}
      </DialogTitle>
      <DialogContent>
        {state === 'checking' && (
          <Stack alignItems="center" spacing={2} sx={{ py: 3 }}>
            <CircularProgress color="primary" />
            <Typography variant="body2" color="text.secondary">
              Contacting GitHub releases...
            </Typography>
          </Stack>
        )}

        {state === 'available' && (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body1">
              A newer version of ChronoChime is available: <strong>{latestVersion}</strong>
            </Typography>

            {notes && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Release Notes:
                </Typography>
                {formatNotes(notes)}
              </Box>
            )}

            <Alert severity="warning" sx={{ mt: 1 }}>
              You may need to allow permission again through Windows SmartScreen or your package manager when launching the new installer.
            </Alert>
          </Stack>
        )}

        {state === 'downloading' && (
          <Stack spacing={2} sx={{ py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Downloading installer package...
            </Typography>
            <LinearProgress variant="determinate" value={progress?.percent || 0} sx={{ height: 8, borderRadius: 4 }} />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                {progress ? `${formatSize(progress.transferred)} of ${formatSize(progress.total)}` : '0 MB of 0 MB'}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                {Math.round(progress?.percent || 0)}%
              </Typography>
            </Stack>
          </Stack>
        )}

        {state === 'downloaded' && (
          <Stack spacing={2} sx={{ py: 1 }}>
            <Typography variant="body1">
              The update has been downloaded successfully and is ready to install.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ChronoChime will restart to complete the installation.
            </Typography>
          </Stack>
        )}

        {state === 'up-to-date' && (
          <Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
            <Box
              component="img"
              src={appIcon}
              alt="ChronoChime App Logo"
              sx={{ width: 80, height: 80, mb: 1 }}
            />
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              ChronoChime is up to date!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You are running the latest version.
            </Typography>
          </Stack>
        )}

        {state === 'error' && (
          <Stack spacing={2} sx={{ py: 2 }}>
            <Typography variant="body1" color="error">
              An error occurred during the update process:
            </Typography>
            <Typography variant="body2" sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText', borderRadius: 2 }}>
              {errorMsg}
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {state === 'checking' && (
          <Button onClick={onClose} variant="text">
            Cancel
          </Button>
        )}

        {state === 'available' && (
          <>
            <Button onClick={onClose} color="inherit">
              Later
            </Button>
            <Button onClick={handleDownload} variant="contained" color="primary">
              Download & Install
            </Button>
          </>
        )}

        {state === 'downloading' && (
          <Button onClick={handleCancel} color="error" variant="outlined">
            Cancel
          </Button>
        )}

        {state === 'downloaded' && (
          <>
            <Button onClick={onClose} color="inherit">
              Later
            </Button>
            <Button onClick={handleInstall} variant="contained" color="primary">
              Install & Restart
            </Button>
          </>
        )}

        {(state === 'up-to-date' || state === 'error') && (
          <Button onClick={onClose} variant="contained" color="primary">
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
