---
type: Design
title: Technical Design Document
description: System architecture, the ScheduleRule model, recurrence engine, IPC contract, and persistence.
tags: [design, architecture]
timestamp: 2026-06-19
---

# ChronoChime — Technical Design Document (TDD)

> Phase 1 deliverable. This document defines the complete system design and a
> technical specification for **every** feature in the
> [Product Requirements Document](../prd/chronochime-product-requirements-document.md).

Status: **✅ Accepted for Implementation** (Phase 2 complete — see
[Implementation Status](./implementation-status.md))
Target: Electron desktop application (**Windows and Linux**; macOS not targeted)
Methodology: Test-Driven Development (Vitest)

> The open questions in **Part D** were reviewed and **accepted** before
> implementation; their resolutions are recorded there.

---

## Part A — System Architecture

### A.1 Architectural Goals (derived from the PRD)

The PRD's non-negotiable principle is **Reliability First** (§4). Every
architectural decision below is justified against the three product principles
(§5): improve *when* notifications occur, improve *how* they are delivered, or
improve *reliability*.

| Goal | Architectural consequence |
| --- | --- |
| Accurate execution, no cumulative drift (F3, F4, F14) | A single deterministic scheduler in the **main process**, driven by absolute epoch timestamps, recalculated after every fire. No `setInterval` accumulation. |
| Background-first (PRD §4 reliability, F14) | All scheduling, persistence, and notification logic lives in the main process and runs with **no renderer window open**. |
| Recovery after restart (F14) | Schedules are derived from **persisted rule definitions**, not from in-memory timers. On boot the engine recomputes the next occurrence for every enabled item. |
| Human-first, preserve intentions (§4) | The renderer presents *Reminders* and *Routines* as user intentions. A Routine owns its child schedules; they are never shown as standalone reminders (F11). |
| Predictable, testable recurrence (F2–F6, F14) | The recurrence engine is a set of **pure functions** (`nextOccurrence(rule, after)`) with zero side effects, so it is fully unit-testable without Electron. |

### A.2 Process Topology

ChronoChime uses Electron's standard three-layer separation. The trust and
responsibility boundary is the IPC layer.

```
┌──────────────────────────── Main Process (Node) ────────────────────────────┐
│                                                                              │
│   Scheduler Engine ──uses──> Recurrence Engine (pure, no I/O)                │
│        │                                                                     │
│        ├── reads/writes ──> Persistence Layer (SQLite via better-sqlite3)    │
│        ├── invokes ───────> Notification Manager ──> OS notifications + audio│
│        ├── consults ──────> Quiet Hours Service                             │
│        ├── consults ──────> Time / Drift Monitor (wall-clock + powerMonitor) │
│        └── exposes ───────> IPC Server (typed channels, Zod-validated)       │
│                                                                              │
└───────────────────────────────────▲──────────────────────────────────────┘
                                     │  contextBridge (preload, no Node in UI)
┌───────────────────────────────────┴──────────────────────────────────────┐
│                          Renderer Process (Chromium)                        │
│   React + Material UI (Material 3 theme)                                     │
│   Views: Reminders · Routines · Settings · Search · Selection mode          │
│   State: TanStack Query-style cache over IPC; main process is source of truth│
└──────────────────────────────────────────────────────────────────────────┘
```

**Why main-process scheduling:** the renderer can be closed at any time
(tray app). Timers and persistence must survive without it. The renderer is a
*view and editor*, never the system of record.

### A.3 Technology Stack

| Concern | Choice | Rationale |
| --- | --- | --- |
| Runtime / shell | **Electron** (latest LTS line) | Cross-platform desktop, native notifications, tray, `powerMonitor`. |
| Packaging | **Electron Forge + Vite plugin** | Matches existing `forge.config.js`, `out/`, `.vite/` artifacts. |
| Language | **TypeScript (strict)** | `noImplicitAny`, existing ESLint config. |
| UI | **React + Material UI v5+ (Material 3 theming)** | Per existing conventions; calm, predictable surfaces. |
| Time math | **Luxon** | Correct timezone/DST-aware calendar arithmetic, immutable, testable. |
| Persistence | **SQLite via better-sqlite3** (direct, prepared statements) | Synchronous, durable, fast; perfect for a local single-user app. Rows are JSON-validated with Zod on read. *Implementation note: Drizzle ORM was dropped in favour of a thin hand-written repository — for a fixed two-table local schema it avoids a migration toolchain while keeping queries fully typed and tested. The `Repository` interface keeps Drizzle a drop-in option later.* |
| Validation | **Zod** | One schema source shared by IPC contract and DB row parsing. |
| Testing | **Vitest** | Native Vite/TS speed, ideal for pure-function TDD; `@testing-library/react` for components. |
| E2E (later) | Playwright for Electron | Smoke tests of full launch + IPC; not part of the unit TDD loop. |

### A.4 IPC Contract

All channels follow `chronochime:<domain>:<operation>`. Every request and
response is validated by a Zod schema; a single shared `contract.ts` module
defines them so main and preload agree by construction.

| Channel | Direction | Payload → Result |
| --- | --- | --- |
| `chronochime:reminder:list` | renderer→main (invoke) | `{ query?: string }` → `Reminder[]` |
| `chronochime:reminder:create` | invoke | `ReminderInput` → `Reminder` |
| `chronochime:reminder:update` | invoke | `{ id, patch }` → `Reminder` |
| `chronochime:reminder:setEnabled` | invoke | `{ ids: string[], enabled }` → `Reminder[]` |
| `chronochime:reminder:delete` | invoke | `{ ids: string[] }` → `{ deleted: number }` |
| `chronochime:routine:list` | invoke | `{}` → `Routine[]` (with child schedules) |
| `chronochime:routine:create` | invoke | `RoutineInput` → `Routine` |
| `chronochime:routine:setEnabled` | invoke | `{ id, enabled }` → `Routine` |
| `chronochime:routine:delete` | invoke | `{ id }` → `{ deleted }` |
| `chronochime:settings:get` | invoke | `{}` → `Settings` |
| `chronochime:settings:update` | invoke | `Partial<Settings>` → `Settings` |
| `chronochime:sound:preview` | invoke | `{ soundId }` → `void` |
| `chronochime:event:fired` | main→renderer (send) | `{ reminderId, firedAt, title, message }` |
| `chronochime:event:changed` | main→renderer (send) | `{ entity }` — cache invalidation hint |

**Security:** `contextIsolation: true`, `nodeIntegration: false`,
`sandbox: true`. The preload exposes only the typed methods above via
`contextBridge.exposeInMainWorld('chrono', …)`. No raw `ipcRenderer`.

### A.5 Data Model & Persistence

Timestamps are stored as **epoch milliseconds** (integer). Recurrence is stored
as a structured **rule object** (JSON column), never as a precomputed list of
fire times — this is what makes restart-recovery and drift-prevention possible.

```
reminders
  id            text  (uuid, pk)
  title         text  not null
  message       text  null
  enabled       int   (0|1)
  rule          text  (JSON: ScheduleRule)         -- see A.6
  notification  text  (JSON: NotificationPrefs)    -- sound, vibrate, silent
  next_fire_at  int   (epoch ms, null when inactive/exhausted)
  last_fire_at  int   null
  routine_id    text  null  fk -> routines.id       -- set ⇒ child of a routine
  created_at    int
  updated_at    int

routines
  id            text  (uuid, pk)
  title         text  not null
  type          text  (e.g. 'pomodoro' | 'workout' | 'hydration' | 'study' | 'custom')
  enabled       int   (0|1)
  config        text  (JSON: routine-type params)
  created_at    int

settings  (single row)
  quiet_hours   text  (JSON: { enabled, start:'HH:mm', end:'HH:mm' })
  default_sound text
  ...
```

Child reminders carry a non-null `routine_id`; the reminder-list query for the
Reminders view filters `routine_id IS NULL` (F11: routine schedules never appear
as standalone reminders). Deleting a routine cascades to its children.

### A.6 The Recurrence Engine (core of reliability)

A single discriminated-union `ScheduleRule` expresses every PRD scheduling
feature. The engine is one pure function:

```ts
nextOccurrence(rule: ScheduleRule, after: number /*epoch ms*/, tz: string): number | null
```

`null` means "no further occurrence" (e.g. a past one-shot). The scheduler only
ever asks "what is the next fire time strictly after `now`?" — so the same
function powers initial scheduling, post-fire rescheduling, and boot recovery.

```ts
type ScheduleRule =
  | { kind: 'once';     at: number }                                  // F2
  | { kind: 'interval'; everyMs: number; anchor: number }             // F3
  | { kind: 'calendar'; freq: 'hourly'|'daily'|'weekly'|'monthly'|'yearly';
      interval: number;                 // "every 2 months" => interval:2  (F6)
      atTime?: 'HH:mm';                 // time-of-day anchor
      byWeekday?: number[];             // F4/F6: e.g. weekdays, "every Monday"
      bySetPos?: number;                // F6: 1=first, 2=second, -1=last
      byMonthDay?: number }             // F4: "on the 15th"
```

**Drift prevention (F3, F4, F14):** interval rules compute the next fire as
`anchor + ceil((after - anchor)/everyMs) * everyMs`. Because every fire time is
derived from the immutable `anchor`, a late delivery never shifts the sequence —
the *next* slot is still on the original lattice. Calendar rules snap to real
calendar boundaries via Luxon, so DST and month-length differences are handled
correctly rather than by adding fixed millisecond offsets.

This is the most heavily unit-tested module; the TDD plan (Part C) front-loads
it.

### A.7 Scheduler Engine lifecycle

1. **Boot:** read all enabled reminders; for each, `next = nextOccurrence(rule, now)`; persist `next_fire_at`; arm a timer only for the single soonest item (a min-heap of next fire times, one active `setTimeout`).
2. **Fire:** when the timer elapses, fire every item whose `next_fire_at <= now` (handles clustered times), apply missed-occurrence policy (A.8), deliver via Notification Manager, recompute each fired item's next occurrence, re-arm.
3. **Mutation:** create/edit/enable/disable recomputes the affected item and re-arms if it became the new soonest.
4. **Wake/resume:** `powerMonitor` `resume` and a periodic wall-clock tick trigger a recompute pass to catch sleep-induced gaps.

Single active timer + recompute-after-fire = O(1) timers and **zero cumulative
drift**.

### A.8 Missed-Occurrence Policy (F14 — must be explicit)

When the app was off/asleep across one or more scheduled times:

- **One-shot (`once`)** missed by ≤ a grace window (default 5 min, configurable): fire once immediately, marked "delayed". Older than the window: do **not** fire; surface a "missed while away" indicator. Then deactivate.
- **Recurring** missed occurrences: fire **at most one** catch-up notification (coalesced, e.g. "3 missed since 2:00 PM"), then resume on the normal lattice. Never replay a backlog of N notifications — that would violate the calm/trustworthy UX principle (§9).

This policy is stored as a constant, documented in-app, and unit-tested.

---

## Part B — Feature Specifications

Each feature lists behavior, the data/engine touchpoints, and acceptance
criteria that become the test cases in Part C.

### F1 — Reminders (CRUD + search)
- **Behavior:** create, edit, enable, disable, delete, search reminders. A reminder has title, optional message, enabled state, a `ScheduleRule`, and `NotificationPrefs`.
- **Touchpoints:** `reminder:*` IPC channels; `reminders` table; scheduler re-arm on every mutation.
- **Acceptance:** creating an enabled reminder computes a non-null `next_fire_at`; disabling clears the timer but preserves the rule; deleting removes it from schedule and store.

### F2 — Specific-Time Scheduling
- **Behavior:** fire once at an explicit instant, then become inactive.
- **Rule:** `{ kind: 'once', at }`. After firing, `next_fire_at = null`, `enabled` effectively inactive.
- **Acceptance:** `nextOccurrence` returns `at` when `after < at`, and `null` when `after >= at`; reminder deactivates post-fire.

### F3 — Relative Interval Scheduling
- **Behavior:** "every N minutes starting now"; anchored, drift-free, resilient to delays.
- **Rule:** `{ kind: 'interval', everyMs, anchor }`.
- **Acceptance:** next fire always lands on `anchor + k*everyMs`; a simulated late fire does not shift subsequent slots; covers 15/25/60/90 min and 3 h.

### F4 — Calendar Recurrence
- **Behavior:** hourly, daily, "every Monday", monthly on the 15th, yearly on Jan 1.
- **Rule:** `{ kind:'calendar', freq, interval:1, atTime?, byWeekday?, byMonthDay? }`.
- **Acceptance:** boundary-aligned (e.g. daily@09:00 always 09:00 local, correct across DST); monthly-on-31st skips short months per documented rule.

### F5 — Human-Friendly Scheduling (presentation)
- **Behavior:** every rule renders to natural language ("Every Monday at 9:00 AM"); no cron/RRULE jargon shown.
- **Touchpoint:** pure `describeRule(rule): string` function (renderer + summaries).
- **Acceptance:** golden-string tests mapping each rule shape to its phrase.

### F6 — Advanced Recurrence
- **Behavior:** "every second Monday", "every two months", "every weekday", "every other year", "first Monday of every month".
- **Rule:** uses `interval`, `byWeekday`, `bySetPos`.
- **Acceptance:** "first Monday of month" lands on the correct date across a year; "every other year" respects `interval:2`; "every weekday" = `byWeekday:[Mon..Fri]`.

### F7 — Notification Delivery
- **Behavior:** deliver via OS notification; audible/silent/visual per prefs; vibration where supported.
- **Touchpoint:** Notification Manager (main) using Electron `Notification` + audio playback; respects Quiet Hours (F10).
- **Acceptance:** silent pref → no sound; quiet hours active → notification shown, sound suppressed.

### F8 — Notification Message Templates
- **Behavior:** message may contain time placeholders `[HH:mm]`, `[hh:mm tt]`, rendered with device locale/time settings at fire time.
- **Touchpoint:** pure `renderTemplate(template, firedAt, tz): string`.
- **Acceptance:** `"The time is [HH:mm]"` at 14:05 → "The time is 14:05"; `[hh:mm tt]` → "02:05 PM".

### F9 — Custom Notification Sounds
- **Behavior:** per-reminder sound = default | silent | built-in (assets/sounds) | user-selected file; previewable.
- **Touchpoint:** `sound:preview` IPC; `NotificationPrefs.sound`; bundled `notification.mp3 / notification2.wav / notification3.wav`.
- **Acceptance:** preview plays without firing a reminder; selection persists per reminder.

### F10 — Global Quiet Hours
- **Behavior:** enable/disable; start/end times; supports overnight wrap (22:00–06:00). During quiet hours notifications appear but sounds are suppressed. Never touches system DND.
- **Touchpoint:** pure `isWithinQuietHours(now, {start,end}, tz): boolean` (handles wrap); consulted by Notification Manager.
- **Acceptance:** 22:00–06:00 returns true at 23:00 and 05:00, false at 12:00; reminders still fire visually.

### F11 — Routines
- **Behavior:** composite intentions (Pomodoro, Workout, Hydration, Study, …) shown as first-class entities; expandable to view child schedules; create/enable/disable/delete. Children never appear as standalone reminders; delete cascades.
- **Touchpoint:** `routines` table; child reminders with `routine_id`; routine factory expands `config` → child `ScheduleRule`s.
- **Acceptance:** creating a Pomodoro routine generates its child schedules with `routine_id` set; they are absent from the Reminders list; deleting removes all children.

### F12 — Reminder Search
- **Behavior:** search by title, dynamic/live results, helpful empty state.
- **Touchpoint:** `reminder:list { query }` (case-insensitive title match) + renderer debounce.
- **Acceptance:** query filters results; no-match returns empty set and the UI shows an empty state.

### F13 — Bulk Reminder Management
- **Behavior:** selection mode (long-press to enter), multi-select/deselect, bulk enable/disable/delete, visible selection count, delete confirmation.
- **Touchpoint:** `setEnabled{ids[]}`, `delete{ids[]}`; selection state is renderer-local.
- **Acceptance:** bulk enable/disable/delete operate on all selected ids atomically; delete requires confirm.

### F14 — Reliability & Recovery
- **Behavior:** accurate scheduling, restart recovery, enabled-state preservation, drift prevention, deterministic recurrence, explicit missed-occurrence handling (A.8).
- **Touchpoint:** boot recompute pass; `powerMonitor` resume hook; wall-clock tick.
- **Acceptance:** simulating "app off for 3 h" then boot recomputes correct next fires; recurring backlog coalesces to a single catch-up; one-shots honor the grace window.

---

## Part C — TDD Implementation Plan (Phase 2 preview)

Strict red→green→refactor, bottom-up so pure logic is proven before wiring.

1. **Recurrence Engine** (F2,F3,F4,F6) — pure `nextOccurrence`. Highest test density; covers drift, DST, month-length, set-position.
2. **Presentation helpers** (F5 `describeRule`, F8 `renderTemplate`, F10 `isWithinQuietHours`) — pure, golden tests.
3. **Missed-occurrence policy** (F14) — pure decision function over (lastFire, now, rule).
4. **Persistence layer** — `Repository` interface with in-memory and better-sqlite3 implementations; in-memory SQLite (`:memory:`) + a temp-file durability test.
5. **Scheduler Engine** — with an injectable fake clock/timer; assert re-arm and recovery without real time.
6. **Notification Manager + Quiet Hours wiring** (F7,F9) — mock Electron `Notification`/audio.
7. **IPC contract** (Zod round-trip) and handlers (F1,F11,F12,F13).
8. **Renderer** components with `@testing-library/react`; finally Playwright launch smoke test.

Test layout: `tests/unit/**`, `tests/integration/**`; CI runs `npm test` (Vitest) + `npm run lint`.

---

## Part D — Decisions (Accepted)

These were the open questions at the end of Phase 1; each was **accepted** by the
product owner before implementation. The answers given are recorded here.

1. **Stack confirmation — ACCEPTED (as proposed).** Luxon for time math, Vitest
   for tests, React + MUI (Material 3) for the renderer.
   - *Refinement during implementation:* Drizzle ORM was **dropped** in favour of
     a thin hand-written **better-sqlite3** repository behind the `Repository`
     interface — for a fixed two-table local schema this avoids a migration
     toolchain while keeping queries typed and tested. Drizzle remains a drop-in
     option later. (See A.5.)
2. **Missed-occurrence grace window — ACCEPTED (as proposed).** One-shot
   reminders missed within a **5-minute** grace window fire once then deactivate;
   recurring misses **coalesce into a single catch-up** and resume on the lattice.
   Implemented in `recurrence/recovery.ts` (`DEFAULT_GRACE_MS`). (See A.8.)
3. **Scope ordering — ACCEPTED ("proceed" with the proposed order).** Phase 2
   followed the bottom-up Part C order (pure logic → persistence → scheduler →
   notifications → IPC → renderer).
4. **Stale v1 enums superseded — DONE.** The hardcoded Pomodoro/hourly-chime
   enums in `.github/copilot-instructions.md` were replaced by the generic
   `ScheduleRule` model; the instructions and agent definitions now match this
   architecture.

Outcome: all 14 features implemented via TDD; see
[Implementation Status](./implementation-status.md) for the feature → code →
test traceability and verification gates.
