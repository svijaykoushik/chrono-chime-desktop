import { nextOccurrence } from '../recurrence/recurrence';
import type { Reminder, ReminderInput } from '../../shared/reminder';
import type { Scheduler } from '../scheduler/scheduler';
import type { Repository } from '../store/repository';

export interface ServiceDeps {
  repo: Repository;
  scheduler: Pick<Scheduler, 'reschedule'>;
  clock: () => number;
  idGen: () => string;
  tz: string;
}

/** F1/F12/F13 — create, edit, enable/disable, delete, and search reminders. */
export class ReminderService {
  constructor(private readonly d: ServiceDeps) {}

  private fireTimeFor(rule: Reminder['rule'], enabled: boolean, now: number): number | null {
    return enabled ? nextOccurrence(rule, now, this.d.tz) : null;
  }

  create(input: ReminderInput): Reminder {
    const now = this.d.clock();
    const reminder: Reminder = {
      id: this.d.idGen(),
      title: input.title,
      message: input.message,
      enabled: input.enabled,
      rule: input.rule,
      notification: input.notification,
      nextFireAt: this.fireTimeFor(input.rule, input.enabled, now),
      lastFireAt: null,
      routineId: null,
      createdAt: now,
      updatedAt: now,
      conclusion: null,
      concludedAt: null,
    };
    this.d.repo.insertReminder(reminder);
    this.d.scheduler.reschedule();
    return reminder;
  }

  update(id: string, patch: Partial<ReminderInput>): Reminder | undefined {
    const cur = this.d.repo.getReminder(id);
    if (!cur) return undefined;
    const now = this.d.clock();
    const rule = patch.rule ?? cur.rule;
    const enabled = patch.enabled ?? cur.enabled;
    const recompute = patch.rule !== undefined || patch.enabled !== undefined;
    const nextFireAt = recompute ? this.fireTimeFor(rule, enabled, now) : cur.nextFireAt;
    const clearConclusion = nextFireAt !== null;
    const updated = this.d.repo.updateReminder(id, {
      ...patch,
      updatedAt: now,
      ...(recompute ? { nextFireAt } : {}),
      ...(clearConclusion ? { conclusion: null, concludedAt: null } : {}),
    });
    this.d.scheduler.reschedule();
    return updated;
  }

  /** F13 — bulk enable/disable. */
  setEnabled(ids: string[], enabled: boolean): Reminder[] {
    const now = this.d.clock();
    const out: Reminder[] = [];
    for (const id of ids) {
      const cur = this.d.repo.getReminder(id);
      if (!cur) continue;
      const nextFire = this.fireTimeFor(cur.rule, enabled, now);
      const finalEnabled = (enabled && nextFire === null) ? false : enabled;
      const u = this.d.repo.updateReminder(id, {
        enabled: finalEnabled,
        nextFireAt: nextFire,
        updatedAt: now,
        ...(nextFire !== null ? { conclusion: null, concludedAt: null } : {}),
      });
      if (u) out.push(u);
    }
    this.d.scheduler.reschedule();
    return out;
  }

  /** F13 — bulk delete. */
  delete(ids: string[]): number {
    const n = this.d.repo.deleteReminders(ids);
    this.d.scheduler.reschedule();
    return n;
  }

  /** F1 — top-level reminders only (routine children are hidden). */
  list(): Reminder[] {
    return this.d.repo.listReminders();
  }

  /** F12 — live search by title. */
  search(query: string): Reminder[] {
    return this.d.repo.listReminders({ query });
  }
}
