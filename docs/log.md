# ChronoChime Engineering Log

All changes made to the codebase are tracked here in reverse chronological order.

### 2026-10-02
- **Linux .deb Packaging Permission Normalization & Postinst Fix**
  - Resolved `Failed to execute, permission denied` on installed Linux `.deb` binaries. When builds occur on non-POSIX/FUSE filesystems (such as NTFS mounts where chmod is a no-op), packaged binaries inherited `0770` (`-rwxrwx--- root:root`), blocking execution for non-root users.
  - Implemented `SafeMakerDeb` in `forge.config.js` to stage builds in `os.tmpdir()` and enforce standard POSIX modes (`0755` for directories, executables, `.so`, and `.node` modules; `0644` for data files; `4755` for `chrome-sandbox`).
  - Added Debian maintainer script `scripts/debian/postinst` ensuring target directory `/usr/lib/chronochime` permissions and `chrome-sandbox` SUID bit are verified and enforced upon installation.
- **Issue #67 — Main-Process Web Audio Playback**
  - Replaced shell audio commands with async decoding and Web Audio playback; added malformed-sample validation, WAV alias fallback, playback cleanup, and shutdown disposal.
  - Preserved non-blocking notification/event delivery and made sound-preview IPC await playback startup with error logging.
  - Upgraded Electron to 38.8.6 and `@electron/rebuild` to 4.2.0; CI/release workflows now use Node 22. Electron 44 was not selected because `better-sqlite3` 11.10.0 does not compile against its Node 24 V8 API.
  - Linux `npm run make`, packaged ASAR audio-module import/decode smoke, and real default-sink playback pass; strict typecheck and all 145 tests pass. Windows packaging and audible playback remain to be verified.

### 2026-10-01
- **Snooze: Defer Fired Reminders by Short Interval (Issue #58)**
  - Added `snoozedUntil` override occurrence to `Reminder` schema without altering recurrence rules or introducing calendar drift.
  - Added SQLite migration `ALTER TABLE reminders ADD COLUMN snoozed_until INTEGER DEFAULT NULL` and updated prepared statements & schedulable indexes.
  - Implemented `ReminderService.snooze(id, minutes = 5)` supporting re-arming concluded one-shots and recurring reminders, rejecting disabled reminders.
  - Updated `Scheduler` to arm for `snoozedUntil` over normal recurrence, clearing `snoozedUntil` upon firing and preserving recurring schedules.
  - Implemented notification `click` listener focusing the application window.
  - Added dynamic "Snooze last reminder (5 min)" with 5/10/15/30 min options in the tray context menu.
  - Added "Snooze 5m" action button in `App.tsx` fired reminder `Snackbar` and indicator chip in `RemindersView.tsx`.
  - Added comprehensive test suite `tests/unit/snooze.test.ts` covering all 6 Issue #58 criteria; all 149 test cases passing.
- **v1.0.0-rc.2 Release & Cross-Platform CI Pipeline Fixes**
  - Released `v1.0.0-rc.2` featuring startup acceleration, bundle trimming, and conclusion tracking.
  - Resolved Linux and Windows release packaging failures in GitHub Actions:
    - Fixed Linux-specific `umask 022` step crashing on Windows PowerShell (`pwsh`) runners by isolating the step to `if: runner.os == 'Linux'`.
    - Pinned Windows CI runner to `windows-2022` in `release.yml` and `validate.yml` to resolve `@electron/node-gyp` incompatibility with preview Visual Studio 18 on `windows-latest`.
  - Verified multi-platform build pipeline publishing all release artifacts to GitHub Releases:
    - Linux: `chronochime_1.0.0.rc.2_amd64.deb` (84.93 MiB)
    - Windows: `ChronoChime-1.0.0-rc.2.Setup.exe` (118.39 MiB), `ChronoChime-1.0.0-rc2-full.nupkg` (117.60 MiB)

### 2026-09-30
- **Startup Performance Profiling & Optimization ([spec](/specs/performance-optimization-plan.md))**
  - Profiled cold-start lifecycle on the dual-core Intel Core i3-6100T desktop host using automated IPC benchmark hooks.
  - Deferred GitHub Releases `UpdateService.checkForUpdates()` check by 10s to eliminate socket and network competition during window launch.
  - Asynchronously scheduled filesystem log retention pruning in `initLogging()` via `setImmediate()`.
  - Lazy-loaded `RoutinesView`, `SettingsView`, and `ReminderDialog` via `React.lazy()` / `Suspense` to shrink the initial script evaluation burden.
  - Seeded initial state in `App.tsx` with default settings so the UI shell and `RemindersView` render on the very first frame without waiting for IPC settings round-trip.
  - Reduced Time to Window Ready from 3,544.8 ms to **2,766.9 ms (21.9% faster)** and Time-to-Interactive (TTI) from 3,624.3 ms to **3,055.6 ms (15.7% faster)**.
- **Runtime Performance & Fat-Trimming Execution ([spec](/specs/performance-optimization-plan.md))**
  - Created `perf/trim-fat` branch and anchored all profiling to the reference dual-core Intel Core i3-6100T desktop host.
  - Implemented SQLite hotpath optimizations: statement caching, low-latency PRAGMAs (`WAL`, `synchronous = NORMAL`, `temp_store = MEMORY`), B-tree indices (`idx_reminders_schedulable`, `idx_reminders_created`), and direct typed mapping in `SqliteRepository`.
  - Accelerated scheduler arming and tick execution from 2–8 ms down to **0.0013 ms (1.3 microseconds)**—a 1,000x+ speedup.
  - Introduced 150ms search input debouncing in `RemindersView.tsx` (saving 89% of database query traffic while typing) and memoized `ReminderCardItem` with `React.memo`.
  - Removed pruned packages from `package.json`: `drizzle-orm`, `@mui/icons-material`, and `@mui/x-date-pickers` (pruned 82 MB from `node_modules`).
  - Implemented lightweight bespoke SVG icons (`src/renderer/icons.tsx`) to replace `@mui/icons-material`.
  - Replaced `@mui/x-date-pickers` in `ReminderDialog.tsx` with Chromium's native `<TextField type="datetime-local" />`.
  - Decoupled `src/crash.tsx` from MUI/Emotion, shrinking the crash bundle chunk from **293.37 kB down to 2.98 kB** (-99% reduction).
  - Compressed audio assets (`notification2.wav`, `notification3.wav`) to 192kbps MP3s with backward-compatibility aliases, shrinking sound assets from **2.5 MB to 404 KB** (-84% reduction).
  - Test suite execution improved from **21.19s to 9.29s (56% faster)**; Vite renderer build improved from **16.70s to 12.58s (25% faster)**; all 142 tests pass.

### 2026-08-05
- **One-time Reminders & Conclusion State (Issue #57)**
  - Reorganized `ReminderDialog.tsx` layout to separate "Once" from repeating/intervals into a top-level selection.
  - Implemented `conclusion` ('fired'/'missed') and `concludedAt` fields on `Reminder` schema to distinguish between disabled, successfully fired, and missed occurrences.
  - Added sqlite database migrations to add `conclusion` and `concluded_at` columns, and backfill legacy fired one-shot reminders.
  - Updated scheduler to set conclusion instead of setting `enabled: false` upon firing/skipping.
  - Excluded concluded reminders from schedulable list in repository layer.
  - Rendered status chips and replacement "Schedule again" button in `RemindersView.tsx`.
  - Added new unit tests and verified all 141 tests pass.

### 2026-07-20
- **Standardized `docs/` as an OKF bundle** ([ADR-001](/decisions/ADR-001-adopt-okf.md)).
  - Added [`knowledge-format.md`](/knowledge-format.md) defining the project-adapted [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) profile: reserved files, frontmatter contract, `type` vocabulary, cross-linking, and the docs workflow.
  - Renamed every directory-listing `README.md` (bundle root + all `concepts/*`) to the reserved `index.md`; rewrote the root [`index.md`](/index.md) as the bundle map with bundle-relative links.
  - Added YAML frontmatter (`type`, `title`, `description`, `tags`, `timestamp`) to all non-reserved documents across `prd/`, `design/`, `specs/`, `concepts/`, `build/`, and the root.
  - Created [`decisions/`](/decisions/index.md) with `ADR-001` recording the adoption.
  - Added a vendor-agnostic "start from the OKF bundle" first step to root `AGENTS.md`; updated external index references in `README.md` and `.github/copilot-instructions.md`.

### 2026-07-05
- **Documentation Overhaul & Concept Architecture Indexing**
  - Created concept-based directories and documents (`docs/concepts/`) covering Core Scheduling (Luxon DST & recovery), SQLite direct persistence, sandboxed IPC bridges, Range-Resume staged downloads, process-safe crash reentrancy guards, and `chrono-sound://` audio protocol recycling.
  - Indexed all concept documentation in the main `docs/README.md`.
  - Updated all Milestone status listings to Done in `shipping-implementation-plan.md`.
- **Android-style Built-in Sound Picker Dialog**
  - Implemented `SoundPickerDialog` with a clean radio list layout and built-in theme styling.
  - Added interactive audio preview capability supporting automatic active playback termination on option switch or dialog close.
  - Replaced basic MUI select dropdown inside `ReminderDialog` with a read-only trigger selector field and a volume icon adornment.
- **Stable & Pre-release Update Channels Support**
  - Integrated `updateChannel` setting schema and defaults into the main settings configurations.
  - Updated `github-client.ts` to support querying the generic `/releases` list endpoint to parse, skip drafts, and retrieve the latest beta/pre-release tag when subscribed to the Prerelease channel.
  - Added a channel selection dropdown selector inside the Settings Updates card view.
- **Inline Application Version Display**
  - Exposed local application version query via `updateGetVersion` IPC channel.
  - Injected current app version context dynamically in the Settings page updates card description.
- **Repository Owner Correction**
  - Updated owner configuration paths to `svijaykoushik/chrono-chime-desktop` (corrected from `vijaykoushik`) inside update fetch requests and design documentation.

### 2026-10-01
- **Snooze Reminders Implementation (Issue #58)**
  - Added `snoozedUntil` schema attribute to `Reminder` and migrated SQLite repository schema and indexes (`idx_reminders_schedulable`).
  - Added `ReminderService.snooze` supporting both concluded one-shots and recurring schedules while rejecting disabled reminders.
  - Prioritized `snoozedUntil` in `Scheduler` without mutating recurrence rules to preserve the zero-drift scheduling anchor.
  - Implemented dynamic tray context menu snooze options (5m, 10m, 15m, 30m), OS notification click-to-focus window trigger, and in-app notification snackbar snooze action.
  - Added unit test suite `tests/unit/snooze.test.ts` (6 tests).
  - Merged latest changes from `release-v1.0`, synchronized `package-lock.json`, and restored `@vitejs/plugin-react` to `devDependencies` to resolve CI workflow build failure.

