import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Radio,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import type { SoundChoice } from '../shared/reminder';

const SOUND_OPTIONS: { id: string; label: string; choice: SoundChoice }[] = [
  { id: 'default', label: 'Default', choice: { kind: 'default' } },
  { id: 'silent', label: 'Silent', choice: { kind: 'silent' } },
  { id: 'notification.mp3', label: 'Chime 1', choice: { kind: 'builtin', id: 'notification.mp3' } },
  { id: 'notification2.wav', label: 'Chime 2', choice: { kind: 'builtin', id: 'notification2.wav' } },
  { id: 'notification3.wav', label: 'Chime 3', choice: { kind: 'builtin', id: 'notification3.wav' } },
];

const getSoundId = (s: SoundChoice): string => {
  if (s.kind === 'builtin') return s.id;
  if (s.kind === 'silent') return 'silent';
  if (s.kind === 'custom') return s.path;
  return 'default';
};

interface Props {
  open: boolean;
  value: SoundChoice;
  onClose: () => void;
  onSelect: (choice: SoundChoice) => void;
}

export function SoundPickerDialog({ open, value, onClose, onSelect }: Props) {
  const [selectedId, setSelectedId] = useState<string>('default');
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);

  // Sync selected sound ID when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedId(getSoundId(value));
    }
  }, [open, value]);

  // Clean up playing audio on close/unmount
  const stopAudio = () => {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      setActiveAudio(null);
    }
  };

  useEffect(() => {
    return () => {
      if (activeAudio) {
        activeAudio.pause();
      }
    };
  }, [activeAudio]);

  const handleOptionClick = (option: typeof SOUND_OPTIONS[0]) => {
    setSelectedId(option.id);

    // Stop current playing audio
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }

    if (option.choice.kind === 'silent') {
      setActiveAudio(null);
      return;
    }

    // Play preview
    let src = '';
    if (option.choice.kind === 'default') {
      src = 'chrono-sound://notification.mp3';
    } else if (option.choice.kind === 'builtin') {
      src = `chrono-sound://${option.choice.id}`;
    } else if (option.choice.kind === 'custom') {
      src = `file://${option.choice.path}`;
    }

    if (src) {
      const audio = new Audio(src);
      audio.play().catch(() => {});
      setActiveAudio(audio);
    }
  };

  const handleCancel = () => {
    stopAudio();
    onClose();
  };

  const handleOk = () => {
    stopAudio();
    const opt = SOUND_OPTIONS.find((o) => o.id === selectedId) ?? SOUND_OPTIONS[0];
    if (opt) {
      onSelect(opt.choice);
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, fontWeight: 'bold' }}>
        Select notification sound
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <List sx={{ pt: 0, pb: 0 }}>
          {SOUND_OPTIONS.map((option) => {
            const isSelected = selectedId === option.id;
            return (
              <ListItem key={option.id} disablePadding>
                <ListItemButton
                  onClick={() => handleOptionClick(option)}
                  sx={{
                    py: 1.5,
                    px: 3,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Radio
                      checked={isSelected}
                      value={option.id}
                      name="sound-picker-radio"
                      sx={{ p: 0 }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={option.label}
                    primaryTypographyProps={{
                      fontWeight: isSelected ? 'bold' : 'normal',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={handleCancel} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleOk} variant="contained" color="primary">
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}
