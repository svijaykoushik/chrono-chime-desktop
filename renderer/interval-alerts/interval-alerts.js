'use strict';

import { getSettings, setSettings } from '../app-settings/app-settings.js';
import { showNotification } from '../push-notifications/push-notifications.js';

/**
 * @type {NodeJS.Timeout}
 * Stores the interval ID for the notification timer
 */
let notificationInterval;

/**
 * @type {NodeJS.Timeout}
 * Store the interval ID for the countdown timer
 */
let countdownInterval;

/**
 * store the countdown time in milliseconds
 */
let countdownTimeRemaining = 0;

/**
 * @type {NodeJS.Timeout}
 *  Store the timeout ID of the next hour timeout
 */
let nextHourTimeout;

const askPermissionButton = /** @type {HTMLButtonElement} */ (
  document.getElementById('askPermissionButton')
);

const countdownTimer = /** @type {HTMLParagraphElement} */ (
  document.getElementById('countdownTimer')
);

function showAskPermissionButton() {
  askPermissionButton.style.opacity = '1';
  askPermissionButton.style.visibility = 'visible';
}

function hideCountdownTimer() {
  countdownTimer.style.opacity = '0';
  countdownTimer.style.visibility = 'hidden';
}

function clearIntervals() {
  __electronLog.info('Clearing intervals');
  clearTimeout(nextHourTimeout);
  clearInterval(notificationInterval);
  clearInterval(countdownInterval);
}

function hideAskPermissionButton() {
  askPermissionButton.style.opacity = '0';
  askPermissionButton.style.visibility = 'hidden';
}

function showCountdownTimer() {
  countdownTimer.style.opacity = '1';
  countdownTimer.style.visibility = 'visible';
}

function setNextNotificationInterval(intervalHours) {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(nextHour.getHours() + intervalHours, 0, 0, 0);
  return nextHour.getTime() - now.getTime();
}

function resetCountdownTime(time) {
  countdownTimeRemaining = time;
}

function updateCountdownTimer(intervalHours) {
  countdownTimeRemaining -= 1000; // Subtract 1 second (1000 milliseconds) from the remaining time

  if (countdownTimeRemaining <= 0) {
    // Countdown reached zero or became negative, stop the interval
    clearInterval(countdownInterval);

    // Reset the countdown time to 1 hour and update the countdown timer accordingly
    resetCountdownTime(intervalHours * 60 * 60 * 1000);
    updateCountdownTimer(intervalHours);
  } else {
    // Calculate the countdown time (in hours, minutes and seconds)
    const hours = Math.floor(countdownTimeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor(
      (countdownTimeRemaining % (1000 * 60 * 60)) / (1000 * 60)
    );
    const seconds = Math.floor((countdownTimeRemaining % (1000 * 60)) / 1000);

    // Update the countdown timer on the HTML element with ID 'countdownTimer'
    let text = `Next notification in ${minutes}m ${seconds}s`;
    if (hours > 0) {
      text = `Next notification in ${hours}h ${minutes}m ${seconds}s`;
    }
    countdownTimer.textContent = text;
  }
}

function startCountdown(intervalHours, timeUntilNextHour) {
  resetCountdownTime(timeUntilNextHour);
  updateCountdownTimer(intervalHours);
  countdownInterval = setInterval(
    () => updateCountdownTimer(intervalHours),
    1000
  );
}

function scheduleNextNotification(intervalHours, timeUntilNextHour) {
  __electronLog.info(
    'Scheduling next notification after ',
    Math.round(timeUntilNextHour / (1000 * 60)),
    ' minutes'
  );
  nextHourTimeout = setTimeout(() => {
    __electronLog.info(
      'Reached next hour with ID',
      nextHourTimeout,
      'and dispatched notification'
    );
    showNotification(getSettings());
    __electronLog.info('Resetting countdown timer');
    resetCountdownTime(intervalHours * 60 * 60 * 1000);
    updateCountdownTimer(intervalHours);

    __electronLog.info(
      'Scheduling next notification after ',
      intervalHours,
      ' hour(s)'
    );
    notificationInterval = setInterval(() => {
      __electronLog.info(
        'Dispatching notification after',
        intervalHours,
        ' hour(s) with Id ',
        notificationInterval
      );
      showNotification(getSettings());
      __electronLog.info(
        'Resetting countdown timer after ',
        intervalHours,
        ' hour(s)'
      );
      resetCountdownTime(intervalHours * 60 * 60 * 1000); // Reset the countdown to 1 hour
      updateCountdownTimer();
    }, intervalHours * 60 * 60 * 1000); // Repeat every hour
  }, timeUntilNextHour);
}

/**
 * Schedule Interval alerts
 * @param {*} settings
 * @returns
 */
export function scheduleNotifications(settings) {
  const allowNotificationCheckbox = /** @type {HTMLInputElement} */ (
    document.getElementById('allowNotificationCheckbox')
  );
  const autoLaunchCheckbox = /** @type {HTMLInputElement} */ (
    document.getElementById('autoLaunchCheckbox')
  );

  if (settings.isOff === true) {
    showAskPermissionButton();
    hideCountdownTimer();
    allowNotificationCheckbox.checked = false;

    // Clear the previous intervals if they exist
    clearIntervals();
    return;
  }

  hideAskPermissionButton();
  showCountdownTimer();

  allowNotificationCheckbox.checked = true;
  autoLaunchCheckbox.checked = settings.autoLaunch;

  let intervalHours = 1;
  switch (settings.interval) {
    case '1':
      intervalHours = 1;
      break;
    case '2':
      intervalHours = 2;
      break;
    case '3':
      intervalHours = 3;
      break;
    default:
      intervalHours = 1;
      break;
  }

  // Clear the previous intervals if they exist
  clearIntervals();

  const timeUntilNextHour = setNextNotificationInterval(intervalHours);

  // Start the countdown timer
  startCountdown(intervalHours, timeUntilNextHour);

  scheduleNextNotification(intervalHours, timeUntilNextHour);
}

// Allow notification permission
askPermissionButton.addEventListener('click', () => {
  const settings = getSettings();
  settings.isOff = false;
  setSettings(settings);
  scheduleNotifications(settings);
});
