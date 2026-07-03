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

  test('parses successful JSON response', async () => {
    const response = new (require('events').EventEmitter)();
    // Simulate net.request returning a request object that emits 'response'
    (net.request as any).mockImplementation(() => {
      const req = new (require('events').EventEmitter)();
      process.nextTick(() => {
        req.emit('response', response);
        response.emit('data', JSON.stringify({ tag_name: 'v2.0.0', body: 'notes', assets: [] }));
        response.emit('end');
      });
      req.end = vi.fn();
      return req;
    });

    const release = await fetchLatestRelease();
    expect(release.tag_name).toBe('v2.0.0');
    expect(release.body).toBe('notes');
    expect(release.assets).toEqual([]);
  });

  test('rejects on malformed JSON', async () => {
    (net.request as any).mockImplementation(() => {
      const req = new (require('events').EventEmitter)();
      const resp = new (require('events').EventEmitter)();
      process.nextTick(() => {
        req.emit('response', resp);
        resp.emit('data', 'not json');
        resp.emit('end');
      });
      req.end = vi.fn();
      return req;
    });

    await expect(fetchLatestRelease()).rejects.toThrow();
  });
});
