/**
 * Load backend/.env regardless of shell cwd (fixes SMTP missing when starting Node from repo root).
 * Must be imported before any module that reads process.env (e.g. nodemailer).
 * override: true so file values win over stale PM2-injected env (e.g. old Firebase path).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '..');
dotenv.config({ path: path.join(backendRoot, '.env'), override: true });

/** Drop placeholder / missing Firebase paths left in PM2 or .env.example copies */
function scrubFirebaseEnv() {
  const p = (process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '').trim();
  if (
    !p ||
    /path[/\\]to[/\\]firebase/i.test(p) ||
    /your_.*\.json/i.test(p) ||
    /^C:[/\\]/i.test(p)
  ) {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  }
  const j = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!j) delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
}

scrubFirebaseEnv();
