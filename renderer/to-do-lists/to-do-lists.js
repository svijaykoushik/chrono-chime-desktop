/**
 * @module todoModule
 * @description This module provides functions to manage to-do lists and tasks using IndexedDB.
 */

import createDBConnection from '../utils/indexed-db-utils.js';

// IndexedDB Utilities

/**
 * @function dbPromise
 * @description Opens a connection to the IndexedDB database named 'todo_list'.
 * @returns {Promise<import('../utils/indexed-db-utils.js').DBConnection>} A Promise that resolves to the DBConnection object.
 * @throws {Error} An error if the database fails to open.
 */
async function dbPromise() {
    const connection = await createDBConnection('todo_list', 1, (db) => {
        const listStore = db.createObjectStore('lists', { keyPath: 'id', autoIncrement: true });

        listStore.createIndex('name', 'name', { unique: true });

        const tasksStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });

        tasksStore.createIndex('description', 'description', { unique: false });
        tasksStore.createIndex('status', 'status', { unique: false });
    });
    return connection;
};

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
    return await conn.handleRequest(store.add({ name }));
};

/**
 * @function deleteList
 * @description Deletes a to-do list from IndexedDB.
 * @param {number} id The ID of the list to delete.
 * @returns {Promise<void>} A Promise that resolves when the list is deleted.
 * @throws {Error} An error if deleting the list fails.
 */
export async function deleteList(id) {
    const conn = await dbPromise();
    const store = conn.createTransaction('lists', 'readwrite');
    return await conn.handleRequest(store.delete(id));
};

/**
 * @function addTask
 * @description Adds a new task to a specific to-do list in IndexedDB.
 * @param {number} listId The ID of the list to add the task to.
 * @param {string} task The description of the new task.
 * @returns {Promise<number>} A Promise that resolves to the ID of the newly created task.
 * @throws {Error} An error if adding the task fails.
 */
export async function addTask(listId, task) {
    const conn = await dbPromise();
    const store = conn.createTransaction('tasks', 'readwrite');
    return await conn.handleRequest(store.add({ listId, task }));
};

/**
 * @function removeTask
 * @description Deletes a task from a to-do list in IndexedDB.
 * @param {number} id The ID of the task to delete.
 * @returns {Promise<void>} A Promise that resolves when the task is deleted.
 * @throws {Error} An error if deleting the task fails.
 */
export async function removeTask(id) {
    const conn = await dbPromise();
    const store = conn.createTransaction('tasks', 'readwrite');
    return await conn.handleRequest(store.delete(id));
};

/**
 * @function updateTask
 * @description Updates an existing task in a to-do list in IndexedDB.
 * @param {number} id The ID of the task to update.
 * @param {object} updatedTask An object containing the updated properties for the task.
 * @property {string} [updatedTask.task] The updated task description (optional).
 * @property {boolean} [updatedTask.completed] The updated completion status of the task (optional).
 * @returns {Promise<void>} A Promise that resolves when the task is updated.
 * @throws {Error} An error if updating the task fails.
 */
export async function updateTask(id, updatedTask) {
    const conn = await dbPromise();
    const store = conn.createTransaction('tasks', 'readwrite');
    return await conn.handleRequest(store.put({ ...updatedTask, id }));
};

/**
 * @function getLists
 * @description Retrieves all to-do lists stored in IndexedDB.
 * @returns {Promise<Array<object>>} A Promise that resolves to an array of list objects.
 * @property {number} list.id The ID of the list.
 * @property {string} list.name The name of the list.
 * @throws {Error} An error if retrieving lists fails.
 */
export async function getLists() {
    const conn = await dbPromise();
    const store = conn.createTransaction('lists', 'readonly');
    return await conn.handleRequest(store.getAll());
};

/**
 * @function getTasks
 * @description Retrieves all tasks for a specific to-do list stored in IndexedDB.
 * @param {number} listId The ID of the list to retrieve tasks for.
 * @returns {Promise<Array<object>>} A Promise that resolves to an array of task objects for the specified list.
 * @property {number} task.id The ID of the task.
 * @property {number} task.listId The ID of the list the task belongs to.
 * @property {string} task.task The description of the task.
 * @property {boolean} [task.completed=false] The completion status of the task (defaults to false).
 * @throws {Error} An error if retrieving tasks fails.
 */
export async function getTasks(listId) {
    const conn = await dbPromise();
    const store = conn.createTransaction('tasks', 'readonly');
    const tasks = await conn.handleRequest(store.getAll());
    return tasks.filter((task) => task.listId === listId);
};
