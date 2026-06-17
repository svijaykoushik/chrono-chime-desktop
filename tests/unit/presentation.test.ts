import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { describeRule } from '../../src/shared/describe-rule';
import { renderTemplate } from '../../src/shared/template';
import { isWithinQuietHours } from '../../src/shared/quiet-hours';
import type { ScheduleRule } from '../../src/shared/schedule';
import { WEEKDAY, WEEKDAYS } from '../../src/shared/schedule';

const TZ = 'America/New_York';
const ms = (iso: string) => DateTime.fromISO(iso, { zone: TZ }).toMillis();

describe('describeRule — F5 human-friendly summaries', () => {
  it('once', () => {
    expect(describeRule({ kind: 'once', at: ms('2026-06-20T09:00') }, TZ)).toBe('On June 20, 2026 at 9:00 AM');
  });
  it('interval', () => {
    expect(describeRule({ kind: 'interval', everyMs: 25 * 60_000, anchor: 0 }, TZ)).toBe('Every 25 minutes');
    expect(describeRule({ kind: 'interval', everyMs: 3 * 3600_000, anchor: 0 }, TZ)).toBe('Every 3 hours');
  });
  it('hourly', () => {
    expect(describeRule({ kind: 'calendar', freq: 'hourly', interval: 1 }, TZ)).toBe('Every hour');
  });
  it('daily at time', () => {
    expect(describeRule({ kind: 'calendar', freq: 'daily', interval: 1, atTime: '09:00' }, TZ)).toBe('Every day at 9:00 AM');
  });
  it('weekly on Monday', () => {
    expect(
      describeRule({ kind: 'calendar', freq: 'weekly', interval: 1, atTime: '08:00', byWeekday: [WEEKDAY.MONDAY] }, TZ),
    ).toBe('Every Monday at 8:00 AM');
  });
  it('every weekday', () => {
    expect(
      describeRule({ kind: 'calendar', freq: 'daily', interval: 1, atTime: '09:00', byWeekday: [...WEEKDAYS] }, TZ),
    ).toBe('Every weekday at 9:00 AM');
  });
  it('monthly on the 15th', () => {
    expect(
      describeRule({ kind: 'calendar', freq: 'monthly', interval: 1, byMonthDay: 15, atTime: '09:00' }, TZ),
    ).toBe('Every month on the 15th at 9:00 AM');
  });
  it('every other month', () => {
    expect(
      describeRule({ kind: 'calendar', freq: 'monthly', interval: 2, byMonthDay: 1, atTime: '09:00' }, TZ),
    ).toBe('Every 2 months on the 1st at 9:00 AM');
  });
  it('first Monday of every month', () => {
    expect(
      describeRule({ kind: 'calendar', freq: 'monthly', interval: 1, byWeekday: [WEEKDAY.MONDAY], bySetPos: 1, atTime: '08:00' }, TZ),
    ).toBe('The first Monday of every month at 8:00 AM');
  });
  it('last Monday of every month', () => {
    expect(
      describeRule({ kind: 'calendar', freq: 'monthly', interval: 1, byWeekday: [WEEKDAY.MONDAY], bySetPos: -1, atTime: '08:00' }, TZ),
    ).toBe('The last Monday of every month at 8:00 AM');
  });
});

describe('renderTemplate — F8 message templates', () => {
  const at = ms('2026-06-20T14:05');
  it('renders [HH:mm] in 24h', () => {
    expect(renderTemplate('The time is [HH:mm]', at, TZ)).toBe('The time is 14:05');
  });
  it('renders [hh:mm tt] in 12h', () => {
    expect(renderTemplate('The time is [hh:mm tt]', at, TZ)).toBe('The time is 02:05 PM');
  });
  it('leaves text without placeholders untouched', () => {
    expect(renderTemplate('Stand up and stretch', at, TZ)).toBe('Stand up and stretch');
  });
});

describe('isWithinQuietHours — F10 (overnight wrap supported)', () => {
  const overnight = { start: '22:00', end: '06:00' };
  it('true inside an overnight window', () => {
    expect(isWithinQuietHours(ms('2026-06-16T23:00'), overnight, TZ)).toBe(true);
    expect(isWithinQuietHours(ms('2026-06-16T05:00'), overnight, TZ)).toBe(true);
  });
  it('false outside an overnight window', () => {
    expect(isWithinQuietHours(ms('2026-06-16T12:00'), overnight, TZ)).toBe(false);
  });
  it('handles a same-day window', () => {
    const daytime = { start: '13:00', end: '14:00' };
    expect(isWithinQuietHours(ms('2026-06-16T13:30'), daytime, TZ)).toBe(true);
    expect(isWithinQuietHours(ms('2026-06-16T15:00'), daytime, TZ)).toBe(false);
  });
});
