# ChronoChime Engineering Log

All changes made to the codebase are tracked here in reverse chronological order.

### 2026-07-05
- **Documentation Overhaul & Concept Architecture Indexing**
  - Created concept-based directories and documents (`docs/concepts/`) covering Core Scheduling (Luxon DST & recovery), SQLite direct persistence, sandboxed IPC bridges, Range-Resume staged downloads, process-safe crash reentrancy guards, and `chrono-sound://` audio protocol recycling.
  - Indexed all concept documentation in the main `docs/README.md`.
  - Updated all Milestone status listings to Done in `shipping-implementation-plan.md`.
- **Android-style Built-in Sound Picker Dialog**
  - Implemented `SoundPickerDialog` with a clean radio list layout and built-in theme styling.
  - Added interactive audio preview capability supporting automatic active playback termination on option switch or dialog close.
  - Replaced basic MUI select dropdown inside `ReminderDialog` with a read-only trigger selector field and a volume icon adornment.
- **Stable & Pre-release Update Channels Support**
  - Integrated `updateChannel` setting schema and defaults into the main settings configurations.
  - Updated `github-client.ts` to support querying the generic `/releases` list endpoint to parse, skip drafts, and retrieve the latest beta/pre-release tag when subscribed to the Prerelease channel.
  - Added a channel selection dropdown selector inside the Settings Updates card view.
- **Inline Application Version Display**
  - Exposed local application version query via `updateGetVersion` IPC channel.
  - Injected current app version context dynamically in the Settings page updates card description.
- **Repository Owner Correction**
  - Updated owner configuration paths to `svijaykoushik/chrono-chime-desktop` (corrected from `vijaykoushik`) inside update fetch requests and design documentation.
