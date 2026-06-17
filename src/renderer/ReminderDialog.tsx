import React, { useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem,
  Stack, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { describeRule } from '../shared/describe-rule';
import { buildRule, defaultScheduleForm, WEEKDAY_LABELS, type ScheduleForm, type ScheduleKind } from './scheduleForm';
import type { ReminderInput } from '../shared/reminder';
import type { SoundChoice } from '../shared/reminder';

const KIND_OPTIONS: { value: ScheduleKind; label: string }[] = [
  { value: 'once', label: 'Once' },
  { value: 'interval', label: 'Every interval' },
  { value: 'hourly', label: 'Every hour' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const SOUND_OPTIONS: { value: string; label: string; choice: SoundChoice }[] = [
  { value: 'default', label: 'Default', choice: { kind: 'default' } },
  { value: 'silent', label: 'Silent', choice: { kind: 'silent' } },
  { value: 'notification.mp3', label: 'Chime 1', choice: { kind: 'builtin', id: 'notification.mp3' } },
  { value: 'notification2.wav', label: 'Chime 2', choice: { kind: 'builtin', id: 'notification2.wav' } },
  { value: 'notification3.wav', label: 'Chime 3', choice: { kind: 'builtin', id: 'notification3.wav' } },
];

interface Props {
  open: boolean;
  tz: string;
  onClose: () => void;
  onSave: (input: ReminderInput) => void;
}

export function ReminderDialog({ open, tz, onClose, onSave }: Props) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sound, setSound] = useState('default');
  const [form, setForm] = useState<ScheduleForm>(defaultScheduleForm());

  const rule = useMemo(() => buildRule(form, Date.now()), [form]);
  const preview = useMemo(() => describeRule(rule, tz), [rule, tz]);

  const set = <K extends keyof ScheduleForm>(key: K, value: ScheduleForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const reset = () => {
    setTitle('');
    setMessage('');
    setSound('default');
    setForm(defaultScheduleForm());
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const choice = SOUND_OPTIONS.find((o) => o.value === sound)!.choice;
    onSave({
      title: title.trim(),
      message: message.trim() || undefined,
      enabled: true,
      rule,
      notification: { sound: choice, vibrate: false },
    });
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New reminder</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required />
          <TextField
            label="Message (optional)"
            helperText="Tip: use [HH:mm] or [hh:mm tt] to insert the time"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <TextField select label="Schedule" value={form.kind} onChange={(e) => set('kind', e.target.value as ScheduleKind)}>
            {KIND_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>

          {form.kind === 'once' && (
            <TextField
              type="datetime-local"
              label="When"
              InputLabelProps={{ shrink: true }}
              value={form.at}
              onChange={(e) => set('at', e.target.value)}
            />
          )}

          {form.kind === 'interval' && (
            <Stack direction="row" spacing={2}>
              <TextField
                type="number" label="Every" sx={{ flex: 1 }}
                value={form.intervalAmount}
                onChange={(e) => set('intervalAmount', Number(e.target.value))}
              />
              <TextField
                select label="Unit" sx={{ flex: 1 }}
                value={form.intervalUnit}
                onChange={(e) => set('intervalUnit', e.target.value as 'minutes' | 'hours')}
              >
                <MenuItem value="minutes">minutes</MenuItem>
                <MenuItem value="hours">hours</MenuItem>
              </TextField>
            </Stack>
          )}

          {(form.kind === 'daily' || form.kind === 'weekly' || form.kind === 'monthly') && (
            <TextField type="time" label="At" InputLabelProps={{ shrink: true }} value={form.atTime} onChange={(e) => set('atTime', e.target.value)} />
          )}

          {form.kind === 'weekly' && (
            <ToggleButtonGroup
              value={form.weekdays} size="small"
              onChange={(_e, v: number[]) => set('weekdays', v)}
            >
              {WEEKDAY_LABELS.map((d) => (
                <ToggleButton key={d.value} value={d.value}>{d.label}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}

          {form.kind === 'monthly' && (
            <TextField
              type="number" label="Day of month" inputProps={{ min: 1, max: 31 }}
              value={form.monthDay}
              onChange={(e) => set('monthDay', Math.min(31, Math.max(1, Number(e.target.value))))}
            />
          )}

          <TextField select label="Sound" value={sound} onChange={(e) => setSound(e.target.value)}>
            {SOUND_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>

          <Typography variant="body2" color="text.secondary">Summary: {preview}</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={!title.trim()}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
