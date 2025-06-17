import { contextBridge, ipcRenderer } from 'electron';

console.log('Process versions', process.versions);

contextBridge.exposeInMainWorld('versions', {
  electron: () => process.versions.electron,
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  onAppVersionRecived: (
    listener: (event: Electron.IpcRendererEvent, data: string) => void
  ) => {
    ipcRenderer.on('app-version', listener);
  },
});

contextBridge.exposeInMainWorld('ipcNav', {
  onLocationReceived: (
    listener: (event: Electron.IpcRendererEvent, data: string) => void
  ) => {
    ipcRenderer.on('invoke-navigation', listener);
  },
});

contextBridge.exposeInMainWorld('toggleNotification', {
  onStatusChanged: (
    listener: (event: Electron.IpcRendererEvent, data: boolean) => void
  ) => {
    ipcRenderer.on('toggle-notification', listener);
  },
  sendResponse: (notificationStatus: boolean) =>
    ipcRenderer.send('notification-status', notificationStatus),
});

contextBridge.exposeInMainWorld('autoLauncher', {
  onStatusChanged: (
    listener: (event: Electron.IpcRendererEvent, data: boolean) => void
  ) => {
    ipcRenderer.on('auto-launch-status', listener);
  },
  sendResponse: (status: boolean) =>
    ipcRenderer.send('auto-launch-status', status),
});
