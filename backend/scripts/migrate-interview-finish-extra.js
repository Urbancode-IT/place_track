import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../src/config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(path.join(__dirname, 'add_interview_finish_extra_fields.sql'), 'utf8');

await query(sql);
console.log('OK: InterviewFinishRequest trainer review + reschedule columns');
process.exit(0);
