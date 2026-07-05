import { logger } from '../diagnostics/logger';
import { fetchLatestRelease, ReleaseInfo } from './github-client';
import { isNewer } from './version-utils';
import { selectAsset } from './asset-select';
import { Downloader } from './downloader';
import { app, ipcMain, BrowserWindow } from 'electron';
import { CH, updateCheckResult } from '../../shared/contract';
import process from 'node:process';

/**
 * Service that periodically checks GitHub for a newer release.
 * It stores the latest release info in memory and exposes an IPC handler
 * for the renderer to request the current status.
 */
export class UpdateService {
  private timer: NodeJS.Timeout | null = null;
  private latest: ReleaseInfo | null = null;
  private readonly intervalMs = 24 * 60 * 60 * 1000; // 24 h
  private downloader = new Downloader();

  constructor(getMainWindow?: () => BrowserWindow | null) {
    // Immediate check on startup
    this.checkForUpdates();
    // Schedule recurring checks
    this.timer = setInterval(() => this.checkForUpdates(), this.intervalMs);
    // Register IPC handlers if the electron ipcMain API is available (tests may mock it)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore – ipcMain may be undefined in a mocked environment
    if (typeof ipcMain !== 'undefined' && ipcMain && typeof ipcMain.handle === 'function') {
      ipcMain.handle(CH.updateGetVersion, async () => {
        return app.getVersion();
      });

      ipcMain.handle(CH.updateCheck, async () => {
        logger.info('Update', 'Manual update check requested by user');
        await this.checkForUpdates();
        return this.getCheckResult();
      });

      ipcMain.handle(CH.updateDownload, async () => {
        if (!this.latest) {
          throw new Error('No update information available. Please check for updates first.');
        }
        const assetUrl = selectAsset(this.latest.assets, process.platform);
        if (!assetUrl) {
          throw new Error(`No installer asset found for platform: ${process.platform}`);
        }
        const asset = this.latest.assets.find((a) => a.browser_download_url === assetUrl)!;

        logger.info('Update', `Starting download for update asset: ${asset.name}`);
        this.downloader.start({
          url: assetUrl,
          version: this.latest.tag_name,
          expectedSize: asset.size,
          onProgress: (p) => {
            const win = getMainWindow ? getMainWindow() : null;
            if (win && !win.isDestroyed()) {
              win.webContents.send(CH.updateDownloadProgress, p);
            }
          },
          onDone: (err) => {
            const win = getMainWindow ? getMainWindow() : null;
            if (win && !win.isDestroyed()) {
              win.webContents.send(CH.updateInstallResult, {
                success: !err,
                error: err?.message,
              });
            }
          },
        });
      });

      ipcMain.handle(CH.updateCancelDownload, async () => {
        this.downloader.cancel();
      });

      ipcMain.handle(CH.updateInstall, async () => {
        await this.downloader.install();
      });
    }
  }

  /** Perform a single check against GitHub. */
  async checkForUpdates(): Promise<void> {
    try {
      const release = await fetchLatestRelease();
      const currentVersion = app.getVersion();
      if (isNewer(release.tag_name, currentVersion)) {
        this.latest = release;
        logger.info('Update', 'Update available', { currentVersion, latest: release.tag_name });
      } else {
        this.latest = null;
        logger.info('Update', 'No update needed', { currentVersion });
      }
    } catch (e) {
      logger.error('Update', 'Failed to check for updates', e as Error);
    }
  }

  /** Return the result object for the renderer. */
  async getCheckResult() {
    if (this.latest) {
      const assetUrl = selectAsset(this.latest.assets, process.platform) || undefined;
      return updateCheckResult.parse({
        available: true,
        latestVersion: this.latest.tag_name,
        notes: this.latest.body,
        assetUrl,
      });
    }
    return updateCheckResult.parse({ available: false });
  }

  /** Clean up when the app quits. */
  dispose() {
    if (this.timer) clearInterval(this.timer);
  }
}
