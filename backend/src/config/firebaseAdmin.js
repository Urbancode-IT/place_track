import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';

let app;

function resolveServiceAccountPath() {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '').trim();
  if (!raw) return null;
  // Ignore .env.example placeholders (Windows path on Linux VPS, etc.)
  if (/path\/to\/firebase|your_.*\.json/i.test(raw)) return null;
  if (!existsSync(raw)) {
    console.warn(`[push] FIREBASE_SERVICE_ACCOUNT_PATH not found, skipping: ${raw}`);
    return null;
  }
  return raw;
}

function initFirebaseAdmin() {
  if (app) return app;

  const serviceAccountJson = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  const serviceAccountPath = resolveServiceAccountPath();

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
