import { app, BrowserWindow, ipcMain, powerMonitor, protocol, net, Tray, Menu, nativeImage, dialog } from 'electron';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SqliteRepository } from './main/store/sqlite-repository';
import { schedulerStoreFor } from './main/store/repository';
import { Scheduler } from './main/scheduler/scheduler';
import { ReminderService } from './main/app/reminder-service';
import { RoutineService } from './main/app/routine-service';
import { NotificationManager } from './main/notification/manager';
import { SettingsStore } from './main/settings';
import { getAutoStart, setAutoStart, START_MINIMIZED_ARG } from './main/autostart';
import { initLogging, logger } from './main/diagnostics/logger';
import { exportLogs, openLogsDir } from './main/diagnostics/export';
import { installCrashHandlers, exportCrashLogsAndRestart, getCrashInfo } from './main/diagnostics/crash';
import { UpdateService } from './main/update/update-service';
let updateService: UpdateService | undefined;
import {
  CH,
  reminderListReq,
  reminderCreateReq,
  reminderUpdateReq,
  reminderSetEnabledReq,
  reminderDeleteReq,
  routineCreateReq,
  routineSetEnabledReq,
  routineDeleteReq,
  settingsSchema,
} from './shared/contract';
import type { RoutineView } from './shared/bridge';

// Injected by the Electron Forge Vite plugin.
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;
declare const CRASH_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const CRASH_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let crashWindow: BrowserWindow | null = null;
let crashHandlers: ReturnType<typeof installCrashHandlers> | null = null;

// Dev builds get an isolated data dir so they never share logs/db/settings with
// an installed ChronoChime (or a legacy v1-beta checkout). Production is
// unchanged — it intentionally upgrades the old install in place.
if (!app.isPackaged) {
  app.setPath('userData', join(app.getPath('appData'), 'ChronoChime-dev'));
}

const userData = app.getPath('userData');
// Ensure the data dir exists before opening the DB — it may not on first launch
// (Electron doesn't pre-create it before this module-load code runs).
mkdirSync(userData, { recursive: true });
const repo = new SqliteRepository(join(userData, 'chronochime.db'));
const settingsStore = new SettingsStore(join(userData, 'settings.json'));

const notifications = new NotificationManager({
  repo,
  getSettings: () => settingsStore.get(),
  emit: (event) => mainWindow?.webContents.send(CH.eventFired, event),
});

const scheduler = new Scheduler({
  store: schedulerStoreFor(repo),
  clock: () => Date.now(),
  timer: {
    set: (fn, ms) => setTimeout(fn, ms) as unknown as number,
    clear: (h) => clearTimeout(h as unknown as NodeJS.Timeout),
  },
  tz: settingsStore.get().timezone,
  notify: (event) => notifications.deliver(event),
});

const serviceDeps = {
  repo,
  scheduler,
  clock: () => Date.now(),
  idGen: () => randomUUID(),
  tz: settingsStore.get().timezone,
};
const reminderService = new ReminderService(serviceDeps);
const routineService = new RoutineService(serviceDeps);

function toRoutineView(r: { id: string; title: string; type: string; enabled: boolean; children: unknown }): RoutineView {
  return { id: r.id, title: r.title, type: r.type, enabled: r.enabled, children: r.children as RoutineView['children'] };
}

function registerIpc(): void {
  ipcMain.handle(CH.reminderList, (_e, raw) => reminderService.search(reminderListReq.parse(raw ?? {}).query ?? ''));
  ipcMain.handle(CH.reminderCreate, (_e, raw) => reminderService.create(reminderCreateReq.parse(raw)));
  ipcMain.handle(CH.reminderUpdate, (_e, raw) => {
    const { id, patch } = reminderUpdateReq.parse(raw);
    return reminderService.update(id, patch);
  });
  ipcMain.handle(CH.reminderSetEnabled, (_e, raw) => {
    const { ids, enabled } = reminderSetEnabledReq.parse(raw);
    return reminderService.setEnabled(ids, enabled);
  });
  ipcMain.handle(CH.reminderDelete, (_e, raw) => reminderService.delete(reminderDeleteReq.parse(raw).ids));

  ipcMain.handle(CH.routineList, () => routineService.list().map(toRoutineView));
  ipcMain.handle(CH.routineCreate, (_e, raw) => toRoutineView(routineService.create(routineCreateReq.parse(raw))));
  ipcMain.handle(CH.routineSetEnabled, (_e, raw) => {
    const { id, enabled } = routineSetEnabledReq.parse(raw);
    routineService.setEnabled(id, enabled);
  });
  ipcMain.handle(CH.routineDelete, (_e, raw) => routineService.delete(routineDeleteReq.parse(raw).id));

  ipcMain.handle(CH.settingsGet, () => ({ ...settingsStore.get(), launchAtLogin: getAutoStart() }));
  ipcMain.handle(CH.settingsUpdate, (_e, raw) => {
    const patch = settingsSchema.partial().parse(raw);
    const updated = settingsStore.update(patch);
    if (patch.launchAtLogin !== undefined || patch.startMinimizedOnAutoLaunch !== undefined) {
      const launchAtLogin = patch.launchAtLogin !== undefined ? patch.launchAtLogin : getAutoStart();
      setAutoStart(launchAtLogin, updated.startMinimizedOnAutoLaunch);
    }
    return { ...updated, launchAtLogin: getAutoStart() };
  });
  ipcMain.handle(CH.soundPreview, () => {
    // Sound preview is played in the renderer; main acknowledges the request.
    return undefined;
  });
  ipcMain.handle(CH.diagnosticsExport, async () => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Diagnostic Logs',
      defaultPath: `chronochime-logs-${new Date().toISOString().split('T')[0]}.zip`,
      filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
    });
    if (filePath) await exportLogs(filePath);
  });
  ipcMain.handle(CH.diagnosticsOpenDir, async () => {
    await openLogsDir();
  });

  ipcMain.handle(CH.crashGetInfo, () => {
    return getCrashInfo();
  });

  ipcMain.handle(CH.crashExportAndRestart, async () => {
    await exportCrashLogsAndRestart(exportLogs);
  });
}

function createCrashWindow(): void {
  crashWindow = new BrowserWindow({
    width: 780,
    height: 640,
    minWidth: 720,
    minHeight: 520,
    show: false,
    resizable: false,
    webPreferences: {
      preload: join(__dirname, 'crash-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (CRASH_WINDOW_VITE_DEV_SERVER_URL) {
    crashWindow.loadURL(`${CRASH_WINDOW_VITE_DEV_SERVER_URL}/crash.html`);
  } else {
    crashWindow.loadFile(join(__dirname, `../renderer/${CRASH_WINDOW_VITE_NAME}/crash.html`));
  }

  crashWindow.once('ready-to-show', () => crashWindow?.show());
  crashWindow.on('closed', () => {
    crashWindow = null;
  });
}

function showCrashWindow(): void {
  if (crashWindow) {
    crashWindow.show();
    return;
  }

  createCrashWindow();
}

function createWindow(showOnReady = true): void {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 720,
    minHeight: 560,
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  mainWindow.once('ready-to-show', () => {
    if (showOnReady) {
      mainWindow?.show();
    }
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (crashHandlers) {
    mainWindow.webContents.on('render-process-gone', crashHandlers.onRenderProcessGone);
  }
}

function createTray(): void {
  const icon = nativeImage.createFromPath(join(app.getAppPath(), 'assets/icons/chrono-chime-icon-32.png'));
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('ChronoChime');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open ChronoChime', click: () => (mainWindow ? mainWindow.show() : createWindow()) },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          logger.info('main', 'Application quitting via tray menu');
          app.exit(0);
        },
      },
    ]),
  );
}

// Single instance — a second launch focuses the existing window.
if (!app.requestSingleInstanceLock()) {
  app.exit(0);
} else {
  app.on('second-instance', () => {
    logger.warn('main', 'Second instance launch detected; focusing existing window');
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Serve built-in notification sounds from assets/sounds to the renderer.
  protocol.registerSchemesAsPrivileged([
    { scheme: 'chrono-sound', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
  ]);

  app.whenReady().then(() => {
    try {
      protocol.handle('chrono-sound', (request) => {
        const id = basename(decodeURIComponent(new URL(request.url).hostname || request.url.replace('chrono-sound://', '')));
        const file = join(app.getAppPath(), 'assets/sounds', id);
        return net.fetch(pathToFileURL(file).toString());
      });
      initLogging(); // configure file logging + retention sweep (D§1)
      logger.info('main', 'ChronoChime starting', { version: app.getVersion(), platform: process.platform });
      Menu.setApplicationMenu(null); // hide the application menu bar (Win/Linux)
      crashHandlers = installCrashHandlers(showCrashWindow, (code) => app.exit(code));
      registerIpc();
      scheduler.start(); // boot recovery + arm (F14)
      const autoLaunchMinimized = process.argv.includes(START_MINIMIZED_ARG) && settingsStore.get().startMinimizedOnAutoLaunch;
      createWindow(!autoLaunchMinimized);
      createTray();
      // Initialise update checker service (M4)
      updateService = new UpdateService(() => mainWindow, () => settingsStore.get());

      // Resume from sleep → re-run recovery so missed occurrences are handled.
      powerMonitor.on('resume', () => {
        logger.info('main', 'System resumed from sleep; triggering recovery sweep');
        scheduler.start();
      });

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
      });

      // Handle signal exit logging (SIGINT, SIGTERM)
      process.on('SIGINT', () => {
        logger.info('main', 'Application received SIGINT signal; exiting');
        app.exit(0);
      });

      process.on('SIGTERM', () => {
        logger.info('main', 'Application received SIGTERM signal; exiting');
        app.exit(0);
      });

      app.on('before-quit', () => {
        logger.info('main', 'Application before-quit event triggered');
        // Dispose periodic update timer
        if (typeof updateService !== 'undefined') {
          updateService.dispose();
        }
      });
    } catch (err) {
      logger.error('main', 'Fatal exception during application startup', err instanceof Error ? err : new Error(String(err)));
      app.exit(1);
    }
  });

  // Background-first: keep the scheduler running in the tray after the window closes.
  app.on('window-all-closed', () => {
    logger.info('main', 'All windows closed; keeping app running in tray');
    // Intentionally do not quit; ChronoChime lives in the tray.
  });
}
