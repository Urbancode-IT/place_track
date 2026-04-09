/**
 * Migration: Adds "course" column to StudentInterviewRequest if it doesn't exist.
 */
import pool from '../src/config/db.js';

async function main() {
  console.log('Starting migration: add course to StudentInterviewRequest...');
  
  try {
    // Check if column exists
    const checkRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'StudentInterviewRequest' AND column_name = 'course';
    `);

    if (checkRes.rows.length === 0) {
      console.log('Column "course" missing. Adding...');
      await pool.query(`ALTER TABLE "StudentInterviewRequest" ADD COLUMN "course" TEXT;`);
      console.log('Column "course" added successfully.');
    } else {
      console.log('Column "course" already exists.');
    }
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
