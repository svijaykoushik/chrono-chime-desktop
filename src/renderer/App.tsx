import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  AppBar, Box, Button, Container, CssBaseline, Snackbar, Tab, Tabs, ThemeProvider, Toolbar, Typography,
} from '@mui/material';
import { RemindersView } from './RemindersView';
import { makeTheme, type ThemeMode } from './theme';
import type { Settings } from '../shared/contract';
import type { FiredEvent } from '../shared/bridge';

const RoutinesView = lazy(() => import('./RoutinesView').then((m) => ({ default: m.RoutinesView })));
const SettingsView = lazy(() => import('./SettingsView').then((m) => ({ default: m.SettingsView })));

const DEFAULT_SETTINGS: Settings = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  quietHours: { enabled: false, start: '22:00', end: '07:00' },
  theme: 'system',
  launchAtLogin: false,
  startMinimizedOnAutoLaunch: false,
  updateChannel: 'stable',
};

export function App() {
  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [snack, setSnack] = useState<{ id?: string; message: string } | null>(null);
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  );

  useEffect(() => {
    void window.chrono.settings.get().then((s) => {
      setSettings(s);
      void window.chrono.notifyStartupReady?.(performance.now());
    });
    const off = window.chrono.onFired((event: FiredEvent) => {
      setSnack({ id: event.reminderId, message: `${event.title}: ${event.body}` });
    });
    return off;
  }, []);

  const handleSnooze = async (minutes = 5) => {
    if (!snack?.id) return;
    try {
      await window.chrono.reminders.snooze(snack.id, minutes);
      setSnack({ message: `Snoozed for ${minutes} min` });
    } catch {
      setSnack(null);
    }
  };

  // Track the OS color scheme so the "System" theme option stays in sync.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const mode: ThemeMode = useMemo(() => {
    const pref = settings.theme;
    if (pref === 'system') return systemDark ? 'dark' : 'light';
    return pref;
  }, [settings.theme, systemDark]);

  const theme = useMemo(() => makeTheme(mode), [mode]);

  const updateSettings = async (patch: Partial<Settings>) => {
    setSettings(await window.chrono.settings.update(patch));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box>
        <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar>
            <Typography variant="h6" sx={{ flex: 1 }}>ChronoChime</Typography>
          </Toolbar>
          <Tabs value={tab} onChange={(_e, v) => setTab(v)} centered>
            <Tab label="Reminders" />
            <Tab label="Routines" />
            <Tab label="Settings" />
          </Tabs>
        </AppBar>

        <Container maxWidth="md" sx={{ py: 3 }}>
          {tab === 0 && <RemindersView tz={settings.timezone} />}
          <Suspense fallback={null}>
            {tab === 1 && <RoutinesView tz={settings.timezone} />}
            {tab === 2 && <SettingsView settings={settings} onChange={updateSettings} />}
          </Suspense>
        </Container>

        <Snackbar
          open={snack !== null}
          autoHideDuration={6000}
          onClose={() => setSnack(null)}
          message={snack?.message ?? ''}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          action={
            snack?.id ? (
              <Button color="inherit" size="small" onClick={() => handleSnooze(5)}>
                Snooze 5m
              </Button>
            ) : undefined
          }
        />
      </Box>
    </ThemeProvider>
  );
}
