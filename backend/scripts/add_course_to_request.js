import { query } from '../src/config/db.js';

async function migrate() {
  console.log('Migrating: Adding course column to StudentInterviewRequest...');
  try {
    await query(`
      ALTER TABLE "StudentInterviewRequest" 
      ADD COLUMN IF NOT EXISTS "course" VARCHAR(50);
    `);
    console.log('Migration successful: course column added.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    process.exit();
  }
}

migrate();
