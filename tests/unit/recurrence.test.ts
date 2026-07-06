import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { nextOccurrence } from '../../src/main/recurrence/recurrence';
import type { ScheduleRule } from '../../src/shared/schedule';
import { WEEKDAY, WEEKDAYS } from '../../src/shared/schedule';

const TZ = 'America/New_York';
const ms = (iso: string, zone = TZ) => DateTime.fromISO(iso, { zone }).toMillis();

describe('nextOccurrence — F2 once (specific-time)', () => {
  const rule: ScheduleRule = { kind: 'once', at: ms('2026-06-20T09:00') };

  it('returns the instant when asked from before it', () => {
    expect(nextOccurrence(rule, ms('2026-06-19T09:00'), TZ)).toBe(rule.at);
  });

  it('returns null once the instant has passed (deactivates)', () => {
    expect(nextOccurrence(rule, rule.at, TZ)).toBeNull();
    expect(nextOccurrence(rule, ms('2026-06-21T00:00'), TZ)).toBeNull();
  });
});

describe('nextOccurrence — F3 interval (drift-free)', () => {
  const anchor = ms('2026-06-16T08:00');
  const rule: ScheduleRule = { kind: 'interval', everyMs: 25 * 60_000, anchor };

  it('lands on the next lattice point strictly after `after`', () => {
    expect(nextOccurrence(rule, anchor, TZ)).toBe(anchor + 25 * 60_000);
  });

  it('does not drift when a fire was delivered late', () => {
    // We were due at anchor+25m but only ask 3 minutes late.
    const late = anchor + 25 * 60_000 + 3 * 60_000;
    // The next slot is still on the original lattice: anchor + 2*25m.
    expect(nextOccurrence(rule, late, TZ)).toBe(anchor + 2 * 25 * 60_000);
  });

  it('skips many missed slots to the immediate next one', () => {
    const after = anchor + 10.5 * 25 * 60_000;
    expect(nextOccurrence(rule, after, TZ)).toBe(anchor + 11 * 25 * 60_000);
  });
});

describe('nextOccurrence — F4 calendar', () => {
  it('daily at 09:00 stays at 09:00 local', () => {
    const rule: ScheduleRule = { kind: 'calendar', freq: 'daily', interval: 1, atTime: '09:00' };
    expect(nextOccurrence(rule, ms('2026-06-16T10:00'), TZ)).toBe(ms('2026-06-17T09:00'));
    expect(nextOccurrence(rule, ms('2026-06-16T08:00'), TZ)).toBe(ms('2026-06-16T09:00'));
  });

  it('daily preserves wall-clock time across a DST spring-forward', () => {
    // US DST begins 2026-03-08. 09:00 local stays 09:00 local on the 9th.
    const rule: ScheduleRule = { kind: 'calendar', freq: 'daily', interval: 1, atTime: '09:00' };
    const got = nextOccurrence(rule, ms('2026-03-08T10:00'), TZ)!;
    expect(DateTime.fromMillis(got, { zone: TZ }).toFormat('yyyy-MM-dd HH:mm')).toBe('2026-03-09 09:00');
  });

  it('every Monday at 08:00', () => {
    const rule: ScheduleRule = {
      kind: 'calendar', freq: 'weekly', interval: 1, atTime: '08:00',
      byWeekday: [WEEKDAY.MONDAY],
    };
    // 2026-06-16 is a Tuesday → next Monday is 2026-06-22.
    expect(nextOccurrence(rule, ms('2026-06-16T12:00'), TZ)).toBe(ms('2026-06-22T08:00'));
  });

  it('hourly fires on the next hour boundary', () => {
    const rule: ScheduleRule = { kind: 'calendar', freq: 'hourly', interval: 1 };
    expect(nextOccurrence(rule, ms('2026-06-16T10:30'), TZ)).toBe(ms('2026-06-16T11:00'));
  });

  it('monthly on the 15th at 09:00', () => {
    const rule: ScheduleRule = {
      kind: 'calendar', freq: 'monthly', interval: 1, byMonthDay: 15, atTime: '09:00',
    };
    expect(nextOccurrence(rule, ms('2026-06-16T00:00'), TZ)).toBe(ms('2026-07-15T09:00'));
  });

  it('monthly on the 31st skips months without a 31st', () => {
    const rule: ScheduleRule = {
      kind: 'calendar', freq: 'monthly', interval: 1, byMonthDay: 31, atTime: '09:00',
    };
    // From mid-Feb 2026, next 31st is March 31 (Feb has none).
    expect(nextOccurrence(rule, ms('2026-02-15T00:00'), TZ)).toBe(ms('2026-03-31T09:00'));
  });

  it('yearly on January 1st', () => {
    const rule: ScheduleRule = {
      kind: 'calendar', freq: 'yearly', interval: 1, byMonthDay: 1, atTime: '00:00',
    };
    // Approximate "Jan 1": from mid-2026, next is 2027-01-01.
    expect(nextOccurrence(rule, ms('2026-06-16T00:00'), TZ)).toBe(ms('2027-01-01T00:00'));
  });
});

describe('nextOccurrence — F6 advanced recurrence', () => {
  it('every weekday (Mon–Fri) at 09:00', () => {
    const rule: ScheduleRule = {
      kind: 'calendar', freq: 'daily', interval: 1, atTime: '09:00',
      byWeekday: [...WEEKDAYS],
    };
    // Friday 2026-06-19 after 10:00 → skip Sat/Sun → Monday 2026-06-22.
    expect(nextOccurrence(rule, ms('2026-06-19T10:00'), TZ)).toBe(ms('2026-06-22T09:00'));
  });

  it('every other month (interval 2) on the 1st', () => {
    const rule: ScheduleRule = {
      kind: 'calendar', freq: 'monthly', interval: 2, byMonthDay: 1, atTime: '09:00',
      anchor: ms('2026-06-01T09:00'),
    };
    // Anchored to June; valid months are Jun, Aug, Oct… → from June 1 10:00, next is August 1.
    const got = nextOccurrence(rule, ms('2026-06-01T10:00'), TZ)!;
    expect(DateTime.fromMillis(got, { zone: TZ }).toFormat('yyyy-MM-dd')).toBe('2026-08-01');
  });

  it('first Monday of every month at 08:00', () => {
    const rule: ScheduleRule = {
      kind: 'calendar', freq: 'monthly', interval: 1, atTime: '08:00',
      byWeekday: [WEEKDAY.MONDAY], bySetPos: 1,
    };
    // First Monday of July 2026 is the 6th.
    expect(nextOccurrence(rule, ms('2026-06-16T00:00'), TZ)).toBe(ms('2026-07-06T08:00'));
  });

  it('second Monday of every month at 08:00', () => {
    const rule: ScheduleRule = {
      kind: 'calendar', freq: 'monthly', interval: 1, atTime: '08:00',
      byWeekday: [WEEKDAY.MONDAY], bySetPos: 2,
    };
    // Second Monday of June 2026 is the 8th — still ahead of the 1st.
    expect(nextOccurrence(rule, ms('2026-06-01T00:00'), TZ)).toBe(ms('2026-06-08T08:00'));
  });

  it('last Monday of every month (bySetPos -1)', () => {
    const rule: ScheduleRule = {
      kind: 'calendar', freq: 'monthly', interval: 1, atTime: '08:00',
      byWeekday: [WEEKDAY.MONDAY], bySetPos: -1,
    };
    // Last Monday of June 2026 is the 29th.
    expect(nextOccurrence(rule, ms('2026-06-16T00:00'), TZ)).toBe(ms('2026-06-29T08:00'));
  });

  it('every other year on January 1st (interval 2)', () => {
    const rule: ScheduleRule = {
      kind: 'calendar', freq: 'yearly', interval: 2, byMonthDay: 1, atTime: '00:00',
      anchor: ms('2026-01-01T00:00'),
    };
    const got = nextOccurrence(rule, ms('2026-06-16T00:00'), TZ)!;
    // From 2026 anchor, next on the 2-year lattice is 2028-01-01.
    expect(DateTime.fromMillis(got, { zone: TZ }).year).toBe(2028);
  });
});
