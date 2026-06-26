# ChronoChime Documentation

Index of all project documentation.

## Product

- [Product Requirements Document](prd/chronochime-product-requirements-document.md) —
  the PRD: mission, philosophy, and feature requirements (F1–F14).

## Design

- [Technical Design Document](design/technical-design-document.md) —
  system architecture, the `ScheduleRule` model, the recurrence engine, the IPC
  contract, persistence, and a spec for every feature.
- [Implementation Status](design/implementation-status.md) —
  feature → code → test traceability and the current verification gates.
- [Branding & Theme](design/branding-and-theme.md) —
  the "Aesthetic Bubblegum Pink" brand palette (from the app icon) and how the
  theme is applied. **Future UI work must follow this.**

## Specifications (operational)

- [Diagnostics, Logging & Updates](specs/diagnostics-and-updates.md) —
  implementation spec for local-first logging + crash overlay and the GitHub
  Releases update notifier. Operational features that support reliability but are
  not part of the temporal-notification domain.
- [About & Feedback](specs/feedback-and-community.md) —
  implementation spec for the offline-first, user-initiated feedback paths (public
  GitHub issue + private email) and the About surface. No telemetry/backend.
- [Shipping Implementation Plan](specs/shipping-implementation-plan.md) —
  milestone-sequenced plan (M1–M7) for building the diagnostics/updates and
  about/feedback specs, with exit criteria and risks.

## Build & Release

- [Packaging & Distribution](build/packaging-and-distribution.md) —
  `package` vs `make`, the Windows (Squirrel) and Linux (Deb) makers, supported
  platforms, and build-host requirements.

## Contributor guidance

- Repository conventions: [`../.github/copilot-instructions.md`](../.github/copilot-instructions.md)
- Process-specific agents: [`../.github/agents/`](../.github/agents/)
