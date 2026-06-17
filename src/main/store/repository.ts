import type { Reminder } from '../../shared/reminder';
import type { SchedulerStore, ScheduledItem } from '../scheduler/types';

export interface PersistedRoutine {
  id: string;
  title: string;
  type: string;
  enabled: boolean;
  config: unknown;
  createdAt: number;
}

export interface ListReminderOptions {
  query?: string;
  /** When false (default), routine-owned children are excluded (F11). */
  includeRoutineChildren?: boolean;
}

/** Persistence seam. SQLite/Drizzle and in-memory both implement this. */
export interface Repository {
  insertReminder(r: Reminder): Reminder;
  getReminder(id: string): Reminder | undefined;
  updateReminder(id: string, patch: Partial<Reminder>): Reminder | undefined;
  deleteReminders(ids: string[]): number;
  listReminders(opts?: ListReminderOptions): Reminder[];

  insertRoutine(r: PersistedRoutine): PersistedRoutine;
  getRoutine(id: string): PersistedRoutine | undefined;
  deleteRoutine(id: string): number; // cascades to children
  listRoutines(): PersistedRoutine[];
  setRoutineEnabled(id: string, enabled: boolean): void;
}

export class InMemoryRepository implements Repository {
  private reminders = new Map<string, Reminder>();
  private routines = new Map<string, PersistedRoutine>();

  insertReminder(r: Reminder): Reminder {
    this.reminders.set(r.id, r);
    return r;
  }
  getReminder(id: string) {
    return this.reminders.get(id);
  }
  updateReminder(id: string, patch: Partial<Reminder>) {
    const cur = this.reminders.get(id);
    if (!cur) return undefined;
    const next = { ...cur, ...patch };
    this.reminders.set(id, next);
    return next;
  }
  deleteReminders(ids: string[]) {
    let n = 0;
    for (const id of ids) if (this.reminders.delete(id)) n++;
    return n;
  }
  listReminders(opts: ListReminderOptions = {}) {
    let out = [...this.reminders.values()];
    if (!opts.includeRoutineChildren) out = out.filter((r) => r.routineId == null);
    if (opts.query) {
      const q = opts.query.toLowerCase();
      out = out.filter((r) => r.title.toLowerCase().includes(q));
    }
    return out.sort((a, b) => a.createdAt - b.createdAt);
  }

  insertRoutine(r: PersistedRoutine) {
    this.routines.set(r.id, r);
    return r;
  }
  getRoutine(id: string) {
    return this.routines.get(id);
  }
  deleteRoutine(id: string) {
    if (!this.routines.delete(id)) return 0;
    const childIds = [...this.reminders.values()].filter((r) => r.routineId === id).map((r) => r.id);
    this.deleteReminders(childIds);
    return 1;
  }
  listRoutines() {
    return [...this.routines.values()].sort((a, b) => a.createdAt - b.createdAt);
  }
  setRoutineEnabled(id: string, enabled: boolean) {
    const r = this.routines.get(id);
    if (r) this.routines.set(id, { ...r, enabled });
  }
}

/** Adapts a Repository to the narrow interface the Scheduler needs. */
export function schedulerStoreFor(repo: Repository): SchedulerStore {
  return {
    listSchedulable: (): ScheduledItem[] =>
      repo
        .listReminders({ includeRoutineChildren: true })
        .filter((r) => r.enabled)
        .map((r) => ({
          id: r.id,
          rule: r.rule,
          enabled: r.enabled,
          nextFireAt: r.nextFireAt,
          lastFireAt: r.lastFireAt,
        })),
    update: (id, patch) => {
      repo.updateReminder(id, patch);
    },
  };
}
