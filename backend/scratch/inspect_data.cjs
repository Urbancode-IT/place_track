const { query } = require('../src/config/db.js');

async function run() {
  try {
    const s = await query('SELECT id, name, email FROM "Student" LIMIT 10');
    console.log('\n--- Students ---');
    console.table(s.rows);

    const r = await query('SELECT id, company, round, status, date FROM "StudentInterviewRequest" LIMIT 10');
    console.log('\n--- Requests ---');
    console.table(r.rows);

    const i = await query('SELECT id, company, date, status FROM "Interview" LIMIT 10');
    console.log('\n--- Interviews ---');
    console.table(i.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
