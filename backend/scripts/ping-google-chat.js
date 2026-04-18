/**
 * Quick test: only checks GOOGLE_CHAT_WEBHOOK_URL (no DB).
 * Usage: from backend folder, `npm run chat:ping`
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env');
dotenv.config({ path: envPath });

if (!process.env.GOOGLE_CHAT_WEBHOOK_URL?.trim()) {
  console.error('');
  console.error('[google-chat] GOOGLE_CHAT_WEBHOOK_URL not set.');
  if (!fs.existsSync(envPath)) {
    console.error(`  → Create this file: ${envPath}`);
    console.error('  → Copy from .env.example or add one line:');
  } else {
    console.error(`  → Edit this file and set the webhook (file exists: ${envPath})`);
    console.error('  → Add or fix this line:');
  }
  console.error('     GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/.../messages?key=...&token=...');
  console.error('  → Get URL: Google Chat space → space name → Apps & integrations → Incoming webhooks.');
  console.error('');
  process.exit(1);
}

const { sendToGoogleChat } = await import('../src/services/googleChat.service.js');

const r = await sendToGoogleChat(
  `PlaceTrack manual ping — ${new Date().toISOString()}`
);
console.log(r.ok ? 'OK' : 'FAILED', r);
process.exit(r.ok ? 0 : 1);
