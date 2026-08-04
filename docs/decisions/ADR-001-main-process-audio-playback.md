# ADR-001: Main-Process Audio Playback

## Context

ChronoChime is designed to be a background-first temporal notification desktop application. When the renderer process window is closed, the application runs entirely from the main process (in the system tray). 

Previously, audio chimes (custom and built-in notification sounds) were played entirely in the renderer process via HTML5 Audio upon receiving a notification event via IPC. If the renderer window was closed, the notification would display visually (via the OS notification system), but no custom sound would play. Only the default OS chime would ring.

To ensure reliability and consistency of sound playback regardless of the renderer window state, we need a way to play custom audio files directly from the background main process.

## Alternatives Considered

1. **Keep renderer window open but hidden:** Instead of closing the renderer process, we could minimize or hide the browser window.
   - *Trade-offs:* High memory overhead. Keeping Chromium fully active in the background just to play audio violates the lightweight utility principle of ChronoChime.
2. **Third-party native Node audio modules (e.g., `play-sound`, `sound-play`):** Install third-party npm packages.
   - *Trade-offs:* Many of these require native bindings, which can cause ABI compilation mismatches between Node and Electron (requiring rebuilding via `electron-rebuild`). This complicates packaging, makes platform cross-compilation harder, and adds third-party dependencies.
3. **OS Command Spawning (Shell utilities):** Spawn built-in OS command-line audio players (PowerShell on Windows, `paplay`/`pw-play`/`aplay`/`ffplay` on Linux) asynchronously in the background.
   - *Trade-offs:* Requires robust path escaping to prevent shell injection and handle folder paths with spaces (e.g., "My Documents"). However, it has zero dependencies, requires no native node bindings compilation, is lightweight, and is highly robust on modern Windows and Linux desktop environments.

## Decision Made

We decided to implement **OS Command Spawning** for main-process audio playback. We created `src/main/notification/audio-player.ts` to manage platform-specific playback asynchronously:
- **Windows:** Spawn PowerShell executing a `WMPlayer.OCX` COM player object. It supports both `.wav` and `.mp3` files in a non-interactive/hidden manner and limits maximum playback wait time to 10 seconds to prevent hanging.
- **Linux:** Spawn a shell chain of standard desktop players: `paplay` (PulseAudio), `pw-play` (PipeWire), `aplay` (ALSA - for WAV files only), and `ffplay` (fallback).
- **Integration:** Integrated into `NotificationManager`. When custom/builtin sounds are selected, we configure the visual OS notification as `silent: true` (to suppress duplicate default OS bells) and play the audio via our player.
- **Renderer Cleanup:** Cleaned up redundant sound triggers from the renderer's `onFired` listener to avoid duplicate chimes when the UI window is open.

## Long-Term Implications

- **Consistency:** Custom chimes are reliably played regardless of the renderer process state.
- **Maintainability:** The project remains lightweight and has zero extra NPM package dependencies, avoiding Electron native ABI recompilation issues.
- **Testability:** The audio player is easily mocked in the unit/integration testing pipeline via dependency injection.
