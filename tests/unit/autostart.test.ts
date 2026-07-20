import { beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';

const originalPlatform = process.platform;

const mockFs = {
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  rmSync: vi.fn(),
};

const mockApp = {
  getLoginItemSettings: vi.fn(),
  setLoginItemSettings: vi.fn(),
};

vi.mock('electron', async () => {
  const actual = await vi.importActual('electron');
  return {
    ...actual,
    app: mockApp,
  };
});

vi.mock('node:fs', () => mockFs);
vi.mock('node:os', () => ({ homedir: vi.fn(() => '/home/testuser') }));

function setPlatform(platform: string) {
  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true,
  });
}

describe('autostart persistence', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    setPlatform(originalPlatform);
  });

  it('reads Linux autostart state from the XDG entry file', async () => {
    setPlatform('linux');
    const { getAutoStart } = await import('../../src/main/autostart');

    mockFs.existsSync.mockReturnValueOnce(true);

    expect(getAutoStart()).toBe(true);
    expect(mockFs.existsSync).toHaveBeenCalledWith(path.join('/home/testuser', '.config', 'autostart', 'chronochime.desktop'));
  });

  it('writes a Linux autostart entry with --start-minimized when requested', async () => {
    setPlatform('linux');
    const { setAutoStart, START_MINIMIZED_ARG } = await import('../../src/main/autostart');

    mockFs.existsSync.mockReturnValue(false);

    setAutoStart(true, true);

    expect(mockFs.mkdirSync).toHaveBeenCalledWith(path.join('/home/testuser', '.config', 'autostart'), { recursive: true });
    expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1);
    const [writePath, contents] = mockFs.writeFileSync.mock.calls[0] as [string, string];
    expect(writePath).toBe(path.join('/home/testuser', '.config', 'autostart', 'chronochime.desktop'));
    expect(contents).toContain(`Exec=${process.execPath} ${START_MINIMIZED_ARG}`);
  });

  it('writes a Linux autostart entry without --start-minimized when disabled', async () => {
    setPlatform('linux');
    const { setAutoStart } = await import('../../src/main/autostart');

    mockFs.existsSync.mockReturnValue(false);

    setAutoStart(true, false);

    expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1);
    const [, contents] = mockFs.writeFileSync.mock.calls[0] as [string, string];
    expect(contents).toContain(`Exec=${process.execPath}`);
    expect(contents).not.toContain('--start-minimized');
  });

  it('removes the Linux autostart file when disabling auto-start', async () => {
    setPlatform('linux');
    const { setAutoStart } = await import('../../src/main/autostart');

    mockFs.existsSync.mockReturnValue(true);

    setAutoStart(false, true);

    expect(mockFs.rmSync).toHaveBeenCalledWith(path.join('/home/testuser', '.config', 'autostart', 'chronochime.desktop'));
  });

  it('reads Windows app login-item state', async () => {
    setPlatform('win32');
    const { getAutoStart } = await import('../../src/main/autostart');

    mockApp.getLoginItemSettings.mockReturnValue({ openAtLogin: true });

    expect(getAutoStart()).toBe(true);
    expect(mockApp.getLoginItemSettings).toHaveBeenCalled();
  });

  it('configures Windows login-item args to include --start-minimized when enabled', async () => {
    setPlatform('win32');
    const { setAutoStart, START_MINIMIZED_ARG } = await import('../../src/main/autostart');

    setAutoStart(true, true);

    expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith({
      openAtLogin: true,
      args: [START_MINIMIZED_ARG],
    });
  });

  it('configures Windows login-item args as empty when start minimized is disabled', async () => {
    setPlatform('win32');
    const { setAutoStart } = await import('../../src/main/autostart');

    setAutoStart(true, false);

    expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith({
      openAtLogin: true,
      args: [],
    });
  });
});
