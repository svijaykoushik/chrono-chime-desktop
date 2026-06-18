import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Checkbox, Fab, IconButton, InputAdornment, Stack, Switch,
  TextField, Toolbar, Typography, Button, Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { describeRule } from '../shared/describe-rule';
import { ReminderDialog } from './ReminderDialog';
import type { Reminder, ReminderInput } from '../shared/reminder';

export function RemindersView({ tz }: { tz: string }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  // Reminder ids pending a confirmed deletion (single item or bulk selection).
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);

  const refresh = useCallback(async (q = query) => {
    setReminders(await window.chrono.reminders.list(q || undefined));
  }, [query]);

  useEffect(() => { void refresh(query); }, [query, refresh]);

  const toggleEnabled = async (r: Reminder) => {
    await window.chrono.reminders.setEnabled([r.id], !r.enabled);
    void refresh();
  };

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (r: Reminder) => { setEditing(r); setDialogOpen(true); };

  const handleSave = async (input: ReminderInput) => {
    if (editing) await window.chrono.reminders.update(editing.id, input);
    else await window.chrono.reminders.create(input);
    void refresh();
  };

  const selectionMode = selection.size > 0;
  const toggleSelect = (id: string) =>
    setSelection((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const ids = [...selection];
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
            <Card
              key={r.id} variant="outlined"
              onContextMenu={(e) => { e.preventDefault(); toggleSelect(r.id); }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {selectionMode && (
                  <Checkbox checked={selection.has(r.id)} onChange={() => toggleSelect(r.id)} />
                )}
                <Box sx={{ flex: 1, opacity: r.enabled ? 1 : 0.5 }}>
                  <Typography variant="subtitle1">{r.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{describeRule(r.rule, tz)}</Typography>
                </Box>
                {!selectionMode && (
                  <>
                    <Switch checked={r.enabled} onChange={() => toggleEnabled(r)} />
                    <Tooltip title="Edit">
                      <IconButton onClick={() => openEdit(r)} aria-label={`edit ${r.title}`}><EditIcon /></IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => setPendingDelete([r.id])} aria-label={`delete ${r.title}`}><DeleteIcon /></IconButton>
                    </Tooltip>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Fab color="primary" aria-label="add" sx={{ position: 'fixed', bottom: 24, right: 24 }} onClick={openCreate}>
        <AddIcon />
      </Fab>

      <ReminderDialog
        open={dialogOpen} tz={tz} reminder={editing}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />

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
