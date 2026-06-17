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
  onFired: (cb) => {
    const listener = (_e: unknown, event: FiredEvent) => cb(event);
    ipcRenderer.on(CH.eventFired, listener);
    return () => ipcRenderer.removeListener(CH.eventFired, listener);
  },
};

contextBridge.exposeInMainWorld('chrono', bridge);
