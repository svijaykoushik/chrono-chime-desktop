import type { Reminder } from './reminder';

export type ReminderStatus = 'scheduled' | 'off' | 'done' | 'missed';

export function reminderStatus(r: Reminder): ReminderStatus {
  if (r.conclusion === 'fired') return 'done';
  if (r.conclusion === 'missed') return 'missed';
  if (!r.enabled) return 'off';
  return 'scheduled';
}
