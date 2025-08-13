import { app, ipcMain, IpcMainInvokeEvent, Notification, BrowserWindow } from 'electron';
import { clock } from './clock/clock';
import { settingsManager } from './settings-manager';

class NotificationScheduler {
  private static instance: NotificationScheduler;
  private notificationInterval: NodeJS.Timeout;
  private countdownTimeRemaining = 0;
  private nextHourTimeout: NodeJS.Timeout;

  private constructor() {
    this.setupClockEvents();
    this.setupIpcEvents();
  }

  public static get Instance() {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler();
    }
    return NotificationScheduler.instance;
  }

  private setupClockEvents() {
    clock.on('tick', () => {
      this.updateCountdown();
    });
  }

  private setupIpcEvents() {
    ipcMain.on('schedule-notifications', () => {
      this.scheduleNotifications();
    });
  }

  private updateCountdown() {
    if (this.countdownTimeRemaining > 0) {
      this.countdownTimeRemaining -= 1000;
    }

    const hours = Math.floor(this.countdownTimeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor(
      (this.countdownTimeRemaining % (1000 * 60 * 60)) / (1000 * 60)
    );
    const seconds = Math.floor(
      (this.countdownTimeRemaining % (1000 * 60)) / 1000
    );

    let text = `Next notification in ${minutes}m ${seconds}s`;
    if (hours > 0) {
      text = `Next notification in ${hours}h ${minutes}m ${seconds}s`;
    }

    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].webContents.send('countdown-update', text);
    }
  }

  private showNotification() {
    const settings = settingsManager.getSettings();
    const options = {
      title: settings.notificationTitle,
      body: settings.notificationContent,
      icon: 'chrono-chime-icon-192.png',
      silent: settings.notificationSound === 'mute',
    };

    const notification = new Notification(options);

    if (settings.notificationSound !== 'mute') {
      // Play sound logic here if needed, for now, it's handled by the notification itself
    }

    notification.show();
  }

  private clearIntervals() {
    clearTimeout(this.nextHourTimeout);
    clearInterval(this.notificationInterval);
  }

  private setNextNotificationInterval(intervalHours: number) {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + intervalHours, 0, 0, 0);
    return nextHour.getTime() - now.getTime();
  }

  public scheduleNotifications() {
    const settings = settingsManager.getSettings();

    if (settings.isOff) {
      this.clearIntervals();
      return;
    }

    let intervalHours = 1;
    switch (settings.interval) {
      case '1':
        intervalHours = 1;
        break;
      case '2':
        intervalHours = 2;
        break;
      case '3':
        intervalHours = 3;
        break;
      default:
        intervalHours = 1;
        break;
    }

    this.clearIntervals();

    const timeUntilNextHour = this.setNextNotificationInterval(intervalHours);
    this.countdownTimeRemaining = timeUntilNextHour;

    this.nextHourTimeout = setTimeout(() => {
      this.showNotification();
      this.countdownTimeRemaining = intervalHours * 60 * 60 * 1000;

      this.notificationInterval = setInterval(() => {
        this.showNotification();
        this.countdownTimeRemaining = intervalHours * 60 * 60 * 1000;
      }, intervalHours * 60 * 60 * 1000);
    }, timeUntilNextHour);
  }
}

export const notificationScheduler = NotificationScheduler.Instance;
