import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { UpdateService } from '../../../src/main/update/update-service';
import * as github from '../../../src/main/update/github-client';
import { app, ipcMain } from 'electron';
import { CH } from '../../../src/shared/contract';

vi.mock('electron', async () => {
  const actual = await vi.importActual('electron');
  // Provide a minimal ipcMain mock with a handle method.
  const handlers: Record<string, Function> = {};
  const ipcMain = {
    handle: vi.fn((channel, fn) => {
      handlers[channel] = fn;
    }),
    // Helper for testing to retrieve registered handlers
    _getHandler: (channel: string) => handlers[channel],
  } as any;

  return {
    ...actual,
    app: {
      getVersion: vi.fn(() => '1.0.0'),
      getPath: vi.fn(() => '/tmp/mock-userData-us'),
    },
    ipcMain,
  };
});

vi.mock('../../../src/main/update/github-client');

describe('UpdateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('Happy Path: detects newer release natively using version comparison', async () => {
    vi.mocked(app.getVersion).mockReturnValue('1.0.0');
    vi.mocked(github.fetchLatestRelease).mockResolvedValue({
      tag_name: 'v2.0.0',
      body: 'new version release notes',
      assets: [
        { name: 'setup.exe', browser_download_url: 'https://example.com/setup.exe', size: 100 },
        { name: 'setup.deb', browser_download_url: 'https://example.com/setup.deb', size: 150 },
      ],
    });

    const service = new UpdateService();
    // Wait for the immediate constructor check
    await service.checkForUpdates();

    const result = await service.getCheckResult();
    expect(result.available).toBe(true);
    expect(result.latestVersion).toBe('v2.0.0');
    expect(result.notes).toBe('new version release notes');
    
    const expectedUrl = process.platform === 'win32'
      ? 'https://example.com/setup.exe'
      : (process.platform === 'linux' ? 'https://example.com/setup.deb' : undefined);
    expect(result.assetUrl).toBe(expectedUrl);
    service.dispose();
  });

  test('Happy Path: no update when current version is latest or newer', async () => {
    vi.mocked(app.getVersion).mockReturnValue('1.0.0');
    vi.mocked(github.fetchLatestRelease).mockResolvedValue({
      tag_name: 'v1.0.0',
      body: '',
      assets: [],
    });

    const service = new UpdateService();
    await service.checkForUpdates();

    const result = await service.getCheckResult();
    expect(result.available).toBe(false);
    service.dispose();
  });

  test('Observable Behavior: registers IPC handlers on creation', () => {
    const service = new UpdateService();
    expect(ipcMain.handle).toHaveBeenCalledWith(CH.updateGetVersion, expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith(CH.updateCheck, expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith(CH.updateDownload, expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith(CH.updateCancelDownload, expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith(CH.updateInstall, expect.any(Function));
    service.dispose();
  });

  test('Observable Behavior: updateGetVersion IPC handler returns current app version', async () => {
    vi.mocked(app.getVersion).mockReturnValue('1.2.3');
    const service = new UpdateService();
    const handler = (ipcMain as any)._getHandler(CH.updateGetVersion);
    expect(handler).toBeDefined();

    const version = await handler();
    expect(version).toBe('1.2.3');
    service.dispose();
  });

  test('Observable Behavior: manual check triggers a live check over IPC', async () => {
    vi.mocked(app.getVersion).mockReturnValue('1.0.0');
    vi.mocked(github.fetchLatestRelease).mockResolvedValue({
      tag_name: 'v3.0.0',
      body: 'manual check notes',
      assets: [],
    });

    const service = new UpdateService();
    const handler = (ipcMain as any)._getHandler(CH.updateCheck);
    expect(handler).toBeDefined();

    // Trigger the manual IPC handler, which should run a live check
    const result = await handler();
    expect(github.fetchLatestRelease).toHaveBeenCalledTimes(2); // constructor + manual trigger
    expect(result.available).toBe(true);
    expect(result.latestVersion).toBe('v3.0.0');
    service.dispose();
  });

  test('Observable Behavior: schedules check every 24 hours', async () => {
    const service = new UpdateService();
    expect(github.fetchLatestRelease).toHaveBeenCalledTimes(1); // startup

    // Advance time by 24 hours
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
    expect(github.fetchLatestRelease).toHaveBeenCalledTimes(2); // periodic check triggered

    // Advance another 24 hours
    await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
    expect(github.fetchLatestRelease).toHaveBeenCalledTimes(3);

    service.dispose();
  });

  test('Failure Mode: handles GitHub request failure gracefully without throwing', async () => {
    vi.mocked(github.fetchLatestRelease).mockRejectedValue(new Error('Network disconnected'));

    const service = new UpdateService();
    // verify it doesn't crash on checklist trigger
    await expect(service.checkForUpdates()).resolves.toBeUndefined();

    const result = await service.getCheckResult();
    expect(result.available).toBe(false);
    service.dispose();
  });

  test('Failure Mode: handles GitHub HTTP 3xx, 4xx, 5xx status failures gracefully without crashing', async () => {
    const errorCodes = [302, 400, 404, 500, 503];
    for (const code of errorCodes) {
      vi.mocked(github.fetchLatestRelease).mockRejectedValue(new Error(`GitHub API returned status code ${code}`));

      const service = new UpdateService();
      await expect(service.checkForUpdates()).resolves.toBeUndefined();

      const result = await service.getCheckResult();
      expect(result.available).toBe(false);
      service.dispose();
    }
  });
});
