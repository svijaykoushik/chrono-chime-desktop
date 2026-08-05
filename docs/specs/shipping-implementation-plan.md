---
type: Specification
title: Shipping Implementation Plan
description: Milestone-sequenced build plan (M1-M7) with exit criteria and risks.
tags: [spec, planning]
timestamp: 2026-07-05
---

# Implementation Plan — Shipping-Prep Features

A sequenced, milestone-based plan for implementing the two accepted specs:

- [Diagnostics, Logging & Updates](./diagnostics-and-updates.md) (Spec D)
- [About & Feedback](./feedback-and-community.md) (Spec F)

This plan **does not restate** the specs — it orders the work, names exit
criteria, and flags risks. Section references (e.g. D§1.3, F§2.2) point into the
specs.

## Principles

- **One milestone = one PR**, each independently green: `npm run typecheck` +
  `npm test` pass, and `npm run make`/`start` still work where relevant.
- **TDD, pure logic first.** Every milestone front-loads its pure functions
  (`selectExpiredLogs`, `isNewer`, `selectAsset`, URL builders, integrity/backoff
  helpers) as unit tests, then wires the Electron glue.
- **No native dependencies.** `electron-log`, `adm-zip`, `semver` are pure JS — no
  `electron-rebuild`/ABI concerns (unlike `better-sqlite3`).
- **Main owns I/O.** Network, filesystem, `shell`, downloads live in main; the
  renderer stays sandboxed and talks over the typed Zod IPC contract.
- **Keep gates green:** the `validate` workflow (typecheck + test + renderer build,
  on Linux + Windows) gates every PR.

## Ordering & dependencies

```
M1 Logging foundation ──┬─> M2 Export logs ──> M3 Crash overlay
                        │                          (uses M2 export)
                        └─> (all later code can log)

M4 About & Feedback  (independent; establishes the About card)
                        └─> M6 Update UI adds its "Check for updates" control here

M5 Update detection ──> M6 Update UI ──> M7 Managed downloader (+ release.yml)
```

Rationale: **logging is foundational** (everything else logs through it), so M1
first. **Crash overlay depends on export** (its button exports), so M2 before M3.
**About & Feedback (M4)** is small and independent and creates the shared *About*
Settings card that the update UI later hangs its "Check for updates" control on.
**Updates** go detection → UI → downloader (the downloader is the largest, riskiest
piece, so it lands last).

| # | Milestone | Spec | Size | Blocks | Status |
| --- | --- | --- | --- | --- | --- |
| M1 | Logging foundation | D§1.1–1.3, 1.2.1 | M | M2, M3 | **Done** |
| M2 | Export diagnostic logs | D§1.6 | S | M3 | **Done** |
| M3 | Crash capture + overlay | D§1.4–1.5 | M | — | **Done** |
| M4 | About & Feedback | F (all) | M | M6 (shared card) | **Done** |
| M5 | Update detection (no UI) | D§2.1–2.5 | M | M6 | **Done** |
| M6 | Update UI (banner/modal) | D§2.6 | M | M7 | **Done** |
| M7 | Managed downloader + release checksums | D§2.7, 2.9 | L | — | **Done** |

---

## M1 — Logging foundation

**Goal:** structured, rolling, per-OS logs from main *and* renderer.

- Deps: `electron-log` (^5).
- Files: `src/main/diagnostics/logger.ts` (init `electron-log/main`, file transport
  → `userData/logs`, 5 MB cap, the D§1.2 format), `src/main/diagnostics/retention.ts`
  (pure `selectExpiredLogs` + `pruneLogs` sweep). `src/preload.ts` adds
  `import 'electron-log/preload'`. `src/main.ts` calls `log.initialize()` + `pruneLogs()`
  at boot. Renderer modules start using `electron-log/renderer` (`log.scope(...)`)
  and `log.errorHandler.startCatching()`.
- Tests: `tests/unit/retention.test.ts` — age-only, count-only, combined,
  empty, boundary (D§1.9).
- **Exit:** logs appear under `logs/` in the specified format on a real run;
  retention prunes to ≤5 files / ≤7 days; gates green.
- Risk: confirm `electron-log/preload` works under `sandbox: true` (verify on first
  run; small).

## M2 — Export Diagnostic Logs

**Goal:** zip the `logs/` dir to a user-chosen file.

- Deps: `adm-zip` (+ `@types/adm-zip`).
- Files: `src/main/diagnostics/export.ts` (zip + `dialog.showSaveDialog`,
  default `~/Desktop/chronochime-logs-YYYYMMDD.zip`). IPC
  `diagnostics:exportLogs` (+ optional `diagnostics:openLogsDir`) in `contract.ts`;
  `window.chrono.diagnostics.exportLogs()` in the bridge. A **"Diagnostics"**
  card in `SettingsView` with the **"Export Diagnostic Logs"** button.
- Tests: integration — export writes a non-empty zip containing the log files
  (temp dir, adm-zip read-back) (D§1.9).
- **Exit:** button produces the dated zip of `logs/`; gates green.

## M3 — Crash capture + Friendly Crash Overlay

**Goal:** no silent crashes; a friendly overlay with export+restart.

- Files: `src/main/diagnostics/crash.ts` (global `uncaughtException`/
  `unhandledRejection` + `render-process-gone`; **reentrancy guard D§1.4.1**:
  single-flight flag, self-protected handler, loop breaker, post-quit suppression).
  New Vite renderer entry **`crash_window`** in `forge.config.js` (+ its CSP'd HTML);
  `src/crash.tsx` (overlay UI: message, details accordion, "Export Crash Report &
  Restart"), `src/crash-preload.ts` (`getCrashInfo`, `exportAndRestart`). IPC
  `crash:getInfo`, `crash:exportAndRestart` (reuses M2 export, then
  `app.relaunch(); app.exit(0)`).
- Tests: reentrancy logic factored into a pure/testable helper where possible
  (e.g. the loop-breaker decision); overlay verified by run + bundle check.
- **Exit:** a thrown error in main and a renderer crash both log a full stack and
  show the overlay (not a silent exit); export+restart works; no crash loop.
- Risk: the second renderer entry (Forge Vite multi-renderer wiring) — verify
  `npm run make` bundles `crash_window`.

## M4 — About & Feedback

**Goal:** the two offline feedback paths + the About surface.

- Deps: none (Electron `shell`/`app` + Node `os`/`process`).
- Files: `src/main/feedback/urls.ts` (pure `buildGitHubFeedbackUrl`,
  `buildMailtoUrl`), `src/main/feedback/feedback.ts` (gather metadata; handlers;
  `shell.openExternal` in `try/catch`, F§5.1). IPC `about:get`,
  `feedback:openGitHub`, `feedback:openEmail` (+ `aboutInfoSchema`); bridge
  `window.chrono.about`/`feedback`. **"About & Feedback"** card in `SettingsView`
  (identity, privacy copy, two captioned buttons, F§1). Repo artifact:
  `.github/ISSUE_TEMPLATE/feedback.yml` committed to the **default branch**.
- Tests: `tests/unit/feedback-urls.test.ts` — base, param order, encoding,
  CRLF body, `?template=feedback.yml` (F§6).
- **Exit:** GitHub button opens the pre-filled issue form (label applied via
  template); email button opens the mail client; no-handler case is a graceful
  Snackbar; 0 app-originated network frames; gates green.
- Risk: confirm GitHub Issue-Form **query-param prefill** of the `system` field by
  `id` (verify against the live repo once `feedback.yml` is on the default branch).

## M5 — Update detection (no UI)

**Goal:** know when a newer release exists; expose it over IPC.

- Deps: `semver` (+ `@types/semver`).
- Files: `src/main/update/compare.ts` (pure `isNewer`), `asset-select.ts` (pure
  `selectAsset`), `checker.ts` (fetch `releases/latest`, map → `UpdateInfo`, Zod
  validate, `CheckResult`). IPC `update:check` + `update:available` event; bridge
  `window.chrono.update.check/onAvailable`. Startup deferred check + manual handler
  (D§2.5); offline/error mapped silently.
- Tests: `isNewer` (equal, bumps, `v` prefix, prerelease, malformed→false);
  `selectAsset` (win/linux/none/multiple); `checker` maps a fixture + offline →
  `{status:'offline'}` (mocked fetch) (D§2.10).
- **Exit:** against a fixture/live repo, a newer tag → `available`; same → `up-to-date`;
  offline → silent; gates green.

## M6 — Update UI (banner + modal)

**Goal:** surface an available update non-intrusively.

- Files: `src/renderer/UpdateBanner.tsx` (app-bar badge when available; modal with
  version/date/changelog + "Download Update"; auto-open only if `critical`,
  D§2.6). Add a **"Check for updates"** control to the **About & Feedback** card
  (from M4). Wire startup push + manual check. Until M7, "Download Update" uses the
  `update:openDownload` **browser fallback** (`shell.openExternal`).
- Tests: banner/modal via run + bundle string checks (consistent with current
  renderer coverage).
- **Exit:** newer remote → banner; modal shows notes; download opens the release in
  the browser (interim); up-to-date → no banner.

## M7 — Managed downloader + release checksums

**Goal:** in-app download with progress, resume, and integrity.

- Files: `src/main/update/downloader.ts` (`session.downloadURL` → `DownloadItem`;
  stage to `userData/updates/<asset>.part`; throttled progress; reconnect/resume;
  cross-restart resume via `pending.json` + `createInterruptedDownload`; size +
  SHA-256 verify; atomic rename → copy to `Downloads/`; `shell.openPath`; single-flight
  guard — D§2.7). Pure helpers (backoff schedule, should-resume?, integrity verify)
  unit-tested. IPC `update:download/cancelDownload/downloadProgress/downloadDone/
  resumablePending`; modal progress bar + resume prompt. **`release.yml`**: publish
  `SHA256SUMS.txt` alongside installers.
- Tests: pure backoff/should-resume/integrity (D§2.10); finalize does atomic rename
  only after a passing checksum and deletes `.part` on mismatch; simulated
  interruption resumes; restart resumes from `pending.json`; corrupt file rejected.
- **Exit:** download shows progress, survives interruption + app restart, rejects a
  tampered/short file, opens the verified installer; browser fallback when no asset
  or repeated failure.
- Risk (**highest**): `createInterruptedDownload` needs exact `eTag`/`lastModified`/
  `startTime`/offset — fiddly; full integration needs a real release carrying
  `SHA256SUMS.txt`, so until one exists, test with fixtures and the size-only
  fallback.

---

## Cross-cutting

- **CI:** new unit/integration tests run in `validate` on Linux + Windows. The
  renderer build sanity step builds `main_window`; the `crash_window` entry is
  exercised by `npm run make` (M3) — consider adding a crash-window build check to
  `validate` when M3 lands.
- **Versioning:** if these ship in the first public release they fold into
  **`1.0.0`**; if released afterward they are a **MINOR** bump (`1.1.0`) since
  they're backward-compatible additions. (See packaging doc.)
- **Settings/About surface is shared:** M2 adds a Diagnostics card, M4 creates the
  About & Feedback card, M6 adds a "Check for updates" control to it. Land M4
  before M6 to avoid churn on that card.
- **Optional setting:** `checkUpdatesOnStartup` (D cross-cutting) can be added with
  M5/M6 if desired.
- **Per-PR verification:** `npm run typecheck && npm test`, plus a manual `npm start`
  smoke for any milestone with UI or Electron glue (M2–M7).

## Risks / unknowns to validate early

1. `electron-log/preload` under `sandbox: true` (M1).
2. Forge Vite multi-renderer (`crash_window`) bundling (M3).
3. GitHub Issue-Form `system`-field prefill by query param (M4).
4. `createInterruptedDownload` resume fidelity + needing a real `SHA256SUMS.txt`
   release for end-to-end (M7).

## Out of scope

Per both specs: remote telemetry/analytics, silent auto-install, code signing,
delta updates, macOS artifacts, in-app feedback storage/ratings.
