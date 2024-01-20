// main.js

// Handle default squirrel events (Windows installation)
if (require("electron-squirrel-startup")) return;

// Modules to control application life and create native browser window
const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  Notification,
  nativeImage,
} = require("electron");
const path = require("node:path");


/** @type {BrowserWindow} */
let mainWindow = null;
let isQuitting = false;
const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: "./chrono-chime-icon-512.png",
    title: "ChronoChime - Hourly Notification",
  });

  mainWindow.webContents.openDevTools()

  // and load the index.html of the app.
  mainWindow.loadFile("index.html");

  // Close the app to system tray
  mainWindow.on("close", (event) => {
    if (isQuitting == false) {
      event.preventDefault();
      mainWindow.hide();
      const notification = new Notification({
        title: "ChornoChime is Running in the Background",
        body:
          "ChornoChime is now running discreetly in the background." +
          " Rest assured, it will continue to notify you promptly",
        icon: "./chrono-chime-icon-512.png",
      });
      notification.show();
      return false;
    }
  });

  //

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
};

/** @type {Tray} */
let trayIcon = null;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Hide the default menu bar
  Menu.setApplicationMenu(null);

  // The tray icon
  const icon = nativeImage.createFromPath(
    path.join(__dirname, "chrono-chime-icon-32.png")
  );

  // Create a tray icon with context menu
  trayIcon = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show window",
      click: () => {
        mainWindow?.show();
      },
      icon: "show-window.png"
    },
    {
      label: "Quit ChronoChime",
      role: "close",
      click: () => {
        isQuitting = true;
        mainWindow?.destroy();
        trayIcon.destroy();
        app.quit();
      },
      icon: "close-app.png"
    },
  ]);
  trayIcon.setContextMenu(contextMenu);
  trayIcon.setTitle("ChornoChime");
  trayIcon.setToolTip("ChronoChime - Hourly Notification");
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
