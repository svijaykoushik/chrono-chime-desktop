// main.js

import { join } from 'node:path';
import {
  app,
  BrowserWindow,
  Menu,
  Tray,
  Notification,
  nativeImage,
  ipcMain,
  shell,
} from 'electron';
import started from 'electron-squirrel-startup';
import * as log from 'electron-log/main';
import { updateElectronApp } from 'update-electron-app';
import AutoLaunch from 'auto-launch';
import { clock } from './core/clock/clock';
import { settingsManager } from './core/settings-manager';
import { notificationScheduler } from './core/notification-scheduler';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// initialize logger
log.initialize();

// Overide the default console log functions
Object.assign(console, log.functions);

// run the auto updater
updateElectronApp();

// enable error logging
log.errorHandler.startCatching();

// enable event handling
log.eventLogger.startLogging();

// Setup auto launch
const autoLauncher = new AutoLaunch({
  name: 'chrono-chime-desktop',
});

let mainWindow: BrowserWindow = null;
let isQuitting = false;


autoLauncher.isEnabled().then((isEnabled) => {
  mainWindow?.webContents.send('auto-launch-status', isEnabled);
});

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: join(__dirname, 'chrono-chime-icon-512.png'),
    title: 'ChronoChime - Time Keeper Extraordinaire',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Close the app to system tray
  mainWindow.on('close', (event) => {
    if (isQuitting == false) {
      log.info('Minimizing the app to tray');
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    log.info('Initiating quit procedure');
  });

  // Open urls in browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' }; // Prevent app from opening url
  });

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
  if (process.argv.includes('--enable-dev-tools')) {
    log.info('Detected flag to enable dev tools. Enabling dev tools');
    mainWindow.webContents.openDevTools();
  }
};

let trayIcon: Tray = null;

// Make the app a single instance app
const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.quit();
}

app.on('second-instance', () => {
  log.info('Handling launch of second instance');
  if (mainWindow && mainWindow.isMinimized()) {
    mainWindow.restore();
  } else if (mainWindow && !mainWindow.isVisible()) {
    mainWindow.show();
  }
  mainWindow.focus();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  log.info('App launched');
  createWindow();

  // Start the clock
  clock.start();

  // Initialize the notification scheduler
  notificationScheduler.scheduleNotifications();

  // Set the context menu
  const settings = settingsManager.getSettings();
  const contextMenu = Menu.buildFromTemplate([
    {
      id: 'open-main-window',
      label: 'Open ChronoChime',
      click: () => {
        mainWindow.show();
      },
      icon: join(__dirname, 'show-window.png'),
      visible: false,
    },
    {
      id: 'minimize-main-window',
      label: 'Minimize to tray',
      click: () => {
        mainWindow.hide();
      },
      icon: join(__dirname, 'minimize-app.png'),
      visible: true,
    },
    {
      id: 'disable-notification',
      label: 'Disable Notification',
      click: () => {
        const currentSettings = settingsManager.getSettings();
        currentSettings.isOff = true;
        settingsManager.saveSettings(currentSettings);
        notificationScheduler.scheduleNotifications();
      },
      icon: join(__dirname, 'notification-disabled.png'),
      visible: !settings.isOff,
    },
    {
      id: 'enable-notification',
      label: 'Enable notification',
      click: () => {
        const currentSettings = settingsManager.getSettings();
        currentSettings.isOff = false;
        settingsManager.saveSettings(currentSettings);
        notificationScheduler.scheduleNotifications();
      },
      icon: join(__dirname, 'notification-enabled.png'),
      visible: settings.isOff,
    },
    {
      id: 'app-settings',
      label: 'Settings',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('invoke-navigation', '/settings');
      },
      icon: join(__dirname, 'app-settings.png'),
    },
    {
      id: 'quit-application',
      label: 'Quit ChronoChime',
      click: () => {
        log.info('Quitting app');
        isQuitting = true;
        mainWindow.destroy();
        trayIcon.destroy();
        app.quit();
      },
      icon: join(__dirname, 'close-app.png'),
    },
  ]);
  trayIcon.setContextMenu(contextMenu);

  // Handle auto-launch
  autoLauncher.isEnabled().then((isEnabled) => {
    if (settings.autoLaunch && !isEnabled) {
      autoLauncher.enable();
    } else if (!settings.autoLaunch && isEnabled) {
      autoLauncher.disable();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
