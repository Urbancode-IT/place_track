import admin from 'firebase-admin';
import { readFileSync } from 'fs';

let app;

function initFirebaseAdmin() {
  if (app) return app;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!serviceAccountJson && !serviceAccountPath) {
    console.warn(
      '[push] Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH to enable push notifications.'
    );
    return null;
  }

  try {
    const credential = serviceAccountJson
      ? admin.credential.cert(JSON.parse(serviceAccountJson))
      : admin.credential.cert(JSON.parse(readFileSync(serviceAccountPath, 'utf-8')));

    app = admin.initializeApp({ credential });
    return app;
  } catch (err) {
    console.error('[push] Failed to initialize Firebase Admin:', err);
    return null;
  }
}

export function getFirebaseAdmin() {
  return initFirebaseAdmin() ? admin : null;
}

