import { z } from 'zod';
import { scheduleRuleSchema } from './schedule';

/** F9 — per-reminder sound choice. */
export const soundChoiceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('default') }),
  z.object({ kind: z.literal('silent') }),
  z.object({ kind: z.literal('builtin'), id: z.string() }), // assets/sounds/<id>
  z.object({ kind: z.literal('custom'), path: z.string() }), // user-selected file
]);

export const notificationPrefsSchema = z.object({
  sound: soundChoiceSchema.default({ kind: 'default' }),
  vibrate: z.boolean().default(false),
});

export const reminderInputSchema = z.object({
  title: z.string().min(1),
  message: z.string().optional(),
  enabled: z.boolean().default(true),
  rule: scheduleRuleSchema,
  notification: notificationPrefsSchema.default({ sound: { kind: 'default' }, vibrate: false }),
});

export const reminderSchema = reminderInputSchema.extend({
  id: z.string(),
  nextFireAt: z.number().int().nullable(),
  lastFireAt: z.number().int().nullable(),
  routineId: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  conclusion: z.enum(['fired', 'missed']).nullable().default(null),
  concludedAt: z.number().int().nullable().default(null),
});

export type SoundChoice = z.infer<typeof soundChoiceSchema>;
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;
export type ReminderInput = z.infer<typeof reminderInputSchema>;
export type Reminder = z.infer<typeof reminderSchema>;
