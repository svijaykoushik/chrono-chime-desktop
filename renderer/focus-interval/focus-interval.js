'use strict';

import { showFocusNotification } from '../push-notifications/push-notifications.js';

//#region focus

// State variables to keep track of intervals and breaks
let focusCounter = 0;
let isFocusTime = true;
let intervalDuration;

// Timer function
/**
 *
 * @param {import('../app-settings/app-settings.js').AppSettings} settings App settings
 */
function startFocusCycle(settings) {
  intervalDuration = parseInt(settings.focusInterval) * 60 * 1000; // Initial focus duration in milliseconds
  __electronLog.log(`Focus interval ${intervalDuration / (1000 * 60)} minutes strarted.`);
  // Set up the timer
  let timer = setInterval(() => {
    if (isFocusTime) {
      // Focus period complete, switch to break
      focusCounter++;
      __electronLog.log(
        `Focus interval ${focusCounter} complete. Taking a break.`
      );

      // Check if it's time for a long break
      if (focusCounter === parseInt(settings.maxFocusSessions)) {
        showFocusNotification('Time for a long break!');
        intervalDuration = parseInt(settings.focusLongBreak) * 60 * 1000; // Set long break duration
        focusCounter = 0; // Reset focus counter
      } else {
        showFocusNotification('Time for a short break!');
        intervalDuration = parseInt(settings.focusShortBreak) * 60 * 1000; // Set short break duration
      }
      isFocusTime = false; // Switch to break time
    } else {
      // Break period complete, switch back to focus
      showFocusNotification('Break is over, time to focus!');
      intervalDuration = parseInt(settings.focusInterval) * 60 * 1000; // Set focus duration
      isFocusTime = true; // Switch to focus time
    }

    clearInterval(timer); // Clear the current interval
    timer = setInterval(() => {
      startFocusCycle(settings);
    }, intervalDuration); // Start a new interval with the updated duration
  }, intervalDuration);
}

/**
 * Schedule focus cycle
 * @param {import('../app-settings/app-settings.js').AppSettings} settings App settings
 */
export function scheduleFocusCycle(settings) {
  // Start the Focus cycle
  if (settings.focusInterval) {
    startFocusCycle(settings);
  }
}
//#endregion
