import Database from 'better-sqlite3';
import { reminderSchema, type Reminder } from '../../shared/reminder';
import type {
  ListReminderOptions,
  PersistedRoutine,
  Repository,
} from './repository';
import { logger } from '../diagnostics/logger';

interface ReminderRow {
  id: string;
  title: string;
  message: string | null;
  enabled: number;
  rule: string;
  notification: string;
  next_fire_at: number | null;
  last_fire_at: number | null;
  routine_id: string | null;
  created_at: number;
  updated_at: number;
  conclusion: string | null;
  concluded_at: number | null;
}

interface RoutineRow {
  id: string;
  title: string;
  type: string;
  enabled: number;
  config: string;
  created_at: number;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS reminders (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  message      TEXT,
  enabled      INTEGER NOT NULL,
  rule         TEXT NOT NULL,
  notification TEXT NOT NULL,
  next_fire_at INTEGER,
  last_fire_at INTEGER,
  routine_id   TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  conclusion   TEXT,
  concluded_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_reminders_routine ON reminders(routine_id);
CREATE TABLE IF NOT EXISTS routines (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  type       TEXT NOT NULL,
  enabled    INTEGER NOT NULL,
  config     TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`;

/** Durable, synchronous persistence backed by SQLite (better-sqlite3). */
export class SqliteRepository implements Repository {
  private readonly db: Database.Database;

  constructor(filename: string) {
    try {
      this.db = new Database(filename);
      this.db.pragma('journal_mode = WAL');
      this.db.exec(SCHEMA);

      // Run migrations to add conclusion and concluded_at columns if they don't exist
      try {
        this.db.exec('ALTER TABLE reminders ADD COLUMN conclusion TEXT DEFAULT NULL');
      } catch (err) {
        // Ignored if column already exists
      }
      try {
        this.db.exec('ALTER TABLE reminders ADD COLUMN concluded_at INTEGER DEFAULT NULL');
      } catch (err) {
        // Ignored if column already exists
      }

      // Backfill once rule + last_fire_at != null to conclusion = 'fired'
      try {
        this.db.prepare(`
          UPDATE reminders
          SET conclusion = 'fired', concluded_at = last_fire_at
          WHERE conclusion IS NULL
            AND last_fire_at IS NOT NULL
            AND json_extract(rule, '$.kind') = 'once'
        `).run();
      } catch (err) {
        logger.error('Database', 'Migration backfill failed', err instanceof Error ? err : new Error(String(err)));
      }

      logger.info('Database', 'SQLite database initialized successfully', { filename });
    } catch (err) {
      logger.error('Database', 'Failed to initialize SQLite database', err instanceof Error ? err : new Error(String(err)), { filename });
      throw err;
    }
  }

  close(): void {
    try {
      this.db.close();
      logger.info('Database', 'SQLite database closed');
    } catch (err) {
      logger.error('Database', 'Error while closing SQLite database', err instanceof Error ? err : new Error(String(err)));
    }
  }

  private toReminder(row: ReminderRow): Reminder {
    return reminderSchema.parse({
      id: row.id,
      title: row.title,
      message: row.message ?? undefined,
      enabled: row.enabled === 1,
      rule: JSON.parse(row.rule),
      notification: JSON.parse(row.notification),
      nextFireAt: row.next_fire_at,
      lastFireAt: row.last_fire_at,
      routineId: row.routine_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      conclusion: row.conclusion ?? null,
      concludedAt: row.concluded_at ?? null,
    });
  }

  insertReminder(r: Reminder): Reminder {
    try {
      this.db
        .prepare(
          `INSERT INTO reminders
             (id, title, message, enabled, rule, notification, next_fire_at, last_fire_at, routine_id, created_at, updated_at, conclusion, concluded_at)
           VALUES (@id, @title, @message, @enabled, @rule, @notification, @next, @last, @routine, @created, @updated, @conclusion, @concludedAt)`,
        )
        .run({
          id: r.id,
          title: r.title,
          message: r.message ?? null,
          enabled: r.enabled ? 1 : 0,
          rule: JSON.stringify(r.rule),
          notification: JSON.stringify(r.notification),
          next: r.nextFireAt,
          last: r.lastFireAt,
          routine: r.routineId,
          created: r.createdAt,
          updated: r.updatedAt,
          conclusion: r.conclusion ?? null,
          concludedAt: r.concludedAt ?? null,
        });
      logger.debug('Database', 'Inserted reminder', { id: r.id, enabled: r.enabled });
      return r;
    } catch (err) {
      logger.error('Database', 'Failed to insert reminder', err instanceof Error ? err : new Error(String(err)), { id: r.id });
      throw err;
    }
  }

  getReminder(id: string): Reminder | undefined {
    const row = this.db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as ReminderRow | undefined;
    return row ? this.toReminder(row) : undefined;
  }

  updateReminder(id: string, patch: Partial<Reminder>): Reminder | undefined {
    try {
      const cur = this.getReminder(id);
      if (!cur) return undefined;
      const next: Reminder = { ...cur, ...patch };
      this.db
        .prepare(
          `UPDATE reminders SET
             title=@title, message=@message, enabled=@enabled, rule=@rule, notification=@notification,
             next_fire_at=@next, last_fire_at=@last, routine_id=@routine, updated_at=@updated,
             conclusion=@conclusion, concluded_at=@concludedAt
           WHERE id=@id`,
        )
        .run({
          id,
          title: next.title,
          message: next.message ?? null,
          enabled: next.enabled ? 1 : 0,
          rule: JSON.stringify(next.rule),
          notification: JSON.stringify(next.notification),
          next: next.nextFireAt,
          last: next.lastFireAt,
          routine: next.routineId,
          updated: next.updatedAt,
          conclusion: next.conclusion ?? null,
          concludedAt: next.concludedAt ?? null,
        });
      logger.debug('Database', 'Updated reminder', { id, enabled: next.enabled });
      return next;
    } catch (err) {
      logger.error('Database', 'Failed to update reminder', err instanceof Error ? err : new Error(String(err)), { id });
      throw err;
    }
  }

  deleteReminders(ids: string[]): number {
    try {
      if (ids.length === 0) return 0;
      const stmt = this.db.prepare('DELETE FROM reminders WHERE id = ?');
      const tx = this.db.transaction((list: string[]) => list.reduce((n, id) => n + stmt.run(id).changes, 0));
      const count = tx(ids);
      logger.info('Database', 'Deleted reminders', { count, requestedIds: ids });
      return count;
    } catch (err) {
      logger.error('Database', 'Failed to delete reminders', err instanceof Error ? err : new Error(String(err)), { ids });
      throw err;
    }
  }

  listReminders(opts: ListReminderOptions = {}): Reminder[] {
    const where: string[] = [];
    const params: unknown[] = [];
    if (!opts.includeRoutineChildren) where.push('routine_id IS NULL');
    if (opts.query) {
      where.push('LOWER(title) LIKE ?');
      params.push(`%${opts.query.toLowerCase()}%`);
    }
    const sql = `SELECT * FROM reminders${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at ASC`;
    const rows = this.db.prepare(sql).all(...params) as ReminderRow[];
    return rows.map((r) => this.toReminder(r));
  }

  insertRoutine(r: PersistedRoutine): PersistedRoutine {
    try {
      this.db
        .prepare('INSERT INTO routines (id, title, type, enabled, config, created_at) VALUES (?,?,?,?,?,?)')
        .run(r.id, r.title, r.type, r.enabled ? 1 : 0, JSON.stringify(r.config), r.createdAt);
      logger.debug('Database', 'Inserted routine', { id: r.id, enabled: r.enabled });
      return r;
    } catch (err) {
      logger.error('Database', 'Failed to insert routine', err instanceof Error ? err : new Error(String(err)), { id: r.id });
      throw err;
    }
  }

  getRoutine(id: string): PersistedRoutine | undefined {
    const row = this.db.prepare('SELECT * FROM routines WHERE id = ?').get(id) as RoutineRow | undefined;
    return row ? this.toRoutine(row) : undefined;
  }

  private toRoutine(row: RoutineRow): PersistedRoutine {
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      enabled: row.enabled === 1,
      config: JSON.parse(row.config),
      createdAt: row.created_at,
    };
  }

  deleteRoutine(id: string): number {
    try {
      const tx = this.db.transaction((rid: string) => {
        this.db.prepare('DELETE FROM reminders WHERE routine_id = ?').run(rid);
        return this.db.prepare('DELETE FROM routines WHERE id = ?').run(rid).changes;
      });
      const count = tx(id);
      logger.info('Database', 'Deleted routine and cascaded child reminders', { id, changes: count });
      return count;
    } catch (err) {
      logger.error('Database', 'Failed to delete routine', err instanceof Error ? err : new Error(String(err)), { id });
      throw err;
    }
  }

  listRoutines(): PersistedRoutine[] {
    const rows = this.db.prepare('SELECT * FROM routines ORDER BY created_at ASC').all() as RoutineRow[];
    return rows.map((r) => this.toRoutine(r));
  }

  setRoutineEnabled(id: string, enabled: boolean): void {
    try {
      this.db.prepare('UPDATE routines SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
      logger.debug('Database', 'Updated routine enabled state', { id, enabled });
    } catch (err) {
      logger.error('Database', 'Failed to update routine enabled state', err instanceof Error ? err : new Error(String(err)), { id, enabled });
      throw err;
    }
  }
}
