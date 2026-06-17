import React from 'react';
import { Box, Card, CardContent, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import type { Settings } from '../shared/contract';

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

export function SettingsView({ settings, onChange }: Props) {
  const q = settings.quietHours;
  const setQuiet = (patch: Partial<Settings['quietHours']>) => onChange({ quietHours: { ...q, ...patch } });

  return (
    <Box>
      <Card variant="outlined">
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
    </Box>
  );
}
