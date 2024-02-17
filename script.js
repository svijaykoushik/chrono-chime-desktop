let notificationInterval; // Store the interval ID for the notification timer
let countdownInterval; // Store the interval ID for the countdown timer
let countdownTimeRemaining = 0; // Global variable to store the countdown time in milliseconds
let nextHourTimeout; // Store the timeout ID of the next hout timeout

const soundSelect = document.getElementById('notificationSound');
const intervalSelect = document.getElementById('interval');
const notificationTitleText = document.getElementById('notificationTitle');
const notificationContentText = document.getElementById('notificationContent');
const previewNotificationBtn = document.getElementById('previewNotification');
const resetSettingsButton = document.getElementById('resetSettings');
const playButton = document.getElementById('playSoundButton');
const sound1Audio = document.getElementById('sound1Audio');
const sound2Audio = document.getElementById('sound2Audio');
const sound3Audio = document.getElementById('sound3Audio');
const askPermissionButton = document.getElementById('askPermissionButton');
const countdownTimer = document.getElementById('countdownTimer');
const allowNotificationCheckbox = document.getElementById(
  'allowNotificationCheckbox'
);
const autoLaunchCheckbox = document.getElementById(
  'autoLaunchCheckbox'
);
const generalTabLink = document.getElementById('generalTabLink');
const soundTabLink = document.getElementById('soundTabLink');
const contentTabLink = document.getElementById('contentTabLink');
const resetTabLink = document.getElementById('resetTabLink');

// Get references to the app drawer and toggle button
const appDrawer = document.getElementById('appDrawer');
const toggleButton = document.getElementById('toggleDrawerButton');

const defaultSettings = {
  autoLaunch: false,
  isOff: false,
  interval: '1', // Default interval, e.g., '1' for 1 hour
  notificationSound: 'sound1', // Default sound, e.g., 'sound1',
  notificationTitle: 'Hourly notification',
  notificationContent: 'This is an hourly notification from ChronoChime!', // Default content
};

// Store the settings object in localStorage
if (!getSettingsFromLocalStorage()) {
  saveSettingsToLocalStorage(defaultSettings);
}

let settings = getSettingsFromLocalStorage() || defaultSettings;

// Function to show the notification and play the sound
function showNotification() {
  const options = {
    body: settings.notificationContent,
    icon: 'chrono-chime-icon-192.png', // Replace with the path to your notification icon (192x192 pixels)
    vibrate: [200, 100, 200], // Vibration pattern (optional)
    // Add other notification options here if needed
  };

  // Play the notification sound
  let sound = 'notification.mp3';
  switch (settings.notificationSound) {
    case 'sound1':
      sound = 'notification.mp3';
      break;
    case 'sound2':
      sound = 'notification2.wav';
      break;
    case 'sound3':
      sound = 'notification3.wav';
      break;
    case 'mute':
      sound = '';
      break;
    default:
      sound = 'notification.mp3';
  }
  if (sound !== '') {
    const notificationSound = new Audio(sound); // Replace with your notification sound file

    // Set volume to 75 %
    notificationSound.volume = 0.7;
    notificationSound.play();
  }

  // Send the notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(settings.notificationTitle, options);
  }
}

function showAskPermissionButton(){
  askPermissionButton.style.opacity = 1;
  askPermissionButton.style.visibility = 'visible';
}

function hideAskPermissionButton(){
  askPermissionButton.style.opacity = 0;
  askPermissionButton.style.visibility = 'hidden';
}

function showCountdownTimer(){
  countdownTimer.style.opacity = 1;
  countdownTimer.style.visibility = 'visible';
}

function hideCountdownTimer(){
  countdownTimer.style.opacity = 0;
  countdownTimer.style.visibility = 'hidden';
}

function clearIntervals(){
  __electronLog.info('Clearing intervals');
  clearTimeout(nextHourTimeout);
  clearInterval(notificationInterval);
  clearInterval(countdownInterval);
}

function startCountdown(intervalHours,timeUntilNextHour) {
  resetCountdownTime(timeUntilNextHour);
  updateCountdownTimer(intervalHours);
  countdownInterval = setInterval(() => updateCountdownTimer(intervalHours), 1000);
}

function scheduleNextNotification(intervalHours, timeUntilNextHour){
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
    showNotification();
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
      showNotification();
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

function setNextNotificationInterval(intervalHours) {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(nextHour.getHours() + intervalHours, 0, 0, 0);
  return nextHour - now;
}

// Schedule hourly notifications
function scheduleNotifications() {
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
  startCountdown(intervalHours,timeUntilNextHour);

  scheduleNextNotification(intervalHours, timeUntilNextHour);
}

// Function to update the countdown timer
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

// Function to reset the countdown time
function resetCountdownTime(time) {
  countdownTimeRemaining = time;
}

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

// Function to show the toast notification
function showAppToast(message) {
  const toastNotification = document.getElementById('toastNotification');
  toastNotification.innerText = message;
  toastNotification.classList.add('show');
  setTimeout(() => {
    toastNotification.innerText = '';
    toastNotification.classList.remove('show');
  }, 5000); // Hide the toast after 5 seconds
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
  settings = getSettingsFromLocalStorage();

  for (const container of containers) {
    if (
      url.includes(container.id) ||
      (url === '/' && container.id === 'main')
    ) {
      setElementPropertiesWithFadeIn(container, 'block');
    } else {
      setElementPropertiesWithFadeIn(container, 'none');
    }
  }

  // Check if the URL matches the "/settings" route
  if (url === '/settings') {
    // Automatically open the 'General' tab when the page loads
    document.getElementById('general').classList.add('tabcontent-active');
    document.getElementById('generalTabLink').classList.add('active');

    // load settings from local storage and populate the form
    settings = getSettingsFromLocalStorage();
    scheduleNotifications();
    initializeSettingsForm(settings);
  } else {
    settings = getSettingsFromLocalStorage();
    scheduleNotifications();
  }
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
  console.log('Navigation to %s due to history change', url);
  loadContent(url);
});

// Load initial content based on the current URL
loadContent('/');

// JavaScript function to open a specific tab
function openTab(evt, tabName) {

  // Hide all tab content
  const tabcontent = document.getElementsByClassName('tabcontent');
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].classList.remove('tabcontent-active');
  }

  // Deactivate all tab buttons
  const tablinks = document.getElementsByClassName('tablinks');
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].classList.remove('active'); // Remove 'active' class from all buttons
  }

  // Show the selected tab content and mark the button as active
  document.getElementById(tabName).classList.add('tabcontent-active');
  evt.currentTarget.classList.add('active');
}

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
  window.toggleNotification.sendResponse(!settings.isOff);

  // Send the auto launch status to main process
  window.autoLauncher.sendResponse(settings.autoLaunch);

  // Show a toast message
  showAppToast('✅ Settings saved.');
}

function getSettingsFromLocalStorage() {
  // Retrieve the JSON string from localStorage
  const settingsJSON = localStorage.getItem('settings');

  // Parse the JSON string to get the settings object
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

function initializeSettingsForm(settingsArg) {

  // Set the notification status based on the loaded setting
  if (settingsArg.isOff !== undefined && settingsArg.isOff !== null) {
    allowNotificationCheckbox.checked = !settingsArg.isOff;
  }

  // Set the autolaunch status based on the loaded setting
  if (settingsArg.autoLaunch !== undefined && settingsArg.autoLaunch !== null) {
    autoLaunchCheckbox.checked = settingsArg.autoLaunch;
  }

  // Set the selected option based on the loaded setting
  if (settingsArg.notificationSound) {
    soundSelect.value = settingsArg.notificationSound;
  }

  // Set the selected option based on the loaded setting
  if (settingsArg.interval) {
    intervalSelect.value = settingsArg.interval;
  }

  // Set the state of the allow notification setting
  if (settingsArg.interval) {
    allowNotificationCheckbox.checked = settingsArg.interval;
  }

  // Set the  title text
  if (settingsArg.notificationTitle) {
    notificationTitleText.value = settingsArg.notificationTitle;
  }

  // Set the content text
  if (settingsArg.notificationContent) {
    notificationContentText.value = settingsArg.notificationContent;
  }

  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      previewNotificationBtn.innerText = '🔔 Preview Notification';
      previewNotificationBtn.disabled = false;
      scheduleNotifications();
    } else if (Notification.permission === 'denied') {
      previewNotificationBtn.innerText = '🔔 Preview Notification';
      previewNotificationBtn.disabled = true;
      console.warn('Notification permission denied.');
    } else {
      previewNotificationBtn.innerText = '🥺 Ask permission';
      previewNotificationBtn.disabled = false;
    }
  }
}

playButton.addEventListener('click', (e) => {
  e.preventDefault();
  const selectedSound = soundSelect.value;

  sound1Audio.pause();
  sound2Audio.pause();
  sound3Audio.pause();

  if (selectedSound === 'sound1') {
    sound1Audio.currentTime = 0;
    sound1Audio.play();
  } else if (selectedSound === 'sound2') {
    sound2Audio.currentTime = 0;
    sound2Audio.play();
  } else if (selectedSound === 'sound3') {
    sound3Audio.currentTime = 0;
    sound3Audio.play();
  }
});

soundSelect.addEventListener('change', () => {
  settings.notificationSound = soundSelect.value;
  saveSettingsToLocalStorage(settings);
});

intervalSelect.addEventListener('change', () => {
  settings.interval = intervalSelect.value;
  saveSettingsToLocalStorage(settings);
  scheduleNotifications();
});

notificationTitleText.addEventListener('change', () => {
  settings.notificationTitle = notificationTitleText.value;
  saveSettingsToLocalStorage(settings);
});

notificationContentText.addEventListener('change', () => {
  settings.notificationContent = notificationContentText.value;
  saveSettingsToLocalStorage(settings);
});

previewNotificationBtn.addEventListener('click', (e) => {
  e.preventDefault();
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      showNotification();
    } else if (
      Notification.permission !== 'granted' &&
      Notification.permission !== 'denied'
    ) {
      Notification.requestPermission()
        .then((permission) => {
          if (permission === 'granted') {
            console.log('Notification permission granted.');
            previewNotificationBtn.disabled = false;
            previewNotificationBtn.innerText = 'Preview Notification 🔔';
            scheduleNotifications();
          } else {
            previewNotificationBtn.disabled = true;
            console.warn('Notification permission denied.');
          }
        })
        .catch((error) => {
          console.error('Error requesting notification permission:', error);
        });
    }
  }
});

resetSettingsButton.addEventListener('click', (e) => {
  e.preventDefault();
  saveSettingsToLocalStorage(defaultSettings);
  settings = getSettingsFromLocalStorage();
  initializeSettingsForm(settings);
});

// Add a click event listener to the toggle button
toggleButton.addEventListener('click', () => {
  // Toggle the app drawer by adjusting its right property
  appDrawer.classList.toggle('drawer-open');

  // Reposition the toggle button
  toggleButtonPosition();
});

function toggleButtonPosition() {
  const isOpen = appDrawer.classList.contains('drawer-open');
  if (isOpen) {
    // Calculate the button's position relative to the drawer when it's open
    const drawerRect = appDrawer.getBoundingClientRect();
    const buttonRect = toggleButton.getBoundingClientRect();
    const leftOffset = buttonRect.left - drawerRect.left;

    toggleButton.style.left = leftOffset + 'px';
  } else {
    // Bring the button back to its original position when the drawer is closed
    toggleButton.style.left = '15px'; // Adjust as needed
  }
}

// Allow notification permission
askPermissionButton.addEventListener('click', () => {
  settings.isOff = false;
  saveSettingsToLocalStorage(settings);
  scheduleNotifications();
});

allowNotificationCheckbox.addEventListener('change', (e) => {
  e.preventDefault();
  settings.isOff = !e.currentTarget.checked;
  saveSettingsToLocalStorage(settings);
  scheduleNotifications();
});

autoLaunchCheckbox.addEventListener('change', (e) => {
  e.preventDefault();
  settings.autoLaunch = e.currentTarget.checked;
  saveSettingsToLocalStorage(settings);
  scheduleNotifications();
});

// Listen for tab events
generalTabLink.addEventListener('click', (e) => {
  e.preventDefault();
  openTab(e, 'general');
});
soundTabLink.addEventListener('click', (e) => {
  e.preventDefault();
  openTab(e, 'sound');
});
contentTabLink.addEventListener('click', (e) => {
  e.preventDefault();
  openTab(e, 'content');
});
resetTabLink.addEventListener('click', (e) => {
  e.preventDefault();
  openTab(e, 'reset');
});

// Listen for online/offline events
window.addEventListener('online', handleOnlineStatus);
window.addEventListener('offline', handleOnlineStatus);

// Prevent navigation behaviour of links
navigation.addEventListener('navigate', (navigationEvent) => {
  navigationEvent.preventDefault();
  const url = new URL(navigationEvent.destination.url);
  const path = '/' + url.pathname.split('/').pop().split('.')[0];
  loadContent(path);
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
  settings.isOff = !data;
  saveSettingsToLocalStorage(settings);
  scheduleNotifications();
});

// Subscribe to autolaunch settings changes
window.autoLauncher.onStatusChanged((e, data) => {
  settings.autoLaunch = data;
  saveSettingsToLocalStorage(settings);
  scheduleNotifications();
});

// Initialize the online status when the page loads
handleOnlineStatus();

// Send the notification status to main process
window.toggleNotification.sendResponse(!settings.isOff);
