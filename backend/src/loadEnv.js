/**
 * Load backend/.env regardless of shell cwd (fixes SMTP missing when starting Node from repo root).
 * Must be imported before any module that reads process.env (e.g. nodemailer).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '..');
dotenv.config({ path: path.join(backendRoot, '.env') });
