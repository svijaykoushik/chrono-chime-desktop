---
type: Spec
title: Performance Optimization & Fat-Trimming Plan
description: Comprehensive performance profiling, fat-trimming blueprint, and benchmark yardstick on dual-core hardware.
tags: [performance, benchmarking, optimization, bundle-size, memory]
timestamp: 2026-09-30
---

# Performance Optimization & Fat-Trimming Plan

This specification establishes the performance blueprint and fat-trimming strategy for ChronoChime. In accordance with ChronoChime's core philosophy—**Indie Maker Utility Aesthetic**, **Zero-Dependency/Local-Only**, and **Reliability First**—the desktop application must boot instantly, idle with negligible memory and CPU footprint, and produce lean distributable packages without bloat.

---

## 1. Hardware Benchmark Yardstick ("This Box")

All benchmarks, timing profiles, and memory metrics are anchored to this reference hardware environment:

*   **Host Machine:** Intel(R) Core(TM) i3-6100T CPU @ 3.20GHz
*   **Topology:** 2 physical cores, 4 threads (35W TDP Skylake desktop processor, 3MB L3 cache)
*   **Memory:** 7.6 GiB total DDR4 (~2.8 GiB available under baseline desktop workload)
*   **Operating System:** Ubuntu 24.04.1 LTS (Linux kernel 7.0.0-34-generic x86_64)
*   **Runtime Environment:** Node.js v24.15.0, npm 11.12.1, Electron 33.4.11

### Why This Hardware Serves as the Golden Standard
Modern high-spec developer rigs (e.g. 16-core Apple Silicon or Ryzen 9 with 64GB RAM) mask cold-start latencies, excessive bundle parsing times, unindexed database queries, and IPC churn. The dual-core i3-6100T acts as an honest yardstick: any lag, memory bloat, or excessive CPU cycles immediately manifest here. If ChronoChime runs silky smooth on this machine, it will fly on any user device.

---

## 2. Baseline Measurements

### 2.1 Build & Package Baseline
| Category | Metric | Baseline Value | Observations |
| :--- | :--- | :--- | :--- |
| **Test Suite** | Vitest Execution Duration | **21.19 s** (19 files, 141 tests) | Transform: 4.08s, collect: 12.13s, prepare: 21.05s |
| **Build Time** | Vite Renderer Build | **16.70 s** (1,122 modules) | Heavy transformation of `@mui/x-date-pickers` & `@mui/material` |
| **Bundle Size** | Renderer Main Bundle (`main-*.js`) | **493.99 kB** (gzip: 142.24 kB) | Includes full React, Emotion, MUI, and Luxon runtime |
| **Bundle Size** | Crash Chunk (`ExpandMore-*.js`) | **293.37 kB** (gzip: 94.40 kB) | Bloated due to `crash.tsx` importing MUI Accordion and Icon |
| **Bundle Size** | Total Renderer JS Output | **~789.30 kB** minified | Substantial weight for a desktop utility UI |
| **Dependencies** | Total `node_modules` on Disk | **634 MB** | Heavy dev and runtime dependencies |
| **Dependencies** | `@mui/icons-material` | **63 MB** | Entire icon suite installed; only 7 icons imported |
| **Dependencies** | `drizzle-orm` | **13 MB** | Completely unused across the entire codebase |
| **Dependencies** | `@mui/x-date-pickers` | **6.2 MB** | Used for a single input in `ReminderDialog.tsx` |
| **Asset Footprint**| Sound Assets (`assets/sounds`) | **2.5 MB** | `notification3.wav` (1.8MB) + `notification2.wav` (725KB) |

### 2.2 Empirical Runtime Benchmarks (Measured on i3-6100T)
These benchmarks were executed directly on this reference machine measuring CPU execution time across critical runtime hotpaths:

| Runtime Hotpath | Baseline (Unoptimized) | Optimized Prototype | Empirical Gain on i3-6100T |
| :--- | :--- | :--- | :--- |
| **Scheduler Arming (50 reminders)** | **2.176 ms/op** (Full scan + JSON + Zod) | **0.0012 ms/op** (Indexed `SELECT MIN`) | **1,815x faster** (99.9% CPU drop) |
| **Scheduler Arming (200 reminders)** | **3.640 ms/op** (Full scan + JSON + Zod) | **0.0035 ms/op** (Indexed `SELECT MIN`) | **1,051x faster** (99.9% CPU drop) |
| **Scheduler Arming (500 reminders)** | **8.374 ms/op** (Full scan + JSON + Zod) | **0.0026 ms/op** (Indexed `SELECT MIN`) | **3,179x faster** (100.0% CPU drop) |
| **SQLite Statement Prep (2k queries)** | **155.85 ms** (Uncached `db.prepare`) | **16.81 ms** (Cached statement handle) | **9.3x faster** execution |
| **Read Deserialization (5k rows)** | **79.76 ms** (Zod `reminderSchema.parse`) | **14.24 ms** (Direct typed mapping) | **5.6x faster** (82.1% CPU saved) |
| **Audio Spawn Latency** | **12.02 ms** (`/bin/sh -c` subshell exec) | **5.50 ms** (Direct binary spawn) | **54.3% faster** invocation |
| **UI Formatting (100 items / render)** | **1.31 ms** (Unmemoized Luxon `toFormat`) | **< 0.02 ms** (Memoized value) | **99% render pass CPU saved** |
| **Search Burst (10 keystrokes)** | **26.88 ms** (10 unthrottled IPC queries) | **1.67 ms** (1 debounced query) | **93.8% database queries avoided** |

### 2.3 Cold Startup Benchmarks (Measured on i3-6100T)
Startup benchmarks were executed using automated lifecycle timing hooks across Main, Preload, and Renderer processes:

| Startup Lifecycle Phase | Initial Cold Start | Steady Dev Baseline | After Startup Optimizations | Improvement / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **1. Process Launch to `app.whenReady()`** | 2,888.1 ms | 416.5 ms | **496.9 ms** | Node/Chromium runtime initialization |
| **2. Services & Scheduler Boot** | 1,516.7 ms | 51.6 ms | **44.3 ms** | **14.1% faster** (deferred log pruning & update check) |
| **3. Window Creation to `ready-to-show`** | 11,770.8 ms | 3,076.5 ms | **2,225.6 ms** | **27.7% faster** (code-splitting + instant fallback shell) |
| **4. Total Time to Window Ready** | 16,175.8 ms | 3,544.8 ms | **2,766.9 ms** | **21.9% faster** (777.9 ms shaved off boot) |
| **5. Total Time-to-Interactive (TTI)** | 16,356.5 ms | 3,624.3 ms | **3,055.6 ms** | **15.7% faster** (568.7 ms shaved off TTI) |

*Key startup improvements implemented:*
1. **Deferred GitHub Update Check:** Moved un-deferred `checkForUpdates()` out of the constructor to a 10s timer, preventing network/socket contention during launch.
2. **Asynchronous Retention Sweep:** Converted synchronous filesystem `pruneLogs()` sweep in `initLogging()` to `setImmediate()`.
3. **Renderer Code-Splitting:** Lazily loaded `RoutinesView`, `SettingsView`, and `ReminderDialog` via `React.lazy()` / `Suspense`, eliminating them from the initial script evaluation phase.
4. **Immediate Fallback Shell:** Initialized `App.tsx` with default settings so the UI shell and `RemindersView` mount on the very first frame without awaiting an IPC roundtrip.
5. **Window Background Flash Prevention:** Configured `backgroundColor: '#fffbfa'` on `BrowserWindow` matching the brand theme.

---

## 3. Fat-Trimming & Performance Tracks

### Track 1: Dependency & Packaging Fat Pruning
1.  **Eliminate Unused Dependencies:**
    *   Remove `drizzle-orm` (13 MB on disk). It is declared in `package.json` dependencies but never imported in `src/` or `tests/`.
2.  **Replace `@mui/icons-material` with Lightweight SVGs:**
    *   Currently, `@mui/icons-material` consumes 63 MB in `node_modules`.
    *   Only 7 icons are used in the application: `Add`, `Search`, `Delete`, `Edit`, `History`, `VolumeUp`, `ExpandMore`.
    *   Creating clean, inline SVG components or a lightweight `<Icon name="..." />` helper removes the entire 63 MB package, accelerates build transforms, and shrinks module resolution time.
3.  **Replace `@mui/x-date-pickers` with Native Date-Time Input:**
    *   `@mui/x-date-pickers` is solely used in `ReminderDialog.tsx` for scheduling one-time reminders.
    *   Chromium provides a high-performance, keyboard-accessible, localized `<input type="datetime-local">` natively.
    *   Switching to native `<TextField type="datetime-local" ... />` saves 6.2 MB in `node_modules`, eliminates 200+ module transforms in Vite, and trims ~150 kB of JS bundle.
4.  **Audit Packaged Dependencies in `forge.config.js`:**
    *   Vite bundles all renderer dependencies into static JS.
    *   Packages like `react`, `react-dom`, `@mui/material`, `@emotion/*`, and `luxon` should be treated as devDependencies or pruned from the packaged `node_modules`, ensuring only native `better-sqlite3` is bundled into the final `.deb` and Squirrel installers.

### Track 2: Asset Optimization (Audio Compression)
*   `assets/sounds/notification3.wav` is 1.8 MB and `notification2.wav` is 725 KB (uncompressed PCM audio).
*   Convert or re-encode these chime files into compact, high-fidelity MP3/OGG (128 kbps).
*   **Target:** Reduce audio assets from 2.5 MB down to < 250 KB (90% reduction) without audible loss in notification chime quality.

### Track 3: Renderer Bundle & Crash Overlay Lean-Out
1.  **Decouple `crash.tsx` from MUI & Emotion:**
    *   The crash screen is an emergency recovery overlay rendered when the main process or renderer crashes.
    *   Currently, `crash.tsx` pulls in MUI `Card`, `Accordion`, `ThemeProvider`, `CssBaseline`, and `ExpandMoreIcon`, creating a separate 293 kB chunk (`ExpandMore-*.js`).
    *   Replace MUI in `crash.tsx` with clean semantic HTML5 and scoped CSS styles. A crash screen should load instantaneously under memory pressure and require < 5 kB of code.
2.  **View & Dialog Code Splitting:**
    *   In `App.tsx`, `RemindersView` is the primary screen. `RoutinesView`, `SettingsView`, and dialogs (`ReminderDialog`, `SoundPickerDialog`, `UpdateDialog`) can be lazily loaded via `React.lazy()` and `Suspense`.
    *   Reduces initial bundle parse and evaluation time during window creation.

### Track 4: SQLite Persistence & IPC Hotpath Optimization
1.  **Prepared Statement Caching:**
    *   In [sqlite-repository.ts](file:///home/vijaykoushik/Evee/My%20Documents/GitHub/chrono-chime-desktop/src/main/store/sqlite-repository.ts), statements (`SELECT * FROM reminders WHERE id = ?`, `UPDATE reminders...`, `INSERT...`) are re-prepared on every invocation.
    *   Prepare and cache statements once during repository initialization or memoize them to bypass SQL compilation overhead.
2.  **Eliminate Redundant Schema Parsing on Database Reads:**
    *   `toReminder()` in `sqlite-repository.ts` currently runs `reminderSchema.parse()` via Zod on every database row returned.
    *   Since data written to SQLite is already validated upon ingestion via the IPC contract, re-running full Zod schema validation on every read is redundant CPU waste.
    *   Use a direct mapper on internal reads while retaining Zod validation strictly at the untrusted IPC boundary.
3.  **Database Indexing:**
    *   Add SQLite indexes on `reminders(created_at)`, `reminders(next_fire_at)`, and `reminders(enabled)` to eliminate full-table scans during scheduler queries and list views.

### Track 5: Search Throttling & Debounce
*   In [RemindersView.tsx](file:///home/vijaykoushik/Evee/My%20Documents/GitHub/chrono-chime-desktop/src/renderer/RemindersView.tsx), typing in the search box immediately fires `window.chrono.reminders.list(query)` on every keystroke.
*   Introduce a lightweight 150ms debounce on the search input to avoid IPC flooding and repeated SQLite `LIKE` queries while the user is actively typing.

---

## 4. Benchmark Targets

| Metric | Baseline (i3-6100T) | Target | Target Improvement |
| :--- | :--- | :--- | :--- |
| **`node_modules` Size** | 634 MB | **< 520 MB** | -114 MB (-18%) |
| **Renderer JS Bundle** | ~789 kB | **< 450 kB** | -339 kB (-43%) |
| **Crash Window Chunk** | 293 kB | **< 10 kB** | -283 kB (-96%) |
| **Sound Assets Size** | 2.5 MB | **< 300 kB** | -2.2 MB (-88%) |
| **Vite Renderer Build** | 16.70 s | **< 10.0 s** | ~40% faster build |
| **Vitest Suite Duration** | 21.19 s | **< 16.0 s** | ~25% faster test run |

---

## 5. Phased Implementation Roadmap

```
[Phase 1: Quick Fat Prune]
  ├── Remove drizzle-orm
  ├── Compress notification WAV files to MP3
  └── Benchmark build & test times

[Phase 2: Icon & DatePicker Streamlining]
  ├── Replace @mui/icons-material with bespoke SVG components
  ├── Replace @mui/x-date-pickers with native datetime-local input
  └── Verify all 141 tests pass + measure bundle size

[Phase 3: Crash Overlay & Code Splitting]
  ├── Rewrite crash.tsx using vanilla HTML/CSS
  ├── Add React.lazy for RoutinesView, SettingsView, and heavy Dialogs
  └── Verify crash overlay behavior and bundle chunk output

[Phase 4: SQLite Hotpath & Search Debounce]
  ├── Implement prepared statement caching in SqliteRepository
  ├── Replace row-read Zod parse with direct mapping
  ├── Add DB indexes for created_at, next_fire_at, enabled
  └── Add search input debounce in RemindersView.tsx

[Phase 5: Packaging & Distribution Audit]
  ├── Audit forge.config.js packaging pruned modules
  └── Produce before/after benchmark scorecard on the i3-6100T yardstick
```

---

## 6. Verification & Test Guardrails

Every optimization step must adhere to the TDD principles set out in `AGENTS.md`:
1.  All existing 141 unit and integration tests must pass at every phase (`npm test`).
2.  Typecheck must complete with zero errors (`npm run typecheck`).
3.  No process boundary violations (Renderer remains decoupled from Main/Node APIs).
4.  Verification numbers must be documented in `docs/progress.md` and recorded in `docs/log.md`.
