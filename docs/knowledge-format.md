---
type: Guide
title: ChronoChime Knowledge Format & Workflow
description: How the docs/ OKF bundle is structured and the documentation workflow every change must follow.
tags: [meta, process, okf, contributing]
timestamp: 2026-07-20
---

# ChronoChime Knowledge Format & Workflow

The `docs/` directory is an **OKF bundle**: a self-contained, hierarchical
collection of markdown knowledge documents that travels with the repository. It
adopts the [Open Knowledge Format (OKF) v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
and adapts it to fit ChronoChime. This document is the profile: it defines the
structure, the frontmatter contract, the project's `type` vocabulary, and the
workflow every documentation change must follow.

It is intentionally **vendor-agnostic** — it names no specific AI tool, IDE, or
assistant. Any human or agent starts the same way: from this bundle.

## 1. The bundle

* **Bundle root:** `docs/`.
* Knowledge is organized hierarchically into subdirectories (`prd/`, `design/`,
  `specs/`, `concepts/`, `build/`, `decisions/`). Subdirectories may nest.
* The unit of distribution is the whole tree; it can be read directly from the
  repo, a tarball, or as a subdirectory of a larger project.

```
docs/                          # bundle root
├── index.md                   # RESERVED — directory listing (the map)
├── log.md                     # RESERVED — update history
├── knowledge-format.md        # this guide
├── <concept>.md               # a concept document (has frontmatter)
└── <subdirectory>/
    ├── index.md               # optional listing for the subdirectory
    └── <concept>.md
```

## 2. Reserved filenames

Two filenames carry defined meaning and are **not** regular concept documents.
They do **not** require frontmatter.

| File | Meaning |
|------|---------|
| `index.md` | Directory listing / map. The entry point for a directory. See §6. |
| `log.md`   | Update history in reverse-chronological order. See §7. |

> **Project adaptation:** upstream OKF also allows `README.md` as an ordinary
> concept. ChronoChime standardizes on `index.md` as *the* directory listing so
> there is exactly one canonical entry per directory. Do not reintroduce
> `README.md` inside `docs/`.

## 3. Concept documents

Every non-reserved `.md` file is a **concept document** and MUST have:

1. A YAML frontmatter block delimited by `---` at the very top of the file.
2. A markdown body.

### 3.1 Frontmatter

```yaml
---
type: <Type>          # REQUIRED — see the vocabulary in §4
title: <string>       # recommended — human-readable display name
description: <string> # recommended — one sentence summarizing the document
tags: [<string>, ...] # recommended — cross-cutting labels
timestamp: <date>     # recommended — ISO 8601 (YYYY-MM-DD) of last meaningful change
---
```

* `type` is the only required field. Consumers use it for routing, filtering,
  and presentation.
* Additional custom keys are allowed. Consumers MUST NOT reject a document for
  unknown keys, unknown `type` values, or missing optional fields.

### 3.2 Body conventions

Use standard markdown. Three headings carry conventional meaning when present:

| Heading | Purpose |
|---------|---------|
| `# Schema`    | Structured description of a model's fields/columns (e.g. `ScheduleRule`). |
| `# Examples`  | Concrete usage examples, usually fenced code blocks. |
| `# Citations` | External sources backing claims in the body. |

`mermaid` diagrams are used throughout the concepts (subsystem graphs); keep them.

## 4. Type vocabulary

`type` values are not centrally registered by OKF; this project uses the
following set. Add new values when a genuinely new kind of document appears, and
list it here.

| `type` | Used for | Location |
|--------|----------|----------|
| `PRD` | Product requirements | `prd/` |
| `Design` | Architecture / design documents | `design/` |
| `Specification` | Operational implementation specs | `specs/` |
| `Concept` | A subsystem or load-bearing mechanic | `concepts/**` |
| `Runbook` | Build / release / operational procedures | `build/` |
| `Convention` | Coding standards | root |
| `Status` | Traceability & progress tracking | `design/`, root |
| `Guide` | Meta / process documentation | root |
| `Decision` | Architecture Decision Record (ADR) | `decisions/` |

## 5. Cross-linking

* **Bundle-relative links are preferred.** A link that begins with `/` is
  resolved from the bundle root (`docs/`), e.g.
  `[PRD](/prd/chronochime-product-requirements-document.md)`. These stay valid
  when a document is moved.
* Standard relative links are permitted for links to code outside the bundle
  (e.g. `../src/main/scheduler/scheduler.ts`).
* Links are directed edges of an untyped relationship; the meaning comes from the
  surrounding prose, not the link.

## 6. Index files (`index.md`)

Each directory SHOULD have an `index.md` that lists its contents as a bulleted
map. Entries SHOULD carry the linked document's `description`:

```markdown
# Section

* [Concept Title](/path/to/concept.md) — one-line description.
* [Subdirectory](/path/to/subdir/index.md) — brief overview.
```

The root [`/index.md`](/index.md) is the master map of the bundle.

## 7. Log file (`log.md`)

`/log.md` records changes newest-first under ISO 8601 date headings
(`YYYY-MM-DD`). Add an entry whenever bundle content changes:

```markdown
### 2026-07-20
- **Change**: what changed and why.
```

## 8. Workflow — every change follows this

1. **Read before writing.** Start from [`/index.md`](/index.md); read the
   relevant concept and the [PRD](/prd/chronochime-product-requirements-document.md).
2. **Author or update** the concept document. New files MUST include frontmatter
   (§3.1) with at least a `type`.
3. **Register it in the map.** Add or update the entry in the directory's
   `index.md` (and the root `/index.md` if it is a new top-level document).
4. **Record decisions.** A structural pivot, new pattern, or a non-trivial
   trade-off becomes an ADR under [`/decisions/`](/decisions/index.md), named
   `ADR-###-<slug>.md`, `type: Decision`.
5. **Track progress.** Update [`/progress.md`](/progress.md) with work done,
   in-progress items, and next steps.
6. **Append to the log.** Add a dated entry to [`/log.md`](/log.md).
7. **Bump the timestamp.** Set the changed document's `timestamp` frontmatter to
   the date of the meaningful change.

## 9. Conformance

This bundle conforms to OKF v0.1 when:

1. Every non-reserved `.md` file has a parseable YAML frontmatter block.
2. Every such block has a non-empty `type`.
3. Reserved files (`index.md`, `log.md`) follow §6–§7 when present.

Consumption is permissive: a bundle is never rejected for missing optional
fields, unknown `type` values, extra keys, broken cross-links, or a missing
`index.md`.
