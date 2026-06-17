import { describe, it, expect } from 'vitest';
import { DateTime } from 'luxon';
import { expandRoutine } from '../../src/main/routine/expand';
import type { RoutineConfig } from '../../src/shared/routine';

const TZ = 'America/New_York';
const ms = (iso: string) => DateTime.fromISO(iso, { zone: TZ }).toMillis();

describe('expandRoutine — F11 composite intentions', () => {
  it('Pomodoro generates work/break transition reminders for each cycle', () => {
    const startAt = ms('2026-06-16T09:00');
    const config: RoutineConfig = {
      type: 'pomodoro', workMinutes: 25, breakMinutes: 5, cycles: 2, startAt,
    };
    const children = expandRoutine(config, TZ);

    // 2 cycles → work-end + break-end each, last break replaced by completion.
    expect(children.length).toBeGreaterThanOrEqual(3);
    // First transition is the end of the first work block.
    expect(children[0]!.rule).toEqual({ kind: 'once', at: startAt + 25 * 60_000 });
    // Every child is a one-shot (a routine owns concrete moments).
    expect(children.every((c) => c.rule.kind === 'once')).toBe(true);
    // Titles are human, never technical.
    expect(children[0]!.title.length).toBeGreaterThan(0);
  });

  it('Hydration generates a recurring interval reminder', () => {
    const startAt = ms('2026-06-16T09:00');
    const config: RoutineConfig = { type: 'hydration', everyMinutes: 60, startAt };
    const children = expandRoutine(config, TZ);
    expect(children).toHaveLength(1);
    expect(children[0]!.rule).toEqual({ kind: 'interval', everyMs: 60 * 60_000, anchor: startAt });
  });
});
