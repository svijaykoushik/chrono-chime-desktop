import { DateTime } from 'luxon';
import type { CalendarRule, ScheduleRule } from './schedule';

const WEEKDAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SETPOS_NAMES: Record<number, string> = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth', [-1]: 'last' };

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}

function formatTime(atTime?: string): string {
  if (!atTime) return '';
  const t = DateTime.fromFormat(atTime, 'HH:mm');
  return ` at ${t.toFormat('h:mm a')}`;
}

function isEveryWeekday(byWeekday?: number[]): boolean {
  if (!byWeekday || byWeekday.length !== 5) return false;
  const set = new Set(byWeekday);
  return [1, 2, 3, 4, 5].every((d) => set.has(d));
}

function describeInterval(everyMs: number): string {
  const minutes = Math.round(everyMs / 60_000);
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? 'Every hour' : `Every ${hours} hours`;
  }
  return minutes === 1 ? 'Every minute' : `Every ${minutes} minutes`;
}

function describeCalendar(rule: CalendarRule, tz: string): string {
  const time = formatTime(rule.atTime);
  const interval = rule.interval ?? 1;

  switch (rule.freq) {
    case 'hourly':
      return interval === 1 ? 'Every hour' : `Every ${interval} hours`;

    case 'daily':
      if (isEveryWeekday(rule.byWeekday)) return `Every weekday${time}`;
      return interval === 1 ? `Every day${time}` : `Every ${interval} days${time}`;

    case 'weekly': {
      const day = rule.byWeekday?.[0];
      const name = day ? WEEKDAY_NAMES[day] : 'week';
      const every = interval === 1 ? `Every ${name}` : `Every ${interval} weeks on ${name}`;
      return `${every}${time}`;
    }

    case 'monthly': {
      if (rule.bySetPos != null && rule.byWeekday?.[0]) {
        const pos = SETPOS_NAMES[rule.bySetPos] ?? ordinal(rule.bySetPos);
        const name = WEEKDAY_NAMES[rule.byWeekday[0]];
        return `The ${pos} ${name} of every month${time}`;
      }
      const day = ordinal(rule.byMonthDay ?? 1);
      const every = interval === 1 ? 'Every month' : `Every ${interval} months`;
      return `${every} on the ${day}${time}`;
    }

    case 'yearly': {
      const every = interval === 1 ? 'Every year' : `Every ${interval} years`;
      if (rule.anchor != null) {
        const month = DateTime.fromMillis(rule.anchor, { zone: tz }).toFormat('MMMM');
        return `${every} on ${month} ${ordinal(rule.byMonthDay ?? 1)}${time}`;
      }
      return `${every} on the ${ordinal(rule.byMonthDay ?? 1)}${time}`;
    }
  }
}

/**
 * F5 — produces a calm, human-readable summary of any schedule rule. No
 * technical scheduling jargon is ever exposed to the user.
 */
export function describeRule(rule: ScheduleRule, tz: string): string {
  switch (rule.kind) {
    case 'once':
      return `On ${DateTime.fromMillis(rule.at, { zone: tz }).toFormat("MMMM d, yyyy 'at' h:mm a")}`;
    case 'interval':
      return describeInterval(rule.everyMs);
    case 'calendar':
      return describeCalendar(rule, tz);
  }
}
