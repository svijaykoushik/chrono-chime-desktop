import { logger } from '../diagnostics/logger';
import { fetchLatestRelease, ReleaseInfo } from './github-client';
import { isNewer } from './version-utils';
import { app, ipcMain } from 'electron';
import { CH, updateCheckResult } from '../../shared/contract';

/**
 * Service that periodically checks GitHub for a newer release.
 * It stores the latest release info in memory and exposes an IPC handler
 * for the renderer to request the current status.
 */
export class UpdateService {
  private timer: NodeJS.Timeout | null = null;
  private latest: ReleaseInfo | null = null;
  private readonly intervalMs = 24 * 60 * 60 * 1000; // 24 h

  constructor() {
    // Immediate check on startup
    this.checkForUpdates();
    // Schedule recurring checks
    this.timer = setInterval(() => this.checkForUpdates(), this.intervalMs);
    // Register IPC handler if the electron ipcMain API is available (tests may mock it)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore – ipcMain may be undefined in a mocked environment
    if (typeof ipcMain !== 'undefined' && ipcMain && typeof ipcMain.handle === 'function') {
      ipcMain.handle(CH.updateCheck, async () => this.getCheckResult());
    }
  }

  /** Perform a single check against GitHub. */
  async checkForUpdates(): Promise<void> {
    try {
      const release = await fetchLatestRelease();
      const currentVersion = app.getVersion();
      if (isNewer(release.tag_name, currentVersion)) {
        this.latest = release;
        logger.info('Update available', { currentVersion, latest: release.tag_name });
      } else {
        this.latest = null;
        logger.info('No update needed', { currentVersion });
      }
    } catch (e) {
      logger.error('Failed to check for updates', e as any);
    }
  }

  /** Return the result object for the renderer. */
  async getCheckResult() {
    if (this.latest) {
      return updateCheckResult.parse({
        available: true,
        latestVersion: this.latest.tag_name,
        notes: this.latest.body,
      });
    }
    return updateCheckResult.parse({ available: false });
  }

  /** Clean up when the app quits. */
  dispose() {
    if (this.timer) clearInterval(this.timer);
  }
}
