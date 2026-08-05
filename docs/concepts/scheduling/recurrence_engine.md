---
type: Concept
title: Recurrence & Calendaring Engine
description: Timezone-aware, DST-resilient occurrence math built on Luxon.
tags: [scheduling, recurrence, luxon]
timestamp: 2026-07-05
---

# Recurrence & Calendaring Engine

The Recurrence Engine represents the pure mathematical core of ChronoChime's scheduling. It contains zero I/O side effects, allowing it to be fully unit-tested natively outside of Electron.

## Load-Bearing Mechanics

### 1. Epoch-Millisecond Lattice
All timestamps are calculated and stored as absolute integers representing milliseconds since the Unix epoch (UTC). No local ISO strings or JS relative dates are stored in the database.

### 2. Timezone & DST Resilience
Using Luxon, recurrence checks resolve calendar boundaries natively against the user's local timezone.
- **Spring Forward (DST start):** If an occurrence falls inside the missing hour (e.g., 2:30 AM on the day DST starts), it is pushed forward according to the local timezone adjustment.
- **Fall Back (DST end):** The engine resolves the ambiguous hour by mapping occurrences using absolute time increments rather than relative string hours.

### 3. Drift Prevention
For interval schedules (e.g. "every 15 minutes starting now"), the engine creates an anchor timestamp (the "lattice anchor") representing the initial start time. Future occurrences are resolved via:
```typescript
nextOccurrence = anchor + (N * intervalMs)
```
This ensures that even if a notification execution is delayed by CPU bottlenecks or OS thread sleep, subsequent executions do not shift forward.
