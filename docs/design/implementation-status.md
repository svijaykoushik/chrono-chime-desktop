# ChronoChime — Implementation Status

Phase 2 (TDD implementation) traceability: every PRD feature → the module that
implements it → the tests that prove it. All tests run with `npm test` (Vitest).

## Verification gates (all green)

| Gate | Command | Result |
| --- | --- | --- |
| Unit + integration tests | `npm test` | **116 passing** across 16 files |
| Type safety (strict) | `npm run typecheck` | clean |
| Renderer bundle | Vite production build | builds (931 modules) |
| Full app package | `npm run package` | packages for linux-x64; native `better_sqlite3.node` unpacked, assets bundled |

## Feature → code → tests

| PRD feature | Implementation | Tests |
| --- | --- | --- |
| F1 Reminders (CRUD/search) | `main/app/reminder-service.ts`, `renderer/RemindersView.tsx`, edit via `renderer/ReminderDialog.tsx` + `scheduleForm.ruleToForm` (preserves history & future executions) | `services.test.ts` |
| F2 Specific-time | `main/recurrence/recurrence.ts` (`once`) | `recurrence.test.ts` |
| F3 Relative interval (drift-free) | recurrence (`interval`, anchor lattice) | `recurrence.test.ts` |
| F4 Calendar recurrence | recurrence (`calendar`) + Luxon | `recurrence.test.ts` |
| F5 Human-friendly summaries | `shared/describe-rule.ts` | `presentation.test.ts` |
| F6 Advanced recurrence | recurrence (`bySetPos`, `byWeekday`, `interval`) | `recurrence.test.ts` |
| F7 Notification delivery | `main/notification/decide.ts` + `manager.ts` | `notification.test.ts` |
| F8 Message templates | `shared/template.ts` | `presentation.test.ts` |
| F9 Custom sounds | `shared/reminder.ts` (SoundChoice), `notification/manager.ts`, `renderer` sound select + `chrono-sound://` protocol | `notification.test.ts` |
| F10 Quiet hours (overnight) | `shared/quiet-hours.ts`, `renderer/SettingsView.tsx` | `presentation.test.ts`, `notification.test.ts` |
| F11 Routines | `shared/routine.ts`, `main/routine/expand.ts`, `main/app/routine-service.ts`, `renderer/RoutinesView.tsx` | `routine.test.ts`, `services.test.ts` |
| F12 Search | `reminder-service.search`, repository title filter | `services.test.ts`, `sqlite-repository.test.ts` |
| F13 Bulk management | `reminder-service.setEnabled/delete`, selection mode + single & bulk delete confirmation in `RemindersView.tsx` | `services.test.ts` |
| F14 Reliability & recovery | `main/scheduler/scheduler.ts`, `main/recurrence/recovery.ts`, boot + `powerMonitor` resume in `main.ts`, SQLite durability | `scheduler.test.ts`, `recovery.test.ts`, `sqlite-repository.test.ts` |

## Post-PRD enhancements

Built after the initial feature set, on top of the same architecture:

| Enhancement | Implementation |
| --- | --- |
| Hidden application menu bar | `Menu.setApplicationMenu(null)` in `main.ts` |
| Launch at login (user-level, Win + Linux) | `main/autostart.ts` (Windows login item; Linux `~/.config/autostart/*.desktop`), exposed via `Settings.launchAtLogin` |
| Dark mode / theme | `Settings.theme` (`light`/`dark`/`system`); `ThemeProvider` in `App` + `makeTheme` in `renderer/theme.ts` |
| Reminder editing (preserve history & future) | `renderer/ReminderDialog.tsx` edit mode + `scheduleForm.ruleToForm`; `services.test.ts` |
| "Starting now" vs "On the clock" + time-format chips | `renderer/ReminderDialog.tsx`, `renderer/scheduleForm.ts` |
| Brand theme "Aesthetic Bubblegum Pink" | `renderer/theme.ts` (`BRAND`); see [Branding & Theme](./branding-and-theme.md) |
| Distributables (Windows/Linux) | `forge.config.js` (Squirrel + Deb); see [Packaging & Distribution](../build/packaging-and-distribution.md) |

## Architecture realized

- **Main process** (`src/main.ts` + `src/main/**`): Scheduler (single drift-free timer) → pure Recurrence engine; better-sqlite3 `Repository`; Notification Manager; Settings store; autostart; Zod-validated IPC handlers; tray; menu hidden; `powerMonitor` recovery.
- **Preload** (`src/preload.ts`): `contextBridge` exposes the typed `window.chrono` API only (`contextIsolation`, `sandbox`, no `nodeIntegration`).
- **Renderer** (`src/renderer.tsx` + `src/renderer/**`): React + MUI (Material 3, Bubblegum-Pink brand) — Reminders, Routines, Settings tabs; live search; selection mode; create/edit dialog; in-app fired-event snackbar + sound playback.

## Known limitations / next steps

- `npm run lint` requires the ESLint plugin stack referenced in `.eslintrc.json` to be installed; `npm test` (Vitest) + `npm run typecheck` are the active quality gates.
- A Playwright launch smoke test (Part C step 8) remains to be added; renderer components are currently covered via service-layer tests + bundle checks rather than React Testing Library.
- Native module ABI: `npm start`/`make` rebuild `better-sqlite3` for Electron, `npm test` rebuilds it for Node (handled automatically by the `pre*` scripts).
