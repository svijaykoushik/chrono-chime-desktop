import { describe, expect, test, vi, beforeEach } from 'vitest';
import { Downloader } from '../../../src/main/update/downloader';
import { net, shell, app } from 'electron';
import fs from 'node:fs';

// Mock electron's API
vi.mock('electron', async () => {
  const actual = await vi.importActual('electron');
  const EventEmitter = require('events').EventEmitter;
  const mockRequest = new EventEmitter();
  mockRequest.end = vi.fn();
  mockRequest.abort = vi.fn();

  return {
    ...actual,
    app: {
      getPath: vi.fn(() => '/tmp/mock-userData-dl'),
      quit: vi.fn(),
    },
    shell: {
      openPath: vi.fn().mockResolvedValue(''),
    },
    net: {
      request: vi.fn(() => mockRequest),
    },
  };
});

// Mock fs module completely
vi.mock('node:fs');

describe('Downloader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('Happy Path: starts fresh download, handles progress, size verification, renames, and cleans up metadata', async () => {
    let partChecked = false;
    vi.mocked(fs.existsSync).mockImplementation((p: any) => {
      if (typeof p === 'string') {
        if (p.includes('pending.json')) return true;
        if (p.endsWith('.part')) {
          if (!partChecked) {
            partChecked = true;
            return false;
          }
          return true;
        }
      }
      return false;
    });
    
    const mockWriteStream = {
      write: vi.fn(),
      end: vi.fn((cb) => cb && cb()),
      close: vi.fn(),
    } as any;
    vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream);
    vi.mocked(fs.statSync).mockReturnValue({ size: 100 } as any); // simulated downloaded file size

    const downloader = new Downloader();
    const progressSpy = vi.fn();
    const doneSpy = vi.fn();

    const EventEmitter = require('events').EventEmitter;
    const reqEmitter = new EventEmitter();
    reqEmitter.end = vi.fn();
    vi.mocked(net.request).mockImplementation(() => reqEmitter as any);

    downloader.start({
      url: 'https://example.com/installer.exe',
      version: 'v2.0.0',
      expectedSize: 100,
      onProgress: progressSpy,
      onDone: doneSpy,
    });

    // Check directory preparation and metadata writing
    expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp/mock-userData-dl/updates', { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/tmp/mock-userData-dl/updates/pending.json',
      expect.stringContaining('"version":"v2.0.0"'),
      'utf8'
    );
    expect(fs.createWriteStream).toHaveBeenCalledWith('/tmp/mock-userData-dl/updates/installer.exe.part', { flags: 'w' });

    // Simulate server response and chunk emission
    const respEmitter = new EventEmitter();
    respEmitter.statusCode = 200;
    
    reqEmitter.emit('response', respEmitter);
    respEmitter.emit('data', Buffer.from('chunk1'));
    respEmitter.emit('data', Buffer.from('chunk2'));
    respEmitter.emit('end');

    // Verify progress reporting and finalization
    expect(progressSpy).toHaveBeenCalled();
    expect(mockWriteStream.write).toHaveBeenCalledTimes(2);
    expect(mockWriteStream.end).toHaveBeenCalled();
    expect(fs.renameSync).toHaveBeenCalledWith(
      '/tmp/mock-userData-dl/updates/installer.exe.part',
      '/tmp/mock-userData-dl/updates/installer.exe'
    );
    expect(doneSpy).toHaveBeenCalled();
    expect(doneSpy.mock.calls[0]?.[0]).toBeUndefined();
  });

  test('Happy Path: resumes download using Range headers when partial state is valid', () => {
    // Mock that pending.json and .part file both exist
    vi.mocked(fs.existsSync).mockImplementation((path: any) => {
      if (path.includes('pending.json') || path.includes('.part') || path.includes('updates')) return true;
      return false;
    });

    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
      url: 'https://example.com/installer.exe',
      version: 'v2.0.0',
      path: '/tmp/mock-userData-dl/updates/installer.exe.part',
      received: 40,
      total: 100,
    }));

    vi.mocked(fs.statSync).mockReturnValue({ size: 40 } as any); // size matches pending.json received bytes

    const downloader = new Downloader();
    const reqEmitter = new (require('events').EventEmitter)();
    reqEmitter.end = vi.fn();
    vi.mocked(net.request).mockImplementation(() => reqEmitter as any);

    downloader.start({
      url: 'https://example.com/installer.exe',
      version: 'v2.0.0',
      expectedSize: 100,
      onProgress: vi.fn(),
      onDone: vi.fn(),
    });

    // Verify correct Range header inclusion
    expect(net.request).toHaveBeenCalledWith(expect.objectContaining({
      headers: expect.objectContaining({
        Range: 'bytes=40-',
      }),
    }));
    // Stream flag should be append 'a'
    expect(fs.createWriteStream).toHaveBeenCalledWith('/tmp/mock-userData-dl/updates/installer.exe.part', { flags: 'a' });
  });

  test('Failure Mode: falls back to full download if range request status is 200 instead of 206', () => {
    // Mock that pending.json and .part file exist to trigger Range resume request
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
      url: 'https://example.com/installer.exe',
      version: 'v2.0.0',
      path: '/tmp/mock-userData-dl/updates/installer.exe.part',
      received: 40,
      total: 100,
    }));
    vi.mocked(fs.statSync).mockReturnValue({ size: 40 } as any);

    const downloader = new Downloader();
    const reqEmitter = new (require('events').EventEmitter)();
    reqEmitter.end = vi.fn();
    vi.mocked(net.request).mockImplementation(() => reqEmitter as any);

    downloader.start({
      url: 'https://example.com/installer.exe',
      version: 'v2.0.0',
      expectedSize: 100,
      onProgress: vi.fn(),
      onDone: vi.fn(),
    });

    // Simulate 200 OK response code indicating Range was ignored/unsupported
    const respEmitter = new (require('events').EventEmitter)();
    respEmitter.statusCode = 200;

    reqEmitter.emit('response', respEmitter);

    // Verify it cleans the corrupt partial file and restarts download fresh
    expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/mock-userData-dl/updates/installer.exe.part');
  });

  test('Failure Mode: cleans up resources on file size integrity mismatch', () => {
    let partChecked = false;
    vi.mocked(fs.existsSync).mockImplementation((p: any) => {
      if (typeof p === 'string') {
        if (p.includes('pending.json')) return true;
        if (p.endsWith('.part')) {
          if (!partChecked) {
            partChecked = true;
            return false;
          }
          return true;
        }
      }
      return false;
    });
    
    const mockWriteStream = {
      write: vi.fn(),
      end: vi.fn((cb) => cb && cb()),
      close: vi.fn(),
    } as any;
    vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream);
    
    // Simulate size mismatch: actual size is 50 bytes instead of expected 100 bytes
    vi.mocked(fs.statSync).mockReturnValue({ size: 50 } as any);

    const downloader = new Downloader();
    const doneSpy = vi.fn();

    const reqEmitter = new (require('events').EventEmitter)();
    reqEmitter.end = vi.fn();
    vi.mocked(net.request).mockImplementation(() => reqEmitter as any);

    downloader.start({
      url: 'https://example.com/installer.exe',
      version: 'v2.0.0',
      expectedSize: 100,
      onProgress: vi.fn(),
      onDone: doneSpy,
    });

    const respEmitter = new (require('events').EventEmitter)();
    respEmitter.statusCode = 200;
    
    reqEmitter.emit('response', respEmitter);
    respEmitter.emit('end');

    // Verify callback gets error, part file is deleted, and pending metadata is unlinked
    expect(doneSpy).toHaveBeenCalledWith(expect.any(Error));
    expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/mock-userData-dl/updates/installer.exe.part');
    expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/mock-userData-dl/updates/pending.json');
  });

  test('Cancellation: immediately aborts socket request and closes stream', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    
    const mockWriteStream = {
      write: vi.fn(),
      end: vi.fn(),
      close: vi.fn(),
    } as any;
    vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream);

    const downloader = new Downloader();
    const reqEmitter = new (require('events').EventEmitter)();
    reqEmitter.end = vi.fn();
    reqEmitter.abort = vi.fn();
    vi.mocked(net.request).mockImplementation(() => reqEmitter as any);

    downloader.start({
      url: 'https://example.com/installer.exe',
      version: 'v2.0.0',
      expectedSize: 100,
      onProgress: vi.fn(),
      onDone: vi.fn(),
    });

    downloader.cancel();

    expect(reqEmitter.abort).toHaveBeenCalled();
    expect(mockWriteStream.close).toHaveBeenCalled();
    expect(downloader['isCancelled']).toBe(true);
  });

  test('Install Flow: launches package installer and quits application', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true); // finalPath exists

    const downloader = new Downloader();
    // stub private path field
    downloader['finalPath'] = '/tmp/mock-userData-dl/updates/installer.exe';

    await downloader.install();

    expect(shell.openPath).toHaveBeenCalledWith('/tmp/mock-userData-dl/updates/installer.exe');
    expect(app.quit).toHaveBeenCalled();
  });

  test('Failure Mode: HTTP 3xx, 4xx, 5xx status codes trigger download failure callback', () => {
    const errorCodes = [301, 400, 404, 500, 503];
    for (const code of errorCodes) {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const downloader = new Downloader();
      const doneSpy = vi.fn();

      const reqEmitter = new (require('events').EventEmitter)();
      reqEmitter.end = vi.fn();
      vi.mocked(net.request).mockImplementation(() => reqEmitter as any);

      downloader.start({
        url: 'https://example.com/installer.exe',
        version: 'v2.0.0',
        expectedSize: 100,
        onProgress: vi.fn(),
        onDone: doneSpy,
      });

      const respEmitter = new (require('events').EventEmitter)();
      respEmitter.statusCode = code;

      reqEmitter.emit('response', respEmitter);

      expect(doneSpy).toHaveBeenCalledWith(expect.any(Error));
      expect(doneSpy.mock.calls[0]?.[0]?.message).toContain(`Bad status code: ${code}`);
    }
  });
});
