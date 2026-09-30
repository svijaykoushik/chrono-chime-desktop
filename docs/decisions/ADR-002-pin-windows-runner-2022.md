---
type: Decision
title: ADR-002 — Pin Windows CI runners to windows-2022 for native toolchain compatibility
description: Pin GitHub Actions Windows runner image to windows-2022 instead of windows-latest to avoid Visual Studio 18 detection failures in node-gyp during Electron native module compilation.
tags: [decision, ci, build, windows, toolchain]
timestamp: 2026-10-01
status: Accepted
---

# ADR-002 — Pin Windows CI runners to `windows-2022`

**Status:** Accepted · **Date:** 2026-10-01

## Context

ChronoChime relies on `better-sqlite3`, a high-performance C++ native SQLite addon that must be compiled or rebuilt against Electron's Node ABI using `@electron/rebuild` (which delegates to `@electron/node-gyp`).

In the automated release and pull request validation workflows (`.github/workflows/release.yml` and `.github/workflows/validate.yml`), Windows builds were initially configured with `runs-on: windows-latest`.

When GitHub Actions migrated the `windows-latest` image from Windows Server 2022 to Windows Server 2025 with preview Visual Studio 18 (VS 2026 Enterprise), native compilation broke:
```text
npm error gyp verb find VS unknown version "undefined" found at "C:\Program Files\Microsoft Visual Studio\18\Enterprise"
npm error gyp verb find VS could not find a version of Visual Studio 2017 or newer to use
npm error gyp ERR! stack Error: Could not find any Visual Studio installation to use
npm error gyp ERR! stack at VisualStudioFinder.fail (D:\a\...\lib\find-visualstudio.js:118:11)
```

Investigation of `@electron/node-gyp/lib/find-visualstudio.js` showed that its `findNewVSUsingSetupModule` implementation is hardcoded to support specific release years: `[2019, 2022]`. When querying PowerShell for VS instances on Windows Server 2025, it discovered VS 18, could not parse the version string, and aborted with exit code 1.

Additionally, multi-platform build steps combining Unix shell builtins (e.g. `umask 022`) failed on Windows runners because GitHub Actions defaults to PowerShell (`pwsh`), where `umask` is not recognized.

## Decision

1. **Explicitly pin Windows runners to `windows-2022`:**
   Change `runs-on: windows-latest` and matrix target `os: windows-latest` to `windows-2022` in all GitHub Actions workflows (`release.yml` and `validate.yml`).
   `windows-2022` provides Windows Server 2022 with Visual Studio 2022 (v17.x) pre-installed, fully satisfying the `[2019, 2022]` search criteria in `@electron/node-gyp`.

2. **Isolate OS-specific build commands:**
   Ensure Unix-only builtins (such as `umask 022` used to ensure proper packaging permissions on Linux) are explicitly guarded by `if: runner.os == 'Linux'`, while Windows executes clean native `npm run make` without POSIX shell syntax.

## Alternatives Considered

* **Retain `windows-latest` and patch `@electron/node-gyp`:**
  Rejected. Patching deep transitive dependencies inside `@electron/rebuild` is fragile, non-deterministic across clean `npm ci` environments, and upstream Electron has not yet released a stable VS 18 compatibility patch.
* **Retain `windows-latest` and install VS 2022 side-by-side in CI:**
  Rejected. Installing a secondary Visual Studio 2022 payload during runner boot adds several gigabytes of download and 10+ minutes to every workflow run.
* **Rely purely on prebuilt native binaries without rebuild:**
  Rejected. `better-sqlite3` must compile against Electron's specific internal V8 / Node ABI (`premake` / `prepackage` calls `electron-rebuild -f -w better-sqlite3`). Bypassing compilation causes Electron runtime ABI symbol mismatches.

## Trade-offs

* Pinning to `windows-2022` locks the runner image to Windows Server 2022 until `@electron/node-gyp` and `@electron/rebuild` release official support for Visual Studio 18 / Windows Server 2025.
* Minimal maintenance: when upstream Electron toolchains add stable VS 18 support, the matrix can be reviewed and bumped to a newer runner image.

## Consequences

* Windows release builds and PR validation workflows reliably succeed with deterministic MSVC 2022 toolchain detection.
* Squirrel `.exe` and `.nupkg` distributables package cleanly in CI without pipeline failures.
