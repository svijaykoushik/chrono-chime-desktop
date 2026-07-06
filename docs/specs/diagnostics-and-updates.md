# Implementation Spec — Diagnostics/Logging & Alternate Updates

Status: **Accepted — ready to implement** (Phase: shipping prep)
Scope: two operational features needed before public shipping. These are
platform/operational concerns, **not** temporal-notification domain features, so
they live here rather than in the [PRD](../prd/chronochime-product-requirements-document.md)
(which is cross-referenced near its Reliability pillar). Target platforms:
**Windows and Linux only** (no macOS).

## Accepted decisions (from review)

- Logging built on **`electron-log` v5** + a small custom retention sweep; logs
  are **plaintext** (not encrypted).
- Update source of truth is the **GitHub Releases API** (`releases/latest`); the
  spec's separate `latest-version.json` asset is **dropped** (single source of
  truth = the release; avoids drift; pre-releases auto-excluded).
- Unsigned install: the app performs a **managed in-app download** of the platform
  asset (progress, resume across reconnects and app restarts, integrity check),
  then opens the installer for the user to run; `shell.openExternal(releaseUrl)` is
  the fallback. (Expanded in §2.7.)
- Network + filesystem work happens in the **main process**; the renderer stays
  sandboxed and talks over the typed Zod IPC contract.

Conventions follow the existing codebase: IPC channels in `src/shared/contract.ts`
(`chronochime:<domain>:<operation>`, Zod-validated), the `window.chrono` bridge in
`src/shared/bridge.ts`/`src/preload.ts`, pure logic unit-tested under `tests/unit`.

---

# Part 1 — Local-First Diagnostics & Logging

## 1.1 Module layout

```
src/main/diagnostics/
  logger.ts        # configure electron-log; expose log(level, module, msg, meta)
  retention.ts     # pure: selectExpiredLogs(files, now, opts) -> string[]
  crash.ts         # install global handlers; open crash window; export+restart
  export.ts        # zip logs dir -> save dialog
src/crash.tsx              # crash overlay renderer entry (separate window)
src/crash-preload.ts       # minimal bridge for the crash window
src/renderer/...           # "Export Diagnostic Logs" control in SettingsView
```

## 1.2 Storage, format, levels

- **Directory:** `join(app.getPath('userData'), 'logs')` — resolves to
  `%AppData%/ChronoChime/logs` (Windows) and `~/.config/ChronoChime/logs` (Linux)
  automatically; no per-OS branching.
- **Files:** `main.log` (main process) and `renderer.log` (renderer; electron-log
  bridges renderer→main automatically in v5).
- **Levels:** `error | warn | info | debug`.
- **Line format** (electron-log `format`):
  `[YYYY-MM-DD HH:mm:ss.SSS] [LEVEL] [MODULE] - {text} {metadata-json}`
- **Async:** electron-log's file transport writes off the UI thread; never block
  the renderer.

## 1.2.1 Renderer → file logging (electron-log)

Renderer logs are written to the same `logs/` directory via electron-log's
renderer→main bridge — the renderer never touches the filesystem itself
(consistent with `sandbox: true`, `contextIsolation: true`).

Wiring:
- **Main** (`main/diagnostics/logger.ts`): `import log from 'electron-log/main'`
  then `log.initialize()` once at startup. `initialize()` installs the IPC
  transport that receives renderer logs. Configure the file transport here (path
  resolver → `userData/logs`, `maxSize` 5 MB, the §1.2 line `format`); main writes
  both `main.log` and the renderer stream.
- **Preload** (`src/preload.ts`): add `import 'electron-log/preload';`. Under
  sandbox, electron-log's auto-injection can't run, so its preload bridge must be
  imported explicitly for the renderer transport to reach main.
- **Renderer**: modules use `import log from 'electron-log/renderer';` and
  `const logger = log.scope('RemindersView')` to populate the `[MODULE]` field.

Data flow (all async, non-blocking):
`renderer log.info(...)` → electron-log renderer transport → IPC
(`__ELECTRON_LOG__`) → main IPC transport → file transport → `logs/renderer.log`.

Renderer error capture:
- Call `log.errorHandler.startCatching()` in the renderer to log `window.onerror`
  and `unhandledrejection` (**soft** JS errors) to file. These are distinct from
  **hard** renderer crashes, which the main process catches via
  `render-process-gone` (§1.4) and which drive the Friendly Crash Overlay.

Routing main vs renderer is by electron-log `scope`/transport into `main.log` /
`renderer.log`, both under `logs/` and in the §1.2 format, so a single grep across
`logs/` reconstructs a full session timeline.

## 1.3 Retention policy (pure + sweep)

electron-log caps a single file at **5 MB** (`transports.file.maxSize`) and rotates
to `*.old`. The "≤ 5 files / ≤ 7 days" policy is enforced by a pure function run
on startup and after each rotation:

```ts
interface LogFileStat { name: string; mtimeMs: number; }
interface RetentionOpts { maxFiles: number; maxAgeMs: number; } // {5, 7*24*3600_000}

// Returns the filenames to delete: anything older than maxAgeMs, plus anything
// beyond the newest maxFiles. Deterministic; no I/O.
function selectExpiredLogs(files: LogFileStat[], now: number, opts: RetentionOpts): string[];
```

A thin `pruneLogs()` in `retention.ts` reads `logs/` stats, calls
`selectExpiredLogs`, and unlinks the results.

## 1.4 Global exception capture

In `crash.ts`, installed during app startup (main process):

- `process.on('uncaughtException', onFatal)`
- `process.on('unhandledRejection', onFatal)`
- For renderer crashes: `mainWindow.webContents.on('render-process-gone', onFatal)`

`onFatal(error)`:
1. `logger.log('error', 'crash', message, { stack })` — full stack persisted.
2. Open the **Friendly Crash Overlay** window with `{ message, stack }`.
3. Do **not** call `process.exit` immediately; let the overlay drive restart.

### 1.4.1 Reentrancy & crash-loop protection

The fatal handler must be safe to enter while a crash is already being handled —
otherwise an error thrown *during* logging or while opening the overlay would
raise another `uncaughtException` and loop forever.

- **Single-flight flag:** a module-level `let handling = false`. The first fatal
  sets `handling = true` and proceeds; while it is true, further fatals are
  appended to the log (best-effort, wrapped in `try/catch`) and otherwise
  ignored — no second overlay, no repeated export/relaunch.
- **Self-protected handler:** the whole body of `onFatal` is wrapped in
  `try/catch`. If handling itself throws (logging or window creation fails), the
  `catch` does a last-resort `process.exit(1)` rather than rethrow — it must never
  re-enter the handler.
- **Crash window is isolated:** the overlay window uses its own minimal preload and
  is **not** covered by the main `render-process-gone` handler. A failure inside
  the crash window triggers a plain exit, never a recursive `onFatal`.
- **Loop breaker:** keep an in-memory crash counter + first-crash timestamp; if
  more than `N` fatals (e.g. 3) occur within a short window (e.g. 5 s), skip the
  overlay and hard-exit so a tight crash loop can't thrash the machine.
- **Post-quit suppression:** once "Export & Restart" has called
  `app.relaunch()` / `app.exit()`, set a `quitting` flag so late
  `unhandledRejection`s emitted during teardown are dropped silently.
- **Idempotent install:** handlers are attached exactly once at startup (guarded),
  so re-initialization can't stack duplicate listeners.

## 1.5 Friendly Crash Overlay

- A **dedicated `BrowserWindow`** loading a separate Vite renderer entry
  (`crash_window`) — a renderer crash can't be shown in the crashed window, so a
  fresh window is required. Add the entry to `forge.config.js`
  (`renderer: [{ name: 'main_window', … }, { name: 'crash_window', … }]`).
- **UI:** message *"Something went wrong, but your data is safe locally."*; a
  collapsible "Technical Details" accordion (stack snippet); primary button
  **"Export Crash Report & Restart"**.
- Button → export logs (1.6) then `app.relaunch(); app.exit(0)`.
- Crash window preload (`crash-preload.ts`) exposes only:
  `getCrashInfo(): Promise<{message,stack}>` and `exportAndRestart(): Promise<void>`.

## 1.6 Export Diagnostic Logs

- Settings/Help control **"Export Diagnostic Logs"** in `SettingsView`.
- Main handler: `dialog.showSaveDialog` with
  `defaultPath = join(app.getPath('desktop'), 'chronochime-logs-YYYYMMDD.zip')`;
  on confirm, zip the whole `logs/` dir with **`adm-zip`** and write to the chosen
  path. Returns `{ canceled }` or `{ path }`.

## 1.7 IPC + bridge additions

| Channel | Direction | Payload → Result |
| --- | --- | --- |
| `chronochime:diagnostics:exportLogs` | invoke | `{}` → `{ canceled: boolean; path?: string }` |
| `chronochime:diagnostics:openLogsDir` | invoke (optional) | `{}` → `void` (`shell.openPath`) |
| `chronochime:crash:getInfo` | invoke (crash window) | `{}` → `{ message: string; stack: string }` |
| `chronochime:crash:exportAndRestart` | invoke (crash window) | `{}` → `void` |

`window.chrono.diagnostics.exportLogs()` added to the bridge. Renderer code uses
electron-log's renderer logger directly (no custom log channel needed).

## 1.8 Dependencies
- `electron-log` (^5), `adm-zip` (+ `@types/adm-zip`). Both small, MIT.

## 1.9 Test plan (TDD)
- **Pure:** `selectExpiredLogs` — age-only purge, count-only purge, combined,
  empty, exactly-at-threshold (boundaries).
- **Integration:** export writes a non-empty zip containing the log files (temp
  dir, adm-zip read-back).
- Electron glue (handlers, crash window) verified by running the app + bundle
  checks (consistent with current renderer coverage approach).

## 1.10 Acceptance criteria
- Logs written to the per-OS `logs/` dir in the specified format; no UI blocking.
- File capped at 5 MB; never more than 5 files or 7 days retained.
- An unhandled main/renderer error is logged with full stack and shows the
  overlay instead of a silent crash; "Export & Restart" produces a zip and relaunches.
- "Export Diagnostic Logs" yields `chronochime-logs-YYYYMMDD.zip` of `logs/`.

---

# Part 2 — Alternate Update Mechanism (GitHub Releases)

## 2.1 Module layout

```
src/main/update/
  checker.ts       # fetch releases/latest; orchestrate; expose check()
  compare.ts       # pure: isNewer(localVersion, remoteVersion) via semver
  asset-select.ts  # pure: selectAsset(assets, platform) -> url | null
  downloader.ts    # managed download: progress, resume, integrity (§2.7)
src/renderer/UpdateBanner.tsx   # non-intrusive banner + detail modal + progress
```

## 2.2 Version source & API

- **Current version:** `app.getVersion()` (= `package.json` version, e.g. `1.0.0`).
- **Endpoint:** `GET https://api.github.com/repos/svijaykoushik/chrono-chime-desktop/releases/latest`
  with headers `Accept: application/vnd.github+json`, `User-Agent: ChronoChime`.
  Unauthenticated (public repo); `releases/latest` excludes drafts/pre-releases.
- **Mapped result** (validated with Zod):

```ts
interface UpdateInfo {
  version: string;       // from tag_name, 'v' stripped
  releaseDate: string;   // published_at
  notes: string;         // body (changelog)
  releaseUrl: string;    // html_url (fallback target)
  assetUrl: string | null; // platform installer, via selectAsset
  critical: boolean;     // body contains a "[critical]" marker
}
type CheckResult =
  | { status: 'up-to-date' }
  | { status: 'available'; info: UpdateInfo }
  | { status: 'offline' }
  | { status: 'error' };
```

## 2.3 Detection logic (pure)
- `isNewer(local, remote)` uses the **`semver`** package (`semver.gt(clean(remote), clean(local))`),
  correctly handling the `v` prefix and prerelease ordering. Update triggers iff
  `isNewer` is true.

## 2.4 Asset selection (pure)
- `selectAsset(assets, platform)`:
  - `win32` → asset whose name ends with `.exe` (Squirrel `*Setup*.exe` preferred).
  - `linux` → asset whose name ends with `.deb`.
  - else → `null`. (No macOS — the spec's `.dmg`/`macos` entry is intentionally absent.)

## 2.5 Triggers & failure handling
- **Startup:** after the main window is ready, a deferred async `check()` (kept
  off the critical path). Result cached for the session.
- **Manual:** `chronochime:update:check` from an "About / Check for Updates"
  control in Settings.
- **Offline/error:** all network/parse errors are caught and mapped to
  `{status:'offline'|'error'}`; never thrown to the UI, never blocking.

## 2.6 UI notification & lifecycle
- **Non-intrusive:** when `status==='available'`, render a subtle banner/badge
  ("Update vX.Y.Z available") in the app bar — no modal interrupt, **unless**
  `critical` is true (then auto-open the modal).
- **Modal:** version, release date, changelog (`notes`), primary **"Download Update"**;
  includes the reminder: *"You may need to allow permission again through Windows
  SmartScreen / macOS Gatekeeper when launching the new installer."*

## 2.7 Install flow — managed download (unsigned)

The app **downloads the installer itself** (for progress + reliability) but never
auto-executes it — after a verified download it opens the file for the user to run
(the unsigned installer still passes through SmartScreen/Gatekeeper). New module:
`src/main/update/downloader.ts`. No new dependency — built on Electron's
`session`/`DownloadItem` and Node `crypto`.

### 2.7.1 Mechanism & progress
- Started from the main process via the main window's
  `session.downloadURL(assetUrl)`; the resulting Electron **`DownloadItem`** is the
  handle. `item.setSavePath(stagingPath)` forces a known path and suppresses the OS
  save dialog.
- **Staging:** download to `userData/updates/<asset>.part` (a temp file) — never
  directly to the final name or into `Downloads/`. Partial/corrupt bytes stay out
  of the user's Downloads folder.
- **Progress:** the `DownloadItem` `updated` event exposes
  `getReceivedBytes()`/`getTotalBytes()`; throttle to ~4/s and push
  `chronochime:update:downloadProgress` `{ received, total, percent, bytesPerSec }`
  to the renderer, which shows a determinate progress bar in the update modal.
  Expose pause and cancel.

### 2.7.2 Reconnects / transient failures
- On `updated`/`done` with state `interrupted`: if `item.canResume()`, call
  `item.resume()`. GitHub asset URLs (S3/CDN) honour HTTP `Range`, so a resume
  continues from the received offset instead of restarting.
- Retry interruptions with **exponential backoff** (1s, 2s, 4s… capped) up to
  `MAX_RETRIES` (e.g. 5); after that, surface a retryable error in the modal.
  Going offline mid-download is just an interruption → same path, no crash, no
  visible error spam.

### 2.7.3 Resume across app restarts
- On each throttled progress tick and on interruption, persist
  `userData/updates/pending.json`:
  `{ version, url, urlChain, savePath, received, total, eTag, lastModified, startTime }`.
- On next launch, if `pending.json` + its `.part` exist for the **still-latest**
  version, offer "Resume update download". Resume uses
  `session.createInterruptedDownload({ path, urlChain, offset: received, length: total, lastModified, eTag, startTime })`
  — Electron's primitive for cross-restart resume.
- If the release/version changed (eTag or tag differs) or the partial is otherwise
  unusable, **discard** `.part` + `pending.json` and start fresh.

### 2.7.4 Corruption prevention & integrity
- All bytes land in `<asset>.part`; the final file does not exist until verified.
- On completion, verify **in order**:
  1. **Size** equals `getTotalBytes()` / `Content-Length`.
  2. **Checksum** — SHA-256 of the `.part` (Node `crypto`, streamed) compared to
     the release's published checksum.
- Only on success: **atomically rename** `.part` → `userData/updates/<asset>`
  (same volume ⇒ atomic), then copy into `Downloads/` and clear `pending.json`.
- On failure: delete the `.part`, clear `pending.json`, surface "Download failed —
  retry". A half-written file is therefore never openable.
- **Requires a checksum asset on the release.** Add to `release.yml`: publish
  `SHA256SUMS.txt` (or per-asset `*.sha256`) alongside the installers; the checker
  reads it from `releases/latest` assets. If absent, fall back to **size-only**
  verification and log a warning (weaker guarantee — flagged).

### 2.7.5 After download
- `shell.openPath(finalPath)` to launch the installer (or `shell.showItemInFolder`).
  Keep the SmartScreen/Gatekeeper reminder text. The app never executes it silently
  (unsigned).
- **Fallback:** if `selectAsset` → `null` (no platform asset) or the managed
  download keeps failing, fall back to `shell.openExternal(releaseUrl)` so the user
  downloads manually from the browser.

### 2.7.6 Constraints
- **Single active download** at a time (guard); a second request no-ops or replaces
  only after the first is cancelled.
- Only download from the verified `releases/latest` asset URL on the project repo
  (no arbitrary URLs) — the URL is never taken from user input.

## 2.8 IPC + bridge additions

| Channel | Direction | Payload → Result |
| --- | --- | --- |
| `chronochime:update:check` | invoke | `{}` → `CheckResult` |
| `chronochime:update:download` | invoke | `{}` → `void` (starts/uses the managed download) |
| `chronochime:update:cancelDownload` | invoke | `{}` → `void` |
| `chronochime:update:downloadProgress` | main→renderer (send) | `{ received, total, percent, bytesPerSec }` |
| `chronochime:update:downloadDone` | main→renderer (send) | `{ status: 'completed' \| 'failed' \| 'verifying'; path?: string; error?: string }` |
| `chronochime:update:openDownload` | invoke | `{ url: string }` → `void` (browser fallback) |
| `chronochime:update:available` | main→renderer (send) | `UpdateInfo` (startup push) |
| `chronochime:update:resumablePending` | main→renderer (send) | `{ version: string }` (offer resume on launch) |

```
window.chrono.update = {
  check(), download(), cancelDownload(), openDownload(url),
  onAvailable(cb), onProgress(cb), onDone(cb), onResumablePending(cb),
}
```

## 2.9 Dependencies
- `semver` (+ `@types/semver`).
- The managed download adds **no** new dependency — it uses Electron's
  `session`/`DownloadItem` and Node's built-in `crypto` (SHA-256) and `fs`.
- Release-side: `release.yml` must publish a checksum asset (`SHA256SUMS.txt`)
  for §2.7.4 integrity verification.

## 2.10 Test plan & acceptance
- **Pure:** `isNewer` (equal, patch/minor/major bumps, `v` prefix, prerelease vs
  release, malformed → false); `selectAsset` (win/linux/none, multiple assets).
  Factor download decisions into pure helpers and test them: backoff schedule,
  "should-resume?" given (eTag/version/partial), and **integrity verify**
  (size match + SHA-256 match/mismatch) over a temp `.part` fixture.
- **Integration:** `checker` maps a sample GitHub `releases/latest` JSON fixture
  → `UpdateInfo`; network failure → `{status:'offline'}` (mocked fetch). Verify
  finalize does an atomic rename only after a passing checksum and deletes the
  `.part` on mismatch.
- **Acceptance:** newer remote → banner appears; offline → silent no-op; download
  shows progress, survives a simulated interruption (resumes), survives an app
  restart (resumes from `pending.json`), and a corrupted/size-mismatched file is
  rejected (never opened); up-to-date → no banner.

---

# Cross-cutting

- **Security:** no tokens (public, unauthenticated GitHub read); renderer remains
  `sandbox`/`contextIsolation`; CSP unchanged (network calls are main-process only;
  `shell.openExternal` opens the OS browser). Validate the GitHub payload with Zod
  before use.
- **Settings additions (optional):** `checkUpdatesOnStartup: boolean` (default
  true) added to `Settings` so users can disable the startup check.
- **Supersedes v1 issues:** #3 (logging), #23 (log rollover).
- **Build & release:** the crash window adds a Vite renderer entry; new deps
  (`electron-log`, `adm-zip`, `semver`) are bundled by Forge/Vite (none native — no
  ABI concerns). `release.yml` gains a step to publish `SHA256SUMS.txt` for update
  integrity (§2.7.4). Downloads stage under `userData/updates/`.

## Suggested sequencing
1. Logging service + retention (pure `selectExpiredLogs` first, TDD) → wire main +
   renderer transports (§1.2.1).
2. Global exception capture + reentrancy guard (§1.4.1) + crash overlay window.
3. Export logs (zip + dialog) + Settings control.
4. Update pure logic (`isNewer`, `selectAsset`, TDD) → `checker` → IPC.
5. Update UI (banner + modal) + startup/manual triggers.
6. Managed `downloader` (§2.7): progress → reconnect/resume → cross-restart resume
   → integrity, plus the `SHA256SUMS.txt` step in `release.yml`.

## Out of scope
- Remote telemetry/analytics; auto-download-and-silently-install; code signing;
  delta updates; macOS artifacts.
