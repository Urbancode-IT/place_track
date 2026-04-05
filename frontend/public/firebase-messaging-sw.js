/* global firebase */
// Firebase Messaging service worker (background notifications)

importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

// Paste Firebase web config values from Firebase Console.
firebase.initializeApp({
  apiKey: 'PASTE_FIREBASE_API_KEY',
  authDomain: 'PASTE_FIREBASE_AUTH_DOMAIN',
  projectId: 'PASTE_FIREBASE_PROJECT_ID',
  storageBucket: 'PASTE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'PASTE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'PASTE_FIREBASE_APP_ID',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || 'Notification';
  const options = {
    body: payload?.notification?.body || '',
    data: payload?.data || {},
  };
  self.registration.showNotification(title, options);
});

