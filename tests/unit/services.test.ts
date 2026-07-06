import { describe, it, expect, beforeEach } from 'vitest';
import { DateTime } from 'luxon';
import { InMemoryRepository, schedulerStoreFor } from '../../src/main/store/repository';
import { ReminderService } from '../../src/main/app/reminder-service';
import { RoutineService } from '../../src/main/app/routine-service';
import type { ReminderInput } from '../../src/shared/reminder';

const TZ = 'America/New_York';
const ms = (iso: string) => DateTime.fromISO(iso, { zone: TZ }).toMillis();
const NOW = ms('2026-06-16T08:00');

function setup() {
  const repo = new InMemoryRepository();
  let n = 0;
  const idGen = () => `id-${++n}`;
  const reschedules = { count: 0 };
  const scheduler = { reschedule: () => { reschedules.count++; } };
  const deps = { repo, scheduler, clock: () => NOW, idGen, tz: TZ };
  return {
    repo,
    reschedules,
    reminders: new ReminderService(deps),
    routines: new RoutineService(deps),
  };
}

const dailyInput = (title: string): ReminderInput => ({
  title,
  enabled: true,
  rule: { kind: 'calendar', freq: 'daily', interval: 1, atTime: '09:00' },
  notification: { sound: { kind: 'default' }, vibrate: false },
});

describe('ReminderService — F1 CRUD', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => (s = setup()));

  it('creates an enabled reminder with a computed next fire and re-arms', () => {
    const r = s.reminders.create(dailyInput('Standup'));
    expect(r.id).toBe('id-1');
    expect(r.nextFireAt).toBe(ms('2026-06-16T09:00'));
    expect(s.reschedules.count).toBe(1);
  });

  it('disabling clears the next fire but preserves the rule', () => {
    const r = s.reminders.create(dailyInput('Standup'));
    const updated = s.reminders.update(r.id, { enabled: false })!;
    expect(updated.enabled).toBe(false);
    expect(updated.nextFireAt).toBeNull();
    expect(updated.rule).toEqual(r.rule);
  });

  it('deleting removes it from the store', () => {
    const r = s.reminders.create(dailyInput('Standup'));
    expect(s.reminders.delete([r.id])).toBe(1);
    expect(s.reminders.list()).toHaveLength(0);
  });

  it('editing preserves identity and history, and keeps the future fire time when the schedule is unchanged', () => {
    const r = s.reminders.create(dailyInput('Standup'));
    const firedAt = NOW - 3_600_000;
    s.repo.updateReminder(r.id, { lastFireAt: firedAt }); // pretend it already fired once

    const updated = s.reminders.update(r.id, {
      title: 'Standup (renamed)',
      rule: r.rule, // unchanged schedule
      enabled: r.enabled,
    })!;

    expect(updated.id).toBe(r.id); // same reminder, not a new one
    expect(updated.title).toBe('Standup (renamed)');
    expect(updated.lastFireAt).toBe(firedAt); // history preserved
    expect(updated.nextFireAt).toBe(r.nextFireAt); // next occurrence not moved
  });

  it('recomputes future executions when the schedule changes', () => {
    const r = s.reminders.create(dailyInput('Standup')); // daily 09:00
    const updated = s.reminders.update(r.id, {
      rule: { kind: 'calendar', freq: 'daily', interval: 1, atTime: '18:00' },
    })!;
    // NOW is 08:00, so the next 18:00 occurrence is today.
    expect(updated.nextFireAt).toBe(ms('2026-06-16T18:00'));
  });
});

describe('ReminderService — F12 search & F13 bulk ops', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => {
    s = setup();
    s.reminders.create(dailyInput('Morning Standup'));
    s.reminders.create(dailyInput('Evening Review'));
    s.reminders.create(dailyInput('Standup Notes'));
  });

  it('searches by title, case-insensitive', () => {
    const hits = s.reminders.search('standup');
    expect(hits.map((r) => r.title).sort()).toEqual(['Morning Standup', 'Standup Notes']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(s.reminders.search('nonexistent')).toHaveLength(0);
  });

  it('bulk-disables multiple reminders at once', () => {
    const all = s.reminders.list();
    const out = s.reminders.setEnabled(all.map((r) => r.id), false);
    expect(out.every((r) => r.enabled === false && r.nextFireAt === null)).toBe(true);
  });

  it('bulk-deletes multiple reminders at once', () => {
    const all = s.reminders.list();
    expect(s.reminders.delete([all[0]!.id, all[1]!.id])).toBe(2);
    expect(s.reminders.list()).toHaveLength(1);
  });
});

describe('RoutineService — F11 routines', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => (s = setup()));

  it('creates a routine and persists its child schedules', () => {
    const routine = s.routines.create({
      title: 'Focus Session',
      enabled: true,
      config: { type: 'pomodoro', workMinutes: 25, breakMinutes: 5, cycles: 2, startAt: NOW },
    });
    expect(routine.children.length).toBeGreaterThanOrEqual(3);
    expect(routine.children.every((c) => c.routineId === routine.id)).toBe(true);
  });

  it('hides routine children from the standalone reminders list', () => {
    s.reminders.create(dailyInput('Standalone'));
    s.routines.create({
      title: 'Hydration',
      enabled: true,
      config: { type: 'hydration', everyMinutes: 60, startAt: NOW },
    });
    const top = s.reminders.list();
    expect(top).toHaveLength(1);
    expect(top[0]!.title).toBe('Standalone');
  });

  it('deleting a routine removes all schedules it owns', () => {
    const routine = s.routines.create({
      title: 'Hydration',
      enabled: true,
      config: { type: 'hydration', everyMinutes: 60, startAt: NOW },
    });
    expect(s.repo.listReminders({ includeRoutineChildren: true })).toHaveLength(1);
    s.routines.delete(routine.id);
    expect(s.repo.listReminders({ includeRoutineChildren: true })).toHaveLength(0);
    expect(s.routines.list()).toHaveLength(0);
  });

  it('disabling a routine disables all its children', () => {
    const routine = s.routines.create({
      title: 'Hydration',
      enabled: true,
      config: { type: 'hydration', everyMinutes: 60, startAt: NOW },
    });
    s.routines.setEnabled(routine.id, false);
    const children = s.repo.listReminders({ includeRoutineChildren: true });
    expect(children.every((c) => c.enabled === false && c.nextFireAt === null)).toBe(true);
  });
});
