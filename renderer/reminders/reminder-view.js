'use strict';
import {
  DAY_IN_MS,
  addReminder,
  deleteReminder,
  getReminders,
  scheduleReminders,
  updateReminder,
} from './reminders.js';

//#region Reminders
const reminderListContainer = document.getElementById('reminderListContainer');

export async function renderReminder() {
  let reminderListItems = '';
  const reminders = await getReminders();

  // All reminders have been retrieved, you can now use the 'reminders' array
  reminders
    .sort((reminderA, reminderB) => {
      return reminderA.time.getTime() - reminderB.time.getTime();
    })
    .sort((reminderA, reminderB) => {
      if (reminderA.status === 'active' && reminderB.status === 'completed') {
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

function clearCompletedReminders() {
  setInterval(() => {
    (async () => {
      const reminders = await getReminders();
      for (const reminder of reminders) {
        if (reminder.status === 'completed') {
          // Delete the reminder if it's completed
          await deleteReminder(reminder.id);
        } else if (
          reminder.status === 'recurring' &&
          reminder.time.getTime() < Date.now()
        ) {
          // update the reminder to next day if recurring
          // and the time has passed
          const nextOccurance = reminder.time.getTime() + DAY_IN_MS; // update for next day
          reminder.time = new Date(nextOccurance);
          await updateReminder(reminder);
        } else if (
          reminder.status === 'active' &&
          reminder.time.getTime() < Date.now()
        ) {
          // Delete the past reminder
          await deleteReminder(reminder.id);
        }
      }
      await renderReminder();
    })();
  }, 30000);
}

clearCompletedReminders();

scheduleReminders(renderReminder);

/**
 * @type {HTMLDialogElement}
 */
const remindersModal = /** @type {HTMLDialogElement} */ (
  document.getElementById('remindersModal')
);
const newReminderBtn = document.getElementById('newReminderBtn');
const cancelAddReminderBtn = document.getElementById('cancelAddReminderBtn');
const addReminderBtn = document.getElementById('addReminderBtn');

function closeRemindersModal() {
  remindersModal.close();
}

// Handle add reminders
addReminderBtn.addEventListener('click', (ev) => {
  ev.preventDefault();
  const reminderTitleInput = /** @type {HTMLInputElement} */ (
    document.getElementById('reminderTitleInput')
  );
  const reminderTimeInput = /** @type {HTMLInputElement} */ (
    document.getElementById('reminderTimeInput')
  );
  const reminderTitleInputError = document.getElementById(
    'reminderTitleInputError'
  );
  const reminderTimeInputError = document.getElementById(
    'reminderTimeInputError'
  );
  const isRecurringReminder = /** @type {HTMLInputElement} */ (
    document.getElementById('isRecurringReminder')
  );
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

  scheduleReminders(renderReminder);
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
