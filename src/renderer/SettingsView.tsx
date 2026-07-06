import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography, Button,
} from '@mui/material';
import type { Settings } from '../shared/contract';
import { UpdateDialog } from './update/UpdateDialog';

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

export function SettingsView({ settings, onChange }: Props) {
  const [updateOpen, setUpdateOpen] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const q = settings.quietHours;
  const setQuiet = (patch: Partial<Settings['quietHours']>) => onChange({ quietHours: { ...q, ...patch } });

  useEffect(() => {
    window.chrono.update.getVersion().then(setCurrentVersion).catch(() => {});
  }, []);

  return (
    <Box>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>Appearance</Typography>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select label="Theme" value={settings.theme} sx={{ maxWidth: 240 }}
              onChange={(e) => onChange({ theme: e.target.value as Settings['theme'] })}
            >
              <MenuItem value="system">Match system</MenuItem>
              <MenuItem value="light">Light</MenuItem>
              <MenuItem value="dark">Dark</MenuItem>
            </TextField>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Startup</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={settings.launchAtLogin}
                onChange={(e) => onChange({ launchAtLogin: e.target.checked })}
              />
            }
            label="Launch ChronoChime when I sign in"
          />
          <Typography variant="caption" color="text.secondary" display="block">
            Starts the app automatically at login for your user account only.
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Quiet Hours</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            During quiet hours, reminders still appear but their sound is muted. Your system Do Not Disturb is never changed.
          </Typography>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <FormControlLabel
              control={<Switch checked={q.enabled} onChange={(e) => setQuiet({ enabled: e.target.checked })} />}
              label="Enable quiet hours"
            />
            <Stack direction="row" spacing={2}>
              <TextField type="time" label="Start" InputLabelProps={{ shrink: true }} value={q.start} disabled={!q.enabled} onChange={(e) => setQuiet({ start: e.target.value })} />
              <TextField type="time" label="End" InputLabelProps={{ shrink: true }} value={q.end} disabled={!q.enabled} onChange={(e) => setQuiet({ end: e.target.value })} />
            </Stack>
            <Typography variant="caption" color="text.secondary">Overnight windows (e.g. 22:00–06:00) are supported.</Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Time zone</Typography>
          <Typography variant="body2" color="text.secondary">{settings.timezone}</Typography>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Diagnostics</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Export system and renderer logs for troubleshooting.
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => window.chrono.diagnostics.exportLogs()}
            >
              Export Logs
            </Button>
            <Button
              variant="outlined"
              onClick={() => window.chrono.diagnostics.openLogsDir()}
            >
              Open Logs Dir
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Updates</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Check for and install the latest updates for ChronoChime.{currentVersion ? ` Current version: v${currentVersion}` : ''}
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }} alignItems="center">
            <TextField
              select
              label="Update Channel"
              value={settings.updateChannel || 'stable'}
              size="small"
              sx={{ minWidth: 160 }}
              onChange={(e) => onChange({ updateChannel: e.target.value as Settings['updateChannel'] })}
            >
              <MenuItem value="stable">Stable</MenuItem>
              <MenuItem value="prerelease">Beta (Pre-release)</MenuItem>
            </TextField>
            <Button
              variant="outlined"
              onClick={() => setUpdateOpen(true)}
              sx={{ height: 40 }}
            >
              Check for Updates
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <UpdateDialog open={updateOpen} onClose={() => setUpdateOpen(false)} />
    </Box>
  );
}
