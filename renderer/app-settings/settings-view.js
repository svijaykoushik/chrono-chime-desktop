'use strict';

import { showNotification } from '../push-notifications/push-notifications.js';
import { scheduleNotifications } from '../interval-alerts/interval-alerts.js';
import { getDefaultSettings, getSettings, setSettings } from './app-settings.js';

const intervalSelect = /** @type {HTMLSelectElement} */ (
  document.getElementById('interval')
);
const notificationTitleText = /** @type {HTMLInputElement} */ (
  document.getElementById('notificationTitle')
);
const notificationContentText = /** @type {HTMLInputElement} */ (
  document.getElementById('notificationContent')
);
const previewNotificationBtn = /** @type {HTMLButtonElement} */ (
  document.getElementById('previewNotification')
);
const resetSettingsButton = /** @type {HTMLButtonElement} */ (
  document.getElementById('resetSettings')
);
const sound1Audio = /** @type {HTMLAudioElement} */ (
  document.getElementById('sound1Audio')
);
const sound2Audio = /** @type {HTMLAudioElement} */ (
  document.getElementById('sound2Audio')
);
const sound3Audio = /** @type {HTMLAudioElement} */ (
  document.getElementById('sound3Audio')
);
const allowNotificationCheckbox = /** @type {HTMLInputElement} */ (
  document.getElementById('allowNotificationCheckbox')
);
const autoLaunchCheckbox = /** @type {HTMLInputElement} */ (
  document.getElementById('autoLaunchCheckbox')
);
const generalTabLink = document.getElementById('generalTabLink');
const soundTabLink = document.getElementById('soundTabLink');
const contentTabLink = document.getElementById('contentTabLink');
const resetTabLink = document.getElementById('resetTabLink');
/**
 * @type {NodeListOf<HTMLInputElement>}
 */
const notificationSoundOptions = document.querySelectorAll(
  'input[name="sound"]'
);

/**
 * Initialize settings view
 * @param {import("./app-settings.js").AppSettings} settingsArg Settings to initialize
 */
export function initializeSettingsForm(settingsArg) {
  // Set the notification status based on the loaded setting
  if (settingsArg.isOff !== undefined && settingsArg.isOff !== null) {
    allowNotificationCheckbox.checked = !settingsArg.isOff;
  }

  // Set the auto-launch status based on the loaded setting
  if (settingsArg.autoLaunch !== undefined && settingsArg.autoLaunch !== null) {
    autoLaunchCheckbox.checked = settingsArg.autoLaunch;
  }

  // Set the selected option based on the loaded setting
  if (settingsArg.notificationSound) {
    /** @type {HTMLInputElement} */ (
      document.querySelector(`#${settingsArg.notificationSound}`)
    ).checked = true;
  }

  // Set the selected option based on the loaded setting
  if (settingsArg.interval) {
    intervalSelect.value = settingsArg.interval;
  }

  // Set the state of the allow notification setting
  if (settingsArg.interval) {
    allowNotificationCheckbox.checked = !!settingsArg.interval;
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
      scheduleNotifications(settingsArg);
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

// JavaScript function to open a specific tab
function openTab(evt, tabName) {
  // Hide all tab content
  const tabcontent = document.getElementsByClassName('tabcontent');
  for (let i = 0; i < tabcontent.length; i++) {
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

sound1Audio.addEventListener('ended', (e) => {
  e.preventDefault();
  /** @type {HTMLInputElement} */ (
    document
      .querySelector('input#sound1')
      .parentElement.querySelector('.secondary-action')
  ).style.display = 'none';
});
sound2Audio.addEventListener('ended', (e) => {
  e.preventDefault();
  /** @type {HTMLInputElement} */ (
    document
      .querySelector('input#sound2')
      .parentElement.querySelector('.secondary-action')
  ).style.display = 'none';
});
sound3Audio.addEventListener('ended', (e) => {
  e.preventDefault();
  /** @type {HTMLInputElement} */ (
    document
      .querySelector('input#sound3')
      .parentElement.querySelector('.secondary-action')
  ).style.display = 'none';
});

sound1Audio.addEventListener('pause', (e) => {
  e.preventDefault();
  /** @type {HTMLInputElement} */ (
    document
      .querySelector('input#sound1')
      .parentElement.querySelector('.secondary-action')
  ).style.display = 'none';
});
sound2Audio.addEventListener('pause', (e) => {
  e.preventDefault();
  /** @type {HTMLInputElement} */ (
    document
      .querySelector('input#sound2')
      .parentElement.querySelector('.secondary-action')
  ).style.display = 'none';
});
sound3Audio.addEventListener('pause', (e) => {
  e.preventDefault();
  /** @type {HTMLInputElement} */ (
    document
      .querySelector('input#sound3')
      .parentElement.querySelector('.secondary-action')
  ).style.display = 'none';
});

sound1Audio.addEventListener('play', (e) => {
  e.preventDefault();
  /** @type {HTMLInputElement} */ (
    document
      .querySelector('input#sound1')
      .parentElement.querySelector('.secondary-action')
  ).style.display = 'block';
});
sound2Audio.addEventListener('play', (e) => {
  e.preventDefault();
  /** @type {HTMLInputElement} */ (
    document
      .querySelector('input#sound2')
      .parentElement.querySelector('.secondary-action')
  ).style.display = 'block';
});
sound3Audio.addEventListener('play', (e) => {
  e.preventDefault();
  /** @type {HTMLInputElement} */ (
    document
      .querySelector('input#sound3')
      .parentElement.querySelector('.secondary-action')
  ).style.display = 'block';
});

function playAudio(target) {
  sound1Audio.pause();
  sound2Audio.pause();
  sound3Audio.pause();

  switch (target) {
    case 'sound1':
      {
        sound1Audio.currentTime = 0;
        sound1Audio.play();
      }
      break;
    case 'sound2':
      {
        sound2Audio.currentTime = 0;
        sound2Audio.play();
      }
      break;
    case 'sound3':
      {
        sound3Audio.currentTime = 0;
        sound3Audio.play();
      }
      break;
  }
}
notificationSoundOptions.forEach((option) => {
  option.addEventListener('change', (e) => {
    e.preventDefault();
    const target = /** @type {HTMLInputElement} */ (e.target);
    const selectedSound = target.value;
    const settings = getSettings();
    settings.notificationSound = selectedSound;
    setSettings(settings);
    playAudio(selectedSound);
  });
  option.addEventListener('click', (e) => {
    const target = /** @type {HTMLInputElement} */ (e.target);
    const selectedSound = target.value;
    const selectedAudio = /** @type {HTMLAudioElement} */ (
      document.querySelector(`audio#${selectedSound}Audio`)
    );
    if (target.checked && selectedAudio.paused) {
      playAudio(selectedSound);
    }
  });
});

intervalSelect.addEventListener('change', () => {
  const settings = getSettings();
  settings.interval = intervalSelect.value;
  setSettings(settings);
  scheduleNotifications(settings);
});

notificationTitleText.addEventListener('change', () => {
  const settings = getSettings();
  settings.notificationTitle = notificationTitleText.value;
  setSettings(settings);
});

notificationContentText.addEventListener('change', () => {
  const settings = getSettings();
  settings.notificationContent = notificationContentText.value;
  setSettings(settings);
});

previewNotificationBtn.addEventListener('click', (e) => {
  const settings = getSettings();
  e.preventDefault();
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      showNotification(settings);
    } else if (
      Notification.permission !== 'default' &&
      Notification.permission !== 'denied'
    ) {
      Notification.requestPermission()
        .then((permission) => {
          if (permission === 'granted') {
            console.log('Notification permission granted.');
            previewNotificationBtn.disabled = false;
            previewNotificationBtn.innerText = 'Preview Notification 🔔';
            scheduleNotifications(settings);
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
  setSettings(getDefaultSettings());
  const settings = getSettings();
  initializeSettingsForm(settings);
});

allowNotificationCheckbox.addEventListener('change', (e) => {
  e.preventDefault();
  const target = /** @type {HTMLInputElement} */ (e.currentTarget);
  const settings = getSettings();
  settings.isOff = !target.checked;
  setSettings(settings);
  scheduleNotifications(settings);
});

autoLaunchCheckbox.addEventListener('change', (e) => {
  e.preventDefault();
  const target = /** @type {HTMLInputElement} */ (e.currentTarget);
  const settings = getSettings();
  settings.autoLaunch = target.checked;
  setSettings(settings);
  scheduleNotifications(settings);
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
