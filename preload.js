const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('versions', {
    electron: () => process.versions.electron,
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    onAppVersionRecived: (listener) => {
        ipcRenderer.on('app-version', listener);
    },
});

contextBridge.exposeInMainWorld('ipcNav', {
    onLocationReceived: (listener) => {
        ipcRenderer.on('invoke-navigation', listener);
    },
});

contextBridge.exposeInMainWorld('toggleNotification', {
    onStatusChanged: (listener) => {
        ipcRenderer.on('toggle-notification', listener);
    },
    sendResponse: (notificationStatus) =>
        ipcRenderer.send('notification-status', notificationStatus),
});

contextBridge.exposeInMainWorld('autoLauncher', {
    onStatusChanged: (listener) => {
        ipcRenderer.on('auto-launch-status', listener);
    },
    sendResponse: (status) =>
        ipcRenderer.send('auto-launch-status', status),
});
