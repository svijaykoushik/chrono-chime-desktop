import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Card, CardContent, Checkbox, Fab, IconButton, InputAdornment, Stack, Switch,
  TextField, Toolbar, Typography, Button, Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Tooltip, Chip,
} from '@mui/material';
import { AddIcon, SearchIcon, DeleteIcon, EditIcon, HistoryIcon } from './icons';
import { DateTime } from 'luxon';
import { reminderStatus } from '../shared/reminder-status';
import { describeRule } from '../shared/describe-rule';
import type { Reminder, ReminderInput } from '../shared/reminder';

const ReminderDialog = React.lazy(() => import('./ReminderDialog').then((m) => ({ default: m.ReminderDialog })));

interface ReminderCardItemProps {
  reminder: Reminder;
  tz: string;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleEnabled: (r: Reminder) => void;
  onOpenEdit: (r: Reminder) => void;
  onSetPendingDelete: (ids: string[]) => void;
}

const ReminderCardItem = memo(function ReminderCardItem({
  reminder: r,
  tz,
  selectionMode,
  selected,
  onToggleSelect,
  onToggleEnabled,
  onOpenEdit,
  onSetPendingDelete,
}: ReminderCardItemProps) {
  const status = useMemo(() => reminderStatus(r), [r]);
  const ruleDescription = useMemo(() => describeRule(r.rule, tz), [r.rule, tz]);
  const formattedConcludedAt = useMemo(() => {
    return r.concludedAt ? DateTime.fromMillis(r.concludedAt, { zone: tz }).toFormat('HH:mm') : '';
  }, [r.concludedAt, tz]);

  return (
    <Card
      variant="outlined"
      onContextMenu={(e) => { e.preventDefault(); onToggleSelect(r.id); }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {selectionMode && (
          <Checkbox checked={selected} onChange={() => onToggleSelect(r.id)} />
        )}
        <Box sx={{ flex: 1, opacity: status === 'off' ? 0.5 : 1 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>{r.title}</Typography>
            {status === 'done' && (
              <Chip
                size="small"
                label={`Done · fired ${formattedConcludedAt}`}
                color="success"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.75rem' }}
              />
            )}
            {status === 'missed' && (
              <Chip
                size="small"
                label={`Missed · ChronoChime wasn't running at ${formattedConcludedAt}`}
                color="error"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.75rem' }}
              />
            )}
            {r.snoozedUntil != null && status === 'scheduled' && (
              <Chip
                size="small"
                label={`Snoozed until ${DateTime.fromMillis(r.snoozedUntil, { zone: tz }).toFormat('HH:mm')}`}
                color="secondary"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.75rem' }}
              />
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary">{ruleDescription}</Typography>
        </Box>
        {!selectionMode && (
          <>
            {status === 'done' || status === 'missed' ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={<HistoryIcon />}
                onClick={() => onOpenEdit(r)}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                Schedule again
              </Button>
            ) : (
              <Switch checked={r.enabled} onChange={() => onToggleEnabled(r)} />
            )}
            <Tooltip title="Edit">
              <IconButton onClick={() => onOpenEdit(r)} aria-label={`edit ${r.title}`}><EditIcon /></IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton onClick={() => onSetPendingDelete([r.id])} aria-label={`delete ${r.title}`}><DeleteIcon /></IconButton>
            </Tooltip>
          </>
        )}
      </CardContent>
    </Card>
  );
});

export function RemindersView({ tz }: { tz: string }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  // Reminder ids pending a confirmed deletion (single item or bulk selection).
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);

  // 150ms search input debounce to prevent IPC and SQLite flooding
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const refresh = useCallback(async (q = debouncedQuery) => {
    setReminders(await window.chrono.reminders.list(q || undefined));
  }, [debouncedQuery]);

  useEffect(() => { void refresh(debouncedQuery); }, [debouncedQuery, refresh]);

  const toggleEnabled = useCallback(async (r: Reminder) => {
    await window.chrono.reminders.setEnabled([r.id], !r.enabled);
    void refresh();
  }, [refresh]);

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = useCallback((r: Reminder) => { setEditing(r); setDialogOpen(true); }, []);

  const handleSave = async (input: ReminderInput) => {
    if (editing) await window.chrono.reminders.update(editing.id, input);
    else await window.chrono.reminders.create(input);
    void refresh();
  };

  const selectionMode = selection.size > 0;
  const toggleSelect = useCallback((id: string) =>
    setSelection((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    }), []);

  const ids = useMemo(() => [...selection], [selection]);
  const bulkEnable = async (enabled: boolean) => {
    await window.chrono.reminders.setEnabled(ids, enabled);
    setSelection(new Set());
    void refresh();
  };

  const confirmDelete = async () => {
    await window.chrono.reminders.delete(pendingDelete ?? []);
    setPendingDelete(null);
    setSelection(new Set());
    void refresh();
  };

  return (
    <Box sx={{ pb: 10 }}>
      {selectionMode ? (
        <Toolbar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 2, mb: 2 }}>
          <Typography sx={{ flex: 1 }}>{selection.size} selected</Typography>
          <Button color="inherit" onClick={() => bulkEnable(true)}>Enable</Button>
          <Button color="inherit" onClick={() => bulkEnable(false)}>Disable</Button>
          <IconButton color="inherit" onClick={() => setPendingDelete(ids)} aria-label="delete selected"><DeleteIcon /></IconButton>
          <Button color="inherit" onClick={() => setSelection(new Set())}>Cancel</Button>
        </Toolbar>
      ) : (
        <TextField
          fullWidth placeholder="Search reminders" value={query}
          onChange={(e) => setQuery(e.target.value)} sx={{ mb: 2 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        />
      )}

      {reminders.length === 0 ? (
        <Stack alignItems="center" sx={{ mt: 8, color: 'text.secondary' }} spacing={1}>
          <Typography variant="h6">{query ? 'No reminders match your search' : 'No reminders yet'}</Typography>
          <Typography variant="body2">{query ? 'Try a different title.' : 'Tap + to create your first reminder.'}</Typography>
        </Stack>
      ) : (
        <Stack spacing={1.5}>
          {reminders.map((r) => (
            <ReminderCardItem
              key={r.id}
              reminder={r}
              tz={tz}
              selectionMode={selectionMode}
              selected={selection.has(r.id)}
              onToggleSelect={toggleSelect}
              onToggleEnabled={toggleEnabled}
              onOpenEdit={openEdit}
              onSetPendingDelete={setPendingDelete}
            />
          ))}
        </Stack>
      )}

      <Fab color="primary" aria-label="add" sx={{ position: 'fixed', bottom: 24, right: 24 }} onClick={openCreate}>
        <AddIcon />
      </Fab>

      {dialogOpen && (
        <React.Suspense fallback={null}>
          <ReminderDialog
            open={dialogOpen}
            tz={tz}
            reminder={editing}
            onClose={() => setDialogOpen(false)}
            onSave={handleSave}
          />
        </React.Suspense>
      )}

      <Dialog open={pendingDelete !== null} onClose={() => setPendingDelete(null)}>
        <DialogTitle>
          Delete {pendingDelete?.length ?? 0} reminder{(pendingDelete?.length ?? 0) === 1 ? '' : 's'}?
        </DialogTitle>
        <DialogContent><DialogContentText>This cannot be undone.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
