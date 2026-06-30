import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    relaunch: vi.fn(),
    exit: vi.fn(),
  },
  dialog: {
    showSaveDialog: vi.fn(),
  },
}));

describe('Crash handlers', () => {
  let crashModule: typeof import('../../src/main/diagnostics/crash');

  beforeEach(async () => {
    vi.resetModules();
    crashModule = await import('../../src/main/diagnostics/crash');
  });

  it('starts with no crash info', () => {
    expect(crashModule.getCrashInfo()).toBeNull();
  });

  it('captures renderer process crash info from render-process-gone', () => {
    const showCrashWindow = vi.fn();
    const appExit = vi.fn();
    const handlers = crashModule.installCrashHandlers(showCrashWindow, appExit);

    handlers.onRenderProcessGone({} as any, {
      reason: 'renderer crash',
      reasonText: 'crashed',
    } as any);

    expect(showCrashWindow).toHaveBeenCalledTimes(1);
    const crash = showCrashWindow.mock.calls[0]?.[0];
    expect(crash).toBeDefined();
    expect(crash).toMatchObject({
      message: 'renderer crash',
      processType: 'renderer',
    });
    expect(crashModule.getCrashInfo()).toEqual(crash);
  });

  it('does not open a second crash window while handling is in progress', () => {
    const showCrashWindow = vi.fn();
    const appExit = vi.fn();
    const handlers = crashModule.installCrashHandlers(showCrashWindow, appExit);

    for (let i = 0; i < 3; i += 1) {
      handlers.onRenderProcessGone({} as any, {
        reason: 'renderer crash',
      } as any);
    }

    expect(showCrashWindow).toHaveBeenCalledTimes(1);
    expect(appExit).not.toHaveBeenCalled();
  });
});
