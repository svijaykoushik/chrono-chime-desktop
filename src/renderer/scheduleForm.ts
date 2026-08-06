import { DateTime } from 'luxon';
import type { ScheduleRule } from '../shared/schedule';

export type ScheduleKind = 'once' | 'interval' | 'hourly' | 'daily' | 'weekly' | 'monthly';

/**
 * "Starting now" (relative to the current time, drift-free interval) vs.
 * "On the clock" (anchored to wall-clock calendar positions).
 */
export type ScheduleMode = 'relative' | 'clock';

export interface ScheduleForm {
  mode: ScheduleMode;
  kind: ScheduleKind;
  /** datetime-local string for 'once'. */
  at: string;
  /** interval amount + unit. */
  intervalAmount: number;
  intervalUnit: 'minutes' | 'hours';
  /** HH:mm time-of-day for daily/weekly/monthly. */
  atTime: string;
  /** selected weekdays (ISO 1..7) for weekly. */
  weekdays: number[];
  /** day of month for monthly. */
  monthDay: number;
}

export const defaultScheduleForm = (): ScheduleForm => ({
  mode: 'clock',
  kind: 'daily',
  at: DateTime.now().plus({ minutes: 30 }).toFormat("yyyy-MM-dd'T'HH:mm"),
  intervalAmount: 25,
  intervalUnit: 'minutes',
  atTime: '09:00',
  weekdays: [1],
  monthDay: 1,
});

/** Converts the UI form into a validated-shape ScheduleRule. */
export function buildRule(form: ScheduleForm, now: number): ScheduleRule {
  switch (form.kind) {
    case 'once':
      return { kind: 'once', at: form.at ? new Date(form.at).getTime() : now };
    case 'interval': {
      const unitMs = form.intervalUnit === 'hours' ? 3_600_000 : 60_000;
      return { kind: 'interval', everyMs: Math.max(1, form.intervalAmount) * unitMs, anchor: now };
    }
    case 'hourly':
      return { kind: 'calendar', freq: 'hourly', interval: 1 };
    case 'daily':
      return { kind: 'calendar', freq: 'daily', interval: 1, atTime: form.atTime };
    case 'weekly': {
      const days = (form.weekdays.length ? [...form.weekdays].sort((a, b) => a - b) : [1]) as [number, ...number[]];
      return { kind: 'calendar', freq: 'weekly', interval: 1, atTime: form.atTime, byWeekday: days };
    }
    case 'monthly':
      return { kind: 'calendar', freq: 'monthly', interval: 1, atTime: form.atTime, byMonthDay: form.monthDay };
  }
}

/** Schedule kinds available in "On the clock" mode (wall-clock anchored). */
export const CLOCK_KIND_OPTIONS: ReadonlyArray<{ value: ScheduleKind; label: string }> = [
  { value: 'hourly', label: 'Every hour' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

/** Time-format placeholders the user can insert into a message template (F8). */
export const TIME_FORMAT_SUGGESTIONS: ReadonlyArray<{ token: string; label: string }> = [
  { token: '[HH:mm]', label: '24-hour (14:05)' },
  { token: '[hh:mm tt]', label: '12-hour (02:05 PM)' },
  { token: '[HH:mm:ss]', label: 'With seconds (14:05:30)' },
];

/**
 * Reverse of {@link buildRule}: maps an existing rule back into editable form
 * state so a reminder can be loaded into the dialog for editing.
 */
export function ruleToForm(rule: ScheduleRule, tz: string): ScheduleForm {
  const base = defaultScheduleForm();
  switch (rule.kind) {
    case 'once':
      return {
        ...base,
        mode: 'clock',
        kind: 'once',
        at: DateTime.fromMillis(rule.at, { zone: tz }).toFormat("yyyy-MM-dd'T'HH:mm"),
      };
    case 'interval': {
      const wholeHours = rule.everyMs % 3_600_000 === 0;
      return {
        ...base,
        mode: 'relative',
        kind: 'interval',
        intervalAmount: wholeHours ? rule.everyMs / 3_600_000 : rule.everyMs / 60_000,
        intervalUnit: wholeHours ? 'hours' : 'minutes',
      };
    }
    case 'calendar':
      switch (rule.freq) {
        case 'hourly':
          return { ...base, mode: 'clock', kind: 'hourly' };
        case 'daily':
          return { ...base, mode: 'clock', kind: 'daily', atTime: rule.atTime ?? base.atTime };
        case 'weekly':
          return {
            ...base, mode: 'clock', kind: 'weekly',
            atTime: rule.atTime ?? base.atTime,
            weekdays: rule.byWeekday ? [...rule.byWeekday] : base.weekdays,
          };
        case 'monthly':
        case 'yearly':
          return {
            ...base, mode: 'clock', kind: 'monthly',
            atTime: rule.atTime ?? base.atTime,
            monthDay: rule.byMonthDay ?? base.monthDay,
          };
      }
  }
}

export const WEEKDAY_LABELS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];
