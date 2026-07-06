import { z } from 'zod';

/**
 * Weekday numbering follows Luxon / ISO-8601: Monday = 1 … Sunday = 7.
 */
export const WEEKDAY = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
} as const;

export const WEEKDAYS = [1, 2, 3, 4, 5] as const; // Mon–Fri

/** "HH:mm" 24-hour time-of-day, e.g. "09:00", "23:59". */
export const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'expected HH:mm');

/** F2 — Specific-time: fire once at an absolute instant, then deactivate. */
export const onceRuleSchema = z.object({
  kind: z.literal('once'),
  at: z.number().int(), // epoch ms
});

/** F3 — Relative interval: every `everyMs` from an immutable `anchor` (drift-free). */
export const intervalRuleSchema = z.object({
  kind: z.literal('interval'),
  everyMs: z.number().int().positive(),
  anchor: z.number().int(), // epoch ms; the start of the lattice
});

/** F4 + F6 — Calendar / advanced recurrence aligned to calendar boundaries. */
export const calendarRuleSchema = z.object({
  kind: z.literal('calendar'),
  freq: z.enum(['hourly', 'daily', 'weekly', 'monthly', 'yearly']),
  /** "every N units"; N=1 normal, N=2 => "every other" (F6). */
  interval: z.number().int().positive().default(1),
  /**
   * Reference instant (epoch ms) defining the start of the recurrence and the
   * parity for interval > 1 (e.g. which months count for "every other month").
   * Optional; when omitted, interval is treated as 1-aligned from any period.
   */
  anchor: z.number().int().optional(),
  /** time-of-day anchor for daily/weekly/monthly/yearly. */
  atTime: timeOfDaySchema.optional(),
  /** weekday filter (1=Mon..7=Sun): "every Monday", "every weekday" (F4/F6). */
  byWeekday: z.array(z.number().int().min(1).max(7)).nonempty().optional(),
  /** set position within the period: 1=first, 2=second, -1=last (F6). */
  bySetPos: z.number().int().optional(),
  /** day of month, 1..31: "on the 15th" (F4). */
  byMonthDay: z.number().int().min(1).max(31).optional(),
});

export const scheduleRuleSchema = z.discriminatedUnion('kind', [
  onceRuleSchema,
  intervalRuleSchema,
  calendarRuleSchema,
]);

export type OnceRule = z.infer<typeof onceRuleSchema>;
export type IntervalRule = z.infer<typeof intervalRuleSchema>;
export type CalendarRule = z.infer<typeof calendarRuleSchema>;
export type ScheduleRule = z.infer<typeof scheduleRuleSchema>;
