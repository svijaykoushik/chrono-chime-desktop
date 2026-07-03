import { describe, expect, test, vi, beforeEach } from 'vitest';
import { UpdateService } from '../../../src/main/update/update-service';
import * as github from '../../../src/main/update/github-client';
import * as version from '../../../src/main/update/version-utils';
import { app } from 'electron';

vi.mock('electron', async () => {
  const actual = await vi.importActual('electron');
  // Provide a minimal ipcMain mock with a handle method that does nothing.
  const ipcMain = { handle: vi.fn() } as any;
  return { ...actual, app: { getVersion: vi.fn(() => 'v1.0.0') }, ipcMain };
});

vi.mock('../../../src/main/update/github-client');
vi.mock('../../../src/main/update/version-utils');

describe('UpdateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('detects newer release and stores it', async () => {
    (github.fetchLatestRelease as any).mockResolvedValue({
      tag_name: 'v2.0.0',
      body: 'release notes',
      assets: [],
    });
    (version.isNewer as any).mockReturnValue(true);

    const service = new UpdateService();
    // wait for async check to complete
    await service.checkForUpdates();
    const result = await service.getCheckResult();
    expect(result.available).toBe(true);
    expect(result.latestVersion).toBe('v2.0.0');
    expect(result.notes).toBe('release notes');
    service.dispose();
  });

  test('no update when current version is latest', async () => {
    (github.fetchLatestRelease as any).mockResolvedValue({
      tag_name: 'v1.0.0',
      body: '',
      assets: [],
    });
    (version.isNewer as any).mockReturnValue(false);

    const service = new UpdateService();
    await service.checkForUpdates();
    const result = await service.getCheckResult();
    expect(result.available).toBe(false);
    service.dispose();
  });
});
