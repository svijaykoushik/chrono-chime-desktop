import { z } from 'zod';
import { reminderInputSchema, reminderSchema } from './reminder';
import { routineInputSchema } from './routine';
import { scheduleRuleSchema } from './schedule';

/** Typed IPC channel names: chronochime:<domain>:<operation>. */
export const CH = {
  reminderList: 'chronochime:reminder:list',
  reminderCreate: 'chronochime:reminder:create',
  reminderUpdate: 'chronochime:reminder:update',
  reminderSetEnabled: 'chronochime:reminder:setEnabled',
  reminderDelete: 'chronochime:reminder:delete',
  routineList: 'chronochime:routine:list',
  routineCreate: 'chronochime:routine:create',
  routineSetEnabled: 'chronochime:routine:setEnabled',
  routineDelete: 'chronochime:routine:delete',
  settingsGet: 'chronochime:settings:get',
  settingsUpdate: 'chronochime:settings:update',
  soundPreview: 'chronochime:sound:preview',
  eventFired: 'chronochime:event:fired',
} as const;

/** Request schemas — every IPC input is validated against these. */
export const reminderListReq = z.object({ query: z.string().optional() });
export const reminderCreateReq = reminderInputSchema;
export const reminderUpdateReq = z.object({ id: z.string(), patch: reminderInputSchema.partial() });
export const reminderSetEnabledReq = z.object({ ids: z.array(z.string()).nonempty(), enabled: z.boolean() });
export const reminderDeleteReq = z.object({ ids: z.array(z.string()).nonempty() });
export const routineCreateReq = routineInputSchema;
export const routineSetEnabledReq = z.object({ id: z.string(), enabled: z.boolean() });
export const routineDeleteReq = z.object({ id: z.string() });

export const quietHoursSchema = z.object({
  enabled: z.boolean(),
  start: z.string(),
  end: z.string(),
});
export const settingsSchema = z.object({
  quietHours: quietHoursSchema,
  timezone: z.string(),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  launchAtLogin: z.boolean().default(false),
});

/** Re-exported so renderer + main share one source of truth. */
export { reminderSchema, scheduleRuleSchema };
export type Settings = z.infer<typeof settingsSchema>;
export type QuietHours = z.infer<typeof quietHoursSchema>;
