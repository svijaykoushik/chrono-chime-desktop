import log from 'electron-log/main';
import { app } from 'electron';
import { join } from 'node:path';
import { pruneLogs } from './retention';

const p2 = (n: number) => String(n).padStart(2, '0');
const p3 = (n: number) => String(n).padStart(3, '0');

export const logsDir = (): string => join(app.getPath('userData'), 'logs');

/**
 * D§1.1–1.3 — configure electron-log once at startup. Installs the renderer→main
 * bridge, routes main/renderer to separate files under `userData/logs`, caps each
 * at 5 MB, applies the project line format, and runs the retention sweep.
 * Must be called after `app` is ready.
 */
export function initLogging(): void {
  log.initialize(); // installs the IPC transport for electron-log/renderer

  const dir = logsDir();

  log.transports.file.maxSize = 5 * 1024 * 1024; // 5 MB → rotates to *.old

  // `[YYYY-MM-DD HH:mm:ss.SSS] [LEVEL] [MODULE] -` + original args (metadata
  // objects are serialized by electron-log's inspectOptions). (D§1.2)
  log.transports.file.format = ({ message }) => {
    const d = message.date;
    const ts =
      `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ` +
      `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${p3(d.getMilliseconds())}`;
    const moduleName = message.scope || message.variables?.processType || 'app';
    return [`[${ts}] [${message.level.toUpperCase()}] [${moduleName}] -`, ...message.data];
  };

  // Route renderer logs to renderer.log, main logs to main.log (D§1.2.1).
  log.transports.file.resolvePathFn = (_vars, message) =>
    join(dir, message?.variables?.processType === 'renderer' ? 'renderer.log' : 'main.log');

  pruneLogs(dir); // enforce ≤5 files / ≤7 days at boot
}

export const logger = {
  debug(module: string, message: string, meta?: Record<string, any>): void {
    log.scope(module).debug(message, meta);
  },
  info(module: string, message: string, meta?: Record<string, any>): void {
    log.scope(module).info(message, meta);
  },
  warn(module: string, message: string, meta?: Record<string, any>): void {
    log.scope(module).warn(message, meta);
  },
  error(module: string, message: string, error?: Error, meta?: Record<string, any>): void {
    log.scope(module).error(message, {
      ...meta,
      errorMessage: error?.message,
      stack: error?.stack,
    });
  },
};
