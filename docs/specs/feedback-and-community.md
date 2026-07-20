---
type: Specification
title: About & Feedback
description: Implementation spec for offline-first, user-initiated feedback paths and the About surface.
tags: [spec, feedback]
timestamp: 2026-06-23
---

# Implementation Spec — About & Feedback (Offline-First)

Status: **Accepted — ready to implement** (Phase: shipping prep)
Scope: a user-initiated, offline-first way to send feedback to the developer via
two paths — a public GitHub issue and a private email — surfaced in an
**About & Feedback** area. Operational/community feature, **not** a
temporal-notification domain feature, so it lives here (cross-referenced from the
[PRD](../prd/chronochime-product-requirements-document.md)). Target platforms:
**Windows and Linux only** (no macOS).

## Locked decisions

- **Developer email:** `svijaykoushik@hotmail.com` (Path B destination).
- **Path A mechanism:** a **GitHub Issue Form template**
  (`.github/ISSUE_TEMPLATE/feedback.yml`) that declares the structured fields and
  the `user-feedback` label; the button opens `…/issues/new?template=feedback.yml`
  with the locally-gathered system context pre-filled into a form field. (Chosen
  over raw `&labels=` query params because `&labels=` is silently ignored for
  users without triage rights — the template applies the label for everyone.)
- **UI home:** a combined **About & Feedback** section in the existing Settings
  tab (no new modal infrastructure).

## Hard constraints (from the requirements)

- 100% offline-capable: **no telemetry, no server scripts, no third-party forms,
  no backend.** The only outbound action is the user's own browser/mail client,
  launched by an explicit click.
- Transmission is **100% user-initiated, transparent, and reviewable** before the
  user sends anything.
- Zero infrastructure cost — relies only on the user's device + GitHub/mail vendor.

## Architecture fit (important reconciliation)

The requirements' blueprint uses `require('electron')` and `process.*` in the
renderer. **That cannot run in ChronoChime** — we ship `sandbox: true`,
`contextIsolation: true`, `nodeIntegration: false`. Therefore:

- URL building, runtime-metadata collection (`app.getVersion()`, `process.platform`,
  `process.arch`, `os.release()`), and `shell.openExternal` all run in the **main
  process** (which already owns `shell` usage), exposed to the renderer through the
  typed `window.chrono` bridge — consistent with the rest of the app.
- No metadata is sourced from user input; URLs are built only from hardcoded
  config + read-only runtime parameters, then `encodeURIComponent`-escaped.

---

## Part 1 — UI: "About & Feedback" section

A new MUI card appended **after** the existing cards in `src/renderer/SettingsView.tsx`
(Settings tab), titled **"About & Feedback"**, built from the existing kit
(`Card` `variant="outlined"`, `CardContent`, `Stack`, `Typography`, `Button`,
`Link`) and the brand theme — no new UI primitives.

- **App identity:** product name **ChronoChime**, version (from `about:get` →
  `app.getVersion()`), license **MIT**, and a repo link
  (`https://github.com/svijaykoushik/chrono-chime-desktop`) opened via the bridge
  (which calls `shell.openExternal` in main — never an in-app navigation).
- **Privacy reassurance copy** (verbatim): *"ChronoChime has zero automated
  background tracking or telemetry. Nothing is ever sent unless you choose to send
  it."*
- **Two explicit buttons** (primary `contained` for GitHub, `outlined` for email),
  each with sub-text clarifying the account requirement so it's not a surprise:
  - **"Share Publicly on GitHub"** — caption *"Needs a free GitHub account"* →
    `window.chrono.feedback.openGitHub()` (§2).
  - **"Send Private Email"** — caption *"No sign-up — uses your email app"* →
    `window.chrono.feedback.openEmail()` (§3). (No new/third-party account, but it
    does require the user's own email app/account to be set up on the device.)
- **Accessibility:** buttons have discernible labels; the section is keyboard
  reachable like the other Settings cards.
- Note: the update-check control from
  [diagnostics-and-updates.md](./diagnostics-and-updates.md) §2.6 also lives in
  this About & Feedback surface; its behavior is specified there, not here.

---

## Part 2 — Path A: Public GitHub issue (Issue Form template)

### 2.1 The issue form template (repo artifact)

`.github/ISSUE_TEMPLATE/feedback.yml` (GitHub Issue Form). It owns the structure
and the label so they apply regardless of the reporter's permissions. **It must be
committed to the repo's default branch** for `?template=feedback.yml` to resolve;
the `user-feedback` label should exist in the repo (the form also declares it):

```yaml
name: User Feedback
description: Share your review, expectations, or thoughts on ChronoChime.
title: "Feedback: <brief summary>"
labels: ["user-feedback"]
body:
  - type: textarea
    id: expectations
    attributes:
      label: Expectations vs. reality
      description: What did you expect before installing, and how did reality compare?
    validations:
      required: true
  - type: textarea
    id: thoughts
    attributes:
      label: General reviews & thoughts
      description: UX issues, impressions, high-level feedback.
  - type: textarea
    id: system
    attributes:
      label: System & app context (auto-filled — safe to leave)
      description: Pre-filled by the app; no network was used to collect this.
```

### 2.2 The button action

Main process builds and opens (no network call by the app itself):

```
https://github.com/svijaykoushik/chrono-chime-desktop/issues/new
  ?template=feedback.yml
  &system=<encoded "App <ver> · <platform>/<arch> · OS <osRelease>">
```

- GitHub Issue Forms pre-fill a field when a query-param name matches the field
  `id`; we pre-fill `system` with locally-gathered context. The template supplies
  the title default and the `user-feedback` label.
- Opened via `shell.openExternal(url)` in the OS default browser.
- **Account required:** GitHub has no anonymous issue creation — **submitting**
  needs a signed-in GitHub account (free). A logged-out user is redirected to
  `/login?return_to=…`, which preserves the full pre-filled URL, so after sign-in
  they return to the populated form. Users without an account must sign up first.
  This is why the button is captioned *"Needs a free GitHub account"*, and why
  Path B (email — no new sign-up, uses the user's own mail app) exists as the
  alternative for users who don't have or don't want a GitHub account.

### 2.3 Pure URL builder (testable)

```ts
interface SystemContext { version: string; platform: string; arch: string; osRelease: string; }
function buildGitHubFeedbackUrl(repoPath: string, ctx: SystemContext): string;
```

Returns the URL above with every dynamic segment `encodeURIComponent`-escaped.

---

## Part 3 — Path B: Private email (`mailto:`)

### 3.1 The button action

Main process builds a `mailto:` URL and opens it via `shell.openExternal`,
invoking the OS default mail client. The user reviews/edits/deletes any content —
including the technical metadata — and clicks Send themselves.

Requires the user's own email app/account to be configured on the device (no new
or third-party sign-up). If no default `mailto:` handler is set, the open is a
graceful no-op with a notice (§5.1).

```
mailto:svijaykoushik@hotmail.com
  ?subject=<encoded "[svijaykoushik/chrono-chime-desktop] User Review & Feedback">
  &body=<encoded body template>
```

Body template (metadata is plainly visible and editable in the mail client):

```
Hi Developer,

Here are my thoughts on using the application:

1. Did the application meet your initial goals/expectations?
-

2. General thoughts / UX review:
-

---
Technical context (visible to you, safe to leave attached):
- Build Version: <appVersion>
- Platform: <process.platform> (<process.arch>)
```

### 3.2 Pure URL builder (testable)

```ts
interface MailContext { version: string; platform: string; arch: string; }
function buildMailtoUrl(email: string, repoPath: string, ctx: MailContext): string;
```

`encodeURIComponent` all dynamic parts. Use **CRLF (`\r\n`)** for body line breaks
(RFC 6068 / `mailto:`; `encodeURIComponent` emits `%0D%0A`) for broadest mail-client
compatibility. Keep the body lean (Windows `mailto:` has a practical ~2000-char
limit; this template is well under it).

---

## Part 4 — IPC, bridge & config

### 4.1 IPC channels (`src/shared/contract.ts`)

| Channel | Direction | Payload → Result |
| --- | --- | --- |
| `chronochime:about:get` | invoke | `{}` → `{ appVersion: string; repoUrl: string }` |
| `chronochime:feedback:openGitHub` | invoke | `{}` → `void` (builds URL, `shell.openExternal`) |
| `chronochime:feedback:openEmail` | invoke | `{}` → `void` (builds mailto, `shell.openExternal`) |

The renderer cannot read `app.getVersion()`/`process.*` under sandbox, so
`about:get` provides the version for display; the two feedback handlers gather
metadata and build URLs entirely in main. Channels follow the existing
Zod-validated contract pattern (`src/shared/contract.ts`); requests are empty
objects and `about:get`'s response is validated by a small `aboutInfoSchema`.

### 4.2 Bridge (`src/shared/bridge.ts`, `src/preload.ts`)

```
window.chrono.about    = { get(): Promise<{ appVersion, repoUrl }> }
window.chrono.feedback = { openGitHub(): Promise<void>, openEmail(): Promise<void> }
```

### 4.3 Config constants (main process)

```ts
const FEEDBACK = {
  developerEmail: 'svijaykoushik@hotmail.com',
  repoPath: 'svijaykoushik/chrono-chime-desktop',
  // appVersion via app.getVersion(); platform/arch via process.*; osRelease via os.release()
} as const;
```

### 4.4 Module layout

```
src/main/feedback/
  urls.ts        # pure: buildGitHubFeedbackUrl, buildMailtoUrl
  feedback.ts    # gather runtime metadata; IPC handlers; shell.openExternal
src/renderer/SettingsView.tsx   # About & Feedback section (+ buttons)
.github/ISSUE_TEMPLATE/feedback.yml
```

---

## Part 5 — Security & isolation

- **`shell.openExternal` only.** These URLs are never loaded into the app
  `BrowserWindow` or any `webview` — avoids XSS vectors and preserves the sandbox.
- **No user input feeds the URLs.** Metadata is read-only runtime data; config is
  hardcoded; everything is `encodeURIComponent`-escaped. (`mailto:`/`https:` are the
  only schemes used.)
- Renderer stays sandboxed/contextIsolated; all OS interaction is in main.

### 5.1 Error & edge handling

- `shell.openExternal` is `await`ed in main and wrapped in `try/catch`. If it
  rejects (e.g. **no default browser**, or **no `mailto:` handler configured**),
  the handler resolves without throwing and the renderer shows a non-blocking
  Snackbar (e.g. *"Couldn't open your browser/mail app."*) — never a crash, never a
  blocked UI. No clipboard/other fallback is in scope.
- Actions are idempotent and stateless; repeated clicks simply re-open the handler.
- No network, retry, or offline logic applies — there is no app-originated request.

---

## Part 6 — Test plan & acceptance

- **Pure (unit):** `buildGitHubFeedbackUrl` and `buildMailtoUrl` — correct base,
  param order, `encodeURIComponent` of titles/bodies/metadata, newline handling,
  and that the GitHub URL uses `?template=feedback.yml`.
- **Glue:** IPC handlers gather metadata and call `shell.openExternal` with the
  built URL (mock `shell`).
- **Acceptance matrix (from requirements):**
  - **Privacy:** selecting either action fires **no** app-originated network
    request (0 frames) — only `shell.openExternal` hands off to the OS.
  - **Cross-platform:** both paths open the correct OS handler on Windows + Linux.
  - **Zero cost:** no backend/DB/forms — verified by relying on GitHub + the user's
    mail client only.

---

## Part 7 — Dependencies & build impact

- **No new runtime dependencies.** Uses Electron's `shell` + `app` and Node
  built-ins (`os`, `process`) only.
- **No bundler/packaging change.** `.github/ISSUE_TEMPLATE/feedback.yml` is a
  GitHub **repo artifact** consumed by github.com — it is not bundled into the app
  and needs no Forge/Vite change.
- Touches `src/shared/contract.ts`, `src/shared/bridge.ts`, `src/preload.ts`,
  `src/main.ts` (register handlers), plus the new `src/main/feedback/**` and the
  `SettingsView` section.

## Part 8 — Implementation sequencing

Strict TDD, pure logic first (matches the project's red→green→refactor norm):

1. **Pure URL builders** (`src/main/feedback/urls.ts`) — `buildGitHubFeedbackUrl`,
   `buildMailtoUrl`, unit-tested per §6 before any wiring.
2. **Main wiring** (`feedback.ts`): gather runtime metadata, register the three
   IPC handlers, `shell.openExternal` with `try/catch` (§5.1).
3. **Contract + bridge + preload**: add channels/schemas and `window.chrono.about`
   / `window.chrono.feedback`.
4. **Renderer**: the About & Feedback `SettingsView` card (§1) + the failure Snackbar.
5. **Repo artifact**: commit `.github/ISSUE_TEMPLATE/feedback.yml` to the default
   branch; confirm `?template=feedback.yml` resolves and the label applies.

## Out of scope

- In-app feedback capture/storage, ratings/star widgets, surveys, analytics, or any
  automated/background transmission.
- macOS artifacts. A separate About *modal* (the About content lives in the
  Settings section). Auto-creating issues/emails without an explicit user click.
