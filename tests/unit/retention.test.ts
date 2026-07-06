import { describe, it, expect } from 'vitest';
import { selectExpiredLogs, type LogFileStat } from '../../src/main/diagnostics/retention';

const DAY = 24 * 3600_000;
const OPTS = { maxFiles: 5, maxAgeMs: 7 * DAY };
const NOW = 1_000_000_000_000;

/** Build a file aged `ageMs` before NOW. */
const aged = (name: string, ageMs: number): LogFileStat => ({ name, mtimeMs: NOW - ageMs });

describe('selectExpiredLogs — log retention (D§1.3)', () => {
  it('returns nothing for an empty list', () => {
    expect(selectExpiredLogs([], NOW, OPTS)).toEqual([]);
  });

  it('keeps everything when under both thresholds', () => {
    const files = [aged('a', 1 * DAY), aged('b', 2 * DAY), aged('c', 3 * DAY)];
    expect(selectExpiredLogs(files, NOW, OPTS)).toEqual([]);
  });

  it('purges files older than maxAgeMs (age-only)', () => {
    const files = [aged('fresh', 1 * DAY), aged('old', 8 * DAY), aged('older', 30 * DAY)];
    expect(selectExpiredLogs(files, NOW, OPTS).sort()).toEqual(['old', 'older']);
  });

  it('does not purge a file exactly at the age threshold (strictly older only)', () => {
    const files = [aged('edge', 7 * DAY)]; // now - mtime === maxAgeMs
    expect(selectExpiredLogs(files, NOW, OPTS)).toEqual([]);
  });

  it('purges files beyond the newest maxFiles (count-only)', () => {
    // 7 recent files; keep newest 5, delete the 2 oldest by mtime.
    const files = [1, 2, 3, 4, 5, 6, 7].map((m) => aged(`f${m}`, m * 60_000));
    expect(selectExpiredLogs(files, NOW, OPTS).sort()).toEqual(['f6', 'f7']);
  });

  it('keeps exactly maxFiles when at the count threshold', () => {
    const files = [1, 2, 3, 4, 5].map((m) => aged(`f${m}`, m * 60_000));
    expect(selectExpiredLogs(files, NOW, OPTS)).toEqual([]);
  });

  it('unions age and count expirations without duplicates, in input order', () => {
    const files = [
      aged('new1', 1 * 60_000),
      aged('new2', 2 * 60_000),
      aged('new3', 3 * 60_000),
      aged('new4', 4 * 60_000),
      aged('new5', 5 * 60_000),
      aged('new6', 6 * 60_000), // beyond count (6th newest)
      aged('ancient', 40 * DAY), // beyond age AND count
    ];
    expect(selectExpiredLogs(files, NOW, OPTS)).toEqual(['new6', 'ancient']);
  });
});
