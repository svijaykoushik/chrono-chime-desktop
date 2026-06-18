import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem,
  Stack, ToggleButton, ToggleButtonGroup, Typography, Chip, Box,
} from '@mui/material';
import { describeRule } from '../shared/describe-rule';
import {
  buildRule, defaultScheduleForm, ruleToForm, CLOCK_KIND_OPTIONS, TIME_FORMAT_SUGGESTIONS, WEEKDAY_LABELS,
  type ScheduleForm, type ScheduleKind, type ScheduleMode,
} from './scheduleForm';
import type { Reminder, ReminderInput, SoundChoice } from '../shared/reminder';

const SOUND_OPTIONS: { value: string; label: string; choice: SoundChoice }[] = [
  { value: 'default', label: 'Default', choice: { kind: 'default' } },
  { value: 'silent', label: 'Silent', choice: { kind: 'silent' } },
  { value: 'notification.mp3', label: 'Chime 1', choice: { kind: 'builtin', id: 'notification.mp3' } },
  { value: 'notification2.wav', label: 'Chime 2', choice: { kind: 'builtin', id: 'notification2.wav' } },
  { value: 'notification3.wav', label: 'Chime 3', choice: { kind: 'builtin', id: 'notification3.wav' } },
];

const soundChoiceToValue = (s: SoundChoice): string => {
  if (s.kind === 'builtin') return s.id;
  if (s.kind === 'silent') return 'silent';
  return 'default';
};

interface Props {
  open: boolean;
  tz: string;
  /** When provided, the dialog edits this reminder instead of creating one. */
  reminder?: Reminder | null;
  onClose: () => void;
  onSave: (input: ReminderInput) => void;
}

export function ReminderDialog({ open, tz, reminder, onClose, onSave }: Props) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sound, setSound] = useState('default');
  const [form, setForm] = useState<ScheduleForm>(defaultScheduleForm());

  // Populate the form when the dialog opens (from the reminder when editing).
  useEffect(() => {
    if (!open) return;
    if (reminder) {
      setTitle(reminder.title);
      setMessage(reminder.message ?? '');
      setSound(soundChoiceToValue(reminder.notification.sound));
      setForm(ruleToForm(reminder.rule, tz));
    } else {
      setTitle('');
      setMessage('');
      setSound('default');
      setForm(defaultScheduleForm());
    }
  }, [open, reminder, tz]);

  const rule = useMemo(() => buildRule(form, Date.now()), [form]);
  const preview = useMemo(() => describeRule(rule, tz), [rule, tz]);
  const isEditing = Boolean(reminder);

  const set = <K extends keyof ScheduleForm>(key: K, value: ScheduleForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Switching mode picks a sensible default kind for that family.
  const setMode = (mode: ScheduleMode | null) => {
    if (!mode) return;
    setForm((f) => ({ ...f, mode, kind: mode === 'relative' ? 'interval' : 'daily' }));
  };

  const insertToken = (token: string) =>
    setMessage((m) => (m ? `${m} ${token}` : token));

  const handleSave = () => {
    if (!title.trim()) return;
    const choice = SOUND_OPTIONS.find((o) => o.value === sound)!.choice;

    // Preserve the interval lattice (anchor) when editing and the period is
    // unchanged, so changing other fields does not shift future executions.
    let finalRule = rule;
    if (
      reminder &&
      reminder.rule.kind === 'interval' &&
      finalRule.kind === 'interval' &&
      finalRule.everyMs === reminder.rule.everyMs
    ) {
      finalRule = { ...finalRule, anchor: reminder.rule.anchor };
    }

    onSave({
      title: title.trim(),
      message: message.trim() || undefined,
      enabled: reminder ? reminder.enabled : true,
      rule: finalRule,
      notification: { sound: choice, vibrate: reminder?.notification.vibrate ?? false },
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEditing ? 'Edit reminder' : 'New reminder'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required />

          <TextField
            label="Message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Box>
            <Typography variant="caption" color="text.secondary">Insert current time:</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
              {TIME_FORMAT_SUGGESTIONS.map((s) => (
                <Chip key={s.token} size="small" variant="outlined" label={s.label} onClick={() => insertToken(s.token)} />
              ))}
            </Stack>
          </Box>

          <Stack spacing={1}>
            <Typography variant="subtitle2">When</Typography>
            <ToggleButtonGroup exclusive value={form.mode} onChange={(_e, v: ScheduleMode | null) => setMode(v)} size="small">
              <ToggleButton value="relative">Starting now</ToggleButton>
              <ToggleButton value="clock">On the clock</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {form.mode === 'relative' ? (
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
          ) : (
            <TextField select label="Repeats" value={form.kind} onChange={(e) => set('kind', e.target.value as ScheduleKind)}>
              {CLOCK_KIND_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
          )}

          {form.mode === 'clock' && form.kind === 'once' && (
            <TextField
              type="datetime-local" label="When" InputLabelProps={{ shrink: true }}
              value={form.at} onChange={(e) => set('at', e.target.value)}
            />
          )}

          {form.mode === 'clock' && (form.kind === 'daily' || form.kind === 'weekly' || form.kind === 'monthly') && (
            <TextField type="time" label="At" InputLabelProps={{ shrink: true }} value={form.atTime} onChange={(e) => set('atTime', e.target.value)} />
          )}

          {form.mode === 'clock' && form.kind === 'weekly' && (
            <ToggleButtonGroup value={form.weekdays} size="small" onChange={(_e, v: number[]) => set('weekdays', v)}>
              {WEEKDAY_LABELS.map((d) => (
                <ToggleButton key={d.value} value={d.value}>{d.label}</ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}

          {form.mode === 'clock' && form.kind === 'monthly' && (
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
        <Button variant="contained" onClick={handleSave} disabled={!title.trim()}>
          {isEditing ? 'Save changes' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
