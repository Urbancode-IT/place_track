import cron from 'node-cron';
import { query } from '../config/db.js';
import { sendDailySummary } from '../services/email.service.js';
import { sendPushToUsers } from '../services/push.service.js';

export function runDailyReminder() {
  cron.schedule('0 8 * * *', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = new Date(tomorrow);
    start.setHours(0, 0, 0, 0);
    const end = new Date(tomorrow);
    end.setHours(23, 59, 59, 999);
    const r = await query(
      `SELECT i.*, s.name as "s_name" FROM "Interview" i JOIN "Student" s ON s.id = i."studentId" WHERE i.date >= $1 AND i.date <= $2`,
      [start, end]
    );
    const interviewIds = r.rows.map((i) => i.id);
    const tr = interviewIds.length
      ? await query(
          `SELECT it."interviewId", u.id, u.name, u.email FROM "InterviewTrainer" it JOIN "User" u ON u.id = it."trainerId" WHERE it."interviewId" = ANY($1)`,
          [interviewIds]
        )
      : { rows: [] };
    const trainersByI = {};
    for (const t of tr.rows) {
      if (!trainersByI[t.interviewId]) trainersByI[t.interviewId] = [];
      trainersByI[t.interviewId].push(t);
    }
    const rows = r.rows
      .map((i) => `<tr><td>${i.s_name}</td><td>${i.company}</td><td>${i.round}</td><td>${i.timeSlot}</td><td>${(trainersByI[i.id] || []).map((t) => t.name).join(', ')}</td></tr>`)
      .join('');
    const content = `<table border="1"><tr><th>Student</th><th>Company</th><th>Round</th><th>Time</th><th>Trainers</th></tr>${rows}</table>`;
    const trainerEmails = [...new Set(tr.rows.map((t) => t.email).filter(Boolean))];
    for (const email of trainerEmails) {
      await sendDailySummary(email, content).catch(() => {});
    }

    const trainerIds = [...new Set(tr.rows.map((t) => t.id).filter(Boolean))];
    if (trainerIds.length) {
      await sendPushToUsers(trainerIds, {
        title: 'Deadline Reminder',
        body: 'You have interview tasks scheduled for tomorrow.',
        link: process.env.FRONTEND_URL || 'http://localhost:5173',
        data: { type: 'DEADLINE_REMINDER' },
      }).catch(() => {});
    }
  });
}
