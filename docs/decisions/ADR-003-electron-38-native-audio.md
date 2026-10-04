---
type: Decision
title: Electron 38 for Native Web Audio
description: Select an Electron and Node baseline that supports the current native Web Audio addon without requiring a SQLite major upgrade.
tags: [decision, electron, audio, native-modules]
timestamp: 2026-10-02
---

# ADR-003 — Electron 38 for Native Web Audio

## Status

Accepted

## Context

Issue #67 proposes `node-web-audio-api` for main-process sound playback. The
current 2.x release requires Node 22 or newer, while Electron 33 embeds Node 20.
The latest Electron 44 embeds Node 24, but the repository's `better-sqlite3`
11.10.0 fails to compile against that release's changed V8 APIs. Upgrading
SQLite would broaden this audio change into a database migration.

## Alternatives Considered

- Keep Electron 33 and use the older `node-web-audio-api` 1.x line. This avoids
  an Electron upgrade but pins the application to an older audio API release.
- Upgrade to Electron 44 and also upgrade `better-sqlite3`. This reaches the
  newest Electron line but adds an unrelated native persistence upgrade and
  additional migration risk.
- Upgrade to Electron 38, which embeds Node 22, and retain `better-sqlite3`
  11.10.0. This supports the current audio addon with a smaller runtime jump.

## Decision

Pin Electron to 38.8.6, whose embedded Node is 22.22.0. Use
`node-web-audio-api` 2.2.0 and `audio-decode` 3.12.0. Upgrade
`@electron/rebuild` to 4.2.0 and run CI on Node 22 so native package installation
and rebuilding meet their Node 22.12 minimum. Keep native/ESM audio packages
external in the main Vite bundle and let Forge unpack native binaries.

Local verification confirmed that better-sqlite3 rebuilds, Linux Forge package
and Debian maker succeed, and both audio packages load from the packaged ASAR
under Electron 38. A bundled chime also completed playback through the Linux
host's default audio sink. Windows packaging and audible playback remain
required release checks.

## Consequences

- Electron upgrades must remain compatible with `better-sqlite3`, the audio
  addon's Node engine, and the pinned Windows build toolchain.
- CI now uses Node 22, and Electron native modules must be rebuilt for the
  Electron ABI before packaging.
- Revisit the Electron pin when a newer release can build the current SQLite
  dependency or when a deliberate SQLite upgrade is approved.