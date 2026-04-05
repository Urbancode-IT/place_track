/**
 * Creates "StudentInterviewRequest" if missing (shared form + optional token flow).
 * Run: npm run db:migrate-self-interview
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function stripComments(sql) {
  return sql
    .split(/\r?\n/)
    .filter((line) => !/^\s*--/.test(line))
    .join('\n');
}

async function main() {
  const path = join(__dirname, 'add_student_interview_request.sql');
  const raw = readFileSync(path, 'utf8');
  const sql = stripComments(raw);
  const parts = sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const part of parts) {
    await pool.query(part);
    console.log('OK:', part.split(/\s+/).slice(0, 4).join(' '), '…');
  }
  console.log('\nStudentInterviewRequest migration finished.');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
