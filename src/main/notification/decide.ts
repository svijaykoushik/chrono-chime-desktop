import { isWithinQuietHours } from '../../shared/quiet-hours';
import type { NotificationPrefs, SoundChoice } from '../../shared/reminder';

export interface QuietHoursSetting {
  enabled: boolean;
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

export interface NotificationDecision {
  /** Notifications always appear visually (F10: execution is preserved). */
  showVisual: true;
  /** The sound to play, or null when silenced. */
  sound: SoundChoice | null;
  vibrate: boolean;
}

/**
 * F7/F9/F10 — decides how a notification is delivered given the reminder's
 * preferences and global quiet hours. Quiet hours suppress sound only; the
 * notification still appears and system Do Not Disturb is never touched.
 */
export function decideNotification(
  prefs: NotificationPrefs,
  now: number,
  quietHours: QuietHoursSetting,
  tz: string,
): NotificationDecision {
  const silentPref = prefs.sound.kind === 'silent';
  const quietActive =
    quietHours.enabled && isWithinQuietHours(now, { start: quietHours.start, end: quietHours.end }, tz);

  return {
    showVisual: true,
    sound: silentPref || quietActive ? null : prefs.sound,
    vibrate: prefs.vibrate,
  };
}
