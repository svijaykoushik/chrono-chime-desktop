import { nextOccurrence } from '../recurrence/recurrence';
import { expandRoutine } from '../routine/expand';
import type { Reminder } from '../../shared/reminder';
import type { RoutineInput } from '../../shared/routine';
import type { PersistedRoutine } from '../store/repository';
import type { ServiceDeps } from './reminder-service';

export interface RoutineWithChildren extends PersistedRoutine {
  children: Reminder[];
}

/** F11 — routines as first-class composite intentions that own child schedules. */
export class RoutineService {
  constructor(private readonly d: ServiceDeps) {}

  private childrenOf(routineId: string): Reminder[] {
    return this.d.repo
      .listReminders({ includeRoutineChildren: true })
      .filter((r) => r.routineId === routineId);
  }

  create(input: RoutineInput): RoutineWithChildren {
    const now = this.d.clock();
    const routine: PersistedRoutine = {
      id: this.d.idGen(),
      title: input.title,
      type: input.config.type,
      enabled: input.enabled,
      config: input.config,
      createdAt: now,
    };
    this.d.repo.insertRoutine(routine);

    for (const child of expandRoutine(input.config, this.d.tz)) {
      const reminder: Reminder = {
        id: this.d.idGen(),
        title: child.title,
        message: child.message,
        enabled: input.enabled,
        rule: child.rule,
        notification: { sound: { kind: 'default' }, vibrate: false },
        nextFireAt: input.enabled ? nextOccurrence(child.rule, now, this.d.tz) : null,
        lastFireAt: null,
        routineId: routine.id,
        createdAt: now,
        updatedAt: now,
      };
      this.d.repo.insertReminder(reminder);
    }
    this.d.scheduler.reschedule();
    return { ...routine, children: this.childrenOf(routine.id) };
  }

  setEnabled(id: string, enabled: boolean): void {
    const now = this.d.clock();
    this.d.repo.setRoutineEnabled(id, enabled);
    for (const child of this.childrenOf(id)) {
      this.d.repo.updateReminder(child.id, {
        enabled,
        nextFireAt: enabled ? nextOccurrence(child.rule, now, this.d.tz) : null,
        updatedAt: now,
      });
    }
    this.d.scheduler.reschedule();
  }

  /** Deleting a routine removes all schedules it owns. */
  delete(id: string): number {
    const n = this.d.repo.deleteRoutine(id);
    this.d.scheduler.reschedule();
    return n;
  }

  list(): RoutineWithChildren[] {
    return this.d.repo.listRoutines().map((r) => ({ ...r, children: this.childrenOf(r.id) }));
  }
}
