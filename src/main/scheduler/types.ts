import type { ScheduleRule } from '../../shared/schedule';

/** The minimal projection of a reminder the scheduler needs to operate. */
export interface ScheduledItem {
  id: string;
  rule: ScheduleRule;
  enabled: boolean;
  nextFireAt: number | null;
  lastFireAt: number | null;
}

/** Persistence seam — the scheduler never talks to SQLite directly. */
export interface SchedulerStore {
  /** All enabled, schedulable items (disabled items are excluded). */
  listSchedulable(): ScheduledItem[];
  update(
    id: string,
    patch: Partial<Pick<ScheduledItem, 'nextFireAt' | 'lastFireAt' | 'enabled'>>,
  ): void;
}

/** Injectable wall-clock — `() => epoch ms`. Real impl is `Date.now`. */
export type Clock = () => number;

/** Injectable timer service — real impl wraps setTimeout/clearTimeout. */
export interface TimerService {
  set(fn: () => void, ms: number): number;
  clear(handle: number): void;
}

export interface FireEvent {
  item: ScheduledItem;
  firedAt: number;
  /** Number of occurrences represented by this fire (>1 ⇒ coalesced catch-up). */
  missedCount: number;
}
