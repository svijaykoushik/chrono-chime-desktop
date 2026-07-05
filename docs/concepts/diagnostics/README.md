# Diagnostics & Logging System

Reliability requires robust local-first diagnostics. ChronoChime captures detailed execution metrics, manages log retention automatically, and provides crash recovery overlays.

## Subsystems

### 1. [Durable Rolling Logger](file:///home/vijaykoushik/Evee/My%20Documents/GitHub/chrono-chime-desktop/src/main/diagnostics/logger.ts)
- **Engine:** Built on top of `electron-log`.
- **Transports:** Writes to both stdout/console (development) and file log transports.
- **Log Retention Sweep:** A daily sweep limits logs to a maximum of 5 files or a 7-day retention period.

### 2. [Crash Capture & Reentrancy Guard](crash_reentrancy.md)
- **Responsibility:** Captures main process uncaught exceptions, renderer crashes, and presents the crash handler overlay window.
