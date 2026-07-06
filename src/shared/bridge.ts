import type { Reminder, ReminderInput } from './reminder';
import type { RoutineInput } from './routine';
import type { Settings, UpdateCheckResult, UpdateProgress, InstallResult } from './contract';

/** Shape of a fired-event payload pushed from main → renderer. */
export interface FiredEvent {
  reminderId: string;
  title: string;
  body: string;
  /** built-in sound id / custom path to play, or null when silenced. */
  sound: string | null;
  firedAt: number;
}

export interface RoutineView {
  id: string;
  title: string;
  type: string;
  enabled: boolean;
  children: Reminder[];
}

export interface CrashInfo {
  message: string;
  stack: string;
  processType: 'main' | 'renderer';
  timestamp: number;
}

/** The typed API exposed on `window.chrono` by the preload bridge. */
export interface ChronoBridge {
  reminders: {
    list(query?: string): Promise<Reminder[]>;
    create(input: ReminderInput): Promise<Reminder>;
    update(id: string, patch: Partial<ReminderInput>): Promise<Reminder | undefined>;
    setEnabled(ids: string[], enabled: boolean): Promise<Reminder[]>;
    delete(ids: string[]): Promise<number>;
  };
  routines: {
    list(): Promise<RoutineView[]>;
    create(input: RoutineInput): Promise<RoutineView>;
    setEnabled(id: string, enabled: boolean): Promise<void>;
    delete(id: string): Promise<number>;
  };
  settings: {
    get(): Promise<Settings>;
    update(patch: Partial<Settings>): Promise<Settings>;
  };
  sound: {
    preview(soundId: string): Promise<void>;
  };
  diagnostics: {
    exportLogs(): Promise<void>;
    openLogsDir(): Promise<void>;
  };
  crash: {
    getInfo(): Promise<CrashInfo | null>;
    exportAndRestart(): Promise<void>;
  };
  update: {
    check(): Promise<UpdateCheckResult>;
    download(): Promise<void>;
    cancelDownload(): Promise<void>;
    install(): Promise<void>;
    getVersion(): Promise<string>;
    onDownloadProgress(cb: (progress: UpdateProgress) => void): () => void;
    onInstallResult(cb: (result: InstallResult) => void): () => void;
  };
  onFired(cb: (event: FiredEvent) => void): () => void;
}

declare global {
  interface Window {
    chrono: ChronoBridge;
  }
}
