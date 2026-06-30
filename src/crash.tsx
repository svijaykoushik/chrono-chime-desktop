import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  CssBaseline,
  Stack,
  ThemeProvider,
  Typography,
  createTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface CrashInfo {
  message: string;
  stack: string;
  processType: 'main' | 'renderer';
  timestamp: number;
}

declare global {
  interface Window {
    crash: {
      getInfo(): Promise<CrashInfo | null>;
      exportAndRestart(): Promise<void>;
    };
  }
}

function CrashApp() {
  const [crashInfo, setCrashInfo] = useState<CrashInfo | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exported, setExported] = useState(false);

  useEffect(() => {
    window.crash.getInfo().then(setCrashInfo).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
    });
  }, []);

  const handleExport = async () => {
    setError(null);
    setExporting(true);
    try {
      await window.crash.exportAndRestart();
      setExported(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <ThemeProvider theme={createTheme({ palette: { mode: 'light' } })}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: '#f8f0f4', p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Card sx={{ width: '100%', maxWidth: 760, boxShadow: 6, borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              ChronoChime encountered an unexpected error. Your data is safe locally.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Export a crash report and restart the app to recover.
            </Typography>

            {error ? (
              <Alert severity="error" sx={{ mt: 3 }}>
                {error}
              </Alert>
            ) : null}

            <Stack spacing={2} sx={{ mt: 3 }}>
              <Button variant="contained" color="primary" onClick={handleExport} disabled={exporting || exported}>
                {exporting ? 'Exporting…' : exported ? 'Export started' : 'Export Crash Report & Restart'}
              </Button>
              <Button variant="outlined" disabled={exporting} onClick={() => window.close()}>
                Close
              </Button>
            </Stack>

            {crashInfo ? (
              <Accordion sx={{ mt: 3 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>Technical details</AccordionSummary>
                <AccordionDetails>
                  <Typography variant="subtitle2" gutterBottom>
                    {crashInfo.processType === 'main' ? 'Main process' : 'Renderer process'} crash
                  </Typography>
                  <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'Monospace', fontSize: 13 }}>
                    {crashInfo.message}
                    {crashInfo.stack ? `\n\n${crashInfo.stack}` : ''}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ) : null}
          </CardContent>
        </Card>
      </Box>
    </ThemeProvider>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<CrashApp />);
