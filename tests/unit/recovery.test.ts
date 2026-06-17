import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { decideRecovery, DEFAULT_GRACE_MS } from '../../src/main/recurrence/recovery';
import type { ScheduleRule } from '../../src/shared/schedule';

const TZ = 'America/New_York';
const ms = (iso: string) => DateTime.fromISO(iso, { zone: TZ }).toMillis();

describe('decideRecovery — F14 missed-occurrence policy', () => {
  it('on-time when the scheduled fire is still in the future', () => {
    const rule: ScheduleRule = { kind: 'once', at: ms('2026-06-20T09:00') };
    const d = decideRecovery({ rule, scheduledFor: rule.at, now: ms('2026-06-19T09:00'), tz: TZ });
    expect(d.type).toBe('on-time');
  });

  describe('one-shot (once)', () => {
    const rule: ScheduleRule = { kind: 'once', at: ms('2026-06-20T09:00') };

    it('fires once when missed within the grace window, then deactivates', () => {
      const now = rule.at + DEFAULT_GRACE_MS - 1;
      const d = decideRecovery({ rule, scheduledFor: rule.at, now, tz: TZ });
      expect(d).toMatchObject({ type: 'fire-now', missedCount: 1, deactivate: true });
    });

    it('skips (marks missed) when older than the grace window, then deactivates', () => {
      const now = rule.at + DEFAULT_GRACE_MS + 60_000;
      const d = decideRecovery({ rule, scheduledFor: rule.at, now, tz: TZ });
      expect(d).toMatchObject({ type: 'skip', reason: 'expired', deactivate: true });
    });
  });

  describe('recurring', () => {
    // every 25 minutes, anchored at 08:00
    const rule: ScheduleRule = { kind: 'interval', everyMs: 25 * 60_000, anchor: ms('2026-06-16T08:00') };

    it('coalesces many missed occurrences into a single catch-up, stays active', () => {
      const scheduledFor = ms('2026-06-16T08:25'); // first missed slot
      const now = ms('2026-06-16T10:00'); // ~3.75 intervals later
      const d = decideRecovery({ rule, scheduledFor, now, tz: TZ });
      expect(d.type).toBe('fire-now');
      if (d.type === 'fire-now') {
        expect(d.missedCount).toBeGreaterThan(1);
        expect(d.deactivate).toBe(false);
      }
    });

    it('fires the single due occurrence when only one was missed', () => {
      const scheduledFor = ms('2026-06-16T08:25');
      const now = scheduledFor + 60_000; // 1 minute late, before the next slot
      const d = decideRecovery({ rule, scheduledFor, now, tz: TZ });
      expect(d).toMatchObject({ type: 'fire-now', missedCount: 1, deactivate: false });
    });
  });
});
