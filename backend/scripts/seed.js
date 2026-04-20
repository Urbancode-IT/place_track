import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : new pg.Pool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'admin@123',
      database: process.env.DB_NAME || 'Placement_Tracking',
    });

async function seed() {
  const client = await pool.connect();
  try {
    const hashedAdmin = await bcrypt.hash('admin123', 10);
    const hashedTrainer = await bcrypt.hash('trainer123', 10);

    await client.query(
      `INSERT INTO "User" (id, name, email, password, role, phone)
       VALUES (gen_random_uuid()::text, 'Admin User', 'admin@kattraan.com', $1, 'ADMIN', '+919876543210')
       ON CONFLICT (email) DO NOTHING`,
      [hashedAdmin]
    );
    await client.query(
      `INSERT INTO "User" (id, name, email, password, role, phone)
       VALUES (gen_random_uuid()::text, 'Trainer One', 'trainer1@kattraan.com', $1, 'TRAINER', '+919876543211')
       ON CONFLICT (email) DO NOTHING`,
      [hashedTrainer]
    );
    await client.query(
      `INSERT INTO "User" (id, name, email, password, role, phone)
       VALUES (gen_random_uuid()::text, 'Trainer Two', 'trainer2@kattraan.com', $1, 'TRAINER', '+919876543212')
       ON CONFLICT (email) DO NOTHING`,
      [hashedTrainer]
    );

    const studentCheck = await client.query('SELECT id FROM "Student" WHERE name = $1', ['Alice Kumar']);
    if (studentCheck.rows.length === 0) {
      const studentRes = await client.query(
        `INSERT INTO "Student" (name, email, phone, course, "batchId", "selfIntro")
         VALUES ('Alice Kumar', 'alice@example.com', '+919876543220', 'FSD', 'BATCH-2024-01', 'Full stack developer with React and Node experience.')
         RETURNING id`
      );
      const s1Id = studentRes.rows[0].id;
      await client.query(
        `INSERT INTO "Student" (name, email, phone, course, "batchId") VALUES ('Bob Singh', 'bob@example.com', '+919876543221', 'SDET', 'BATCH-2024-01')`
      );

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const t1 = await client.query('SELECT id FROM "User" WHERE email = $1', ['trainer1@kattraan.com']);
      const t2 = await client.query('SELECT id FROM "User" WHERE email = $1', ['trainer2@kattraan.com']);
      const iRes = await client.query(
        `INSERT INTO "Interview" ("studentId", company, round, date, "timeSlot", "hrNumber", room, status)
         VALUES ($1, 'Tech Corp', 'Technical Round 1', $2, '10:00 AM - 11:00 AM', '+919999999991', 'Room A', 'SCHEDULED')
         RETURNING id`,
        [s1Id, tomorrow]
      );
      const interviewId = iRes.rows[0].id;
      if (t1.rows[0]) await client.query('INSERT INTO "InterviewTrainer" ("interviewId", "trainerId", "notifiedAt") VALUES ($1, $2, now()) ON CONFLICT DO NOTHING', [interviewId, t1.rows[0].id]);
      if (t2.rows[0]) await client.query('INSERT INTO "InterviewTrainer" ("interviewId", "trainerId", "notifiedAt") VALUES ($1, $2, now()) ON CONFLICT DO NOTHING', [interviewId, t2.rows[0].id]);
      await client.query(
        `INSERT INTO "QAEntry" ("studentId", question, answer, category, status) VALUES ($1, 'Tell me about yourself', 'I am a full stack developer...', 'HR', 'PREPARED')`,
        [s1Id]
      );
      console.log('Seed data created.');
    } else {
      console.log('Seed already applied.');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((e) => { console.error(e); process.exit(1); });
