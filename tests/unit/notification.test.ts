import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { decideNotification } from '../../src/main/notification/decide';
import type { NotificationPrefs } from '../../src/shared/reminder';

const TZ = 'America/New_York';
const ms = (iso: string) => DateTime.fromISO(iso, { zone: TZ }).toMillis();
const quiet = { enabled: true, start: '22:00', end: '06:00' };

const prefs = (p: Partial<NotificationPrefs> = {}): NotificationPrefs => ({
  sound: { kind: 'default' },
  vibrate: false,
  ...p,
});

describe('decideNotification — F7/F9/F10 delivery', () => {
  it('always shows the visual notification', () => {
    const d = decideNotification(prefs(), ms('2026-06-16T12:00'), quiet, TZ);
    expect(d.showVisual).toBe(true);
  });

  it('plays the chosen sound outside quiet hours', () => {
    const d = decideNotification(prefs({ sound: { kind: 'builtin', id: 'notification2.wav' } }), ms('2026-06-16T12:00'), quiet, TZ);
    expect(d.sound).toEqual({ kind: 'builtin', id: 'notification2.wav' });
  });

  it('suppresses sound during quiet hours but still shows the notification', () => {
    const d = decideNotification(prefs(), ms('2026-06-16T23:30'), quiet, TZ);
    expect(d.showVisual).toBe(true);
    expect(d.sound).toBeNull();
  });

  it('plays no sound when the reminder is silent', () => {
    const d = decideNotification(prefs({ sound: { kind: 'silent' } }), ms('2026-06-16T12:00'), quiet, TZ);
    expect(d.sound).toBeNull();
  });

  it('ignores quiet hours when the feature is disabled', () => {
    const off = { enabled: false, start: '22:00', end: '06:00' };
    const d = decideNotification(prefs(), ms('2026-06-16T23:30'), off, TZ);
    expect(d.sound).toEqual({ kind: 'default' });
  });
});
