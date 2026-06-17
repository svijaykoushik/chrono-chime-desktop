import type { ScheduleRule } from '../../shared/schedule';
import type { PomodoroConfig, RoutineConfig } from '../../shared/routine';

/** A child schedule owned by a routine (gets a routineId when persisted). */
export interface RoutineChild {
  title: string;
  message?: string;
  rule: ScheduleRule;
}

const MIN = 60_000;

function expandPomodoro(c: PomodoroConfig): RoutineChild[] {
  const children: RoutineChild[] = [];
  let cursor = c.startAt;
  for (let cycle = 1; cycle <= c.cycles; cycle++) {
    cursor += c.workMinutes * MIN;
    const isLast = cycle === c.cycles;
    children.push({
      title: isLast ? 'Pomodoro complete' : 'Time for a break',
      message: isLast ? 'Great work — your session is done.' : `Cycle ${cycle} done. Take a ${c.breakMinutes}-minute break.`,
      rule: { kind: 'once', at: cursor },
    });
    if (isLast) break;
    cursor += c.breakMinutes * MIN;
    children.push({
      title: 'Back to work',
      message: `Break over. Starting cycle ${cycle + 1}.`,
      rule: { kind: 'once', at: cursor },
    });
  }
  return children;
}

/**
 * F11 — expands a routine configuration into the concrete child schedules it
 * owns. Pure and deterministic so routines recover identically after restart.
 */
export function expandRoutine(config: RoutineConfig, _tz: string): RoutineChild[] {
  switch (config.type) {
    case 'pomodoro':
      return expandPomodoro(config);
    case 'hydration':
      return [{
        title: 'Time to hydrate',
        message: 'Have a glass of water.',
        rule: { kind: 'interval', everyMs: config.everyMinutes * MIN, anchor: config.startAt },
      }];
    case 'workout':
    case 'study':
      return [{
        title: config.type === 'workout' ? 'Workout reminder' : 'Study reminder',
        rule: { kind: 'interval', everyMs: config.everyMinutes * MIN, anchor: config.startAt },
      }];
  }
}
