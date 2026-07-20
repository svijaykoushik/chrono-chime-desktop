# ChronoChime Developer & AI Context Guide (AGENTS.md)

Welcome to the **ChronoChime** desktop repository. This document serves as the absolute, comprehensive context guide and system instruction set for developers and AI agents working on this codebase.

---

## 1. Core Philosophy & Guardrails

> [!IMPORTANT]
> **Mandatory First Step — start from the OKF bundle.** The `docs/` directory is
> an [OKF bundle](docs/knowledge-format.md): a self-contained, hierarchical
> knowledge base. Any contributor or agent, regardless of tooling, begins the
> same way:
>
> 1. Open the bundle map at [`docs/index.md`](docs/index.md).
> 2. Read the [Knowledge Format & Workflow](docs/knowledge-format.md) to learn how
>    the bundle is structured and the workflow every documentation change follows.
> 3. Read the [Product Requirements Document](docs/prd/chronochime-product-requirements-document.md)
>    to align on the core product philosophy before modifying code.
>
> When you change the codebase or the docs, follow the bundle workflow: update the
> relevant document's frontmatter `timestamp`, keep the directory `index.md` map
> current, record decisions as ADRs in [`docs/decisions/`](docs/decisions/index.md),
> update [`docs/progress.md`](docs/progress.md), and append a dated entry to
> [`docs/log.md`](docs/log.md).

ChronoChime is governed by non-negotiable architectural and design guardrails derived from its core mission:

*   **Local-Only, Zero-Dependency Design:** The application must remain entirely local. It has zero cloud integrations, zero remote database connections, and zero tracking analytics. Complete data sovereignty is a fundamental expectation of the user.
*   **Indie Maker Utility Aesthetic:** The design and feature scope must prioritize a pragmatic, technical fix and a fluid, high-utility UI over bloated features. The application answers two simple questions: *When should the user be notified?* and *How should the user be notified?* Features outside this boundary (such as project/task management, workouts, habit streaks, or collaboration) are strictly out of scope.
*   **Reliability First:** Correct scheduling execution, drift prevention, and boot recovery take absolute precedence over the quantity of features.

---

## 2. Core Documentation Map

Refer to these documents in the `docs/` folder for specific guidelines, specifications, and architecture decisions:

*   **Product Definition & Requirements:**
    *   [Product Requirements Document (PRD)](docs/prd/chronochime-product-requirements-document.md): Specifies the core mission, principles, out-of-scope boundaries, and requirements for the 14 core features (F1–F14).
*   **Technical Design & Architecture:**
    *   [Technical Design Document (TDD)](docs/design/technical-design-document.md): Outlines the system architecture, process topology, persistence models, database schema, IPC contracts, recurrence rules, and recovery behaviors.
*   **Branding & Styling Guidelines:**
    *   [Branding & Theme Guide](docs/design/branding-and-theme.md): Details the visual style, custom palette ("Aesthetic Bubblegum Pink" brand colors: rose `#EE5A8A`, bubblegum `#F589B2`), typography, and spacing principles. **All frontend UI work must comply with this guide.**
*   **Operational Specs:**
    *   [Diagnostics, Logging & Updates](docs/specs/diagnostics-and-updates.md): Specification for local logging, retention policies, and user-initiated update prompts.
    *   [About & Feedback](docs/specs/feedback-and-community.md): Defines the offline-first feedback paths.
    *   [Shipping Implementation Plan](docs/specs/shipping-implementation-plan.md): Milestone progression plans.
*   **Build, Packaging & Traceability:**
    *   [Implementation Status](docs/design/implementation-status.md): Traceability matrix mapping each PRD feature to its source file and corresponding Vitest test files.
    *   [Packaging & Distribution](docs/build/packaging-and-distribution.md): Guide for compiling distributables (`.deb` for Linux, Squirrel installers for Windows).

---

## 3. Repository Architecture Breakdown

ChronoChime leverages a multi-process Electron architecture separated by a secure IPC boundary. Code is organized into three principal directories:

### 3.1 Main Process (`src/main/`)
The main process acts as the background coordinator, system scheduler, and database owner. It persists schedules and operates even when the renderer UI window is closed.
*   **`src/main.ts`:** Entry point. Houses app lifecycle hooks, tray menu initialization, and registers Zod-validated IPC handlers.
*   **`src/main/scheduler/`:** Orchestrates timing and contains the [Scheduler](src/main/scheduler/scheduler.ts). It runs a single active timer driven by absolute epoch timestamps. It prevents drift and delegates math to the recurrence engine.
*   **`src/main/recurrence/`:**
    *   `recurrence.ts`: Contains the pure scheduling math (`nextOccurrence`), using Luxon for timezone-aware, DST-resilient calendar boundaries.
    *   `recovery.ts`: Defines the recovery decision engine (`decideRecovery`) handling missed-occurrence grace windows (5-minute grace for one-shots; coalesce-to-one for recurring).
*   **`src/main/store/`:** Persistence layer. Uses synchronous SQLite (`better-sqlite3`) behind the `Repository` interface ([repository.ts](src/main/store/repository.ts)). It handles direct prepared statements for speed and predictability.
*   **`src/main/notification/`:** Contains the notification delivery manager, wrapping Electron’s native `Notification` module and custom sound trigger services.
*   **`src/main/diagnostics/`:** Core logger configurations (`electron-log`) with log-file sweep/retention controls.

### 3.2 Renderer Process (`src/renderer/`)
The renderer process handles user interaction. It serves purely as a view and editor and treats the main process as the source of truth.
*   **`src/renderer.tsx` & `src/renderer/App.tsx`:** React root and top-level tab switcher (Reminders, Routines, Settings).
*   **`src/renderer/RemindersView.tsx`:** List panel, live search, toggle status triggers, and the selection mode framework (long-press triggers bulk actions).
*   **`src/renderer/ReminderDialog.tsx`:** Create and Edit forms. Bridges forms to JSON schemas and suggests text template variables.
*   **`src/renderer/RoutinesView.tsx`:** Renders routines (e.g. Pomodoro, Workout) as first-class composite entities, expanding child schedules inline.
*   **`src/renderer/SettingsView.tsx`:** Form controls for local timezone, quiet hours range, auto-start, and system theme selections.
*   **`src/renderer/theme.ts`:** Theme generator configuring Material UI v5 components under the Aesthetic Bubblegum Pink palette.

### 3.3 Shared Layer (`src/shared/`)
A dependency-free isomorphic zone containing schemas, types, and helpers shared by both Main and Renderer processes.
*   **`src/shared/contract.ts`:** Centralized IPC contract definition mapping API endpoints (`CH.domain:action`) and enforcing Zod validation requests.
*   **`src/shared/bridge.ts`:** Interface mapping `window.chrono` handlers exposed to the frontend preload sandbox.
*   **`src/shared/describe-rule.ts`:** Pure generator outputting natural language descriptions for any structural `ScheduleRule`.
*   **`src/shared/template.ts`:** Implements template rendering for visual notification text placeholders (e.g., `[HH:mm]`, `[hh:mm tt]`).

---

## 4. Strict Test-Driven Development (TDD) Mandate

All feature implementations, changes, and bug fixes must follow strict **Test-Driven Development (TDD)** conventions:

1.  **Write the Tests First:** Before editing or adding production code, developers/agents must write or update failing unit tests (`tests/unit/`) or integration tests (`tests/integration/`) that target the new behavior.
2.  **Verify Red State:** Run `npm test` using Vitest to verify that the newly written test boundary fails as expected.
3.  **Implement Code:** Write the minimal production code necessary to satisfy the test specifications.
4.  **Verify Green State:** Run `npm test` and ensure all 77+ tests pass successfully.
5.  **Refactor:** Polish the implementation while keeping tests green.
6.  **Type Check:** Validate code with `npm run typecheck` to ensure zero compilation or strict type warnings.

> [!WARNING]
> Running `npm start` (Vite dev mode) and `npm test` (Vitest Node mode) simultaneously can conflict due to native binary rebuilding. `prestart` and `pretest` rebuild `better-sqlite3`'s native add-on for their respective ABI platforms. Run them sequentially or rebuild manually using the scripts `rebuild:electron` and `rebuild:node` defined in `package.json`.

---

## 5. Conventions for Persisting AI Work & Discussions

To prevent reasoning, configuration, and architectural context from being lost across disjoint chat sessions, the following logging workflows must be adhered to:

### 5.1 Update Implementation Progress
Whenever a task is completed, you must update the implementation checklist in [progress.md](docs/progress.md). Document the work done, features in progress, and what to do next.

### 5.2 Log Architecture Decision Records (ADRs)
If you make a structural pivot, introduce a custom design pattern, or debate a technical trade-off, you must record the reasoning as a new markdown file inside a `docs/decisions/` folder.
*   **ADR File Pattern:** Name the file `ADR-###-[description].md` (e.g. `docs/decisions/ADR-001-sqlite-strategy.md`).
*   **ADR Contents:** Document the Context, Alternatives Considered, Trade-offs, Decisions Made, and long-term implications.

---

## 6. Agent Operational Rules

### 6.1 Process Boundary Integrity
*   **Never Import Main Modules in Renderer:** Renderer code (`src/renderer/**`) must have zero imports from `src/main/**`, `node:fs`, `node:path`, `electron` (except types), or database repositories. Violating this boundary will crash the bundle/sandbox.
*   **Preload Exclusivity:** The preload bridge ([src/preload.ts](src/preload.ts)) acts as the single window of communication. It maps IPC handlers using `contextBridge.exposeInMainWorld('chrono', ...)` strictly matching [bridge.ts](src/shared/bridge.ts).

### 6.2 Timing & Recurrence Guardrails
*   **Epoch-Millisecond Dominance:** Store all timestamps as absolute integers representing UTC epoch milliseconds. Avoid relative JS dates or local string clocks in database schemas.
*   **Sleep/Wake Recovery:** When the host machine wakes up from suspended sleep, the scheduler must execute a recovery sweep via Electron’s `powerMonitor.on('resume')` callback. Any skipped occurrences must be processed under the coalesced catch-up recovery policy rather than firing multiple backlogged system alerts.
