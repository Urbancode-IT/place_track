/**
 * Inserts ~10 dummy students + interviews (batchId DUMMY-SEED-10).
 * Re-run safe: removes previous DUMMY-SEED-10 rows first.
 * Run: npm run db:seed-dummy
 */
import pool from '../src/config/db.js';

const BATCH = 'DUMMY-SEED-10';

const STUDENTS = [
  ['Arun Prakash', 'dummy.student.01@placetrack.local', 'FSD'],
  ['Bharathi S', 'dummy.student.02@placetrack.local', 'SDET'],
  ['Deepa Raj', 'dummy.student.03@placetrack.local', 'BI_DS'],
  ['Elango M', 'dummy.student.04@placetrack.local', 'NETWORKING'],
  ['Fathima N', 'dummy.student.05@placetrack.local', 'AWS'],
  ['Ganesh K', 'dummy.student.06@placetrack.local', 'JAVA'],
  ['Harini R', 'dummy.student.07@placetrack.local', 'REACT'],
  ['Ishaan V', 'dummy.student.08@placetrack.local', 'FSD'],
  ['Jay Kumar', 'dummy.student.09@placetrack.local', 'SDET'],
  ['Kaviya P', 'dummy.student.10@placetrack.local', 'FSD'],
];

const COMPANIES = ['TCS', 'Infosys', 'Wipro', 'Zoho', 'Accenture', 'Cognizant', 'HCL', 'Tech Mahindra', 'LTI Mindtree', 'Capgemini'];
const STATUSES = ['SCHEDULED', 'SCHEDULED', 'SHORTLISTED', 'SCHEDULED', 'AWAITING_RESPONSE', 'SCHEDULED', 'RESCHEDULED', 'SCHEDULED', 'SHORTLISTED', 'SCHEDULED'];
const ROUNDS = ['L1', 'L2', 'HR', 'Technical', 'L1', 'L2', 'L1', 'Managerial', 'L1', 'Final'];

async function main() {
  const del = await pool.query('DELETE FROM "Student" WHERE "batchId" = $1 RETURNING id', [BATCH]);
  console.log('Removed old dummy students:', del.rowCount);

  const trainers = await pool.query('SELECT id FROM "User" WHERE role = $1 LIMIT 2', ['TRAINER']);
  const tIds = trainers.rows.map((r) => r.id);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  for (let i = 0; i < STUDENTS.length; i++) {
    const [name, email, course] = STUDENTS[i];
    const ins = await pool.query(
      `INSERT INTO "Student" (name, email, phone, course, "batchId", "selfIntro")
       VALUES ($1, $2, $3, $4::course_enum, $5, $6)
       RETURNING id`,
      [name, email, `+91987650${String(i + 1).padStart(4, '0')}`, course, BATCH, `Dummy profile for ${name}.`]
    );
    const studentId = ins.rows[0].id;

    const interviewDate = new Date(startOfToday);
    interviewDate.setHours(9 + (i % 8), (i * 7) % 60, 0, 0);

    const timeSlot = `${9 + (i % 8)}:${String((i * 7) % 60).padStart(2, '0')}–${10 + (i % 8)}:${String((i * 11) % 60).padStart(2, '0')}`;

    const iv = await pool.query(
      `INSERT INTO "Interview" ("studentId", company, round, date, "timeSlot", "hrNumber", room, status, comments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::interview_status_enum, $9)
       RETURNING id`,
      [
        studentId,
        COMPANIES[i],
        ROUNDS[i],
        interviewDate,
        timeSlot,
        `+9199888${1000 + i}`,
        `Room ${String.fromCharCode(65 + (i % 5))}`,
        STATUSES[i],
        `Dummy seed interview ${i + 1}.`,
      ]
    );
    const interviewId = iv.rows[0].id;
    for (const tid of tIds) {
      await pool.query(
        `INSERT INTO "InterviewTrainer" ("interviewId", "trainerId", "notifiedAt") VALUES ($1, $2, now())
         ON CONFLICT ("interviewId", "trainerId") DO NOTHING`,
        [interviewId, tid]
      );
    }
  }

  console.log('Inserted', STUDENTS.length, 'dummy students + interviews (batch', BATCH + ').');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
