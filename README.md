# ChronoChime

> Reliably notify people when their chosen temporal conditions become true.

ChronoChime is a calm, reliable temporal-notification desktop app. It remembers
time on your behalf and notifies you at the moments you define — single
reminders, recurring schedules, and composite routines — without becoming a task
manager or productivity suite.

## Tech stack

- **Electron** (Forge + Vite) — cross-platform desktop shell, background-first (tray)
- **TypeScript** (strict) everywhere
- **React + Material UI** (Material 3 theme) renderer
- **better-sqlite3** durable local persistence (behind a `Repository` interface)
- **Luxon** for DST-aware calendar math; **Zod** for IPC + row validation
- **Vitest** for test-driven development

## Architecture

A reliability-first, three-layer Electron design:

- **Main process** — a single drift-free **Scheduler** driven by a pure
  `nextOccurrence(rule, after, tz)` recurrence engine; SQLite persistence;
  Notification Manager; Zod-validated IPC. Runs without the window open.
- **Preload** — `contextBridge` exposes only the typed `window.chrono` API
  (`contextIsolation`, `sandbox`, no `nodeIntegration`).
- **Renderer** — React/MUI views for Reminders, Routines, and Settings.

All scheduling is derived from persisted **rule definitions**, never from
in-memory timers, so the app recovers correctly after restart or sleep.

See [`docs/design/technical-design-document.md`](docs/design/technical-design-document.md)
for the full design and [`docs/design/implementation-status.md`](docs/design/implementation-status.md)
for feature-by-feature traceability.

## Develop

```bash
npm install
npm start        # launch the app with HMR (requires a desktop session)
npm test         # run the Vitest suite (68 tests)
npm run typecheck
npm run package  # build the unpacked app folder (out/ChronoChime-<platform>-<arch>/)
npm run make     # build installers: .deb (Linux) / Squirrel .exe (Windows)
```

ChronoChime targets **Windows and Linux only**. See
[`docs/README.md`](docs/README.md) for the full documentation index, including
[Packaging & Distribution](docs/build/packaging-and-distribution.md).

## License

MIT
