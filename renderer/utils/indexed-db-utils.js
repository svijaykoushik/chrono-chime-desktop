/**
 * @module IndexedDBUtilities
 * @description This module provides functions to connect and perform operations on any IndexedDB database.
 */

/**
 * Opens a connection to the IndexedDB database.
 * @param {string} dbName - The name of the database.
 * @param {number} dbVersion - The version of the database.
 * @param {function(IDBDatabase): void} [upgradeCallback] - Optional callback for database upgrade handling.
 * @returns {Promise<IDBDatabase>} A Promise that resolves to the IDBDatabase object.
 * @throws {Error} An error if the database fails to open.
 */
function openDB(dbName, dbVersion, upgradeCallback) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onupgradeneeded = (event) => {
            // @ts-ignore
            const db = event.target.result;
            if (typeof upgradeCallback === 'function') {
                upgradeCallback(db);
            }
        };

        request.onsuccess = () => resolve(request.result);
        // @ts-ignore
        request.onerror = (event) => reject(event.target.errorCode);
    });
}

/**
 * Creates a transaction on a specific object store within the IndexedDB database.
 * @param {IDBDatabase} db - The IDBDatabase object.
 * @param {string} storeName - The name of the object store to access.
 * @param {"readonly"|"readwrite"} mode - The mode of the transaction ('readonly' or 'readwrite').
 * @returns {IDBObjectStore} The IDBObjectStore object.
 * @throws {Error} An error if the transaction fails to create.
 */
function createTransaction(db, storeName, mode) {
    return db.transaction(storeName, mode).objectStore(storeName);
}

/**
 * Handles an IndexedDB request.
 * @param {IDBRequest} request - The IndexedDB request object.
 * @returns {Promise<any>} A Promise that resolves to the result of the request.
 * @throws {Error} An error if the request fails.
 */
function handleRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * The Connection Object that provides methods to interact with the db.
 * @typedef {Object} DBConnection
 * @property {function(string, "readonly"|"readwrite"): IDBObjectStore} createTransaction - Creates a transaction on a specific object store within the database.
 * @property {function(IDBRequest): Promise<any>} handleRequest - Handles an IndexedDB request.
 * @property {function(): void} close - Closes the connection to the IndexedDB database.
 */

/**
 * Provides an object for interacting with an IndexedDB database.
 * @param {string} dbName - The name of the database.
 * @param {number} dbVersion - The version of the database.
 * @param {function(IDBDatabase): void} [upgradeCallback] - Optional callback for database upgrade handling.
 * @returns {Promise<DBConnection>} A Promise that resolves to a DB connection object
 */
async function createDBConnection(dbName, dbVersion, upgradeCallback) {
    const db = await openDB(dbName, dbVersion, upgradeCallback);

    return {
        /**
         * Creates a transaction on a specific object store within the IndexedDB database.
         * @param {string} storeName - The name of the object store to access.
         * @param {"readonly"|"readwrite"} mode - The mode of the transaction ('readonly' or 'readwrite').
         * @returns {IDBObjectStore} The IDBObjectStore object.
         * @throws {Error} An error if the transaction fails to create.
         */
        createTransaction: (storeName, mode) => createTransaction(db, storeName, mode),

        /**
         * Handles an IndexedDB request.
         * @param {IDBRequest} request - The IndexedDB request object.
         * @returns {Promise<any>} A Promise that resolves to the result of the request.
         * @throws {Error} An error if the request fails.
         */
        handleRequest: (request) => handleRequest(request),

        /**
         * Closes the connection to the IndexedDB database.
         * @returns {void}
         */
        close: () => db.close()
    };
}

export default createDBConnection;
