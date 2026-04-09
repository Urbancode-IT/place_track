import pool from '../src/config/db.js';

async function main() {
  try {
    const sRes = await pool.query(`SELECT id FROM "Student" LIMIT 1`);
    if (sRes.rows.length === 0) {
      console.log('No students found. Creating one...');
      const ns = await pool.query(`INSERT INTO "Student" (name, course) VALUES ('Test Student', 'FSD') RETURNING id`);
      sRes.rows.push(ns.rows[0]);
    }
    const studentId = sRes.rows[0].id;

    const res = await pool.query(
      `INSERT INTO "StudentInterviewRequest" (
        token, "studentId", company, round, date, "timeSlot", "hrNumber", room, comments, course, status, "submittedAt"
      ) VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, 'SUBMITTED', now()) RETURNING *`,
      [
        studentId, 'Test Co', 'L1', new Date().toISOString(), '10 AM', 
        '123', 'Room A', 'Notes', 'FSD'
      ]
    );
    console.log('Insert success!', res.rows[0]);
  } catch (err) {
    console.error('Insert Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
