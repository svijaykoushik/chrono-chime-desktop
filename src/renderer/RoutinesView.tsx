import React, { useEffect, useState, useCallback } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, Dialog, DialogActions,
  DialogContent, DialogTitle, Fab, IconButton, List, ListItem, ListItemText, MenuItem,
  Stack, Switch, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import { describeRule } from '../shared/describe-rule';
import type { RoutineView } from '../shared/bridge';
import type { RoutineConfig } from '../shared/routine';

type RoutineType = 'pomodoro' | 'hydration' | 'workout' | 'study';

export function RoutinesView({ tz }: { tz: string }) {
  const [routines, setRoutines] = useState<RoutineView[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<RoutineType>('pomodoro');
  const [everyMinutes, setEveryMinutes] = useState(60);
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [cycles, setCycles] = useState(4);

  const refresh = useCallback(async () => setRoutines(await window.chrono.routines.list()), []);
  useEffect(() => { void refresh(); }, [refresh]);

  const buildConfig = (): RoutineConfig => {
    const startAt = Date.now();
    if (type === 'pomodoro') return { type, workMinutes, breakMinutes, cycles, startAt };
    if (type === 'hydration') return { type, everyMinutes, startAt };
    return { type, everyMinutes, startAt };
  };

  const create = async () => {
    if (!title.trim()) return;
    await window.chrono.routines.create({ title: title.trim(), enabled: true, config: buildConfig() });
    setTitle('');
    setOpen(false);
    void refresh();
  };

  const toggle = async (r: RoutineView) => { await window.chrono.routines.setEnabled(r.id, !r.enabled); void refresh(); };
  const remove = async (r: RoutineView) => { await window.chrono.routines.delete(r.id); void refresh(); };

  return (
    <Box sx={{ pb: 10 }}>
      {routines.length === 0 ? (
        <Stack alignItems="center" sx={{ mt: 8, color: 'text.secondary' }} spacing={1}>
          <Typography variant="h6">No routines yet</Typography>
          <Typography variant="body2">Create a Pomodoro, Hydration, Workout or Study routine.</Typography>
        </Stack>
      ) : (
        routines.map((r) => (
          <Accordion key={r.id} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ flex: 1, opacity: r.enabled ? 1 : 0.5 }}>
                <Typography variant="subtitle1">{r.title}</Typography>
                <Typography variant="body2" color="text.secondary">{r.type} · {r.children.length} schedules</Typography>
              </Box>
              <Switch checked={r.enabled} onClick={(e) => e.stopPropagation()} onChange={() => toggle(r)} />
              <IconButton onClick={(e) => { e.stopPropagation(); remove(r); }} aria-label="delete routine"><DeleteIcon /></IconButton>
            </AccordionSummary>
            <AccordionDetails>
              <List dense>
                {r.children.map((c) => (
                  <ListItem key={c.id}>
                    <ListItemText primary={c.title} secondary={describeRule(c.rule, tz)} />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        ))
      )}

      <Fab color="primary" aria-label="add routine" sx={{ position: 'fixed', bottom: 24, right: 24 }} onClick={() => setOpen(true)}>
        <AddIcon />
      </Fab>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New routine</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required />
            <TextField select label="Type" value={type} onChange={(e) => setType(e.target.value as RoutineType)}>
              <MenuItem value="pomodoro">Pomodoro Session</MenuItem>
              <MenuItem value="hydration">Hydration</MenuItem>
              <MenuItem value="workout">Workout</MenuItem>
              <MenuItem value="study">Study Session</MenuItem>
            </TextField>

            {type === 'pomodoro' ? (
              <Stack direction="row" spacing={2}>
                <TextField type="number" label="Work min" value={workMinutes} onChange={(e) => setWorkMinutes(Number(e.target.value))} />
                <TextField type="number" label="Break min" value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} />
                <TextField type="number" label="Cycles" value={cycles} onChange={(e) => setCycles(Number(e.target.value))} />
              </Stack>
            ) : (
              <TextField type="number" label="Every (minutes)" value={everyMinutes} onChange={(e) => setEveryMinutes(Number(e.target.value))} />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={create} disabled={!title.trim()}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
