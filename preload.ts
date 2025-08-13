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

contextBridge.exposeInMainWorld('settings', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: unknown) => ipcRenderer.send('save-settings', settings),
  onCountdownUpdate: (
    listener: (event: Electron.IpcRendererEvent, data: string) => void
  ) => {
    ipcRenderer.on('countdown-update', listener);
  },
});
