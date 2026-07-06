import { DateTime } from 'luxon';
import type { CalendarRule, ScheduleRule } from '../../shared/schedule';

/**
 * The single pure function at the heart of ChronoChime's reliability.
 *
 * Returns the next fire time (epoch ms) strictly AFTER `after`, or `null` when
 * no further occurrence exists. It is deterministic and side-effect free, so it
 * powers initial scheduling, post-fire rescheduling, and boot recovery alike.
 *
 * @param rule  the schedule definition
 * @param after epoch ms; the engine finds the first occurrence strictly later
 * @param tz    IANA timezone used for all calendar arithmetic (DST-aware)
 */
export function nextOccurrence(rule: ScheduleRule, after: number, tz: string): number | null {
  switch (rule.kind) {
    case 'once':
      return rule.at > after ? rule.at : null;

    case 'interval': {
      // Every fire derives from the immutable anchor lattice ⇒ no cumulative drift.
      const { anchor, everyMs } = rule;
      const k = Math.floor((after - anchor) / everyMs) + 1;
      return anchor + k * everyMs;
    }

    case 'calendar':
      return calendarNext(rule, after, tz);
  }
}

const MAX_STEPS = 4000; // safety cap; far beyond any realistic gap

function parseTime(atTime: string | undefined): { hour: number; minute: number } {
  if (!atTime) return { hour: 0, minute: 0 };
  const [h, m] = atTime.split(':');
  return { hour: Number(h), minute: Number(m) };
}

function calendarNext(rule: CalendarRule, after: number, tz: string): number | null {
  const afterDt = DateTime.fromMillis(after, { zone: tz });
  const anchorDt = rule.anchor != null ? DateTime.fromMillis(rule.anchor, { zone: tz }) : null;
  const interval = rule.interval ?? 1;
  const time = parseTime(rule.atTime);

  const passesAnchorBound = (c: DateTime) => !anchorDt || c >= anchorDt;
  const passesWeekday = (c: DateTime) => !rule.byWeekday || rule.byWeekday.includes(c.weekday);

  switch (rule.freq) {
    case 'hourly': {
      const base = afterDt.startOf('hour');
      for (let i = 0; i < MAX_STEPS; i++) {
        const c = base.plus({ hours: i });
        if (c <= afterDt) continue;
        if (interval > 1 && anchorDt) {
          const hours = Math.round(c.diff(anchorDt.startOf('hour'), 'hours').hours);
          if (hours % interval !== 0) continue;
        }
        if (!passesWeekday(c) || !passesAnchorBound(c)) continue;
        return c.toMillis();
      }
      return null;
    }

    case 'daily':
    case 'weekly': {
      const base = afterDt.startOf('day').set(time);
      const anchorUnit =
        rule.freq === 'weekly' ? anchorDt?.startOf('week') : anchorDt?.startOf('day');
      for (let i = 0; i < MAX_STEPS; i++) {
        const c = base.plus({ days: i });
        if (c <= afterDt) continue;
        if (!passesWeekday(c) || !passesAnchorBound(c)) continue;
        if (interval > 1 && anchorUnit) {
          const unit = rule.freq === 'weekly' ? 'weeks' : 'days';
          const ref = rule.freq === 'weekly' ? c.startOf('week') : c.startOf('day');
          const n = Math.round(ref.diff(anchorUnit, unit)[unit]);
          if (n % interval !== 0) continue;
        }
        return c.toMillis();
      }
      return null;
    }

    case 'monthly': {
      for (let i = 0; i < MAX_STEPS; i++) {
        const monthStart = afterDt.startOf('month').plus({ months: i });
        if (interval > 1 && anchorDt) {
          const anchorMonth = anchorDt.startOf('month');
          const months = (monthStart.year - anchorMonth.year) * 12 + (monthStart.month - anchorMonth.month);
          if (months % interval !== 0) continue;
        }
        const c = resolveMonthDay(monthStart, rule, time);
        if (!c) continue;
        if (c <= afterDt || !passesAnchorBound(c)) continue;
        return c.toMillis();
      }
      return null;
    }

    case 'yearly': {
      const month = anchorDt ? anchorDt.month : 1;
      for (let i = 0; i < MAX_STEPS; i++) {
        const yearStart = afterDt.startOf('year').plus({ years: i }).set({ month });
        if (interval > 1 && anchorDt) {
          if ((yearStart.year - anchorDt.year) % interval !== 0) continue;
        }
        const c = resolveMonthDay(yearStart.startOf('month'), rule, time);
        if (!c) continue;
        if (c <= afterDt || !passesAnchorBound(c)) continue;
        return c.toMillis();
      }
      return null;
    }
  }
}

/**
 * Resolves the concrete day within a month for a calendar rule and applies the
 * time-of-day. Returns null when the month has no matching day (e.g. the 31st
 * of February, or a non-existent nth weekday).
 */
function resolveMonthDay(
  monthStart: DateTime,
  rule: CalendarRule,
  time: { hour: number; minute: number },
): DateTime | null {
  const daysInMonth = monthStart.daysInMonth!;

  // nth / last weekday of the month (F6: "first Monday of every month")
  if (rule.bySetPos != null && rule.byWeekday && rule.byWeekday.length > 0) {
    const target = rule.byWeekday[0]!;
    let day: number;
    if (rule.bySetPos > 0) {
      const firstWeekday = monthStart.weekday;
      const offset = (target - firstWeekday + 7) % 7;
      day = 1 + offset + (rule.bySetPos - 1) * 7;
      if (day > daysInMonth) return null;
    } else {
      const monthEnd = monthStart.endOf('month');
      const offset = (monthEnd.weekday - target + 7) % 7;
      day = monthEnd.day - offset - (-rule.bySetPos - 1) * 7;
      if (day < 1) return null;
    }
    return monthStart.set({ day, ...time });
  }

  // specific day of month (F4: "on the 15th")
  const day = rule.byMonthDay ?? 1;
  if (day > daysInMonth) return null;
  return monthStart.set({ day, ...time });
}
