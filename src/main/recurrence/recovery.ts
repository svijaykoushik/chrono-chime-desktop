import type { ScheduleRule } from '../../shared/schedule';
import { nextOccurrence } from './recurrence';

/** Default grace window for delayed one-shot reminders (5 minutes). */
export const DEFAULT_GRACE_MS = 5 * 60_000;

export interface RecoveryInput {
  rule: ScheduleRule;
  /** The persisted next fire time that may now be in the past. */
  scheduledFor: number;
  now: number;
  tz: string;
  graceMs?: number;
}

export type RecoveryDecision =
  | { type: 'on-time' }
  | { type: 'fire-now'; missedCount: number; deactivate: boolean }
  | { type: 'skip'; reason: 'expired'; deactivate: boolean };

const MAX_COUNT = 10_000;

/**
 * F14 — decides what to do with a reminder whose scheduled fire time was missed
 * because the app was off, asleep, or delayed.
 *
 * Policy (approved in the design doc, §A.8):
 *  - One-shot missed within the grace window → fire once, then deactivate.
 *  - One-shot older than the grace window → skip (mark missed), then deactivate.
 *  - Recurring → fire at most ONE coalesced catch-up reporting how many were
 *    missed, then resume on the normal lattice. Never replay a backlog.
 */
export function decideRecovery(input: RecoveryInput): RecoveryDecision {
  const { rule, scheduledFor, now, tz } = input;
  const graceMs = input.graceMs ?? DEFAULT_GRACE_MS;

  if (scheduledFor > now) return { type: 'on-time' };

  if (rule.kind === 'once') {
    const delay = now - scheduledFor;
    return delay <= graceMs
      ? { type: 'fire-now', missedCount: 1, deactivate: true }
      : { type: 'skip', reason: 'expired', deactivate: true };
  }

  // Recurring: count missed occurrences in (scheduledFor - 1, now], coalesce to one fire.
  let missedCount = 0;
  let cursor = scheduledFor - 1;
  for (let i = 0; i < MAX_COUNT; i++) {
    const next = nextOccurrence(rule, cursor, tz);
    if (next === null || next > now) break;
    missedCount++;
    cursor = next;
  }
  if (missedCount === 0) return { type: 'on-time' };
  return { type: 'fire-now', missedCount, deactivate: false };
}
