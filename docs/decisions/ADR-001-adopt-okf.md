---
type: Decision
title: ADR-001 — Adopt the OKF bundle format for docs/
description: Standardize the ChronoChime knowledge base on a project-adapted Open Knowledge Format (OKF) profile.
tags: [decision, docs, okf, process]
timestamp: 2026-07-20
status: Accepted
---

# ADR-001 — Adopt the OKF bundle format for `docs/`

**Status:** Accepted · **Date:** 2026-07-20

## Context

`docs/` had grown into an ad-hoc control center (PRD, design docs, specs,
concept notes, build runbooks, progress/log) with no shared structure: mixed
`README.md` entry points, no metadata on documents, and no defined workflow for
keeping the map, the log, and progress in sync. This makes the knowledge base
hard to navigate, filter, or consume programmatically, and easy to let rot.

## Decision

Standardize `docs/` as an **OKF bundle** following the
[Open Knowledge Format v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md),
adapted to the project and documented in [`/knowledge-format.md`](/knowledge-format.md):

* `index.md` is the reserved directory-listing (replacing `README.md` inside the
  bundle); `log.md` is the reserved update history.
* Every non-reserved document carries YAML frontmatter with a required `type`
  plus recommended `title`, `description`, `tags`, and `timestamp`.
* A fixed `type` vocabulary (PRD, Design, Specification, Concept, Runbook,
  Convention, Status, Guide, Decision) maps documents to their kind.
* Bundle-relative links (`/path`) are preferred for intra-bundle references.
* A defined workflow ties document edits to the map, ADRs, `progress.md`, and
  `log.md`.

## Alternatives considered

* **Keep the ad-hoc structure.** Rejected — no metadata, inconsistent entry
  points, no workflow; the problem persists.
* **Invent a bespoke schema.** Rejected — reinvents an existing, permissive
  standard and loses interoperability with OKF consumers.
* **Adopt OKF verbatim.** Rejected — the project benefits from a fixed `type`
  vocabulary and a mandated docs workflow, which the profile layers on top.

## Trade-offs

* Existing `README.md` entry points were renamed to `index.md`; a small number
  of external references had to be updated.
* Contributors and agents must add frontmatter and keep the map/log current —
  modest recurring overhead in exchange for a navigable, filterable, durable
  knowledge base.

## Consequences

* New documents are self-describing and discoverable via the root map.
* The bundle is programmatically consumable by any OKF-aware tool.
* The documentation workflow is now explicit and enforceable in review.
