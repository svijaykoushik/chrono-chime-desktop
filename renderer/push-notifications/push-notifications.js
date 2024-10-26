'use strict';

/**
 * Show push notification and play sound
 * @param {object} settings AppSettings
 */
export function showNotification(settings) {
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
