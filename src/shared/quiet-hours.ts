import { DateTime } from 'luxon';

export interface QuietHoursWindow {
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
};

/**
 * F10 — true when `at` falls inside the quiet-hours window. Supports overnight
 * windows that wrap past midnight (e.g. 22:00–06:00). End is exclusive.
 */
export function isWithinQuietHours(at: number, window: QuietHoursWindow, tz: string): boolean {
  const now = DateTime.fromMillis(at, { zone: tz });
  const minuteOfDay = now.hour * 60 + now.minute;
  const start = toMinutes(window.start);
  const end = toMinutes(window.end);

  if (start === end) return false; // empty window
  return start < end
    ? minuteOfDay >= start && minuteOfDay < end // same-day window
    : minuteOfDay >= start || minuteOfDay < end; // overnight wrap
}
