import { nextOccurrence } from '../recurrence/recurrence';
import { decideRecovery } from '../recurrence/recovery';
import type { Clock, FireEvent, ScheduledItem, SchedulerStore, TimerService } from './types';

export interface SchedulerDeps {
  store: SchedulerStore;
  clock: Clock;
  timer: TimerService;
  tz: string;
  notify: (event: FireEvent) => void;
  graceMs?: number;
}

/**
 * The central reliability component. Drives a SINGLE active timer aimed at the
 * soonest pending occurrence and recomputes everything after each fire, so the
 * sequence never accumulates drift. All scheduling math is delegated to the pure
 * recurrence engine; this class only orchestrates time, persistence, and notify.
 */
export class Scheduler {
  private timerHandle: number | null = null;
  private armedFor: number | null = null;

  constructor(private readonly deps: SchedulerDeps) {}

  /** Boot: recover missed items, compute fresh next-fire times, arm the timer. */
  start(): void {
    const now = this.deps.clock();
    for (const item of this.deps.store.listSchedulable()) {
      if (item.nextFireAt == null) {
        // Freshly created / re-enabled — compute its first occurrence.
        this.deps.store.update(item.id, { nextFireAt: nextOccurrence(item.rule, now, this.deps.tz) });
      } else if (item.nextFireAt <= now) {
        this.recover(item, now);
      }
    }
    this.arm();
  }

  /** Recompute the armed timer (call after any create/edit/enable/disable). */
  reschedule(): void {
    this.arm();
  }

  stop(): void {
    if (this.timerHandle != null) this.deps.timer.clear(this.timerHandle);
    this.timerHandle = null;
    this.armedFor = null;
  }

  /** The instant the timer is currently aimed at (null when idle). */
  nextWakeAt(): number | null {
    return this.armedFor;
  }

  private recover(item: ScheduledItem, now: number): void {
    const decision = decideRecovery({
      rule: item.rule,
      scheduledFor: item.nextFireAt!,
      now,
      tz: this.deps.tz,
      graceMs: this.deps.graceMs,
    });
    if (decision.type === 'fire-now') {
      this.deps.notify({ item, firedAt: now, missedCount: decision.missedCount });
      this.applyAfterFire(item, now, decision.deactivate);
    } else if (decision.type === 'skip') {
      this.deps.store.update(item.id, { enabled: false, nextFireAt: null });
    }
  }

  private fire(item: ScheduledItem, now: number): void {
    this.deps.notify({ item, firedAt: now, missedCount: 1 });
    this.applyAfterFire(item, now, item.rule.kind === 'once');
  }

  private applyAfterFire(item: ScheduledItem, now: number, deactivate: boolean): void {
    if (deactivate) {
      this.deps.store.update(item.id, { lastFireAt: now, nextFireAt: null, enabled: false });
    } else {
      this.deps.store.update(item.id, {
        lastFireAt: now,
        nextFireAt: nextOccurrence(item.rule, now, this.deps.tz),
      });
    }
  }

  private onTimer(): void {
    const now = this.deps.clock();
    for (const item of this.deps.store.listSchedulable()) {
      if (item.nextFireAt != null && item.nextFireAt <= now) this.fire(item, now);
    }
    this.arm();
  }

  private arm(): void {
    if (this.timerHandle != null) {
      this.deps.timer.clear(this.timerHandle);
      this.timerHandle = null;
      this.armedFor = null;
    }
    const now = this.deps.clock();
    let soonest: number | null = null;
    for (const item of this.deps.store.listSchedulable()) {
      if (item.nextFireAt != null && (soonest == null || item.nextFireAt < soonest)) {
        soonest = item.nextFireAt;
      }
    }
    if (soonest == null) return;
    this.armedFor = soonest;
    this.timerHandle = this.deps.timer.set(() => this.onTimer(), Math.max(0, soonest - now));
  }
}
