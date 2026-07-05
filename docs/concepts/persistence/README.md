# Persistence System

ChronoChime operates as a local-first application. All schedules, configurations, reminders, and routines are persisted synchronously using SQLite without external servers or cloud syncing.

## Subsystems

### 1. [SQLite Repository](file:///home/vijaykoushik/Evee/My%20Documents/GitHub/chrono-chime-desktop/src/main/store/sqlite-repository.ts)
- **Engine:** Direct bindings via `better-sqlite3`.
- **Prepared Statements:** For predictable performance, SQL queries are prepared once during repository startup and reused for all CRUD transactions.
- **Synchronous Execution:** Operations execute blocking/synchronously in the main process to ensure structural persistence and prevent concurrent file corruption write-locks.

### 2. Isomorphic Schema Validation
Database rows are parsed and validated on-load using Zod schemas declared in `src/shared/reminder.ts` and `src/shared/routine.ts`. Any corrupted, outdated, or manually edited SQL rows are caught and logged at parse time, falling back to safe states to prevent crashes.

### 3. Parent-Child Cascade Constraints
Routines are composite objects that own child schedules.
- **Cascade Deletes:** When a routine is deleted from the store, cascade triggers delete all child schedules automatically.
- **Isolated Reminders:** Routine-generated child schedules do not appear in the standard reminders list query, preserving clean user boundaries.
