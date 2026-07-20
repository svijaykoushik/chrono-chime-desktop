# Project Guidelines

**Single source of truth:** [`AGENTS.md`](../AGENTS.md) and the OKF knowledge
bundle at [`docs/index.md`](../docs/index.md). In chat/agent mode, read those
first and follow their guardrails and workflow. The rules below are the
always-on essentials duplicated here so inline completions still respect them.

## Essentials

- **TypeScript strict.** `tsconfig.json` is `strict`; follow `.eslintrc.json`.
  2-space indent, single quotes. Entry points: `src/main.ts`, `src/preload.ts`,
  `src/renderer.tsx`.
- **Three-layer Electron app**, trust boundary at IPC: **main** (`src/main/**`,
  runs without a window) → **preload** (`src/preload.ts`, exposes only typed
  `window.chrono`) → **renderer** (`src/renderer/**`, React + MUI). **shared**
  (`src/shared/**`) is isomorphic. Renderer must never import `src/main/**`.
- **Time storage:** epoch milliseconds (number) for all timestamps.
- **Typed IPC:** every channel is `chronochime:<domain>:<operation>` and
  Zod-validated against `src/shared/contract.ts`.
- **Scheduling:** a single drift-free `setTimeout` recalculated after each fire;
  all timing derives from the pure `nextOccurrence` engine; recovery is
  recomputed from persisted `ScheduleRule`s, never from live timers.
- **Persistence:** SQLite via **better-sqlite3** behind the `Repository`
  interface (`src/main/store`).
- **Brand:** "Aesthetic Bubblegum Pink" — rose `#EE5A8A`, bubblegum `#F589B2`.
  Use `BRAND` / `theme.palette` in `src/renderer/theme.ts`; never hardcode
  off-brand hues. See [`docs/design/branding-and-theme.md`](../docs/design/branding-and-theme.md).
- **Targets Windows and Linux only** (no macOS). Use TDD; keep `npm test` and
  `npm run typecheck` green.

## Build & test

- Dev: `npm start` · Test: `npm test` · Typecheck: `npm run typecheck` ·
  Lint: `npm run lint` · Installers: `npm run make`.
- `better-sqlite3` is rebuilt per ABI by the `pre*` scripts — don't run
  `npm start` and `npm test` truly concurrently (they swap the native binary).

For architecture depth, conventions, the TDD mandate, and the docs workflow, see
[`AGENTS.md`](../AGENTS.md) and the bundle map at [`docs/index.md`](../docs/index.md).
