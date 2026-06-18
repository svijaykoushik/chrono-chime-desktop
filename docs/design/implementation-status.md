# ChronoChime — Implementation Status

Phase 2 (TDD implementation) traceability: every PRD feature → the module that
implements it → the tests that prove it. All tests run with `npm test` (Vitest).

## Verification gates (all green)

| Gate | Command | Result |
| --- | --- | --- |
| Unit + integration tests | `npm test` | **70 passing** across 8 files |
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

## Architecture realized

- **Main process:** Scheduler (single drift-free timer) → pure Recurrence engine; SQLite repository; Notification Manager; Settings store; Zod-validated IPC server; tray; `powerMonitor` recovery.
- **Preload:** `contextBridge` exposes the typed `window.chrono` API only (`contextIsolation`, `sandbox`, no `nodeIntegration`).
- **Renderer:** React + MUI (Material 3 theme) — Reminders, Routines, Settings tabs; live search; selection mode; in-app fired-event snackbar + sound playback.

## Known limitations / next steps

- **Live GUI run not verified here** (headless environment has no display); the full build/link/package pipeline passes. Run `npm start` on a desktop to launch.
- Editing an existing reminder from the UI reuses the create dialog shape; an in-place edit form is a follow-up.
- `npm run lint` requires the ESLint plugin stack referenced in `.eslintrc.json` to be installed; tests + `typecheck` are the active quality gates.
- A Playwright launch smoke test (Part C step 8) remains to be added.
