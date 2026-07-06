import { describe, expect, test, vi, beforeEach } from 'vitest';
import { fetchLatestRelease } from '../../../src/main/update/github-client';
import { net } from 'electron';

// Mock electron's net.request API
vi.mock('electron', () => {
  const EventEmitter = require('events');
  const mockRequest = new EventEmitter();
  mockRequest.end = vi.fn();
  mockRequest.on = mockRequest.addListener.bind(mockRequest);
  const request = vi.fn(() => mockRequest);
  return { net: { request } };
});

describe('fetchLatestRelease', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Happy Path: parses successful JSON response with assets', async () => {
    const response = new (require('events').EventEmitter)();
    response.statusCode = 200;
    (net.request as any).mockImplementation(() => {
      const req = new (require('events').EventEmitter)();
      process.nextTick(() => {
        req.emit('response', response);
        response.emit('data', JSON.stringify({
          tag_name: 'v2.0.0',
          body: 'release notes',
          assets: [
            { name: 'chronochime-2.0.0.deb', browser_download_url: 'https://example.com/deb', size: 100 },
          ],
        }));
        response.emit('end');
      });
      req.end = vi.fn();
      return req;
    });

    const release = await fetchLatestRelease();
    expect(release.tag_name).toBe('v2.0.0');
    expect(release.body).toBe('release notes');
    expect(release.assets).toHaveLength(1);
    expect(release.assets[0]?.name).toBe('chronochime-2.0.0.deb');
  });

  test('Failure Mode: DNS / Offline socket error', async () => {
    (net.request as any).mockImplementation(() => {
      const req = new (require('events').EventEmitter)();
      process.nextTick(() => {
        req.emit('error', new Error('getaddrinfo ENOTFOUND api.github.com'));
      });
      req.end = vi.fn();
      return req;
    });

    await expect(fetchLatestRelease()).rejects.toThrow('getaddrinfo ENOTFOUND');
  });

  test('Failure Mode: Malformed JSON (unexpected format)', async () => {
    const response = new (require('events').EventEmitter)();
    response.statusCode = 200;
    (net.request as any).mockImplementation(() => {
      const req = new (require('events').EventEmitter)();
      process.nextTick(() => {
        req.emit('response', response);
        response.emit('data', '{"invalid": json');
        response.emit('end');
      });
      req.end = vi.fn();
      return req;
    });

    await expect(fetchLatestRelease()).rejects.toThrow();
  });

  test('Failure Mode: Missing assets list in response', async () => {
    const response = new (require('events').EventEmitter)();
    response.statusCode = 200;
    (net.request as any).mockImplementation(() => {
      const req = new (require('events').EventEmitter)();
      process.nextTick(() => {
        req.emit('response', response);
        response.emit('data', JSON.stringify({
          tag_name: 'v2.0.0',
          body: 'no assets here',
        }));
        response.emit('end');
      });
      req.end = vi.fn();
      return req;
    });

    await expect(fetchLatestRelease()).rejects.toThrow();
  });

  test('Failure Mode: Empty response body', async () => {
    const response = new (require('events').EventEmitter)();
    response.statusCode = 200;
    (net.request as any).mockImplementation(() => {
      const req = new (require('events').EventEmitter)();
      process.nextTick(() => {
        req.emit('response', response);
        response.emit('data', '');
        response.emit('end');
      });
      req.end = vi.fn();
      return req;
    });

    await expect(fetchLatestRelease()).rejects.toThrow();
  });

  test('Failure Mode: HTTP 3xx, 4xx, 5xx status codes reject the promise', async () => {
    const statusCodes = [301, 400, 404, 500, 503];
    for (const code of statusCodes) {
      const response = new (require('events').EventEmitter)();
      response.statusCode = code;
      (net.request as any).mockImplementation(() => {
        const req = new (require('events').EventEmitter)();
        process.nextTick(() => {
          req.emit('response', response);
          response.emit('data', 'Error body');
          response.emit('end');
        });
        req.end = vi.fn();
        return req;
      });

      await expect(fetchLatestRelease()).rejects.toThrow(`GitHub API returned status code ${code}`);
    }
  });

  test('Prerelease Channel: fetches /releases list, skips drafts, and returns latest pre-release', async () => {
    const response = new (require('events').EventEmitter)();
    response.statusCode = 200;

    (net.request as any).mockImplementation((opts: any) => {
      // Assert it requested the generic releases list URL
      expect(opts.url).toContain('/releases');
      expect(opts.url).not.toContain('/latest');

      const req = new (require('events').EventEmitter)();
      process.nextTick(() => {
        req.emit('response', response);
        response.emit('data', JSON.stringify([
          { tag_name: 'v2.1.0-beta.0', body: 'draft beta', assets: [], draft: true },
          { tag_name: 'v2.0.0-beta.1', body: 'prerelease beta notes', assets: [], draft: false },
          { tag_name: 'v1.0.0', body: 'stable notes', assets: [], draft: false },
        ]));
        response.emit('end');
      });
      req.end = vi.fn();
      return req;
    });

    const release = await fetchLatestRelease('prerelease');
    expect(release.tag_name).toBe('v2.0.0-beta.1'); // selects the first non-draft release
    expect(release.body).toBe('prerelease beta notes');
  });

  test('Prerelease Channel Failure Mode: throws error if no non-draft releases found', async () => {
    const response = new (require('events').EventEmitter)();
    response.statusCode = 200;

    (net.request as any).mockImplementation(() => {
      const req = new (require('events').EventEmitter)();
      process.nextTick(() => {
        req.emit('response', response);
        response.emit('data', JSON.stringify([
          { tag_name: 'v2.1.0-beta.0', body: 'draft beta', assets: [], draft: true },
        ]));
        response.emit('end');
      });
      req.end = vi.fn();
      return req;
    });

    await expect(fetchLatestRelease('prerelease')).rejects.toThrow('No non-draft releases found');
  });
});
