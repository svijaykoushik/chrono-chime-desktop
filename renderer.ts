//#region declarations
const DAY_IN_MS = 8.64e7;

const intervalSelect = document.getElementById('interval') as HTMLSelectElement;
const notificationTitleText = document.getElementById(
  'notificationTitle'
) as HTMLInputElement;
const notificationContentText = document.getElementById(
  'notificationContent'
) as HTMLTextAreaElement;
const previewNotificationBtn = document.getElementById(
  'previewNotification'
) as HTMLButtonElement;
const resetSettingsButton = document.getElementById(
  'resetSettings'
) as HTMLButtonElement;
const sound1Audio = document.getElementById('sound1Audio') as HTMLAudioElement;
const sound2Audio = document.getElementById('sound2Audio') as HTMLAudioElement;
const sound3Audio = document.getElementById('sound3Audio') as HTMLAudioElement;
const askPermissionButton = document.getElementById(
  'askPermissionButton'
) as HTMLButtonElement;
const countdownTimer = document.getElementById('countdownTimer');
const allowNotificationCheckbox = document.getElementById(
  'allowNotificationCheckbox'
) as HTMLInputElement;
const autoLaunchCheckbox = document.getElementById(
  'autoLaunchCheckbox'
) as HTMLInputElement;
const generalTabLink = document.getElementById('generalTabLink');
const soundTabLink = document.getElementById('soundTabLink');
const contentTabLink = document.getElementById('contentTabLink');
const resetTabLink = document.getElementById('resetTabLink');

// Get references to the app drawer and toggle button
const appDrawer = document.getElementById('appDrawer');
const toggleButton = document.getElementById('toggleDrawerButton');
const notificationSoundOptions = document.querySelectorAll(
  'input[name="sound"]'
);

interface Settings {
  autoLaunch: boolean;
  isOff: boolean;
  interval: string;
  notificationSound: string;
  notificationTitle: string;
  notificationContent: string;
}

type ReminderId = `${string}-${string}-${string}-${string}-${string}`;

interface Reminder {
  id: ReminderId;
  title: string;
  time: Date;
  description: string;
  status: string;
}

const defaultSettings: Settings = {
  autoLaunch: false,
  isOff: false,
  interval: '1', // Default interval, e.g., '1' for 1 hour
  notificationSound: 'sound1', // Default sound, e.g., 'sound1',
  notificationTitle: 'Time Keeper Extraordinaire',
  notificationContent: 'This is a personalized notification from ChronoChime!', // Default content
};

//#endregion

function getSettingsFromLocalStorage() {
  return window.settings.getSettings();
}

function saveSettingsToLocalStorage(settings: Settings) {
  window.settings.saveSettings(settings);
  // Show a toast message
  showAppToast('✅ Settings saved.');
}

// Store the settings object in localStorage
if (!getSettingsFromLocalStorage()) {
  saveSettingsToLocalStorage(defaultSettings);
}

let settings = getSettingsFromLocalStorage() || defaultSettings;

//#region Reminders
const reminderScheduler = new Map();

let remindersDb: IDBDatabase;

// Open (or create) the IndexedDB database
const request = window.indexedDB.open('Reminders', 1);

// Handle database upgrade (creation or schema change)
request.onupgradeneeded = function (event) {
  const db = (event.target as IDBOpenDBRequest).result;

  // Create an object store (table) with the specified schema
  const objectStore = db.createObjectStore('reminders', { keyPath: 'id' });

  // Define the schema for the object store
  objectStore.createIndex('title', 'title', { unique: false });
  objectStore.createIndex('time', 'time', { unique: false });
  objectStore.createIndex('description', 'description', { unique: false });
  objectStore.createIndex('status', 'status', { unique: false });
};

const reminderListContainer = document.getElementById('reminderListContainer');
function renderReminder() {
  // Start a transaction to read data
  const transaction = remindersDb.transaction(['reminders'], 'readonly');

  // Get the object store
  const objectStore = transaction.objectStore('reminders');

  let reminderListItems = '';
  const reminders: Reminder[] = [];

  // Open a cursor to iterate over all reminders
  objectStore.openCursor().onsuccess = function (event) {
    const cursor = (event.target as IDBRequest).result;
    if (cursor) {
      // Push each reminder into the array
      reminders.push(cursor.value);
      cursor.continue();
    } else {
      // All reminders have been retrieved, you can now use the 'reminders' array
      reminders
        .sort((reminderA, reminderB) => {
          return reminderA.time.getTime() - reminderB.time.getTime();
        })
        .sort((reminderA, reminderB) => {
          if (
            reminderA.status === 'active' &&
            reminderB.status === 'completed'
          ) {
            return -1; // 'active' comes before 'completed'
          } else if (
            reminderA.status === 'completed' &&
            reminderB.status === 'active'
          ) {
            return 1; // 'completed' comes after 'active'
          } else {
            return 0; // Maintain the same order for 'active' and 'completed'
          }
        })
        .forEach((reminder) => {
          // Get the time string
          const timeString = reminder.time.toTimeString();

          // Extract only the time portion (hours, minutes, and seconds)
          const timeOnly = timeString.split(' ')[0];
          reminderListItems += `<li data-reminder-id="${reminder.id}">
            <div class="flex-grow">
              <span class="heading subtitle1">${reminder.title}</h2>
              <span class="caption"><span class="emoji">⏲️</span> ${timeOnly}</span>
              ${
                reminder.status === 'recurring'
                  ? '<span class="caption">Everyday</span>'
                  : ''
              }
            </div>
            <div class="list-secondary-action">
              <button type="button" onclick="deleteReminder('${reminder.id}')">
                <span class="emoji">❌</span>
              </button>
            </div>
            <div class="clear-float"></div>
          </li>`;
        });

      const remindersList = `<ul class='list'>${reminderListItems}</ul>`;
      reminderListContainer.innerHTML = remindersList;
    }
  };
}

function clearCompletedReminders(remindersDb: IDBDatabase) {
  setInterval(() => {
    // Start a database transaction
    const transaction = remindersDb.transaction(['reminders'], 'readwrite');

    // Get the object store
    const objectStore = transaction.objectStore('reminders');

    // Open a cursor to iterate over all reminders
    objectStore.openCursor().onsuccess = function (event) {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const reminder = cursor.value;
        // Check if the reminder is completed
        if (reminder.status === 'completed') {
          // Delete the reminder if it's completed
          objectStore.delete(cursor.primaryKey);
        } else if (
          reminder.status === 'recurring' &&
          reminder.time.getTime() < Date.now()
        ) {
          // update the reminder to next day if recurring
          // and the time has passed
          const nextOccurance = reminder.time.getTime() + DAY_IN_MS; // update for next day
          reminder.time = new Date(nextOccurance);
          objectStore.put(reminder);
        } else if (
          reminder.status === 'active' &&
          reminder.time.getTime() < Date.now()
        ) {
          // Delete the past reminder
          objectStore.delete(cursor.primaryKey);
        }
        cursor.continue();
      } else {
        // All reminders have been processed
        console.log('Reminder cleanup complete');
        renderReminder();
      }
    };
  }, 30000);
}

function updateReminder(reminder: Reminder) {
  // Start a transaction to read data
  const transaction = remindersDb.transaction(['reminders'], 'readwrite');

  // Get the object store
  const objectStore = transaction.objectStore('reminders');

  objectStore.put(reminder);
}

function scheduleReminders() {
  __electronLog.log('Scheduling reminders');

  // Start a transaction to read data
  const transaction = remindersDb.transaction(['reminders'], 'readonly');

  // Get the object store
  const objectStore = transaction.objectStore('reminders');

  const reminders: Reminder[] = [];

  // Open a cursor to iterate over all reminders
  objectStore.openCursor().onsuccess = function (event) {
    const cursor = (event.target as IDBRequest).result;
    if (cursor) {
      // Push each reminder into the array
      reminders.push(cursor.value);
      cursor.continue();
    } else {
      // All reminders have been retrieved, you can now use the 'reminders' array

      reminderScheduler.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      reminders.forEach((reminder) => {
        const now = Date.now();
        let timeRemaining = Math.abs(reminder.time.getTime() - now);
        if (reminder.time.getTime() < now && reminder.status === 'recurring') {
          const nextOccurance = reminder.time.getTime() + DAY_IN_MS; // update for next day

          // Update the reminder and save it to storage
          reminder.time = new Date(nextOccurance);
          updateReminder(reminder);

          timeRemaining = Math.abs(nextOccurance - now);
        }
        const days =
          timeRemaining >= DAY_IN_MS
            ? Math.floor(timeRemaining / DAY_IN_MS)
            : 0;
        const hours =
          timeRemaining >= 3600000 ? Math.floor(timeRemaining / 3600000) : 0;
        const minutes =
          timeRemaining >= 60000 ? Math.floor(timeRemaining / 60000) % 60 : 0;
        const seconds =
          timeRemaining >= 1000 ? Math.floor(timeRemaining / 1000) % 60 : 0;
        console.log(
          'Remaining time for reminder %s between %s and %s is %d days %d hours %d minutes %d seconds',
          reminder.title,
          reminder.time.toTimeString(),
          new Date(now).toTimeString(),
          days,
          hours,
          minutes,
          seconds,
          reminder.time
        );
        const timeoutId = setTimeout(() => {
          const options = {
            body: reminder.description,
            icon: 'chrono-chime-icon-192.png', // Replace with the path to your notification icon (192x192 pixels)
            vibrate: [200, 100, 200], // Vibration pattern (optional)
            // Add other notification options here if needed
          };
          new Notification(reminder.title, options);
          if (reminder.status === 'active') {
            reminder.status = 'completed';
          } else if (reminder.status === 'recurring') {
            const nextOccurance = reminder.time.getTime() + 8.64e7; // update for next day
            reminder.time = new Date(nextOccurance);
          }
          updateReminder(reminder);
          renderReminder();
        }, timeRemaining);
        reminderScheduler.set(reminder.id, timeoutId);
      });
    }
  };
}

// Handle database opening success
request.onsuccess = function (event) {
  remindersDb = (event.target as IDBOpenDBRequest).result;

  clearCompletedReminders(remindersDb);

  // Scedule reminders on app start
  scheduleReminders();
};

// Handle database opening error
request.onerror = function (event) {
  const error = (event.target as IDBOpenDBRequest).error;
  __electronLog.error('Error opening database:', error);
  showAppToast('Error opening reminders database');
};

function addReminder(
  title: string,
  time: Date,
  isRecurring: boolean,
  description = ''
) {
  // Start a database transaction
  const transaction = remindersDb.transaction(['reminders'], 'readwrite');

  // Get the object store
  const objectStore = transaction.objectStore('reminders');

  // Define the data to be added
  const reminder = {
    id: crypto.randomUUID(),
    title,
    time: new Date(time),
    description,
    status: isRecurring ? 'recurring' : 'active',
  };

  // Add the data to the object store
  const addRequest = objectStore.add(reminder);

  // Handle the success or error of the add operation
  addRequest.onsuccess = function () {
    showAppToast('Reminder Added');
  };

  addRequest.onerror = function (event) {
    showAppToast('Failed to Add reminder');
    __electronLog.error(
      'Error adding reminder:',
      (event.target as IDBOpenDBRequest).error
    );
  };
}

// eslint-disable-next-line no-unused-vars
function deleteReminder(reminderId: ReminderId) {
  // Start a transaction to read data
  const transaction = remindersDb.transaction(['reminders'], 'readwrite');

  // Get the object store
  const objectStore = transaction.objectStore('reminders');

  objectStore.delete(reminderId);
  renderReminder();
}

const remindersModal = document.getElementById(
  'remindersModal'
) as HTMLDialogElement;
const newReminderBtn = document.getElementById('newReminderBtn');
const cancelAddReminderBtn = document.getElementById('cancelAddReminderBtn');
const addReminderBtn = document.getElementById('addReminderBtn');

function closeRemindersModal() {
  remindersModal.close();
}

// Handle add reminders
addReminderBtn.addEventListener('click', (ev) => {
  ev.preventDefault();
  const reminderTitleInput = document.getElementById(
    'reminderTitleInput'
  ) as HTMLInputElement;
  const reminderTimeInput = document.getElementById(
    'reminderTimeInput'
  ) as HTMLInputElement;
  const reminderTitleInputError = document.getElementById(
    'reminderTitleInputError'
  );
  const reminderTimeInputError = document.getElementById(
    'reminderTimeInputError'
  );
  const isRecurringReminder = document.getElementById(
    'isRecurringReminder'
  ) as HTMLInputElement;
  if (reminderTitleInput.checkValidity() === false) {
    reminderTitleInput.classList.contains('validation-error') === false
      ? reminderTitleInput.classList.add('validation-error')
      : null;
    reminderTitleInputError.classList.contains('d-block') === false
      ? reminderTitleInputError.classList.add('d-block')
      : null;
  } else {
    reminderTitleInput.classList.contains('validation-error')
      ? reminderTitleInput.classList.remove('validation-error')
      : false;
    reminderTitleInputError.classList.contains('d-block')
      ? reminderTitleInputError.classList.remove('d-block')
      : null;
  }
  if (reminderTimeInput.checkValidity() === false) {
    reminderTimeInput.classList.contains('validation-error') === false
      ? reminderTimeInput.classList.add('validation-error')
      : null;
    reminderTimeInputError.classList.contains('d-block') === false
      ? reminderTimeInputError.classList.add('d-block')
      : null;
  } else {
    reminderTimeInput.classList.contains('validation-error')
      ? reminderTimeInput.classList.remove('validation-error')
      : false;
    reminderTimeInputError.classList.contains('d-block')
      ? reminderTimeInputError.classList.remove('d-block')
      : null;
  }

  if (
    [reminderTitleInput, reminderTimeInput].some(
      (input) => input.checkValidity() === false
    )
  ) {
    return;
  }
  const title = reminderTitleInput.value;
  const time = reminderTimeInput.value;
  const isRecurring = isRecurringReminder.checked;
  closeRemindersModal();
  reminderTitleInput.value = '';
  reminderTimeInput.value = '';
  const reminderDate = new Date();
  const [hours, minutes] = time.split(':');
  reminderDate.setHours(parseInt(hours));
  reminderDate.setMinutes(parseInt(minutes));
  reminderDate.setSeconds(0);
  isRecurringReminder.checked = false;
  addReminder(title, reminderDate, isRecurring);

  scheduleReminders();
  renderReminder();
});
newReminderBtn.addEventListener('click', (ev) => {
  ev.preventDefault();
  remindersModal.showModal();
});
cancelAddReminderBtn.addEventListener('click', (ev) => {
  ev.preventDefault();
  closeRemindersModal();
});
//#endregion

// Function to show the offline toast notification
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
function showAppToast(message: string) {
    const toastNotification = document.getElementById('toastNotification');
    toastNotification.innerText = message;
    toastNotification.classList.add('show');
    setTimeout(() => {
        toastNotification.classList.remove('show');
    }, 5000); // Hide the toast after 5 seconds
}

async function updateNotificationUI() {
  const settings = await window.settings.getSettings();
  const permission = await Notification.requestPermission();

  if (permission === 'granted' && !settings.isOff) {
    askPermissionButton.style.display = 'none';
    countdownTimer.style.display = 'block';
  } else {
    askPermissionButton.style.display = 'block';
    countdownTimer.style.display = 'none';
  }
}


// Function to set CSS properties for an element with fade-in animation
function setElementPropertiesWithFadeIn(
  element: HTMLElement,
  displayValue: string
) {
  element.style.display = displayValue;
  element.style.opacity = '0'; // Initially set opacity to 0

  // Using setTimeout to apply transition after a short delay
  setTimeout(function () {
    element.style.opacity = '1'; // Transition opacity to 1
  }, 10);
}

async function initializeSettingsForm() {
  const settingsArg = await window.settings.getSettings();
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
    document.querySelector<HTMLInputElement>(
      `#${settingsArg.notificationSound}`
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

async function loadContent(url: string) {
  const containers = document.getElementsByClassName(
    'container'
  ) as HTMLCollectionOf<HTMLDivElement>;
  settings = await window.settings.getSettings();

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

  // Update the notification UI
  updateNotificationUI();

  // Check if the URL matches the "/settings" route
  if (url === '/settings') {
    // Automatically open the 'General' tab when the page loads
    document.getElementById('general').classList.add('tabcontent-active');
    document.getElementById('generalTabLink').classList.add('active');

    // load settings from local storage and populate the form
    await initializeSettingsForm();
    scheduleNotifications();
  } else if (url === '/reminders') {
    scheduleNotifications();
    renderReminder();
  } else {
    scheduleNotifications();
  }
}

// Function to handle navigation
function handleNavigation(event: Event) {
  event.preventDefault();
  const url = (event.target as HTMLElement).getAttribute('href');
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
});

// Load initial content based on the current URL
loadContent('/');

// JavaScript function to open a specific tab
function openTab(evt: Event, tabName: string) {
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
  (evt.currentTarget as HTMLElement).classList.add('active');
}

sound1Audio.addEventListener('ended', (e) => {
  e.preventDefault();
  document
    .querySelector('input#sound1')
    .parentElement.querySelector<HTMLDivElement>(
      '.secondary-action'
    ).style.display = 'none';
});
sound2Audio.addEventListener('ended', (e) => {
  e.preventDefault();
  document
    .querySelector('input#sound2')
    .parentElement.querySelector<HTMLDivElement>(
      '.secondary-action'
    ).style.display = 'none';
});
sound3Audio.addEventListener('ended', (e) => {
  e.preventDefault();
  document
    .querySelector('input#sound3')
    .parentElement.querySelector<HTMLDivElement>(
      '.secondary-action'
    ).style.display = 'none';
});

sound1Audio.addEventListener('pause', (e) => {
  e.preventDefault();
  document
    .querySelector('input#sound1')
    .parentElement.querySelector<HTMLDivElement>(
      '.secondary-action'
    ).style.display = 'none';
});
sound2Audio.addEventListener('pause', (e) => {
  e.preventDefault();
  document
    .querySelector('input#sound2')
    .parentElement.querySelector<HTMLDivElement>(
      '.secondary-action'
    ).style.display = 'none';
});
sound3Audio.addEventListener('pause', (e) => {
  e.preventDefault();
  document
    .querySelector('input#sound3')
    .parentElement.querySelector<HTMLDivElement>(
      '.secondary-action'
    ).style.display = 'none';
});

sound1Audio.addEventListener('play', (e) => {
  e.preventDefault();
  document
    .querySelector('input#sound1')
    .parentElement.querySelector<HTMLDivElement>(
      '.secondary-action'
    ).style.display = 'block';
});
sound2Audio.addEventListener('play', (e) => {
  e.preventDefault();
  document
    .querySelector('input#sound2')
    .parentElement.querySelector<HTMLDivElement>(
      '.secondary-action'
    ).style.display = 'block';
});
sound3Audio.addEventListener('play', (e) => {
  e.preventDefault();
  document
    .querySelector('input#sound3')
    .parentElement.querySelector<HTMLDivElement>(
      '.secondary-action'
    ).style.display = 'block';
});

function playAudio(target: string) {
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
    const target = e.target as HTMLInputElement;
    const selectedSound = target.value;

    settings.notificationSound = selectedSound;
    saveSettingsToLocalStorage(settings);
    playAudio(selectedSound);
  });
  option.addEventListener('click', (e) => {
    const target = e.target as HTMLInputElement;
    const selectedSound = target.value;
    if (
      target.checked &&
      document.querySelector<HTMLAudioElement>(`audio#${selectedSound}Audio`)
        .paused
    ) {
      playAudio(selectedSound);
    }
  });
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
      new Notification(settings.notificationTitle, {
        body: settings.notificationContent,
        icon: 'chrono-chime-icon-192.png',
        vibrate: [200, 100, 200],
      });
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

resetSettingsButton.addEventListener('click', async (e) => {
  e.preventDefault();
  saveSettingsToLocalStorage(defaultSettings);
  settings = await window.settings.getSettings();
  initializeSettingsForm();
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

// Add a click event listener to the toggle button
toggleButton.addEventListener('click', () => {
  // Toggle the app drawer by adjusting its right property
  appDrawer.classList.toggle('drawer-open');

  // Reposition the toggle button
  toggleButtonPosition();
});

// Allow notification permission
askPermissionButton.addEventListener('click', async () => {
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    const settings = await window.settings.getSettings();
    settings.isOff = false;
    saveSettingsToLocalStorage(settings);
    scheduleNotifications();
    updateNotificationUI();
  }
});

allowNotificationCheckbox.addEventListener('change', async (e) => {
  e.preventDefault();
  const settings = await window.settings.getSettings();
  settings.isOff = !(e.currentTarget as HTMLInputElement).checked;
  saveSettingsToLocalStorage(settings);
  scheduleNotifications();
  updateNotificationUI();
});

autoLaunchCheckbox.addEventListener('change', (e) => {
  e.preventDefault();
  settings.autoLaunch = (e.currentTarget as HTMLInputElement).checked;
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

// Initialize the online status when the page loads
handleOnlineStatus();

// Send the notification status to main process
window.toggleNotification.sendResponse(!settings.isOff);
