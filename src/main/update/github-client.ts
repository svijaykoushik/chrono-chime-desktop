import { net } from 'electron';
import { logger } from '../diagnostics/logger';

/** Minimal shape of a GitHub release we need */
export interface ReleaseInfo {
  tag_name: string; // e.g. "v1.2.3"
  body: string; // markdown release notes
  assets: Array<{ name: string; browser_download_url: string; size: number }>;
}

/**
 * Fetch the latest release from the ChronoChime GitHub repository.
 * Returns a promise that resolves to {@link ReleaseInfo}.
 */
export async function fetchLatestRelease(): Promise<ReleaseInfo> {
  return new Promise((resolve, reject) => {
    const request = net.request({
      method: 'GET',
      url: 'https://api.github.com/repos/vijaykoushik/chrono-chime-desktop/releases/latest',
      headers: { 'User-Agent': 'ChronoChime-Update-Checker' },
    });

    let raw = '';
    request.on('response', (response) => {
      response.on('data', (chunk) => (raw += chunk.toString()));
      response.on('end', () => {
        try {
          const json = JSON.parse(raw);
          const info: ReleaseInfo = {
            tag_name: json.tag_name,
            body: json.body ?? '',
            assets: json.assets.map((a: any) => ({
              name: a.name,
              browser_download_url: a.browser_download_url,
              size: a.size,
            })),
          };
          resolve(info);
        } catch (e) {
          logger.error('Failed to parse GitHub release JSON', e as any);
          reject(e);
        }
      });
    });

    request.on('error', (err) => {
      logger.error('GitHub release request error', err);
      reject(err);
    });

    request.end();
  });
}
