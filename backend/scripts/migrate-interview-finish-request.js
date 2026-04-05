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
  const raw = readFileSync(join(__dirname, 'add_interview_finish_request.sql'), 'utf8');
  const sql = stripComments(raw);
  const parts = sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const part of parts) {
    await pool.query(part);
    console.log('OK:', part.split(/\s+/).slice(0, 4).join(' '), '…');
  }
  console.log('\nInterviewFinishRequest migration finished.');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
