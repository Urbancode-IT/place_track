import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(path.join(__dirname, 'add_chat_action_use.sql'), 'utf8');

await query(sql);
console.log('OK: ChatActionUse table ready (Chat Approve/Reject links expire after one use)');
process.exit(0);
