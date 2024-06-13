/**
 * @module Reminders
 * @description This module provides functions to manage reminders using IndexedDB.
 */

import createDBConnection from '../utils/indexed-db-utils.js';

// indexed Db utilities
/**
 * Opens a connection to the IndexedDB database named 'Reminders'.
 * @returns {Promise<import('../utils/indexed-db-utils.js').DBConnection>} A Promise that resolves to the DBConnection object.
 * @throws {Error} An error if the database fails to open.
 */
async function remindersDb() {
  const connection = await createDBConnection('Reminders', 1, (db) => {

    // Create an object store (table) with the specified schema
    const objectStore = db.createObjectStore('reminders', { keyPath: 'id' });

    // Define the schema for the object store
    objectStore.createIndex('title', 'title', { unique: false });
    objectStore.createIndex('time', 'time', { unique: false });
    objectStore.createIndex('description', 'description', { unique: false });
    objectStore.createIndex('status', 'status', { unique: false });
  });
  return connection;
}

/**
 * @typedef {Object} Reminder
 * @property {string} id - The unique id.
 * @property {string} title - Title of the reminder.
 * @property {Date} time - Time to schedule the reminder.
 * @property {string} description - Description of the reminder.
 * @property {"active"|"completed"|"recurring"} status - Status of the reminder.
 */

/**
 * Creates a new reminder at the scheduled time.
 * @param {string} title Title of the reminder.
 * @param {Date} time Time to remind.
 * @param {boolean} isRecurring Is it a recurring reminder.
 * @param {string} description Reminder's description.
 * @returns A Promise that resolves to the created reminder.
 */
export async function addReminder(title, time, isRecurring, description = '') {
  const db = await remindersDb();
  // Start a database transaction
  const store = db.createTransaction('reminders', 'readwrite');

  // Define the data to be added
  /**
   * @type {Reminder}
   */
  const reminder = {
    id: crypto.randomUUID(),
    title,
    time: new Date(time),
    description,
    status: isRecurring ? 'recurring' : 'active',
  };
  return await db.handleRequest(store.add({ reminder }));
}

/**
 * Updates a reminder.
 * @param {Reminder} reminder Reminder to be updated.
 * @returns A Promsise that resolves to the updated result.
 */
export async function updateReminder(reminder) {
  const db = await remindersDb();
  // Start a transaction to read data
  const store = db.createTransaction('reminders', 'readwrite');

  return await db.handleRequest(store.put(reminder));
}

/**
 * Deletes a reminder
 * @param {string} reminderId The unique ID of the reminder
 * @returns A Promise that resolves to the delted result
 */
export async function deleteReminder(reminderId) {
  const db = await remindersDb();

  // Start a transaction to read data
  const store = db.createTransaction('reminders', 'readwrite');

  return await db.handleRequest(store.delete(reminderId));
}

/**
 * Gets All the reminders
 * @returns Array of reminders
 */
export async function getReminders() {
  const db = await remindersDb();

  // Start a transaction to read data
  const store = db.createTransaction('reminders', 'readonly');

  /**
   * @type {Reminder[]}
   */
  const reminders = await db.handleRequest(store.getAll());
  return reminders;
}

/**
 * The scheculer that schedules reminders
 *  @type {Map<string,NodeJS.Timeout>} 
 */
const reminderScheduler = new Map();

/**
 * A day in milliseconds
 * @type {number}
 */
const DAY_IN_MS = 8.64e+7;

/**
 * Schedule reminders
 * @param {()=>void} afterDispatch Callback to be executed after a reminder is dispatched.
 */
export async function scheduleReminders(afterDispatch) {
  const reminders = await getReminders();

  // clear scheduled reminders
  // for a clean slate
  reminderScheduler.forEach((timeoutId) => {
    clearTimeout(timeoutId);
  });

  // schedule reminders
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
      afterDispatch();
    }, timeRemaining);
    reminderScheduler.set(reminder.id, timeoutId);
  });
}




