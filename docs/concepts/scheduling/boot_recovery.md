# Boot & Sleep Recovery Manager

Reliability dictates that ChronoChime must recover from system restarts, unexpected crashes, and long sleep cycles without overwhelming the user with backlogged notifications.

## Load-Bearing Mechanics

### 1. The Grace Window Policy
When the application starts up or wakes from sleep, it scans the repository for any enabled reminder that has a next scheduled run time in the past:
- **One-Shot Reminders:** If a one-shot reminder was scheduled to run within the last **5 minutes** (the grace window), it is immediately fired. If it is older than 5 minutes, it is marked as inactive/missed and logged without alerting the user.
- **Recurring Reminders:** Rather than firing multiple backlogged alerts for every occurrence missed during the downtime (which would overwhelm the user), the recovery engine **coalesces** them into a single alert, fires it once, and schedules the next execution based on the current time.

### 2. OS Sleep/Wake Monitoring
When a computer enters suspended sleep, JavaScript timers are frozen. When the system wakes up, the scheduler captures the event using Electron's `powerMonitor` callback:
```typescript
powerMonitor.on('resume', () => {
  logger.info('main', 'System resumed from sleep; triggering recovery sweep');
  scheduler.start();
});
```
This re-runs the recovery sweep immediately to prevent delays in scheduled chimes.
