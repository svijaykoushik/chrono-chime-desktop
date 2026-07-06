import { Notification } from 'electron';
import { decideNotification } from './decide';
import { renderTemplate } from '../../shared/template';
import { logger } from '../diagnostics/logger';
import type { SoundChoice } from '../../shared/reminder';
import type { FireEvent } from '../scheduler/types';
import type { Repository } from '../store/repository';
import type { Settings } from '../../shared/contract';
import type { FiredEvent } from '../../shared/bridge';

export interface NotificationManagerDeps {
  repo: Repository;
  getSettings: () => Settings;
  /** Pushes the fired event to the renderer (for in-app sound playback / UI). */
  emit: (event: FiredEvent) => void;
}

function soundToId(sound: SoundChoice | null): string | null {
  if (!sound) return null;
  switch (sound.kind) {
    case 'builtin':
      return sound.id;
    case 'custom':
      return sound.path;
    default:
      return 'default';
  }
}

/**
 * F7/F9/F10 — turns a scheduler fire into a delivered notification, applying
 * per-reminder sound preferences and global quiet hours. The OS notification
 * always appears; quiet hours only silence the sound.
 */
export class NotificationManager {
  constructor(private readonly d: NotificationManagerDeps) {}

  deliver(event: FireEvent): void {
    const reminder = this.d.repo.getReminder(event.item.id);
    if (!reminder) {
      logger.warn('Notification', 'Attempted to deliver notification for non-existent reminder', { reminderId: event.item.id });
      return;
    }
    const settings = this.d.getSettings();

    const decision = decideNotification(
      reminder.notification,
      event.firedAt,
      settings.quietHours,
      settings.timezone,
    );

    const rawBody = reminder.message ?? reminder.title;
    let body = renderTemplate(rawBody, event.firedAt, settings.timezone);
    if (event.missedCount > 1) {
      body = `${body} (${event.missedCount} missed while away)`;
    }

    const soundId = soundToId(decision.sound);
    if (decision.sound === null) {
      logger.info('Notification', 'Notification audio suppressed by Quiet Hours', {
        reminderId: reminder.id,
        quietHours: settings.quietHours,
      });
    }

    logger.info('Notification', 'Delivering notification', {
      reminderId: reminder.id,
      title: reminder.title,
      sound: soundId,
      silent: decision.sound === null,
    });

    if (Notification.isSupported()) {
      new Notification({
        title: reminder.title,
        body,
        silent: decision.sound === null, // OS sound suppressed; visual remains
      }).show();
    } else {
      logger.warn('Notification', 'OS notifications are not supported on this environment');
    }

    this.d.emit({
      reminderId: reminder.id,
      title: reminder.title,
      body,
      sound: soundId,
      firedAt: event.firedAt,
    });
  }
}
