// main.js

(() => {// Handle default squirrel events (Windows installation)
  if (require('electron-squirrel-startup')) return;

  // Modules to control application life and create native browser window
  const {
    app,
    BrowserWindow,
    Menu,
    Tray,
    Notification,
    nativeImage,
    ipcMain,
  } = require('electron');
  const path = require('node:path');


  /** @type {BrowserWindow} */
  let mainWindow = null;
  let isQuitting = false;

  const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      icon: './chrono-chime-icon-512.png',
      title: 'ChronoChime - Hourly Notification',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js')
      }
    });

    // and load the index.html of the app.
    mainWindow.loadFile('index.html')
      .then(() => {
        mainWindow.webContents.send('app-version', app.getVersion());
      });


    // Close the app to system tray
    mainWindow.on('close', (event) => {
      if (isQuitting == false) {
        event.preventDefault();
        mainWindow.hide();
        return false;
      }
    });

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
  };

  /** @type {Tray} */
  let trayIcon = null;

  // Make the app a single instance app
  const singleInstanceLock = app.requestSingleInstanceLock();

  if (!singleInstanceLock) {
    return app.quit();
  }

  app.on('second-instance', () => {
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
    createWindow();

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });

    // Hide the default menu bar
    Menu.setApplicationMenu(null);

    // The tray icon
    const icon = nativeImage.createFromPath(
      path.join(__dirname, 'chrono-chime-icon-32.png')
    );

    // Create a tray icon with context menu
    trayIcon = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
      {
        id: 'open-main-window',
        label: 'Open ChronoChime',
        click: () => {
          mainWindow.show();
        },
        icon: 'show-window.png',
        visible: false
      },
      {
        id: 'minimize-main-window',
        label: 'Minimize to tray',
        click: () => {
          mainWindow.hide();
          isHidden = true;
        },
        icon: 'minimize-app.png',
        visible: true
      },
      {
        id: 'disable-notification',
        label: 'Disable Notification',
        click: () => {
          mainWindow.webContents.send('toggle-notification', false);
        },
        icon: 'notification-disabled.png',
        visible: true
      },
      {
        id: 'enable-notification',
        label: 'Enable notification',
        click: () => {
          mainWindow.webContents.send('toggle-notification', true);
        },
        icon: 'notification-enabled.png',
        visible: false
      },
      {
        id: 'app-settings',
        label: 'Settings',
        click: () => {
          mainWindow.show();
          mainWindow.webContents.send('invoke-navigation', '/settings');
        },
        icon: 'app-settings.png'
      },
      {
        id: 'quit-application',
        label: 'Quit ChronoChime',
        role: 'close',
        click: () => {
          isQuitting = true;
          mainWindow.destroy();
          trayIcon.destroy();
          app.quit();
        },
        icon: 'close-app.png'
      },
    ]);
    trayIcon.setContextMenu(contextMenu);
    trayIcon.setTitle('ChornoChime');
    trayIcon.setToolTip('ChronoChime - Hourly Notification');

    // Toggle context menu item visibility based on main window visibility
    mainWindow.on('show', () => {
      contextMenu.getMenuItemById('open-main-window').visible = false;
      contextMenu.getMenuItemById('minimize-main-window').visible = true;
      trayIcon.setContextMenu(contextMenu);
    });

    mainWindow.on('hide', () => {
      contextMenu.getMenuItemById('open-main-window').visible = true;
      contextMenu.getMenuItemById('minimize-main-window').visible = false;
      trayIcon.setContextMenu(contextMenu);
      const minimizedToTrayNotification = new Notification({
        title: 'ChornoChime is Running in the Background',
        body:
          'ChornoChime is now running discreetly in the background.' +
          ' Rest assured, it will continue to notify you promptly',
        icon: './chrono-chime-icon-512.png',
      });
      minimizedToTrayNotification.show();
    });

    ipcMain.on('notification-status', (_event, data) => {
      if (data === true) {
        contextMenu.getMenuItemById('disable-notification').visible = true;
        contextMenu.getMenuItemById('enable-notification').visible = false;
        trayIcon.setContextMenu(contextMenu);
      } else {
        contextMenu.getMenuItemById('disable-notification').visible = false;
        contextMenu.getMenuItemById('enable-notification').visible = true;
        trayIcon.setContextMenu(contextMenu);
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
})(); 
