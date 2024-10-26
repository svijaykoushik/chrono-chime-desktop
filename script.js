/// <reference path="./renderer/types/custom.d.ts" />
'use strict';
import {
  getSettings,
  setSettings,
} from './renderer/app-settings/app-settings.js';
import { initializeSettingsForm } from './renderer/app-settings/settings-view.js';
import { scheduleNotifications } from './renderer/interval-alerts/interval-alerts.js';
import { renderReminder } from './renderer/reminders/reminder-view.js';
import { renderTaskLists } from './renderer/to-do-lists/to-do-lists-view.js';

// Show the offline toast notification
function showOfflineToast() {
  const offlineToast = document.getElementById('offlineToast');
  offlineToast.style.opacity = '1';
  offlineToast.style.visibility = 'visible';
}

// Hide the offline toast notification
function hideOfflineToast() {
  const offlineToast = document.getElementById('offlineToast');
  offlineToast.style.opacity = '0';
  offlineToast.style.visibility = 'hidden';
}

// Check online status and show/hide the toast
function handleOnlineStatus() {
  if (navigator.onLine) {
    hideOfflineToast();
  } else {
    showOfflineToast();
  }
}
// Function to set CSS properties for an element with fade-in animation
function setElementPropertiesWithFadeIn(element, displayValue) {
  element.style.display = displayValue;
  element.style.opacity = '0'; // Initially set opacity to 0

  // Using setTimeout to apply transition after a short delay
  setTimeout(function () {
    element.style.opacity = '1'; // Transition opacity to 1
  }, 10);
}

// Function to load content based on the URL
function loadContent(url) {
  const containers = document.getElementsByClassName('container');
  let settings = getSettings();

  for (const container of containers) {
    if (
      url.includes(container.id) ||
      (url === '/' && container.id === 'main') ||
      (url === '/index' && container.id === 'main')
    ) {
      setElementPropertiesWithFadeIn(container, 'block');
    } else {
      setElementPropertiesWithFadeIn(container, 'none');
    }
  }

  // Check if the URL matches the "/config" route
  if (url === '/config') {
    // Automatically open the 'General' tab when the page loads
    document.getElementById('general').classList.add('tabcontent-active');
    document.getElementById('generalTabLink').classList.add('active');

    // load settings from local storage and populate the form
    settings = getSettings();
    scheduleNotifications(settings);
    initializeSettingsForm(settings);
  } else if (url === '/config') {
    settings = getSettings();
    scheduleNotifications(settings);
    renderReminder();
  } else if (url === '/tasks') {
    settings = getSettings();
    scheduleNotifications(settings);
    renderTaskLists();
  } else {
    settings = getSettings();
    scheduleNotifications(settings);
  }
}

// Function to set active destination in nav-rail
function setActiveDestination(route) {
  const navDestinations = document.querySelectorAll('nav-destination');
  navDestinations.forEach((d) => d.classList.remove('active'));
  navDestinations.forEach((destination) => {
    const href = destination.getAttribute('href');
    if (href === route) {
      destination.classList.add('active');
    }
  });
}

// Function to handle navigation
function handleNavigation(event) {
  event.preventDefault();
  const url = event.target.getAttribute('href');
  history.pushState(null, null, url); // Update the URL
  loadContent(url); // Load the content
}

// Attach click event listeners to navigation links
const navLinks = document.querySelectorAll('nav a');
navLinks.forEach((link) => {
  link.addEventListener('click', handleNavigation);
});

// Listen for the popstate event to handle back/forward navigation
window.addEventListener('popstate', () => {
  const url = window.location.pathname;
  __electronLog.log('Navigation to %s due to history change', url);
  loadContent(url);
  setActiveDestination(url);
});

// Load initial content based on the current URL
loadContent('/');

// Listen for online/offline events
window.addEventListener('online', handleOnlineStatus);
window.addEventListener('offline', handleOnlineStatus);

// Prevent navigation behaviour of links
window.navigation.addEventListener('navigate', (navigationEvent) => {
  navigationEvent.preventDefault();
  const url = new URL(navigationEvent.destination.url);
  __electronLog.log(
    'Navigation to %s handled by navigate event handler',
    navigationEvent.destination.url
  );
  const path = '/' + url.pathname.split('/').pop().split('.')[0];
  loadContent(path);
  setActiveDestination(path);
});

window.versions.onAppVersionRecived((e, data) => {
  document.getElementById('app-version').innerText = 'v' + data;
  document.getElementById('node-version').innerText =
    'Node.js v' + window.versions.node();
  document.getElementById('chrome-version').innerText =
    'Chrome v' + window.versions.chrome();
  document.getElementById('electron-version').innerText =
    'Electron v' + window.versions.electron();
});

window.ipcNav.onLocationReceived((e, data) => {
  loadContent(data);
});

window.toggleNotification.onStatusChanged((e, data) => {
  const settings = getSettings();
  settings.isOff = !data;
  setSettings(settings);
  scheduleNotifications(settings);
});

// Subscribe to autolaunch settings changes

window.autoLauncher.onStatusChanged((e, data) => {
  const settings = getSettings();
  settings.autoLaunch = data;
  setSettings(settings);
  scheduleNotifications(settings);
});

// Initialize the online status when the page loads
handleOnlineStatus();

// Send the notification status to main process

window.toggleNotification.sendResponse(!getSettings().isOff);
