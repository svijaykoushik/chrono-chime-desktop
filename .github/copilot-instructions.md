# Project Guidelines

## Code Style

- Use TypeScript with strict type checking (`tsconfig.json` is `strict`)
- Follow ESLint rules defined in .eslintrc.json for .ts/.tsx files
- Use 2-space indentation, single quotes for strings
- Reference `src/main.ts`, `src/preload.ts`, `src/renderer.tsx` for entry points

## Architecture

ChronoChime is a CommonJS Electron app bundled by Electron Forge + Vite. It
follows a three-layer architecture; the trust boundary is the IPC layer.

- **Main process** (`src/main.ts` + `src/main/**`): all background logic, runs
  without the window open.
  - `main/recurrence/recurrence.ts` — pure `nextOccurrence(rule, after, tz)` engine (Luxon)
  - `main/recurrence/recovery.ts` — missed-occurrence policy (`decideRecovery`)
  - `main/scheduler/scheduler.ts` — single drift-free timer; `types.ts` defines its seams
  - `main/store/repository.ts` (`Repository` interface + in-memory) and `sqlite-repository.ts` (better-sqlite3)
  - `main/app/{reminder,routine}-service.ts` — application services
  - `main/notification/{decide,manager}.ts` — delivery decision + Electron notifications
  - `main/settings.ts`, `main/autostart.ts` — settings + launch-at-login
  - `main.ts` — app lifecycle, tray, IPC handlers, recovery wiring
- **Preload** (`src/preload.ts`): `contextBridge` exposes only the typed
  `window.chrono` API (`src/shared/bridge.ts`). `contextIsolation: true`,
  `sandbox: true`, `nodeIntegration: false`.
- **Renderer** (`src/renderer.tsx` + `src/renderer/**`): React + MUI (Material 3).
- **Shared** (`src/shared/**`): types, Zod schemas, IPC `contract.ts`, and pure
  helpers (`schedule`, `reminder`, `routine`, `describe-rule`, `template`,
  `quiet-hours`) used by both processes.
- **Persistence:** SQLite via **better-sqlite3** behind the `Repository`
  interface (Drizzle was evaluated and dropped — see the design doc).

Key principles:
- Background-first: core logic runs without the UI open (tray app)
- Deterministic scheduling: a single active `setTimeout` recalculated after each
  fire to avoid drift; all timing derives from the pure `nextOccurrence` engine
- Recovery from state, not timers: schedules derive from persisted `ScheduleRule`
  definitions, recomputed on boot and on `powerMonitor` resume
- Typed IPC: all channels follow `chronochime:<domain>:<operation>` and are
  Zod-validated against `src/shared/contract.ts`

## Build and Test

- Install: `npm install`
- Dev: `npm start` (Vite dev server + HMR; `prestart` rebuilds better-sqlite3 for Electron's ABI)
- Test: `npm test` (Vitest; `pretest` rebuilds better-sqlite3 for Node's ABI)
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Package (unpacked app): `npm run package`
- Build installers/distributables: `npm run make` (alias `npm run dist`) — `.deb` (Linux) / Squirrel `.exe` (Windows)

Targets **Windows and Linux only** (no macOS). Use TDD for new features
(red → green → refactor); keep `npm test` and `npm run typecheck` green.

Native-module note: `better-sqlite3` is rebuilt per ABI by the `pre*` scripts —
don't run `npm start` and `npm test` truly concurrently (they swap the binary).

## Conventions

- Time storage: Use epoch milliseconds (number) for all timestamps
- IPC validation: All inputs/outputs validated with Zod schemas (`src/shared/contract.ts`)
- Schedules use one discriminated `ScheduleRule` (`src/shared/schedule.ts`): `once` (F2), `interval` (F3), `calendar` (F4/F6). There are no hardcoded recurrence/pomodoro/event enums — routines (Pomodoro, Hydration, …) expand to child `ScheduleRule`s via `src/main/routine/expand.ts`.
- Persistence: SQLite via better-sqlite3 behind the `Repository` interface (`src/main/store`)
- Use Material UI v5+ with Material 3 theming for renderer components
- Follow 8dp spacing system, rounded corners, elevation-based hierarchy
- Brand is **"Aesthetic Bubblegum Pink"** (from the app icon): rose `#EE5A8A`, bubblegum `#F589B2`. Use the `BRAND` constants / `theme.palette` in `src/renderer/theme.ts` — never hardcode off-brand hues. See `docs/design/branding-and-theme.md`.

For full documentation see the index `docs/README.md`: the
[Technical Design Document](../docs/design/technical-design-document.md)
(architecture, schedule model, IPC contract — **accepted for implementation**),
[Implementation Status](../docs/design/implementation-status.md),
[Branding & Theme](../docs/design/branding-and-theme.md), and
[Packaging & Distribution](../docs/build/packaging-and-distribution.md).