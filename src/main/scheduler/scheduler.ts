import { nextOccurrence } from '../recurrence/recurrence';
import { decideRecovery } from '../recurrence/recovery';
import { logger } from '../diagnostics/logger';
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
    logger.info('Scheduler', 'Scheduler start/restart initiated', { now });
    for (const item of this.deps.store.listSchedulable()) {
      const effectiveNext = item.snoozedUntil ?? item.nextFireAt;
      if (effectiveNext == null) {
        // Freshly created / re-enabled — compute its first occurrence.
        const next = nextOccurrence(item.rule, now, this.deps.tz);
        logger.debug('Scheduler', 'Calculating first occurrence for item', { itemId: item.id, ruleKind: item.rule.kind, next });
        this.deps.store.update(item.id, { nextFireAt: next });
      } else if (effectiveNext <= now) {
        this.recover(item, now);
      }
    }
    this.arm();
  }

  /** Recompute the armed timer (call after any create/edit/enable/disable). */
  reschedule(): void {
    logger.info('Scheduler', 'Reschedule requested');
    this.arm();
  }

  stop(): void {
    logger.info('Scheduler', 'Stopping scheduler timer');
    if (this.timerHandle != null) this.deps.timer.clear(this.timerHandle);
    this.timerHandle = null;
    this.armedFor = null;
  }

  /** The instant the timer is currently aimed at (null when idle). */
  nextWakeAt(): number | null {
    return this.armedFor;
  }

  private recover(item: ScheduledItem, now: number): void {
    const isSnoozed = item.snoozedUntil != null;
    const scheduledFor = item.snoozedUntil ?? item.nextFireAt!;
    const decision = decideRecovery({
      rule: isSnoozed ? { kind: 'once', at: scheduledFor } : item.rule,
      scheduledFor,
      now,
      tz: this.deps.tz,
      graceMs: this.deps.graceMs,
    });
    logger.warn('Scheduler', 'Missed occurrence recovery triggered', {
      itemId: item.id,
      scheduledFor,
      now,
      decisionType: decision.type,
      missedCount: 'missedCount' in decision ? decision.missedCount : undefined,
    });
    if (decision.type === 'fire-now') {
      this.deps.notify({ item, firedAt: now, missedCount: decision.missedCount });
      this.applyAfterFire(item, now, decision.deactivate || (isSnoozed && item.rule.kind === 'once'), isSnoozed);
    } else if (decision.type === 'skip') {
      logger.warn('Scheduler', 'Recovery decided to skip/deactivate item', { itemId: item.id });
      if (item.rule.kind === 'once') {
        this.deps.store.update(item.id, { nextFireAt: null, snoozedUntil: null, conclusion: 'missed', concludedAt: now });
      } else {
        const next = nextOccurrence(item.rule, now, this.deps.tz);
        this.deps.store.update(item.id, { snoozedUntil: null, nextFireAt: next });
      }
    }
  }

  private fire(item: ScheduledItem, now: number): void {
    const isSnoozed = item.snoozedUntil != null;
    const scheduledTime = item.snoozedUntil ?? item.nextFireAt;
    const drift = now - (scheduledTime || now);
    logger.info('Scheduler', 'Firing reminder', {
      itemId: item.id,
      scheduledTime,
      firedAt: now,
      driftMs: drift,
      isSnoozed,
    });
    this.deps.notify({ item, firedAt: now, missedCount: 1 });
    this.applyAfterFire(item, now, item.rule.kind === 'once', isSnoozed);
  }

  private applyAfterFire(item: ScheduledItem, now: number, deactivate: boolean, isSnoozed = false): void {
    if (deactivate) {
      logger.info('Scheduler', 'Concluding one-shot item after fire', { itemId: item.id });
      this.deps.store.update(item.id, {
        lastFireAt: now,
        nextFireAt: null,
        snoozedUntil: null,
        conclusion: 'fired',
        concludedAt: now,
      });
    } else {
      let next = item.nextFireAt;
      if (isSnoozed) {
        if (next == null || next <= now) {
          next = nextOccurrence(item.rule, now, this.deps.tz);
        }
      } else {
        next = nextOccurrence(item.rule, now, this.deps.tz);
      }
      logger.debug('Scheduler', 'Rescheduling recurring item', { itemId: item.id, next, isSnoozed });
      this.deps.store.update(item.id, {
        lastFireAt: now,
        nextFireAt: next,
        snoozedUntil: null,
      });
    }
  }

  private onTimer(): void {
    const now = this.deps.clock();
    const due = this.deps.store.listDueSchedulable
      ? this.deps.store.listDueSchedulable(now)
      : this.deps.store
          .listSchedulable()
          .filter((item) => {
            const at = item.snoozedUntil ?? item.nextFireAt;
            return at != null && at <= now;
          });
    for (const item of due) {
      this.fire(item, now);
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
    if (this.deps.store.getSoonestSchedulableTime) {
      soonest = this.deps.store.getSoonestSchedulableTime();
    } else {
      for (const item of this.deps.store.listSchedulable()) {
        const at = item.snoozedUntil ?? item.nextFireAt;
        if (at != null && (soonest == null || at < soonest)) {
          soonest = at;
        }
      }
    }
    if (soonest == null) {
      logger.debug('Scheduler', 'No active schedulable items; timer idle');
      return;
    }
    this.armedFor = soonest;
    const delay = Math.max(0, soonest - now);
    logger.info('Scheduler', 'Arming active timer', { soonest, delayMs: delay });
    this.timerHandle = this.deps.timer.set(() => this.onTimer(), delay);
  }
}
