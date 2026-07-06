# Code‑Base Conventions

This document captures the **project‑wide conventions** that all contributors
should follow when adding or modifying code in ChronoChime.

## 1. Path handling
* All file‑system paths that are persisted or compared in tests must be built
  using **POSIX‑style joins** (`path.posix.join`).  This guarantees that the
  generated strings contain forward slashes (`/`) on every platform, which is
  what the test suite expects.
* When a path is required to match the native OS representation (e.g. when
  passing a path to Electron APIs), normalise the base `app.getPath('userData')`
  value first:
  ```ts
  const updatesDir = path.posix.join(
    app.getPath('userData').replace(/\\/g, '/'),
    'updates'
  );
  ```
* Tests should **never hard‑code** platform‑specific separators.  Instead they
  should compute the expected value from the mocked `app.getPath` using
  `path.join` (or `path.posix.join` when the test deliberately expects POSIX
  format).

## 2. Naming & Structure
* Files live under `src/main/`, `src/renderer/`, `src/shared/` according to
  their process responsibilities.
* Public APIs exposed via the preload bridge are defined in
  `src/shared/bridge.ts` and validated with Zod schemas in
  `src/shared/contract.ts`.

## 3. Testing
* Follow **Test‑Driven Development** – write failing tests first, then make them
  pass.
* When mocking the filesystem, use `vi.mock('node:fs')` and provide explicit
  implementations for the methods used (`existsSync`, `mkdirSync`, …).
* Use the **OS‑agnostic path helpers** described above to build expected values
  inside the test bodies.

---

For a full overview of the project architecture see the
[Technical Design Document](../design/technical-design-document.md).
