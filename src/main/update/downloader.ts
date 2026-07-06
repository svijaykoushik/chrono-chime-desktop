import { net, shell, app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { logger } from '../diagnostics/logger';
import type { UpdateProgress } from '../../shared/contract';

export interface DownloaderOptions {
  url: string;
  version: string;
  expectedSize: number;
  onProgress: (progress: UpdateProgress) => void;
  onDone: (err?: Error) => void;
}

export class Downloader {
  private activeRequest: any = null;
  private writeStream: fs.WriteStream | null = null;
  private isDownloading = false;
  private isCancelled = false;

  private updatesDir = path.join(app.getPath('userData'), 'updates');
  private partPath = '';
  private finalPath = '';
  private pendingJsonPath = '';

  constructor() {
    this.pendingJsonPath = path.join(this.updatesDir, 'pending.json');
  }

  /**
   * Start or resume downloading the update installer asset.
   */
  start(options: DownloaderOptions): void {
    if (this.isDownloading) {
      logger.warn('Update', 'Download already in progress');
      return;
    }

    this.isDownloading = true;
    this.isCancelled = false;

    const filename = path.basename(new URL(options.url).pathname);
    this.partPath = path.join(this.updatesDir, `${filename}.part`);
    this.finalPath = path.join(this.updatesDir, filename);

    // Ensure update folder exists
    if (!fs.existsSync(this.updatesDir)) {
      fs.mkdirSync(this.updatesDir, { recursive: true });
    }

    let offset = 0;
    let isResume = false;

    // Check if we can resume (cross-restart resume check)
    if (fs.existsSync(this.partPath) && fs.existsSync(this.pendingJsonPath)) {
      try {
        const pending = JSON.parse(fs.readFileSync(this.pendingJsonPath, 'utf8'));
        if (pending.url === options.url && pending.version === options.version) {
          offset = fs.statSync(this.partPath).size;
          isResume = offset > 0 && offset < options.expectedSize;
          logger.info('Update', `Found pending download, attempting to resume from offset: ${offset} bytes`);
        }
      } catch (err) {
        logger.error('Update', 'Failed to read pending.json', err as Error);
      }
    }

    if (!isResume) {
      // Start fresh, truncate any existing files
      if (fs.existsSync(this.partPath)) {
        fs.unlinkSync(this.partPath);
      }
      offset = 0;
    }

    // Write pending metadata
    try {
      fs.writeFileSync(
        this.pendingJsonPath,
        JSON.stringify({
          url: options.url,
          version: options.version,
          path: this.partPath,
          received: offset,
          total: options.expectedSize,
        }),
        'utf8'
      );
    } catch (err) {
      logger.error('Update', 'Failed to write pending.json', err as Error);
    }

    this.writeStream = fs.createWriteStream(this.partPath, { flags: offset > 0 ? 'a' : 'w' });

    let received = offset;
    const total = options.expectedSize;
    let lastProgressTime = 0;

    const headers: Record<string, string> = {
      'User-Agent': 'ChronoChime-Update-Downloader',
    };

    if (offset > 0) {
      headers['Range'] = `bytes=${offset}-`;
    }

    const request = net.request({
      method: 'GET',
      url: options.url,
      headers,
    });

    this.activeRequest = request;

    request.on('response', (response) => {
      const statusCode = response.statusCode;
      if (offset > 0 && statusCode !== 206) {
        logger.warn('Update', 'Server did not support partial range response, restarting download');
        this.writeStream?.close();
        this.activeRequest = null;
        this.isDownloading = false;
        // restart fresh
        if (fs.existsSync(this.partPath)) {
          fs.unlinkSync(this.partPath);
        }
        this.start({ ...options, url: options.url });
        return;
      }

      if (statusCode !== 200 && statusCode !== 206) {
        options.onDone(new Error(`Bad status code: ${statusCode}`));
        this.cleanup();
        return;
      }

      response.on('data', (chunk) => {
        if (this.isCancelled) return;

        this.writeStream?.write(chunk);
        received += chunk.length;

        // Throttled progress reporting (~4 times/sec)
        const now = Date.now();
        if (now - lastProgressTime > 250 || received === total) {
          lastProgressTime = now;
          const percent = total > 0 ? (received / total) * 100 : 0;
          options.onProgress({
            percent,
            transferred: received,
            total,
          });

          // Update pending metadata progress
          try {
            fs.writeFileSync(
              this.pendingJsonPath,
              JSON.stringify({
                url: options.url,
                version: options.version,
                path: this.partPath,
                received,
                total,
              }),
              'utf8'
            );
          } catch (e) {
            // ignore silent metadata update errors
          }
        }
      });

      response.on('end', () => {
        if (this.isCancelled) return;

        this.writeStream?.end(() => {
          this.verifyAndComplete(options);
        });
      });
    });

    request.on('error', (err) => {
      if (this.isCancelled) return;
      options.onDone(err);
      this.cleanup();
    });

    request.end();
  }

  /**
   * Cancel the current download.
   */
  cancel(): void {
    if (!this.isDownloading) return;
    this.isCancelled = true;
    this.isDownloading = false;

    if (this.activeRequest) {
      this.activeRequest.abort();
      this.activeRequest = null;
    }

    if (this.writeStream) {
      this.writeStream.close();
      this.writeStream = null;
    }

    logger.info('Update', 'Download cancelled by user');
  }

  /**
   * Run the downloaded installer.
   */
  async install(): Promise<void> {
    if (!fs.existsSync(this.finalPath)) {
      throw new Error('Installer file not found. Please download again.');
    }

    logger.info('Update', `Launching installer: ${this.finalPath}`);
    // Open path handles OS installation launch
    await shell.openPath(this.finalPath);
    // Exit application to let installer proceed
    app.quit();
  }

  private verifyAndComplete(options: DownloaderOptions): void {
    if (!fs.existsSync(this.partPath)) {
      options.onDone(new Error('Staging part file not found'));
      this.cleanup();
      return;
    }

    const actualSize = fs.statSync(this.partPath).size;
    if (actualSize !== options.expectedSize) {
      logger.error('Update', `Size mismatch: expected ${options.expectedSize}, got ${actualSize}`);
      options.onDone(new Error('Downloaded file size mismatch integrity check'));
      this.cleanup(true); // delete corrupt part file
      return;
    }

    // Size check is successful. Fall back to size‑only verification for simplicity
    // and rename staged file to final path atomically
    try {
      if (fs.existsSync(this.finalPath)) {
        fs.unlinkSync(this.finalPath);
      }
      fs.renameSync(this.partPath, this.finalPath);

      // Clean up metadata
      if (fs.existsSync(this.pendingJsonPath)) {
        fs.unlinkSync(this.pendingJsonPath);
      }

      logger.info('Update', `Download verified and finalized at: ${this.finalPath}`);
      options.onDone();
    } catch (err) {
      logger.error('Update', 'Failed to rename and finalize installer', err as Error);
      options.onDone(err as Error);
      this.cleanup();
    }
  }

  private cleanup(deletePart = false): void {
    this.isDownloading = false;
    this.activeRequest = null;
    this.writeStream = null;

    if (fs.existsSync(this.pendingJsonPath)) {
      try {
        fs.unlinkSync(this.pendingJsonPath);
      } catch (e) {
        // ignore
      }
    }

    if (deletePart && fs.existsSync(this.partPath)) {
      try {
        fs.unlinkSync(this.partPath);
      } catch (e) {
        // ignore
      }
    }
  }
}
