import { z } from 'zod';

/** F11 — composite temporal intentions. Each type expands to child schedules. */
export const pomodoroConfigSchema = z.object({
  type: z.literal('pomodoro'),
  workMinutes: z.number().int().positive(),
  breakMinutes: z.number().int().positive(),
  cycles: z.number().int().positive(),
  startAt: z.number().int(),
});

export const hydrationConfigSchema = z.object({
  type: z.literal('hydration'),
  everyMinutes: z.number().int().positive(),
  startAt: z.number().int(),
});

export const intervalRoutineConfigSchema = z.object({
  // Shared shape for simple recurring routines (workout, study, …).
  type: z.enum(['workout', 'study']),
  everyMinutes: z.number().int().positive(),
  startAt: z.number().int(),
});

export const routineConfigSchema = z.discriminatedUnion('type', [
  pomodoroConfigSchema,
  hydrationConfigSchema,
  intervalRoutineConfigSchema,
]);

export const routineInputSchema = z.object({
  title: z.string().min(1),
  config: routineConfigSchema,
  enabled: z.boolean().default(true),
});

export type PomodoroConfig = z.infer<typeof pomodoroConfigSchema>;
export type RoutineConfig = z.infer<typeof routineConfigSchema>;
export type RoutineInput = z.infer<typeof routineInputSchema>;
