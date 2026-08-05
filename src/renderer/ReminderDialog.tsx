import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem,
  Stack, ToggleButton, ToggleButtonGroup, Typography, Chip, Box, InputAdornment,
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { SoundPickerDialog } from './SoundPickerDialog';
import { describeRule } from '../shared/describe-rule';
import {
  buildRule, defaultScheduleForm, ruleToForm, CLOCK_KIND_OPTIONS, TIME_FORMAT_SUGGESTIONS, WEEKDAY_LABELS,
  type ScheduleForm, type ScheduleKind, type ScheduleMode,
} from './scheduleForm';
import { DateTime } from 'luxon';
import type { Reminder, ReminderInput, SoundChoice } from '../shared/reminder';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

const getSoundLabel = (s: SoundChoice): string => {
  if (s.kind === 'silent') return 'Silent';
  if (s.kind === 'builtin') {
    if (s.id === 'notification.mp3') return 'Chime 1';
    if (s.id === 'notification2.wav') return 'Chime 2';
    if (s.id === 'notification3.wav') return 'Chime 3';
    return s.id;
  }
  if (s.kind === 'custom') return s.path;
  return 'Default';
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
  const [sound, setSound] = useState<SoundChoice>({ kind: 'default' });
  const [soundPickerOpen, setSoundPickerOpen] = useState(false);
  const [form, setForm] = useState<ScheduleForm>(defaultScheduleForm());

  // Populate the form when the dialog opens (from the reminder when editing).
  useEffect(() => {
    if (!open) return;
    if (reminder) {
      setTitle(reminder.title);
      setMessage(reminder.message ?? '');
      setSound(reminder.notification.sound);
      const initialForm = ruleToForm(reminder.rule, tz);
      if (reminder.conclusion !== null && initialForm.kind === 'once') {
        initialForm.at = DateTime.now().plus({ minutes: 30 }).toFormat("yyyy-MM-dd'T'HH:mm");
      }
      setForm(initialForm);
    } else {
      setTitle('');
      setMessage('');
      setSound({ kind: 'default' });
      setForm(defaultScheduleForm());
    }
  }, [open, reminder, tz]);

  const rule = useMemo(() => buildRule(form, Date.now()), [form]);
  const preview = useMemo(() => describeRule(rule, tz), [rule, tz]);
  const isEditing = Boolean(reminder);

  const isOnce = form.kind === 'once';

  const isPastOnce = useMemo(() => {
    if (form.kind !== 'once') return false;
    if (!form.at) return true;
    return new Date(form.at).getTime() <= Date.now();
  }, [form.kind, form.at]);

  const handlePrimaryChange = (val: 'once' | 'repeating') => {
    if (val === 'once') {
      setForm((f) => ({ ...f, kind: 'once', mode: 'clock' }));
    } else {
      setForm((f) => ({ ...f, kind: f.kind === 'once' ? 'daily' : f.kind }));
    }
  };

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
    if (!title.trim() || isPastOnce) return;

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
      notification: { sound, vibrate: reminder?.notification.vibrate ?? false },
    });
    onClose();
  };

  return (
    <>
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
            <ToggleButtonGroup exclusive value={isOnce ? 'once' : 'repeating'} onChange={(_e, v: 'once' | 'repeating' | null) => v && handlePrimaryChange(v)} size="small">
              <ToggleButton value="once">Once</ToggleButton>
              <ToggleButton value="repeating">Repeating</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {isOnce ? (
            <LocalizationProvider dateAdapter={AdapterLuxon}>
              <DateTimePicker
                label="Date & time"
                value={form.at ? DateTime.fromFormat(form.at, "yyyy-MM-dd'T'HH:mm", { zone: tz }) : null}
                onChange={(val) => set('at', val ? val.toFormat("yyyy-MM-dd'T'HH:mm") : '')}
                slotProps={{
                  textField: {
                    required: true,
                    error: isPastOnce,
                    helperText: isPastOnce ? "Must be in the future" : "",
                    fullWidth: true
                  }
                }}
              />
            </LocalizationProvider>
          ) : (
            <>
              <Stack spacing={1}>
                <Typography variant="subtitle2">Timing Mode</Typography>
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
            </>
          )}

          <TextField
            label="Sound"
            value={getSoundLabel(sound)}
            onClick={() => setSoundPickerOpen(true)}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <VolumeUpIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ cursor: 'pointer', '& input': { cursor: 'pointer' } }}
          />

          <Typography variant="body2" color="text.secondary">Summary: {preview}</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={!title.trim() || isPastOnce}>
          {isEditing ? 'Save changes' : 'Save'}
        </Button>
      </DialogActions>
      </Dialog>
      <SoundPickerDialog
        open={soundPickerOpen}
        value={sound}
        onClose={() => setSoundPickerOpen(false)}
        onSelect={setSound}
      />
    </>
  );
}
