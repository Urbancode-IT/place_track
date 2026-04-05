import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigReady = Object.values(firebaseConfig).every((v) => typeof v === 'string' && v.trim() !== '');

export const firebaseApp = isConfigReady ? initializeApp(firebaseConfig) : null;
export const messaging = firebaseApp ? getMessaging(firebaseApp) : null;

