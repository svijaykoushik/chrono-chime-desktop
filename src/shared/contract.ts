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
  diagnosticsExport: 'chronochime:diagnostics:export',
  diagnosticsOpenDir: 'chronochime:diagnostics:openDir',
  crashGetInfo: 'chronochime:crash:getInfo',
  crashExportAndRestart: 'chronochime:crash:exportAndRestart',
  // Update checker IPC channels
  updateCheck: 'chronochime:update:check',
  updateDownload: 'chronochime:update:download',
  updateCancelDownload: 'chronochime:update:cancel-download',
  updateDownloadProgress: 'chronochime:update:download-progress',
  updateInstallResult: 'chronochime:update:install-result',
  updateInstall: 'chronochime:update:install',
  updateGetVersion: 'chronochime:update:get-version',
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
  startMinimizedOnAutoLaunch: z.boolean().default(false),
  updateChannel: z.enum(['stable', 'prerelease']).default('stable'),
});

/** Update checker schemas */
export const updateCheckResult = z.object({
  available: z.boolean(),
  latestVersion: z.string().optional(),
  notes: z.string().optional(),
  assetUrl: z.string().optional(),
});
export const updateProgress = z.object({
  percent: z.number().min(0).max(100),
  transferred: z.number(),
  total: z.number(),
});
export const installResult = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

/** Re-exported so renderer + main share one source of truth. */
export { reminderSchema, scheduleRuleSchema };
export type Settings = z.infer<typeof settingsSchema>;
export type QuietHours = z.infer<typeof quietHoursSchema>;
export type UpdateCheckResult = z.infer<typeof updateCheckResult>;
export type UpdateProgress = z.infer<typeof updateProgress>;
export type InstallResult = z.infer<typeof installResult>;
