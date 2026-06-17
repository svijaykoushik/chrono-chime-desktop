import React, { useEffect, useRef, useState } from 'react';
import { AppBar, Box, Container, Snackbar, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import { RemindersView } from './RemindersView';
import { RoutinesView } from './RoutinesView';
import { SettingsView } from './SettingsView';
import type { Settings } from '../shared/contract';
import type { FiredEvent } from '../shared/bridge';

export function App() {
  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [snack, setSnack] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    void window.chrono.settings.get().then(setSettings);
    const off = window.chrono.onFired((event: FiredEvent) => {
      setSnack(`${event.title}: ${event.body}`);
      if (event.sound && event.sound !== 'default') playSound(event.sound);
    });
    return off;
  }, []);

  const playSound = (id: string) => {
    // Built-in sounds ship under assets/sounds; custom paths are absolute.
    const src = id.includes('/') || id.includes('\\') ? `file://${id}` : `chrono-sound://${id}`;
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = src;
    void audioRef.current.play().catch(() => undefined);
  };

  const updateSettings = async (patch: Partial<Settings>) => {
    setSettings(await window.chrono.settings.update(patch));
  };

  if (!settings) return null;

  return (
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
        {tab === 1 && <RoutinesView tz={settings.timezone} />}
        {tab === 2 && <SettingsView settings={settings} onChange={updateSettings} />}
      </Container>

      <Snackbar
        open={snack !== null} autoHideDuration={6000} onClose={() => setSnack(null)}
        message={snack ?? ''} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
