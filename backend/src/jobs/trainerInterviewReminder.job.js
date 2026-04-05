import cron from 'node-cron';
import { query } from '../config/db.js';
import { sendInterviewTrainerReminder } from '../services/email.service.js';
import { getInterviewStartAt } from '../utils/interviewStartAt.utils.js';

const REMINDER_TYPE = 'INTERVIEW_30MIN_REMINDER';
/** Minutes ± around “30 minutes before” to catch each interview once per minute cron */
const WINDOW_MIN = Math.min(15, Math.max(1, Number(process.env.TRAINER_REMINDER_WINDOW_MIN ?? 5)));

function formatStartLabel(startAt) {
  try {
    return startAt.toLocaleString('en-IN', {
      timeZone: process.env.INTERVIEW_SCHEDULE_TZ || 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return startAt.toISOString();
  }
}

export function runTrainerInterviewReminder() {
  if (process.env.TRAINER_REMINDER_ENABLED === '0' || process.env.TRAINER_REMINDER_ENABLED === 'false') {
    return;
  }
  cron.schedule('* * * * *', async () => {
    try {
      const r = await query(
        `SELECT i.*, s.name as "studentName"
         FROM "Interview" i
         JOIN "Student" s ON s.id = i."studentId"
         WHERE i.status IN ('SCHEDULED', 'RESCHEDULED')
           AND i.date >= now() - interval '6 hours'
           AND i.date <= now() + interval '48 hours'`
      );
      if (!r.rows.length) return;

      const interviewIds = r.rows.map((i) => i.id);
      const tr = await query(
        `SELECT it."interviewId", u.id, u.name, u.email
         FROM "InterviewTrainer" it
         JOIN "User" u ON u.id = it."trainerId"
         WHERE it."interviewId" = ANY($1::text[])`,
        [interviewIds]
      );
      const byInterview = {};
      for (const row of tr.rows) {
        if (!byInterview[row.interviewId]) byInterview[row.interviewId] = [];
        byInterview[row.interviewId].push(row);
      }

      const now = Date.now();
      const windowMs = WINDOW_MIN * 60 * 1000;
      const targetMs = 30 * 60 * 1000;

      for (const interview of r.rows) {
        const startAt = getInterviewStartAt(interview.date, interview.timeSlot);
        if (!startAt) continue;

        const delta = startAt.getTime() - now;
        if (delta <= 0) continue;
        if (delta < targetMs - windowMs || delta > targetMs + windowMs) continue;

        const trainers = byInterview[interview.id] || [];
        const dateLabel = formatStartLabel(startAt);

        for (const t of trainers) {
          if (!t.email) continue;

          const dup = await query(
            `SELECT 1 FROM "Notification" WHERE "interviewId" = $1 AND "toUserId" = $2 AND type = $3 LIMIT 1`,
            [interview.id, t.id, REMINDER_TYPE]
          );
          if (dup.rows.length) continue;

          const data = {
            studentName: interview.studentName,
            company: interview.company,
            round: interview.round,
            date: startAt.toISOString(),
            dateLabel,
            timeSlot: interview.timeSlot,
            hrNumber: interview.hrNumber || 'N/A',
            room: interview.room || 'N/A',
          };

          await sendInterviewTrainerReminder(t.email, t.name, data).catch((e) =>
            console.error('Trainer reminder email:', e?.message || e)
          );

          await query(
            `INSERT INTO "Notification" (type, message, channel, "toUserId", "interviewId", status)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              REMINDER_TYPE,
              `30 min reminder: ${interview.company} — ${interview.studentName}`,
              'EMAIL',
              t.id,
              interview.id,
              'SENT',
            ]
          );
        }
      }
    } catch (e) {
      console.error('trainerInterviewReminder job:', e);
    }
  });
}
