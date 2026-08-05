import { describe, it, expect } from 'vitest';
import { reminderStatus } from '../../src/shared/reminder-status';
import type { Reminder } from '../../src/shared/reminder';

describe('reminderStatus helper', () => {
  const baseReminder = (): Reminder => ({
    id: '1',
    title: 'Test',
    enabled: true,
    rule: { kind: 'once', at: 1000 },
    notification: { sound: { kind: 'default' }, vibrate: false },
    nextFireAt: 1000,
    lastFireAt: null,
    routineId: null,
    createdAt: 500,
    updatedAt: 500,
    conclusion: null,
    concludedAt: null,
  });

  it('is scheduled when enabled and not concluded', () => {
    const r = baseReminder();
    expect(reminderStatus(r)).toBe('scheduled');
  });

  it('is off when disabled and not concluded', () => {
    const r = baseReminder();
    r.enabled = false;
    expect(reminderStatus(r)).toBe('off');
  });

  it('is done when conclusion is fired', () => {
    const r = baseReminder();
    r.conclusion = 'fired';
    expect(reminderStatus(r)).toBe('done');
  });

  it('is missed when conclusion is missed', () => {
    const r = baseReminder();
    r.conclusion = 'missed';
    expect(reminderStatus(r)).toBe('missed');
  });
});
