# Notification & Sound Delivery System

ChronoChime notifies users via visual alerts and audio chimes when scheduled conditions trigger, respecting timezone boundaries and silent settings.

## Subsystems

### 1. Quiet Hours Service
- **Quiet Hours Suppression:** If a trigger fires during quiet hours, visual notifications are delivered silently (sound alerts are muted).
- **No System Muting:** The service evaluates quiet boundaries locally within the app; it does not alter system-wide sound levels or Do Not Disturb settings.

### 2. Audio Context & Protocol Mapping
- **Custom Protocol `chrono-sound://`:** Standard HTML Audio tags are isolated from the host file system. To play built-in sound assets securely in Chromium, the main process registers `chrono-sound://` scheme to serve asset buffers under strict Content Security Policies.
- **Android-style Preview Recycling:** Previewing multiple sounds in the picker dialog creates audio instances. The component stops and cancels any active `new Audio()` instances on selection change to prevent memory leaks and audio context exhaustion in Chromium.
