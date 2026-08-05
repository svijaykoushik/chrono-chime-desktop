import { describe, it, expect, vi } from 'vitest';
import { DateTime } from 'luxon';
import { Notification } from 'electron';
import { join } from 'node:path';
import { decideNotification } from '../../src/main/notification/decide';
import { NotificationManager } from '../../src/main/notification/manager';
import type { NotificationPrefs } from '../../src/shared/reminder';

vi.mock('electron', () => {
  class MockNotification {
    static isSupportedMock = true;
    static isSupported() {
      return MockNotification.isSupportedMock;
    }
    options: any;
    show = vi.fn();
    constructor(options: any) {
      this.options = options;
      MockNotification.instances.push(this);
    }
    static instances: MockNotification[] = [];
  }

  return {
    app: {
      getAppPath: () => '/mock/app/path',
      getPath: (name: string) => `/mock/paths/${name}`,
    },
    Notification: MockNotification,
  };
});

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

describe('NotificationManager — F7/F9/F10 delivery', () => {
  it('delivers notification and plays default sound via OS (silent: false)', () => {
    (Notification as any).instances = [];

    const playAudio = vi.fn();
    const emit = vi.fn();
    const repo = {
      getReminder: () => ({
        id: 'rem-1',
        title: 'Water Plants',
        message: 'Do it now',
        notification: {
          sound: { kind: 'default' },
          vibrate: false,
        },
      }),
    } as any;

    const mgr = new NotificationManager({
      repo,
      getSettings: () => ({
        quietHours: { enabled: false, start: '22:00', end: '06:00' },
        timezone: TZ,
      } as any),
      emit,
      playAudio,
    });

    mgr.deliver({
      item: { id: 'rem-1' } as any,
      firedAt: ms('2026-06-16T12:00'),
      missedCount: 1,
    });

    expect((Notification as any).instances).toHaveLength(1);
    const instance = (Notification as any).instances[0]!;
    expect(instance.options.title).toBe('Water Plants');
    expect(instance.options.body).toBe('Do it now');
    expect(instance.options.silent).toBe(false); // Default sound plays via OS

    expect(playAudio).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith({
      reminderId: 'rem-1',
      title: 'Water Plants',
      body: 'Do it now',
      sound: 'default',
      firedAt: ms('2026-06-16T12:00'),
    });
  });

  it('delivers notification silently (silent: true) and plays builtin sound via playAudio', () => {
    (Notification as any).instances = [];

    const playAudio = vi.fn();
    const emit = vi.fn();
    const repo = {
      getReminder: () => ({
        id: 'rem-1',
        title: 'Stretch',
        message: 'Back stretch',
        notification: {
          sound: { kind: 'builtin', id: 'chime.wav' },
          vibrate: false,
        },
      }),
    } as any;

    const mgr = new NotificationManager({
      repo,
      getSettings: () => ({
        quietHours: { enabled: false, start: '22:00', end: '06:00' },
        timezone: TZ,
      } as any),
      emit,
      playAudio,
    });

    mgr.deliver({
      item: { id: 'rem-1' } as any,
      firedAt: ms('2026-06-16T12:00'),
      missedCount: 1,
    });

    expect((Notification as any).instances).toHaveLength(1);
    const instance = (Notification as any).instances[0]!;
    expect(instance.options.silent).toBe(true); // OS silent

    expect(playAudio).toHaveBeenCalledWith(join('/mock/app/path', 'assets/sounds', 'chime.wav'));
    expect(emit).toHaveBeenCalledWith({
      reminderId: 'rem-1',
      title: 'Stretch',
      body: 'Back stretch',
      sound: 'chime.wav',
      firedAt: ms('2026-06-16T12:00'),
    });
  });

  it('suppresses audio (silent: true) during quiet hours', () => {
    (Notification as any).instances = [];

    const playAudio = vi.fn();
    const emit = vi.fn();
    const repo = {
      getReminder: () => ({
        id: 'rem-1',
        title: 'Late Night Alert',
        notification: {
          sound: { kind: 'builtin', id: 'chime.wav' },
          vibrate: false,
        },
      }),
    } as any;

    const mgr = new NotificationManager({
      repo,
      getSettings: () => ({
        quietHours: { enabled: true, start: '22:00', end: '06:00' },
        timezone: TZ,
      } as any),
      emit,
      playAudio,
    });

    // Fire at 23:30 (during quiet hours)
    mgr.deliver({
      item: { id: 'rem-1' } as any,
      firedAt: ms('2026-06-16T23:30'),
      missedCount: 1,
    });

    expect((Notification as any).instances).toHaveLength(1);
    const instance = (Notification as any).instances[0]!;
    expect(instance.options.silent).toBe(true); // OS silent

    expect(playAudio).not.toHaveBeenCalled(); // Silent in quiet hours
  });
});
