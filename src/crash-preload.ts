import { contextBridge, ipcRenderer } from 'electron';
import { CH } from './shared/contract';

export interface CrashInfo {
  message: string;
  stack: string;
  processType: 'main' | 'renderer';
  timestamp: number;
}

declare global {
  interface Window {
    crash: {
      getInfo(): Promise<CrashInfo | null>;
      exportAndRestart(): Promise<void>;
    };
  }
}

const crashBridge = {
  getInfo: () => ipcRenderer.invoke(CH.crashGetInfo) as Promise<CrashInfo | null>,
  exportAndRestart: () => ipcRenderer.invoke(CH.crashExportAndRestart),
};

contextBridge.exposeInMainWorld('crash', crashBridge);
