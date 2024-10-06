/**
 * @module todoModule
 * @description This module provides functions to manage to-do lists and tasks using IndexedDB.
 */

import createDBConnection from '../utils/indexed-db-utils.js';

/**
 * create tasks schema
 * @param {IDBDatabase} db
 */
function createTasksStore(db) {
  const tasksStore = db.createObjectStore('tasks', {
    keyPath: 'id',
  });

  tasksStore.createIndex('taskDescription', 'description', { unique: false });
  tasksStore.createIndex('taskStatus', 'status', { unique: false });
  tasksStore.createIndex('totalTimeSpent', 'totalTimeSpent', { unique: false });
  tasksStore.createIndex('listId', 'listId', { unique: false }); // Foreign key-like index

  return tasksStore;
}

/**
 * create task sessions schema
 * @param {IDBDatabase} db
 */
function createTaskSessions(db) {
  const taskSessionStore = db.createObjectStore('taskSessions', {
    keyPath: 'id',
  });

  taskSessionStore.createIndex('taskStartTime', 'startTime', { unique: false });
  taskSessionStore.createIndex('taskStopTime', 'stopTime', { unique: false });
  taskSessionStore.createIndex('taskId', 'taskId', { unique: false }); // Foreign key-like index
  return taskSessionStore;
}

// IndexedDB Utilities

/**
 * @function dbPromise
 * @description Opens a connection to the IndexedDB database named 'todo_list'.
 * @returns {Promise<import('../utils/indexed-db-utils.js').DBConnection>} A Promise that resolves to the DBConnection object.
 * @throws {Error} An error if the database fails to open.
 */
async function dbPromise() {
  const connection = await createDBConnection('todoList', 3, (target) => {
    const db = target.result;
    if (!db.objectStoreNames.contains('lists')) {
      const listStore = db.createObjectStore('lists', {
        keyPath: 'id',
      });

      listStore.createIndex('listName', 'name', { unique: true });
      listStore.createIndex('ListCreatedAt', 'createdAt', { unique: false });
      listStore.createIndex('isListPrebuilt', 'isPrebuilt', {
        unique: false,
      });
    }

    if (db.objectStoreNames.contains('tasks')) {
      const tx = target.transaction;
      const oldTasksStore = tx.objectStore('tasks');
      const oldTasksData = [];

      // Read all old data into memory
      oldTasksStore.openCursor().onsuccess = (event) => {
        /** @type {IDBCursorWithValue} */
        const cursor = /** @type {IDBRequest<IDBCursorWithValue>} */ (
          event.target
        ).result;
        if (cursor) {
          oldTasksData.push(cursor.value);
          cursor.continue();
        } else {
          // After reading all data delete the store
          db.deleteObjectStore('tasks');

          const tasksStore = createTasksStore(db);

          const taskSessions = createTaskSessions(db);

          oldTasksData.forEach((task) => {
            // Assign default values for new fields if they don't exist
            task.startTime = task.startTime || null;
            task.stopTime = task.stopTime || null;
            task.completeTime = task.completeTime || null;
            tasksStore.add(task); // Add modified task to new store

            taskSessions.add({
              id: crypto.randomUUID(),
              startTime: task.startTime || null,
              stopTime: task.stopTime || null,
              taskId: task.id,
            });
          });
        }
      };
    } else {
      createTasksStore(db);
      createTaskSessions(db);
    }
  });
  return connection;
}

/**
 * @typedef {Object} List
 * @property {string} id - The unique id.
 * @property {string} icon - Icon chosen for identify list.
 * @property {string} name - Name of the list.
 * @property {Date} createdAt - Timestamp of the list when it was created.
 * @property {boolean} isPrebuilt - A flag to to show if the list was prebuilt.
 */

/**
 * @typedef {Object} Task
 * @property {string} id - The unique id.
 * @property {string} description - Task description.
 * @property {boolean} completed - Is the task completed.
 * @property {string} listId - List id to which the task belongs to
 * @property {number} totalTimeSpent - Task complete time
 */

/**
 * @typedef {Object} TaskSession
 * @property {string} id - The unique id.
 * @property {Date} startTime - Task start time
 * @property {Date} stopTime - Task stop time
 * @property {string} taskId - Id of the task the session belongs to
 */

async function initDatabase() {
  const conn = await dbPromise();
  const store = conn.createTransaction('lists', 'readwrite');

  /**
   * @type List[]
   */
  const prebuiltLists = [
    {
      id: crypto.randomUUID(),
      name: 'Daily Agenda',
      icon: '☀️',
      isPrebuilt: true,
      createdAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      name: 'High Priority',
      icon: '⭐',
      isPrebuilt: true,
      createdAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Scheduled Tasks',
      icon: '📅',
      isPrebuilt: true,
      createdAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Delegated Tasks',
      icon: '👤',
      isPrebuilt: true,
      createdAt: new Date(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Task Inbox',
      icon: '🏠',
      isPrebuilt: true,
      createdAt: new Date(),
    },
  ];

  /**
   * @type List[]
   */
  const lists = await conn.handleRequest(store.getAll());
  if (lists.length) {
    return;
  }
  for (const list of prebuiltLists) {
    await conn.handleRequest(store.add(list));
  }
}

initDatabase();

// To-Do List Functions
/**
 * @function createList
 * @description Creates a new to-do list and stores it in IndexedDB.
 * @param {string} name The name of the new to-do list.
 * @returns {Promise<number>} A Promise that resolves to the ID of the newly created list.
 * @throws {Error} An error if creating the list fails.
 */
export async function createList(name) {
  const conn = await dbPromise();
  const store = conn.createTransaction('lists', 'readwrite');
  return await conn.handleRequest(
    store.add({
      name,
      createdAt: new Date(),
      icon: '📜',
      isPrebuilt: false,
      id: crypto.randomUUID(),
    })
  );
}

/**
 * @function getList
 * @description Gets a to-do list from IndexedDB.
 * @param {string} id id of the to-do list to fetch.
 * @returns {Promise<List|null>} A Promise that resolves when the list is fetched.
 */
export async function getList(id) {
  const conn = await dbPromise();
  const store = conn.createTransaction('lists', 'readonly');
  return await conn.handleRequest(store.get(id));
}

/**
 * @function deleteList
 * @description Deletes a to-do list from IndexedDB.
 * @param {string} id The ID of the list to delete.
 * @returns {Promise<void>} A Promise that resolves when the list is deleted.
 * @throws {Error} An error if deleting the list fails.
 */
export async function deleteList(id) {
  const conn = await dbPromise();
  const list = await getList(id);
  const store = conn.createTransaction('lists', 'readwrite');
  if (list && list.isPrebuilt === false) {
    return await conn.handleRequest(store.delete(id));
  } else if (list && list.isPrebuilt === true) {
    throw new Error("Cannot delete list because it's a prebuilt list");
  } else {
    throw new Error("Cannot delete list because it doesn't exist");
  }
}

/**
 * @function updateList
 * @description Updates a to-do list in IndexedDB.
 * @param {string} id id of the list.
 * @param {Pick<List,'name'>} updatedList Updated list to be stored
 * @returns {Promise<void>} A Promise that resolves when the list is updated.
 */
export async function updateList(id, updatedList) {
  const conn = await dbPromise();
  const list = await getList(id);
  const store = conn.createTransaction('lists', 'readwrite');
  if (list && list.isPrebuilt === false) {
    return await conn.handleRequest(store.put({ ...updatedList, id }));
  } else if (list && list.isPrebuilt === true) {
    throw new Error("Cannot update list because it's a prebuilt list");
  } else if (!list) {
    throw new Error("Cannot update list because it doesn't exist");
  } else {
    throw new Error('Cannot find the list expected');
  }
}

/**
 * @function addTask
 * @description Adds a new task to a specific to-do list in IndexedDB.
 * @param {string} listId The ID of the list to add the task to.
 * @param {Pick<Task,'description'|'completed'>} task The description of the new task.
 * @returns {Promise<number>} A Promise that resolves to the ID of the newly created task.
 * @throws {Error} An error if adding the task fails.
 */
export async function addTask(listId, task) {
  const conn = await dbPromise();
  const store = conn.createTransaction('tasks', 'readwrite');
  return await conn.handleRequest(
    store.add({ listId, ...task, id: crypto.randomUUID() })
  );
}

/**
 * @function removeTask
 * @description Deletes a task from a to-do list in IndexedDB.
 * @param {string} id The ID of the task to delete.
 * @returns {Promise<void>} A Promise that resolves when the task is deleted.
 * @throws {Error} An error if deleting the task fails.
 */
export async function removeTask(id) {
  const conn = await dbPromise();
  const store = conn.createTransaction('tasks', 'readwrite');
  return await conn.handleRequest(store.delete(id));
}

/**
 * @function updateTask
 * @description Updates an existing task in a to-do list in IndexedDB.
 * @param {string} id The ID of the task to update.
 * @param {Task} updatedTask An object containing the updated properties for the task.
 * @returns {Promise<void>} A Promise that resolves when the task is updated.
 * @throws {Error} An error if updating the task fails.
 */
export async function updateTask(id, updatedTask) {
  const conn = await dbPromise();
  const store = conn.createTransaction('tasks', 'readwrite');
  return await conn.handleRequest(store.put({ ...updatedTask, id }));
}

/**
 * @function getLists
 * @description Retrieves all to-do lists stored in IndexedDB.
 * @returns {Promise<Array<List>>} A Promise that resolves to an array of list objects.
 * @property {number} list.id The ID of the list.
 * @property {string} list.name The name of the list.
 * @throws {Error} An error if retrieving lists fails.
 */
export async function getLists() {
  const conn = await dbPromise();
  const store = conn.createTransaction('lists', 'readonly');
  return await conn.handleRequest(store.getAll());
}

/**
 * @function getTasks
 * @description Retrieves all tasks for a specific to-do list stored in IndexedDB.
 * @param {string} listId The ID of the list to retrieve tasks for.
 * @returns {Promise<Array<Task>>} A Promise that resolves to an array of task objects for the specified list.
 * @throws {Error} An error if retrieving tasks fails.
 */
export async function getTasks(listId) {
  const conn = await dbPromise();
  const store = conn.createTransaction('tasks', 'readonly');

  /**
   * @type {Array<Task>}
   */
  const tasks = await conn.handleRequest(store.getAll());
  return tasks.filter((task) => task.listId === listId);
}

/**
 * @function startTask
 * @description Starts a new session for the task.
 * @param {string} taskId Id of the task
 * @param {Date} startTime Time at which the task was started
 * @throws {Error} An error if the session is failed to be created.
 * @returns {Promise<string>}
 */
export async function startTask(taskId, startTime) {
  const conn = await dbPromise();
  const store = conn.createTransaction('taskSessions', 'readwrite');

  /**
   * @type {TaskSession}
   */
  const session = {
    id: crypto.randomUUID(),
    startTime: startTime,
    stopTime: null,
    taskId: taskId,
  };
  return await conn.handleRequest(store.add(session));
}

/**
 * @function stopTask
 * @description Stops the session for the task.
 * @param {string} sessionId Id of the session to be stopped
 * @param {Date} stopTime Time at which the task was stopped
 * @throws {Error} An error if the session could not be stopped
 */
export async function stopTask(sessionId, stopTime){
  const conn = await dbPromise();
  const store = conn.createTransaction('taskSessions', 'readwrite');

  /**
   * @type {TaskSession}
   */
  const session = await conn.handleRequest(store.get(sessionId));
  session.stopTime = stopTime;
  return await conn.handleRequest(store.put({ ...session }));
}
