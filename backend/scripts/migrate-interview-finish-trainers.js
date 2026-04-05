import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = readFileSync(join(__dirname, 'add_interview_finish_proposed_trainers.sql'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => !/^\s*--/.test(line))
    .join('\n')
    .trim();
  await pool.query(sql);
  console.log('OK: InterviewFinishRequest.proposedTrainerIds');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
