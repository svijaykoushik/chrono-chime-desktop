# ChronoChime Knowledge Base

This `docs/` tree is an **OKF bundle** — a self-contained, hierarchical collection of
knowledge documents. It follows the [ChronoChime Knowledge Format](/knowledge-format.md),
a project-adapted profile of the [Open Knowledge Format (OKF) v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md).

> **Start here.** Any contributor or AI agent should read [`/knowledge-format.md`](/knowledge-format.md)
> first to learn how this bundle is organized, then follow the map below. Update
> history lives in [`/log.md`](/log.md).

## Product

* [ChronoChime Product Requirements Document](/prd/chronochime-product-requirements-document.md) — mission, philosophy, out-of-scope boundaries, and the F1–F14 feature requirements.

## Design

* [Technical Design Document](/design/technical-design-document.md) — system architecture, the `ScheduleRule` model, recurrence engine, IPC contract, and persistence.
* [Implementation Status](/design/implementation-status.md) — feature → code → test traceability matrix and current verification gates.
* [Update Checker](/design/update-checker.md) — design of the GitHub Releases update checker and its update UI.
* [Branding & Theme](/design/branding-and-theme.md) — the "Aesthetic Bubblegum Pink" brand palette and how the theme is applied. **Future UI work must follow this.**

## Architectural Concepts

A breakdown of ChronoChime's design, subsystems, and load-bearing mechanics:

* [Core Scheduling System](/concepts/scheduling/index.md)
  * [Recurrence & Calendaring Engine](/concepts/scheduling/recurrence_engine.md) — DST resilience and drift-lattice math.
  * [Boot & Sleep Recovery Manager](/concepts/scheduling/boot_recovery.md) — grace windows and coalesced checks.
* [Persistence System](/concepts/persistence/index.md) — SQLite direct-prepared-statements repository.
* [Secure IPC & Bridge System](/concepts/ipc/index.md) — sandboxed `contextBridge` validation contract.
* [Application Updates System](/concepts/updates/index.md)
  * [Range-Resume Staging Downloader](/concepts/updates/staged_downloader.md) — partial offsets, checksums, and atomic renames.
* [Diagnostics & Logging System](/concepts/diagnostics/index.md)
  * [Process-Safe Reentrancy & Crash Guard](/concepts/diagnostics/crash_reentrancy.md) — single-flight locks and crash-loop breakers.
* [Notification & Sound Delivery System](/concepts/notification/index.md) — quiet-hours suppression and the `chrono-sound://` preview protocol.

## Specifications (operational)

* [Diagnostics, Logging & Updates](/specs/diagnostics-and-updates.md) — implementation spec for local-first logging + crash overlay and the GitHub Releases update notifier.
* [About & Feedback](/specs/feedback-and-community.md) — implementation spec for offline-first, user-initiated feedback paths (public GitHub issue + private email) and the About surface. No telemetry/backend.
* [Shipping Implementation Plan](/specs/shipping-implementation-plan.md) — milestone-sequenced plan (M1–M7) with exit criteria and risks.

## Build & Release

* [Packaging & Distribution](/build/packaging-and-distribution.md) — `package` vs `make`, the Windows (Squirrel) and Linux (Deb) makers, supported platforms, and the release-failure runbook.

## Process & Contribution

* [Knowledge Format & Workflow](/knowledge-format.md) — how this bundle is structured and the docs workflow every change must follow.
* [Implementation Progress](/progress.md) — running status of work done and what to do next.
* [Code-Base Conventions](/code-base-conventions.md) — project-wide coding conventions.
* [Decisions (ADRs)](/decisions/index.md) — architecture decision records.
* Repository & AI-agent guide: [`../AGENTS.md`](../AGENTS.md).
