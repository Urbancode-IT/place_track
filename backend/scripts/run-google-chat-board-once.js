/**
 * Sends tomorrow's board to Google Chat (same as daily job).
 * Usage: from backend folder, `npm run chat:board` (needs DB + GOOGLE_CHAT_WEBHOOK_URL)
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });

const { runGoogleChatBoardOnce } = await import('../src/jobs/googleChatBoard.job.js');

const r = await runGoogleChatBoardOnce();
console.log(r.ok ? 'OK' : 'FAILED', r);
process.exit(r.ok ? 0 : 1);
