import { DateTime } from 'luxon';

/**
 * F8 — renders a notification message template, substituting bracketed time
 * placeholders with the fire time formatted per the device timezone.
 *
 * Supported tokens use Luxon-style format letters inside square brackets, plus
 * the human alias `tt` for the AM/PM marker:
 *   [HH:mm]      → "14:05"
 *   [hh:mm tt]   → "02:05 PM"
 */
export function renderTemplate(template: string, firedAt: number, tz: string): string {
  const dt = DateTime.fromMillis(firedAt, { zone: tz });
  return template.replace(/\[([^\]]+)\]/g, (_match, inner: string) => {
    const fmt = inner.replace(/tt/g, 'a');
    return dt.toFormat(fmt);
  });
}
