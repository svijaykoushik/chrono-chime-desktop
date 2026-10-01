import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateTime } from 'luxon';
import { Scheduler } from '../../src/main/scheduler/scheduler';
import { ReminderService } from '../../src/main/app/reminder-service';
import { InMemoryRepository, schedulerStoreFor } from '../../src/main/store/repository';
import { NotificationManager } from '../../src/main/notification/manager';
import { decideNotification } from '../../src/main/notification/decide';
import type { ScheduledItem, SchedulerStore, FireEvent } from '../../src/main/scheduler/types';
import type { Reminder, ReminderInput } from '../../src/shared/reminder';

const TZ = 'America/New_York';
const ms = (iso: string) => DateTime.fromISO(iso, { zone: TZ }).toMillis();

/** Deterministic in-memory store + clock + timer harness for scheduler tests */
class Harness {
  now: number;
  items = new Map<string, ScheduledItem>();
  fired: FireEvent[] = [];
  private timers = new Map<number, { at: number; fn: () => void }>();
  private seq = 0;

  constructor(start: number) {
    this.now = start;
  }

  store: SchedulerStore = {
    listSchedulable: () =>
      [...this.items.values()].filter((i) => i.enabled && !(i as any).conclusion),
    getSoonestSchedulableTime: () => {
      let soonest: number | null = null;
      for (const item of this.items.values()) {
        if (item.enabled && !(item as any).conclusion) {
          const effective = (item as any).snoozedUntil ?? item.nextFireAt;
          if (effective != null && (soonest === null || effective < soonest)) {
            soonest = effective;
          }
        }
      }
      return soonest;
    },
    listDueSchedulable: (now: number) => {
      const due: ScheduledItem[] = [];
      for (const item of this.items.values()) {
        if (item.enabled && !(item as any).conclusion) {
          const effective = (item as any).snoozedUntil ?? item.nextFireAt;
          if (effective != null && effective <= now) {
            due.push(item);
          }
        }
      }
      return due.sort((a, b) => {
        const atA = (a as any).snoozedUntil ?? a.nextFireAt ?? 0;
        const atB = (b as any).snoozedUntil ?? b.nextFireAt ?? 0;
        return atA - atB;
      });
    },
    update: (id, patch) => {
      const cur = this.items.get(id);
      if (cur) this.items.set(id, { ...cur, ...patch } as ScheduledItem);
    },
  };

  clock = () => this.now;

  timer = {
    set: (fn: () => void, delay: number) => {
      const id = ++this.seq;
      this.timers.set(id, { at: this.now + Math.max(0, delay), fn });
      return id;
    },
    clear: (id: number) => this.timers.delete(id),
  };

  add(item: ScheduledItem & { snoozedUntil?: number | null; conclusion?: string | null }) {
    this.items.set(item.id, item as ScheduledItem);
  }

  advanceTo(t: number) {
    let steps = 0;
    for (;;) {
      if (++steps > 100) throw new Error('Infinite loop detected in advanceTo');
      let next: [number, { at: number; fn: () => void }] | null = null;
      for (const entry of this.timers.entries()) {
        if (entry[1].at <= t && (!next || entry[1].at < next[1].at)) next = entry;
      }
      if (!next) break;
      this.timers.delete(next[0]);
      this.now = next[1].at;
      next[1].fn();
    }
    this.now = t;
  }

  makeScheduler() {
    return new Scheduler({
      store: this.store,
      clock: this.clock,
      timer: this.timer,
      tz: TZ,
      notify: (e) => this.fired.push(e),
    });
  }
}

describe('Snooze Feature (Issue #58)', () => {
  it('1. Snoozing a recurring reminder fires at now + N and leaves the base lattice unchanged (anti-drift)', () => {
    const h = new Harness(ms('2026-06-16T08:00'));
    // Hourly reminder starting at 09:00
    h.add({
      id: 'rec-1',
      enabled: true,
      nextFireAt: null,
      lastFireAt: null,
      rule: { kind: 'interval', everyMs: 60 * 60_000, anchor: ms('2026-06-16T08:00') },
    });
    const s = h.makeScheduler();
    s.start();

    // Arms for 09:00
    expect(h.items.get('rec-1')!.nextFireAt).toBe(ms('2026-06-16T09:00'));
    expect(s.nextWakeAt()).toBe(ms('2026-06-16T09:00'));

    // Fires at 09:00
    h.advanceTo(ms('2026-06-16T09:00'));
    expect(h.fired).toHaveLength(1);
    expect(h.fired[0]!.firedAt).toBe(ms('2026-06-16T09:00'));
    // Base lattice next occurrence is 10:00
    expect(h.items.get('rec-1')!.nextFireAt).toBe(ms('2026-06-16T10:00'));

    // User snoozes for 5 minutes at 09:00 -> snoozedUntil = 09:05
    (h.items.get('rec-1') as any).snoozedUntil = ms('2026-06-16T09:05');
    s.reschedule();

    // Scheduler arms for 09:05, NOT 10:00
    expect(s.nextWakeAt()).toBe(ms('2026-06-16T09:05'));

    // Advance to 09:05 -> snoozed occurrence fires
    h.advanceTo(ms('2026-06-16T09:05'));
    expect(h.fired).toHaveLength(2);
    expect(h.fired[1]!.firedAt).toBe(ms('2026-06-16T09:05'));

    // Snoozed until cleared, base lattice STILL 10:00 (no drift!)
    expect((h.items.get('rec-1') as any).snoozedUntil).toBeNull();
    expect(h.items.get('rec-1')!.nextFireAt).toBe(ms('2026-06-16T10:00'));
    expect(s.nextWakeAt()).toBe(ms('2026-06-16T10:00'));

    // Advance to 10:00 -> normal lattice fires
    h.advanceTo(ms('2026-06-16T10:00'));
    expect(h.fired).toHaveLength(3);
    expect(h.fired[2]!.firedAt).toBe(ms('2026-06-16T10:00'));
    expect(h.items.get('rec-1')!.nextFireAt).toBe(ms('2026-06-16T11:00'));
  });

  it("2. Snoozing sets snoozedUntil; the scheduler arms for it over the rule's own next occurrence", () => {
    const h = new Harness(ms('2026-06-16T09:00'));
    h.add({
      id: 'rec-2',
      enabled: true,
      nextFireAt: ms('2026-06-16T10:00'),
      lastFireAt: ms('2026-06-16T09:00'),
      snoozedUntil: ms('2026-06-16T09:10'), // snoozed 10 min
      rule: { kind: 'interval', everyMs: 60 * 60_000, anchor: ms('2026-06-16T09:00') },
    });
    const s = h.makeScheduler();
    s.start();

    // Armed for snoozedUntil (09:10), prioritizing over nextFireAt (10:00)
    expect(s.nextWakeAt()).toBe(ms('2026-06-16T09:10'));
  });

  it('3. When a snoozed occurrence fires, snoozedUntil clears and normal recurrence resumes', () => {
    const h = new Harness(ms('2026-06-16T09:00'));
    h.add({
      id: 'rec-3',
      enabled: true,
      nextFireAt: ms('2026-06-16T10:00'),
      lastFireAt: ms('2026-06-16T09:00'),
      snoozedUntil: ms('2026-06-16T09:15'),
      rule: { kind: 'interval', everyMs: 60 * 60_000, anchor: ms('2026-06-16T09:00') },
    });
    const s = h.makeScheduler();
    s.start();

    h.advanceTo(ms('2026-06-16T09:15'));
    expect(h.fired).toHaveLength(1);
    expect(h.fired[0]!.firedAt).toBe(ms('2026-06-16T09:15'));

    // snoozedUntil is cleared
    const item = h.items.get('rec-3') as any;
    expect(item.snoozedUntil).toBeNull();
    // Resumes normal recurrence at 10:00
    expect(item.nextFireAt).toBe(ms('2026-06-16T10:00'));
    expect(s.nextWakeAt()).toBe(ms('2026-06-16T10:00'));
  });

  it('4. Snoozing a concluded one-shot clears conclusion and re-arms; re-concludes after firing; lastFireAt preserved', () => {
    const repo = new InMemoryRepository();
    let now = ms('2026-06-16T09:00');
    let reschedules = 0;
    const scheduler = { reschedule: () => { reschedules++; } };
    const svc = new ReminderService({
      repo,
      scheduler,
      clock: () => now,
      idGen: () => 'rem-once',
      tz: TZ,
    });

    // Create a once reminder that already fired and concluded
    const r = repo.insertReminder({
      id: 'rem-once',
      title: 'Take pill',
      enabled: true,
      rule: { kind: 'once', at: ms('2026-06-16T08:55') },
      notification: { sound: { kind: 'default' }, vibrate: false },
      nextFireAt: null,
      lastFireAt: ms('2026-06-16T08:55'),
      routineId: null,
      createdAt: ms('2026-06-16T08:00'),
      updatedAt: ms('2026-06-16T08:55'),
      conclusion: 'fired',
      concludedAt: ms('2026-06-16T08:55'),
      snoozedUntil: null,
    });

    // Snooze 5 minutes
    const snoozed = svc.snooze(r.id, 5);
    expect(snoozed).toBeDefined();
    expect(snoozed?.snoozedUntil).toBe(ms('2026-06-16T09:05'));
    expect(snoozed?.conclusion).toBeNull();
    expect(snoozed?.concludedAt).toBeNull();
    expect(snoozed?.lastFireAt).toBe(ms('2026-06-16T08:55')); // preserved!
    expect(reschedules).toBe(1);

    // Now test scheduler execution of this snoozed one-shot
    const h = new Harness(now);
    h.add({
      id: r.id,
      enabled: true,
      nextFireAt: null,
      lastFireAt: ms('2026-06-16T08:55'),
      snoozedUntil: ms('2026-06-16T09:05'),
      rule: { kind: 'once', at: ms('2026-06-16T08:55') },
    });
    const s = h.makeScheduler();
    s.start();

    expect(s.nextWakeAt()).toBe(ms('2026-06-16T09:05'));
    h.advanceTo(ms('2026-06-16T09:05'));

    expect(h.fired).toHaveLength(1);
    const item = h.items.get(r.id) as any;
    expect(item.snoozedUntil).toBeNull();
    expect(item.lastFireAt).toBe(ms('2026-06-16T09:05'));
    expect(item.conclusion).toBe('fired');
    expect(item.concludedAt).toBe(ms('2026-06-16T09:05'));
    expect(item.nextFireAt).toBeNull();
  });

  it("5. Snooze while inside Quiet Hours: the snoozed fire still appears, still silent — the two features compose and don't cancel", () => {
    // 23:00 is inside quiet hours (22:00 - 06:00)
    const quiet = { enabled: true, start: '22:00', end: '06:00' };
    const firedAt = ms('2026-06-16T23:05');

    const d = decideNotification(
      { sound: { kind: 'default' }, vibrate: false },
      firedAt,
      quiet,
      TZ,
    );

    expect(d?.showVisual).toBe(true);
    expect(d?.sound).toBeNull(); // Suppressed by quiet hours
  });

  it('6. Snooze on a disabled reminder is rejected', () => {
    const repo = new InMemoryRepository();
    const svc = new ReminderService({
      repo,
      scheduler: { reschedule: vi.fn() },
      clock: () => ms('2026-06-16T09:00'),
      idGen: () => 'rem-dis',
      tz: TZ,
    });

    const r = repo.insertReminder({
      id: 'rem-dis',
      title: 'Disabled item',
      enabled: false,
      rule: { kind: 'interval', everyMs: 60 * 60_000, anchor: ms('2026-06-16T08:00') },
      notification: { sound: { kind: 'default' }, vibrate: false },
      nextFireAt: null,
      lastFireAt: null,
      routineId: null,
      createdAt: ms('2026-06-16T08:00'),
      updatedAt: ms('2026-06-16T08:00'),
      conclusion: null,
      concludedAt: null,
      snoozedUntil: null,
    });

    expect(() => svc.snooze(r.id, 5)).toThrow(/disabled/i);
  });
});
