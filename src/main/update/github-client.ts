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
export async function fetchLatestRelease(channel: 'stable' | 'prerelease' = 'stable'): Promise<ReleaseInfo> {
  return new Promise((resolve, reject) => {
    const url = channel === 'stable'
      ? 'https://api.github.com/repos/vijaykoushik/chrono-chime-desktop/releases/latest'
      : 'https://api.github.com/repos/vijaykoushik/chrono-chime-desktop/releases';

    const request = net.request({
      method: 'GET',
      url,
      headers: { 'User-Agent': 'ChronoChime-Update-Checker' },
    });

    let raw = '';
    request.on('response', (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`GitHub API returned status code ${response.statusCode}`));
        return;
      }
      response.on('data', (chunk) => (raw += chunk.toString()));
      response.on('end', () => {
        try {
          const json = JSON.parse(raw);
          let targetRelease = json;

          if (channel === 'prerelease') {
            if (!Array.isArray(json)) {
              throw new Error('Expected JSON array from GitHub releases list API');
            }
            // Find the latest release that is not a draft (can be stable or pre-release)
            const latest = json.find((r: any) => !r.draft);
            if (!latest) {
              throw new Error('No non-draft releases found');
            }
            targetRelease = latest;
          }

          const info: ReleaseInfo = {
            tag_name: targetRelease.tag_name,
            body: targetRelease.body ?? '',
            assets: targetRelease.assets.map((a: any) => ({
              name: a.name,
              browser_download_url: a.browser_download_url,
              size: a.size,
            })),
          };
          resolve(info);
        } catch (e) {
          logger.error('Update', 'Failed to parse GitHub release JSON', e as Error);
          reject(e);
        }
      });
    });

    request.on('error', (err) => {
      logger.error('Update', 'GitHub release request error', err);
      reject(err);
    });

    request.end();
  });
}
