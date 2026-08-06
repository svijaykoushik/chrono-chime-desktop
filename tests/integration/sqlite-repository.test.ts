import { describe, it, expect, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { SqliteRepository } from '../../src/main/store/sqlite-repository';
import type { Reminder } from '../../src/shared/reminder';

const tmpFiles: string[] = [];
afterEach(() => {
  for (const f of tmpFiles) rmSync(f, { force: true });
  tmpFiles.length = 0;
});

let seq = 0;
function tmpPath() {
  const p = join(tmpdir(), `chrono-test-${process.pid}-${++seq}.db`);
  tmpFiles.push(p);
  return p;
}

function reminder(over: Partial<Reminder> = {}): Reminder {
  return {
    id: 'r1',
    title: 'Standup',
    message: undefined,
    enabled: true,
    rule: { kind: 'calendar', freq: 'daily', interval: 1, atTime: '09:00' },
    notification: { sound: { kind: 'default' }, vibrate: false },
    nextFireAt: 1_000,
    lastFireAt: null,
    routineId: null,
    createdAt: 1,
    updatedAt: 1,
    conclusion: null,
    concludedAt: null,
    ...over,
  };
}

describe('SqliteRepository — persistence layer', () => {
  it('round-trips a reminder through SQLite', () => {
    const repo = new SqliteRepository(':memory:');
    repo.insertReminder(reminder());
    const got = repo.getReminder('r1')!;
    expect(got.title).toBe('Standup');
    expect(got.enabled).toBe(true);
    expect(got.rule).toEqual({ kind: 'calendar', freq: 'daily', interval: 1, atTime: '09:00' });
    repo.close();
  });

  it('excludes routine children from the default reminder list', () => {
    const repo = new SqliteRepository(':memory:');
    repo.insertReminder(reminder({ id: 'top', routineId: null }));
    repo.insertReminder(reminder({ id: 'child', routineId: 'routine-1' }));
    expect(repo.listReminders().map((r) => r.id)).toEqual(['top']);
    expect(repo.listReminders({ includeRoutineChildren: true })).toHaveLength(2);
    repo.close();
  });

  it('searches by title (case-insensitive)', () => {
    const repo = new SqliteRepository(':memory:');
    repo.insertReminder(reminder({ id: 'a', title: 'Morning Standup' }));
    repo.insertReminder(reminder({ id: 'b', title: 'Lunch' }));
    expect(repo.listReminders({ query: 'stand' }).map((r) => r.id)).toEqual(['a']);
    repo.close();
  });

  it('updates and deletes reminders', () => {
    const repo = new SqliteRepository(':memory:');
    repo.insertReminder(reminder());
    repo.updateReminder('r1', { enabled: false, nextFireAt: null });
    const got = repo.getReminder('r1')!;
    expect(got.enabled).toBe(false);
    expect(got.nextFireAt).toBeNull();
    expect(repo.deleteReminders(['r1'])).toBe(1);
    expect(repo.getReminder('r1')).toBeUndefined();
    repo.close();
  });

  it('cascades routine deletion to its children', () => {
    const repo = new SqliteRepository(':memory:');
    repo.insertRoutine({ id: 'rt', title: 'Focus', type: 'pomodoro', enabled: true, config: {}, createdAt: 1 });
    repo.insertReminder(reminder({ id: 'c1', routineId: 'rt' }));
    repo.insertReminder(reminder({ id: 'c2', routineId: 'rt' }));
    expect(repo.deleteRoutine('rt')).toBe(1);
    expect(repo.listReminders({ includeRoutineChildren: true })).toHaveLength(0);
    expect(repo.listRoutines()).toHaveLength(0);
    repo.close();
  });

  it('persists data across a simulated restart (F14 durability)', () => {
    const path = tmpPath();
    const first = new SqliteRepository(path);
    first.insertReminder(reminder({ id: 'survivor', title: 'Take medication' }));
    first.close();

    const second = new SqliteRepository(path);
    const got = second.getReminder('survivor')!;
    expect(got.title).toBe('Take medication');
    expect(got.enabled).toBe(true);
    second.close();
  });
});
