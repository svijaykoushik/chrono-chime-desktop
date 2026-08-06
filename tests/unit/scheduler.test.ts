import { describe, it, expect, beforeEach } from 'vitest';
import { DateTime } from 'luxon';
import { Scheduler } from '../../src/main/scheduler/scheduler';
import type { ScheduledItem, SchedulerStore, FireEvent } from '../../src/main/scheduler/types';

const TZ = 'America/New_York';
const ms = (iso: string) => DateTime.fromISO(iso, { zone: TZ }).toMillis();

/** Deterministic in-memory store + clock + timer harness. */
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
    listSchedulable: () => [...this.items.values()].filter((i) => i.enabled && !(i as any).conclusion),
    update: (id, patch) => {
      const cur = this.items.get(id);
      if (cur) this.items.set(id, { ...cur, ...patch });
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

  add(item: ScheduledItem) {
    this.items.set(item.id, item);
  }

  /** Advance the clock to `t`, firing any timers due along the way. */
  advanceTo(t: number) {
    for (;;) {
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

describe('Scheduler — F1/F14 deterministic scheduling', () => {
  let h: Harness;
  beforeEach(() => {
    h = new Harness(ms('2026-06-16T08:00'));
  });

  it('arms the soonest item and fires it, then reschedules on the lattice', () => {
    h.add({ id: 'a', enabled: true, nextFireAt: null, lastFireAt: null,
      rule: { kind: 'interval', everyMs: 60 * 60_000, anchor: ms('2026-06-16T08:00') } });
    const s = h.makeScheduler();
    s.start();

    expect(h.items.get('a')!.nextFireAt).toBe(ms('2026-06-16T09:00'));
    expect(s.nextWakeAt()).toBe(ms('2026-06-16T09:00'));

    h.advanceTo(ms('2026-06-16T09:00'));
    expect(h.fired).toHaveLength(1);
    expect(h.fired[0]!.firedAt).toBe(ms('2026-06-16T09:00'));
    expect(h.items.get('a')!.nextFireAt).toBe(ms('2026-06-16T10:00'));
  });

  it('concludes a once reminder after it fires', () => {
    h.add({ id: 'b', enabled: true, nextFireAt: null, lastFireAt: null,
      rule: { kind: 'once', at: ms('2026-06-16T08:30') } });
    const s = h.makeScheduler();
    s.start();

    h.advanceTo(ms('2026-06-16T08:30'));
    expect(h.fired).toHaveLength(1);
    const item = h.items.get('b')!;
    expect(item.enabled).toBe(true);
    expect((item as any).conclusion).toBe('fired');
    expect(item.nextFireAt).toBeNull();
    expect(s.nextWakeAt()).toBeNull();
  });

  it('coalesces a missed recurring backlog into ONE catch-up on boot recovery', () => {
    // Persisted next fire is in the past (app was off); now is ~3.7 intervals later.
    h.now = ms('2026-06-16T10:00');
    h.add({ id: 'c', enabled: true, nextFireAt: ms('2026-06-16T08:25'), lastFireAt: null,
      rule: { kind: 'interval', everyMs: 25 * 60_000, anchor: ms('2026-06-16T08:00') } });
    const s = h.makeScheduler();
    s.start();

    expect(h.fired).toHaveLength(1); // a single coalesced catch-up, not a flood
    expect(h.fired[0]!.missedCount).toBeGreaterThan(1);
    expect(h.items.get('c')!.nextFireAt).toBeGreaterThan(h.now);
  });

  it('concludes a once reminder missed beyond the grace window as missed without firing', () => {
    h.now = ms('2026-06-16T10:00');
    h.add({ id: 'd', enabled: true, nextFireAt: ms('2026-06-16T08:00'), lastFireAt: null,
      rule: { kind: 'once', at: ms('2026-06-16T08:00') } });
    const s = h.makeScheduler();
    s.start();

    expect(h.fired).toHaveLength(0);
    expect(h.items.get('d')!.enabled).toBe(true);
    expect((h.items.get('d') as any).conclusion).toBe('missed');
  });

  it('excludes disabled items from scheduling after reschedule', () => {
    h.add({ id: 'e', enabled: true, nextFireAt: null, lastFireAt: null,
      rule: { kind: 'interval', everyMs: 60 * 60_000, anchor: ms('2026-06-16T08:00') } });
    const s = h.makeScheduler();
    s.start();
    expect(s.nextWakeAt()).not.toBeNull();

    h.store.update('e', { enabled: false });
    s.reschedule();
    expect(s.nextWakeAt()).toBeNull();
  });
});
