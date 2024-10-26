'use strict';

// Function to show the toast notification
/**
 * Show a toast notification
 * @param {string} message The message to be showed
 */
export function showAppToast(message) {
  const toastNotification = document.getElementById('toastNotification');
  toastNotification.innerText = message;
  toastNotification.classList.add('show');
  setTimeout(() => {
    toastNotification.innerText = '';
    toastNotification.classList.remove('show');
  }, 5000); // Hide the toast after 5 seconds
}
