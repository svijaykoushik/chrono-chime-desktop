import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { exportLogs } from '../../src/main/diagnostics/export';
import { logsDir } from '../../src/main/diagnostics/logger';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import AdmZip from 'adm-zip';

vi.mock('../../src/main/diagnostics/logger', () => ({
  logsDir: vi.fn(),
}));

describe('Diagnostics Export', () => {
  let testRoot: string;
  let testLogsDir: string;
  let testSavePath: string;

  beforeEach(() => {
    testRoot = join(tmpdir(), `diagnostics-test-${Date.now()}`);
    testLogsDir = join(testRoot, 'logs');
    testSavePath = join(testRoot, 'export.zip');
    mkdirSync(testRoot, { recursive: true });
    mkdirSync(testLogsDir, { recursive: true });

    (logsDir as any).mockReturnValue(testLogsDir);
  });

  afterEach(() => {
    rmSync(testRoot, { recursive: true, force: true });
  });

  it('should zip the logs directory and write to the save path', async () => {
    // Create dummy logs
    writeFileSync(join(testLogsDir, 'main.log'), 'main log content');
    writeFileSync(join(testLogsDir, 'renderer.log'), 'renderer log content');

    await exportLogs(testSavePath);

    // Verify zip exists
    const zip = new AdmZip(testSavePath);
    const entries = zip.getEntries();

    expect(entries.length).toBeGreaterThanOrEqual(2);

    const mainLogEntry = entries.find(e => e.entryName.includes('main.log'));
    const rendererLogEntry = entries.find(e => e.entryName.includes('renderer.log'));

    expect(mainLogEntry).toBeDefined();
    expect(rendererLogEntry).toBeDefined();
    expect(mainLogEntry?.getData().toString()).toContain('main log content');
    expect(rendererLogEntry?.getData().toString()).toContain('renderer log content');
  });
});
