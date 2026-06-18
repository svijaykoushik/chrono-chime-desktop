import { app, BrowserWindow, ipcMain, powerMonitor, protocol, net, Tray, Menu, nativeImage } from 'electron';
import { randomUUID } from 'node:crypto';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SqliteRepository } from './main/store/sqlite-repository';
import { schedulerStoreFor } from './main/store/repository';
import { Scheduler } from './main/scheduler/scheduler';
import { ReminderService } from './main/app/reminder-service';
import { RoutineService } from './main/app/routine-service';
import { NotificationManager } from './main/notification/manager';
import { SettingsStore } from './main/settings';
import { getAutoStart, setAutoStart } from './main/autostart';
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

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const userData = app.getPath('userData');
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
    if (patch.launchAtLogin !== undefined) setAutoStart(patch.launchAtLogin);
    const updated = settingsStore.update(patch);
    return { ...updated, launchAtLogin: getAutoStart() };
  });
  ipcMain.handle(CH.soundPreview, () => {
    // Sound preview is played in the renderer; main acknowledges the request.
    return undefined;
  });
}

function createWindow(): void {
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

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(): void {
  const icon = nativeImage.createFromPath(join(app.getAppPath(), 'assets/icons/chrono-chime-icon-32.png'));
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip('ChronoChime');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open ChronoChime', click: () => (mainWindow ? mainWindow.show() : createWindow()) },
      { type: 'separator' },
      { label: 'Quit', click: () => app.exit(0) },
    ]),
  );
}

// Single instance — a second launch focuses the existing window.
if (!app.requestSingleInstanceLock()) {
  app.exit(0);
} else {
  app.on('second-instance', () => {
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
    protocol.handle('chrono-sound', (request) => {
      const id = basename(decodeURIComponent(new URL(request.url).hostname || request.url.replace('chrono-sound://', '')));
      const file = join(app.getAppPath(), 'assets/sounds', id);
      return net.fetch(pathToFileURL(file).toString());
    });
    Menu.setApplicationMenu(null); // hide the application menu bar (Win/Linux)
    registerIpc();
    scheduler.start(); // boot recovery + arm (F14)
    createWindow();
    createTray();

    // Resume from sleep → re-run recovery so missed occurrences are handled.
    powerMonitor.on('resume', () => scheduler.start());

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  // Background-first: keep the scheduler running in the tray after the window closes.
  app.on('window-all-closed', () => {
    // Intentionally do not quit; ChronoChime lives in the tray.
  });
}
