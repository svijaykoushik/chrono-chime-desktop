import { ipcMain, IpcMainInvokeEvent } from 'electron';
import Store from 'electron-store';

interface Settings {
  autoLaunch: boolean;
  isOff: boolean;
  interval: string;
  notificationSound: string;
  notificationTitle: string;
  notificationContent: string;
}

const defaultSettings: Settings = {
  autoLaunch: false,
  isOff: false,
  interval: '1',
  notificationSound: 'sound1',
  notificationTitle: 'Time Keeper Extraordinaire',
  notificationContent: 'This is a personalized notification from ChronoChime!',
};

class SettingsManager {
  private static instance: SettingsManager;
  private store: Store<Settings>;

  private constructor() {
    this.store = new Store<Settings>({ defaults: defaultSettings });
    this.setupIpcEvents();
  }

  public static get Instance() {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  private setupIpcEvents() {
    ipcMain.handle(
      'get-settings',
      (event: IpcMainInvokeEvent) => {
        return this.getSettings();
      }
    );

    ipcMain.on(
      'save-settings',
      (event: IpcMainInvokeEvent, settings: Settings) => {
        this.saveSettings(settings);
      }
    );
  }

  public getSettings(): Settings {
    return this.store.store;
  }

  public saveSettings(settings: Settings) {
    this.store.set(settings);
  }
}

export const settingsManager = SettingsManager.Instance;
