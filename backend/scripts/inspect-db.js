import pool from '../src/config/db.js';

async function main() {
  console.log('Inspecting StudentInterviewRequest...');
  
  try {
    // 1. List all columns
    const cols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'StudentInterviewRequest';
    `);
    console.log('Current columns:', cols.rows.map(r => r.column_name));

    // 2. Force add if not in list
    if (!cols.rows.find(r => r.column_name === 'course')) {
      console.log('Adding course column...');
      await pool.query(`ALTER TABLE "StudentInterviewRequest" ADD COLUMN "course" TEXT;`);
      console.log('Done.');
    } else {
      console.log('Column already there.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
