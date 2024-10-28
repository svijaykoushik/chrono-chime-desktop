'use strict';

import { showAppToast } from '../app-toast/app-toast.js';

/**
 * @typedef {Object} AppSettings
 * @property {boolean} autoLaunch
 * @property {boolean} isOff
 * @property {string} interval - Consider using number if interval is always numeric
 * @property {string} notificationSound
 * @property {string} notificationTitle
 * @property {string} notificationContent
 * @property {string} focusInterval
 * @property {string} focusShortBreak
 * @property {string} focusLongBreak
 */

/**
 * @type {AppSettings}
 */
const defaultSettings = {
  autoLaunch: false,
  isOff: false,
  interval: '1', // Default interval, e.g., '1' for 1 hour
  notificationSound: 'sound1', // Default sound, e.g., 'sound1',
  notificationTitle: 'Time Keeper Extraordinaire',
  notificationContent: 'This is a personalized notification from ChronoChime!', // Default content
  focusInterval: '25', // Default '25' minutes
  focusShortBreak: '5', // Default '5' minutes
  focusLongBreak: '15', // Default '15' minutes
};

/**
 * Get settings from local storage
 * @returns {AppSettings}
 */
function getSettingsFromLocalStorage() {
  // Retrieve the JSON string from localStorage
  const settingsJSON = localStorage.getItem('settings');

  // Parse the JSON string to get the settings object

  /**
   * @type {AppSettings}
   */
  const settings = JSON.parse(settingsJSON);

  if (settings) {
    // Add new settings options if missing in
    // stored settings
    const settingsOptions = Object.keys(settings);
    const defaultSettingsOptions = Object.keys(defaultSettings);

    defaultSettingsOptions.forEach((option) => {
      if (settingsOptions.indexOf(option) === -1) {
        settings[option] = defaultSettings[option];
      }
    });
  }

  return settings;
}

/**
 * Save Settings to local storage
 * @param {AppSettings} settings The App setting to save
 */
function saveSettingsToLocalStorage(settings) {
  // Add new settings options if missing in
  // stored settings
  const settingsOptions = Object.keys(settings);
  const defaultSettingsOptions = Object.keys(defaultSettings);

  defaultSettingsOptions.forEach((option) => {
    if (settingsOptions.indexOf(option) === -1) {
      settings[option] = defaultSettings[option];
    }
  });

  // Convert the settings object to a JSON string
  const settingsJSON = JSON.stringify(settings);

  // Save the JSON string to localStorage under the key 'settings'
  localStorage.setItem('settings', settingsJSON);

  // Send the notification status to main process
  // @ts-ignore
  window.toggleNotification.sendResponse(!settings.isOff);

  // Send the auto launch status to main process
  // @ts-ignore
  window.autoLauncher.sendResponse(settings.autoLaunch);

  // Show a toast message
  showAppToast('✅ Settings saved.');
}
// Store the settings object in localStorage
if (!getSettingsFromLocalStorage()) {
  saveSettingsToLocalStorage(defaultSettings);
}

let settings = getSettingsFromLocalStorage() || defaultSettings;

/**
 * Get the app settings
 * @returns {AppSettings}
 */
export function getSettings() {
  return settings;
}

/**
 * Get the default app settings
 * @returns {AppSettings}
 */
export function getDefaultSettings() {
  return settings;
}


/**
 * Save Settings
 * @param {AppSettings} newSettings The settings to save;
 */
export function setSettings(newSettings) {
  saveSettingsToLocalStorage(newSettings);
  settings = getSettingsFromLocalStorage();
}
