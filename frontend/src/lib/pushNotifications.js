import { getToken, onMessage, isSupported } from 'firebase/messaging';
import { messaging } from './firebase';
import { pushApi } from '@/api/push.api';

async function ensureServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
  if (existing) return existing;
  return navigator.serviceWorker.register('/firebase-messaging-sw.js');
}

export async function enablePushNotifications() {
  const supported = await isSupported();
  if (!supported) return { ok: false, reason: 'NOT_SUPPORTED' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: 'PERMISSION_DENIED' };

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) return { ok: false, reason: 'MISSING_VAPID_KEY' };

  if (!messaging) return { ok: false, reason: 'MISSING_FIREBASE_CONFIG' };

  const swReg = await ensureServiceWorker();
  if (!swReg) return { ok: false, reason: 'SW_NOT_AVAILABLE' };

  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
  if (!token) return { ok: false, reason: 'NO_TOKEN' };

  await pushApi.registerToken({ token, platform: 'web' });
  return { ok: true, token };
}

export function listenToForegroundMessages(handler) {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    handler?.(payload);
  });
}

