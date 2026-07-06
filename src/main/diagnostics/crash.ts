import { app, dialog } from 'electron';
import { logger } from './logger';
import type { ExportLogsFn } from './export';

export interface CrashDetails {
  message: string;
  stack: string;
  processType: 'main' | 'renderer';
  timestamp: number;
}

const MAX_CRASHES = 3;
const CRASH_LOOP_WINDOW_MS = 5_000;

const state = {
  handling: false,
  crashCount: 0,
  firstCrashAt: 0,
  pendingCrash: null as CrashDetails | null,
  restarting: false,
};

function normalizeError(reason: unknown, processType: CrashDetails['processType']): CrashDetails {
  let message = 'Unknown fatal error';
  let stack = '';

  if (reason instanceof Error) {
    message = reason.message;
    stack = reason.stack ?? '';
  } else if (typeof reason === 'string') {
    message = reason;
  } else if (reason && typeof reason === 'object') {
    const maybeReason = reason as { message?: unknown; stack?: unknown };
    if (typeof maybeReason.message === 'string') message = maybeReason.message;
    if (typeof maybeReason.stack === 'string') stack = maybeReason.stack;
  }

  return {
    message,
    stack,
    processType,
    timestamp: Date.now(),
  };
}

function shouldPermitNewCrash(now: number): boolean {
  if (state.firstCrashAt === 0 || now - state.firstCrashAt > CRASH_LOOP_WINDOW_MS) {
    state.firstCrashAt = now;
    state.crashCount = 1;
    return true;
  }

  state.crashCount += 1;
  return state.crashCount <= MAX_CRASHES;
}

function captureCrash(reason: unknown, processType: CrashDetails['processType']): CrashDetails {
  const crash = normalizeError(reason, processType);
  state.pendingCrash = crash;
  return crash;
}

export function getCrashInfo(): CrashDetails | null {
  return state.pendingCrash;
}

export async function exportCrashLogsAndRestart(exportLogs: ExportLogsFn): Promise<void> {
  if (state.restarting) return;
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Export Crash Report & Restart',
    defaultPath: `chronochime-crash-${new Date().toISOString().split('T')[0]}.zip`,
    filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
  });

  if (canceled || !filePath) return;

  await exportLogs(filePath);
  state.restarting = true;
  app.relaunch();
  app.exit(0);
}

function handleFatal(
  reason: unknown,
  processType: CrashDetails['processType'],
  showCrashWindow: (reason: CrashDetails) => void,
  appExit: (code?: number) => void,
): void {
  const now = Date.now();
  const crash = captureCrash(reason, processType);
  logger.error('Crash', 'Fatal exception captured', new Error(crash.message), { processType, stack: crash.stack });

  if (state.handling) {
    logger.warn('Crash', 'Secondary fatal error occurred while crash handling is in progress', {
      processType,
      message: crash.message,
    });
    return;
  }

  if (!shouldPermitNewCrash(now)) {
    logger.error('Crash', 'Crash loop detected; exiting immediately');
    appExit(1);
    return;
  }

  state.handling = true;

  try {
    showCrashWindow(crash);
  } catch (err) {
    logger.error('Crash', 'Failed to show crash overlay', err instanceof Error ? err : new Error(String(err)));
    appExit(1);
  }
}

export function installCrashHandlers(
  showCrashWindow: (crash: CrashDetails) => void,
  appExit: (code?: number) => void,
): {
  onRenderProcessGone: (event: Electron.Event, details: Electron.RenderProcessGoneDetails) => void;
} {
  process.on('uncaughtException', (error) => {
    handleFatal(error, 'main', showCrashWindow, appExit);
  });

  process.on('unhandledRejection', (reason) => {
    handleFatal(reason, 'main', showCrashWindow, appExit);
  });

  return {
    onRenderProcessGone: (_event, details) => {
      const maybeReason = details.reason;
      const isErrorLike =
        typeof maybeReason === 'object' && maybeReason !== null && 'message' in maybeReason;
      const message =
        typeof maybeReason === 'string'
          ? maybeReason
          : isErrorLike
          ? String((maybeReason as { message: unknown }).message)
          : 'Renderer process gone';
      const stack =
        isErrorLike && typeof (maybeReason as { stack?: unknown }).stack === 'string'
          ? (maybeReason as { stack: string }).stack
          : '';
      const crashReason = new Error(message);
      crashReason.stack = stack;
      handleFatal(crashReason, 'renderer', showCrashWindow, appExit);
    },
  };
}
