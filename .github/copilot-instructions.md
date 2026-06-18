# Project Guidelines

## Code Style

- Use TypeScript with strict type checking (`noImplicitAny: true` in tsconfig.json)
- Follow ESLint rules defined in .eslintrc.json for .ts/.tsx files
- Use 2-space indentation, single quotes for strings
- Reference src/main.ts, src/preload.ts, src/renderer.ts for code patterns

## Architecture

ChronoChime follows a multi-process Electron architecture:
- Main process: Scheduler Engine, Notification Manager, Time Sync Service, Idle Tracker, IPC Server
- Renderer process: React UI with Material 3 design
- Preload script: Secure IPC bridge using contextBridge
- Database: SQLite with Drizzle ORM

Key principles:
- Background-first: Core logic runs without UI open (tray app)
- Deterministic scheduling: a single active setTimeout recalculated after each fire to avoid drift; all timing derives from a pure `nextOccurrence(rule, after, tz)` engine
- Low resource usage: Renderer not required for background operation
- Typed IPC: All channels follow `chronochime:<domain>:<operation>` pattern with Zod validation

## Build and Test

- Install: `npm install`
- Dev: `npm start` (launches with Vite dev server and HMR)
- Lint: `npm run lint`
- Package: `npm run package` (OS-specific packages)
- Build installers: `npm run make`
- Publish: `npm run publish`

Test commands will be added as features are implemented. Use TDD approach for new features.

## Conventions

- Time storage: Use epoch milliseconds (number) for all timestamps
- IPC validation: All inputs/outputs validated with Zod schemas (`src/shared/contract.ts`)
- Schedules use one discriminated `ScheduleRule` (`src/shared/schedule.ts`): `once` (F2), `interval` (F3), `calendar` (F4/F6). There are no hardcoded recurrence/pomodoro/event enums — routines (Pomodoro, Hydration, …) expand to child `ScheduleRule`s via `src/main/routine/expand.ts`.
- Persistence: SQLite via better-sqlite3 behind the `Repository` interface (`src/main/store`)
- Use Material UI v5+ with Material 3 theming for renderer components
- Follow 8dp spacing system, rounded corners, elevation-based hierarchy
- Brand is **"Aesthetic Bubblegum Pink"** (from the app icon): rose `#EE5A8A`, bubblegum `#F589B2`. Use the `BRAND` constants / `theme.palette` in `src/renderer/theme.ts` — never hardcode off-brand hues. See `docs/design/branding-and-theme.md`.

For detailed architecture, the schedule model, and the IPC contract, see
`docs/design/technical-design-document.md`.