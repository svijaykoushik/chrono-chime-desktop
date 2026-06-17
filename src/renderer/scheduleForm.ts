import type { ScheduleRule } from '../shared/schedule';

export type ScheduleKind = 'once' | 'interval' | 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface ScheduleForm {
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
  kind: 'daily',
  at: '',
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

export const WEEKDAY_LABELS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];
