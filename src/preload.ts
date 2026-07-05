import 'electron-log/preload'; // bridges electron-log/renderer → main under sandbox (D§1.2.1)
import { contextBridge, ipcRenderer } from 'electron';
import { CH } from './shared/contract';
import type { ChronoBridge, FiredEvent } from './shared/bridge';

const bridge: ChronoBridge = {
  reminders: {
    list: (query) => ipcRenderer.invoke(CH.reminderList, { query }),
    create: (input) => ipcRenderer.invoke(CH.reminderCreate, input),
    update: (id, patch) => ipcRenderer.invoke(CH.reminderUpdate, { id, patch }),
    setEnabled: (ids, enabled) => ipcRenderer.invoke(CH.reminderSetEnabled, { ids, enabled }),
    delete: (ids) => ipcRenderer.invoke(CH.reminderDelete, { ids }),
  },
  routines: {
    list: () => ipcRenderer.invoke(CH.routineList),
    create: (input) => ipcRenderer.invoke(CH.routineCreate, input),
    setEnabled: (id, enabled) => ipcRenderer.invoke(CH.routineSetEnabled, { id, enabled }),
    delete: (id) => ipcRenderer.invoke(CH.routineDelete, { id }),
  },
  settings: {
    get: () => ipcRenderer.invoke(CH.settingsGet),
    update: (patch) => ipcRenderer.invoke(CH.settingsUpdate, patch),
  },
  sound: {
    preview: (soundId) => ipcRenderer.invoke(CH.soundPreview, { soundId }),
  },
  diagnostics: {
    exportLogs: () => ipcRenderer.invoke(CH.diagnosticsExport),
    openLogsDir: () => ipcRenderer.invoke(CH.diagnosticsOpenDir),
  },
  crash: {
    getInfo: () => ipcRenderer.invoke(CH.crashGetInfo),
    exportAndRestart: () => ipcRenderer.invoke(CH.crashExportAndRestart),
  },
  update: {
    // Returns {available:boolean, latestVersion?, notes?}
    check: () => ipcRenderer.invoke(CH.updateCheck),
    download: () => ipcRenderer.invoke(CH.updateDownload),
    cancelDownload: () => ipcRenderer.invoke(CH.updateCancelDownload),
    install: () => ipcRenderer.invoke(CH.updateInstall),
    // Register a listener for download progress events
    onDownloadProgress: (cb: (progress: any) => void) => {
      const listener = (_e: unknown, progress: any) => cb(progress);
      ipcRenderer.on(CH.updateDownloadProgress, listener);
      return () => ipcRenderer.removeListener(CH.updateDownloadProgress, listener);
    },
    // Register a listener for install result events
    onInstallResult: (cb: (result: any) => void) => {
      const listener = (_e: unknown, result: any) => cb(result);
      ipcRenderer.on(CH.updateInstallResult, listener);
      return () => ipcRenderer.removeListener(CH.updateInstallResult, listener);
    },
  },
  onFired: (cb) => {
    const listener = (_e: unknown, event: FiredEvent) => cb(event);
    ipcRenderer.on(CH.eventFired, listener);
    return () => ipcRenderer.removeListener(CH.eventFired, listener);
  },
};

contextBridge.exposeInMainWorld('chrono', bridge);
