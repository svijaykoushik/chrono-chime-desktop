# Process-Safe Reentrancy & Crash Guard

If the crash handler itself encounters an error, it could trigger an infinite loop of crash windows, freezing the host computer. ChronoChime prevents this using a single-flight lock and loop-breaker mechanism.

## Load-Bearing Mechanics

### 1. The Single-Flight Lock
When an uncaught exception or a `render-process-gone` event occurs:
- The system checks if `isHandlingCrash` is true.
- If true, the handler aborts immediately and defaults to hard termination (`app.exit(1)`).
- If false, it sets the lock to true and proceeds to display the crash UI overlay.

### 2. Loop-Breaker Logic
A counter tracks crash events within a rolling window:
- If more than **3 crash events** are captured within **10 seconds**, the system determines a crash loop is in progress.
- It bypasses log export and GUI rendering, immediately terminating the main process.

### 3. Post-Quit Suppression
When the user clicks the "Quit" button, crash listeners are immediately removed or bypassed, ensuring that standard thread terminations during app shutdown do not register as false-positive crashes.
