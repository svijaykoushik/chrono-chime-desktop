import { readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

export interface LogFileStat {
  name: string;
  mtimeMs: number;
}

export interface RetentionOpts {
  /** Keep at most this many log files (newest by mtime). */
  maxFiles: number;
  /** Delete files older than this (strictly). */
  maxAgeMs: number;
}

/** ≤ 5 files / ≤ 7 days. */
export const DEFAULT_RETENTION: RetentionOpts = { maxFiles: 5, maxAgeMs: 7 * 24 * 3600_000 };

/**
 * D§1.3 — pure retention decision. Returns the names to delete: any file older
 * than `maxAgeMs` (strictly), plus any file beyond the newest `maxFiles`. The
 * result is the union (no duplicates), preserving the input order. No I/O.
 */
export function selectExpiredLogs(
  files: LogFileStat[],
  now: number,
  opts: RetentionOpts,
): string[] {
  const expired = new Set<string>();

  for (const f of files) {
    if (now - f.mtimeMs > opts.maxAgeMs) expired.add(f.name);
  }

  const beyondCount = [...files]
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(opts.maxFiles);
  for (const f of beyondCount) expired.add(f.name);

  return files.filter((f) => expired.has(f.name)).map((f) => f.name);
}

/**
 * Reads the logs directory, applies {@link selectExpiredLogs}, and unlinks the
 * expired files. Best-effort: never throws (logging must not break boot).
 */
export function pruneLogs(
  logsDir: string,
  now: number = Date.now(),
  opts: RetentionOpts = DEFAULT_RETENTION,
): string[] {
  let stats: LogFileStat[];
  try {
    stats = readdirSync(logsDir)
      .filter((name) => name.endsWith('.log') || name.endsWith('.old'))
      .map((name) => ({ name, mtimeMs: statSync(join(logsDir, name)).mtimeMs }));
  } catch {
    return []; // dir not created yet, etc.
  }

  const expired = selectExpiredLogs(stats, now, opts);
  for (const name of expired) {
    try {
      unlinkSync(join(logsDir, name));
    } catch {
      /* ignore individual failures */
    }
  }
  return expired;
}
