---
type: Design
title: Update Checker
description: Design of the GitHub Releases update checker and its update UI.
tags: [design, updates]
timestamp: 2026-07-05
---

# Update Checker Feature Design Document

**Feature ID:** M4 (Update checker and UI)

## Overview
The update‑checker feature enables ChronoChime to automatically discover new releases on GitHub, download release assets, and present a non‑intrusive UI that informs the user about available updates and allows them to install the update or defer it.

The design follows the existing three‑layer Electron architecture:
- **Main process** performs network I/O, version comparison, and download handling.
- **Preload** exposes a typed bridge for the renderer to request update checks and receive progress events.
- **Renderer** displays a Material‑UI dialog that shows the current version, latest version, release notes, and actions (Install, Later, Skip).

All code lives under `src/main/update/` (main‑side) and `src/renderer/update/` (renderer‑side). The feature is fully covered by unit and integration tests and integrates with the existing logging and diagnostics infrastructure.

---

## Requirements
### Functional
1. **Automatic periodic check** – On app start and then every 24 h, the main process queries the GitHub Releases API for the repository `svijaykoushik/chrono-chime-desktop`.
2. **Version comparison** – Compare the latest release `tag_name` (semantic version) with the current app version from `package.json`.
3. **Release notes** – Retrieve the `body` of the release and render it as markdown in the UI.
4. **Download assets** – When the user clicks **Install**, download the appropriate asset for the current platform (Linux `.deb` or Windows `.exe`).
5. **Integrity verification** – Verify the SHA‑256 checksum provided in the release assets (a `.sha256` file) before installation.
6. **Installation flow** – After successful download and verification, launch the installer in a detached process and quit the app.
7. **User interaction** – UI dialog with three actions:
   - **Install now** – triggers download & install.
   - **Remind me later** – dismisses dialog; next automatic check remains scheduled.
   - **Skip this version** – records the version in user settings so it will not be offered again.
8. **Error handling** – Network failures, checksum mismatches, or missing assets must be reported to the user with a friendly message and logged.
9. **Update Channels** – Support switching between **Stable** and **Prerelease** channels:
   - **Stable** (default): Queries `/releases/latest` for official public builds.
   - **Prerelease**: Queries the list endpoint `/releases` to discover beta and pre-release releases, offering updates if the latest pre-release version is newer than the current client.

### Non‑functional
- **Security** – All network requests use HTTPS. No code is executed from untrusted sources; only the signed installer binary is launched.
- **Performance** – Update check runs in a background async task; UI remains responsive.
- **Reliability** – Failures do not affect core reminder functionality.
- **Testability** – Mockable HTTP client; unit tests for version parsing, checksum verification, and IPC contracts.

---

## Architecture
### Main Process (`src/main/update/`)
| File | Responsibility |
|------|-----------------|
| `update-service.ts` | Orchestrates periodic checks, stores last‑checked timestamp, and exposes `checkForUpdates()` API.
| `github-client.ts` | Thin wrapper around `node-fetch` (or `axios`) that calls `https://api.github.com/repos/svijaykoushik/chrono-chime-desktop/releases/latest` and returns a typed `ReleaseInfo` object.
| `version-utils.ts` | Parses semantic versions, compares them, and determines if an update is newer.
| `downloader.ts` | Streams the selected asset to a temporary file, computes SHA‑256 while downloading, and validates against the checksum file.
| `installer.ts` | Platform‑specific logic to launch the installer (`dpkg -i` on Linux, `Start-Process` on Windows) in a detached process.
| `update-ipc.ts` | Registers IPC channels `chronochime:update:check`, `chronochime:update:download-progress`, `chronochime:update:install-result` using Zod schemas defined in `src/shared/contract.ts`.

All functions are pure where possible and log via the existing `logger` wrapper.

### Preload (`src/preload.ts`)
Add bridge methods to `window.chrono.update`:
```ts
interface UpdateBridge {
  check(): Promise<UpdateCheckResult>; // resolves with {available: boolean, latestVersion?: string, notes?: string}
  onProgress(cb: (p: UpdateProgress) => void): void; // progress events during download
  install(): Promise<InstallResult>; // resolves when installer launched or error
}
```
The bridge validates arguments using the Zod contracts and forwards calls to the main process.

### Renderer (`src/renderer/update/`)
- **`UpdateDialog.tsx`** – Material‑UI `Dialog` component that displays version info, release notes (rendered with `react-markdown`), and action buttons.
- **`useUpdate.ts`** – React hook that calls `window.chrono.update.check()` on mount, subscribes to progress events, and updates component state.
- **`UpdateButton.tsx`** – Small button placed in the Settings view (under *About* section) to manually trigger a check.

The UI follows the existing brand palette (`theme.palette`) and respects the “quiet‑hours” setting – the dialog will not appear during quiet hours; instead a system notification is shown.

---

## Data Flow
1. **App start** → `update-service` schedules a timer (24 h) and immediately calls `checkForUpdates()`.
2. `checkForUpdates()` → `github-client` fetches latest release.
3. If newer version → `update-service` stores `latestRelease` in memory and sends IPC `chronochime:update:available` to renderer.
4. Renderer receives event → opens `UpdateDialog` with release notes.
5. User clicks **Install** → renderer calls `window.chrono.update.install()`.
6. Main process `installer.ts` downloads asset via `downloader.ts`, validates checksum, then launches installer.
7. Installer process runs; main process sends `chronochime:update:install-result` (success/failure) back to renderer.
8. On success, the app quits; on failure, UI shows error and logs.

---

## IPC Contract (additions to `src/shared/contract.ts`)
```ts
export const updateCheckResult = z.object({
  available: z.boolean(),
  latestVersion: z.string().optional(),
  notes: z.string().optional(),
});
export const updateProgress = z.object({
  percent: z.number().min(0).max(100),
  transferred: z.number(), // bytes
  total: z.number(),
});
export const installResult = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});
```
Corresponding channel names:
- `chronochime:update:check` – request/response.
- `chronochime:update:download-progress` – push from main to renderer.
- `chronochime:update:install-result` – final status.

---

## Release Channels Design
To cater to both general users who prioritize stability and power users who want early access to new features, ChronoChime supports two release channels:

### 1. Settings Schema Extension
A new `updateChannel` property is introduced to the `Settings` contract schema:
```ts
export const settingsSchema = z.object({
  // ...
  updateChannel: z.enum(['stable', 'prerelease']).default('stable'),
});
```

### 2. GitHub Releases Endpoint Switching
Depending on the configured channel, the `UpdateService` orchestrates which GitHub Releases API endpoint to query:
- **Stable Channel:** Queries the standard `/releases/latest` API. This returns only the latest stable release.
- **Prerelease Channel:** Queries the list API `/releases`. The main process iterates through the list of recent releases, ignores drafts, and selects the latest release (regardless of whether `prerelease` is true or false).

---

## Error Handling & Edge Cases
| Situation | Handling |
|-----------|----------|
| Network unreachable | Show dialog: *“Unable to check for updates. Please check your internet connection.”*; log error; retry on next scheduled interval.
| No asset for current platform | Show dialog with message and a link to the GitHub releases page.
| Checksum mismatch | Abort download, delete temporary file, show error, log detailed info for diagnostics.
| Installer launch fails | Show error, keep app running, allow user to retry.
| User skips version | Persist `skippedVersion` in `src/main/settings.ts` (JSON store) and ignore that version in future checks.

All errors are reported via the existing `logger.error` and also sent to the diagnostics export pipeline.

---

## Testing Strategy
- **Unit tests** (`tests/unit/update/*.test.ts`):
  - Version parsing/comparison.
  - GitHub client response handling (mocked HTTP).
  - Checksum verification logic.
- **Integration tests** (`tests/integration/update-checker.test.ts`):
  - Spin up the main process with a mocked GitHub server, trigger `checkForUpdates()`, verify IPC messages.
  - Simulate download progress and ensure renderer receives events (use `@electron/remote` test utilities).
- **UI tests** (optional, using `@testing-library/react`):
  - Render `UpdateDialog` with mock props, verify button states and markdown rendering.
- **End‑to‑end** (manual):
  - Build the app, publish a dummy release on a test repo, run the app, and verify the full flow.

All new tests must be added to the CI pipeline and keep the total test count green.

---

## Security Considerations
- Use **GitHub personal access token** with `public_repo` scope only if rate‑limiting becomes an issue; token is stored in the user’s OS keychain and never written to disk.
- Verify TLS certificates; reject self‑signed certs.
- The installer binary is executed only after successful SHA‑256 verification.
- No code is downloaded or executed other than the signed installer.

---

## Documentation & User Guidance
- Add a section to the *About* view linking to “Check for updates…”.
- Update the README with a note about automatic update checks.
- Include troubleshooting steps in `docs/specs/diagnostics-and-updates.md`.

---

## Timeline (Suggested Sprint)
| Week | Milestone |
|------|-----------|
| 1 | Implement `github-client`, `version-utils`, and IPC contracts.
| 2 | Build `update-service` with periodic timer and logging.
| 3 | Add preload bridge and renderer hook (`useUpdate`).
| 4 | Create `UpdateDialog` UI, integrate with Settings view.
| 5 | Implement downloader, checksum verification, and installer launch.
| 6 | Write unit/integration tests, run full test suite, fix bugs.
| 7 | Polish UI, add quiet‑hours respect, update docs.
| 8 | Code review, merge, and release candidate.

---

## Dependencies
- **node-fetch** (or built‑in `https` module) – already a dependency for other network calls.
- **react-markdown** – already used for rendering markdown in other parts of the UI.
- **crypto** (Node built‑in) – for SHA‑256 checksum.
- No new native modules; all code runs in the existing Electron/Node environment.

---

## Impact on Existing Code
- **`src/main/app/notification-service.ts`** – may need to suppress update notifications during quiet hours (reuse existing quiet‑hours helper).
- **`src/main/settings.ts`** – add `skippedVersion?: string` and persist it.
- **`src/renderer/SettingsView.tsx`** – add “Check for updates now” button that calls the new hook.
- **`src/shared/contract.ts`** – add the new Zod schemas (as shown above).

All changes must respect the strict TypeScript configuration (`tsconfig.json` `strict` mode).

---

## Review Checklist
- [ ] IPC contracts added and validated.
- [ ] Main‑side service respects existing logging and diagnostics.
- [ ] Preload bridge correctly typed.
- [ ] UI follows brand palette (`theme.palette` constants).
- [ ] All new code covered by tests; `npm test` passes.
- [ ] `npm run typecheck` passes with no errors.
- [ ] Documentation updated (README, design docs, specs).
- [ ] No new runtime dependencies that break the build.

---

*Prepared by the AI development assistant for the ChronoChime project.*