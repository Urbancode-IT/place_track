import cron from 'node-cron';
import { query } from '../config/db.js';
import {
  sendStudentInterviewFinishLink,
  sendStudentInterviewFinishReminder,
} from '../services/email.service.js';
import { getInterviewEndAt, getInterviewStartAt } from '../utils/interviewStartAt.utils.js';
import { getPublicFrontendUrl } from '../utils/frontendUrl.utils.js';

const NOTIF_TYPE = 'STUDENT_INTERVIEW_FINISH_LINK';
const REMINDER_TYPE = 'STUDENT_INTERVIEW_FINISH_REMINDER';

/**
 * Extra minutes AFTER the slot ends before mailing (default 5).
 * Never sends while the interview window is still open.
 */
const AFTER_END_MIN = Math.min(
  120,
  Math.max(0, Number(process.env.STUDENT_FINISH_LINK_AFTER_END_MIN ?? 5))
);
/** If the server was down, still send once within this many hours after end. */
const CATCHUP_HOURS = Math.min(
  24,
  Math.max(1, Number(process.env.STUDENT_FINISH_LINK_CATCHUP_HOURS ?? 8))
);
/** Hours after first finish-link email before reminder (default 2). */
const REMINDER_HOURS = Math.min(
  48,
  Math.max(1, Number(process.env.STUDENT_FINISH_REMINDER_HOURS ?? 2))
);
const REMINDER_CATCHUP_HOURS = Math.min(
  72,
  Math.max(REMINDER_HOURS + 1, Number(process.env.STUDENT_FINISH_REMINDER_CATCHUP_HOURS ?? 24))
);

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

function buildPublicUrl(path, email, company) {
  const base = getPublicFrontendUrl().replace(/\/$/, '');
  const params = new URLSearchParams();
  if (email) params.set('email', email);
  if (company) params.set('company', company);
  const q = params.toString();
  return q ? `${base}${path}?${q}` : `${base}${path}`;
}

async function hasFinishSubmission(interviewId) {
  const r = await query(
    `SELECT 1 FROM "InterviewFinishRequest"
     WHERE "interviewId" = $1 AND status IN ('SUBMITTED', 'APPROVED')
     LIMIT 1`,
    [interviewId]
  );
  return r.rows.length > 0;
}

/**
 * Once per interview: only AFTER the time slot has ended (+ small buffer),
 * email the student the public finish form. Never before the interview ends.
 *
 * Also: if first mail was sent and student still has not submitted after
 * REMINDER_HOURS (default 2), send one reminder email.
 */
export function runStudentInterviewFinishLink() {
  if (
    process.env.STUDENT_FINISH_LINK_ENABLED === '0' ||
    process.env.STUDENT_FINISH_LINK_ENABLED === 'false'
  ) {
    console.warn('[finish-link] disabled (STUDENT_FINISH_LINK_ENABLED=false)');
    return;
  }

  console.log(
    `[finish-link] cron every minute — after end +${AFTER_END_MIN}m, default duration ${process.env.INTERVIEW_DEFAULT_DURATION_MIN || 60}m, catchup ${CATCHUP_HOURS}h`
  );

  cron.schedule('* * * * *', async () => {
    try {
      await sendFirstFinishLinks();
      await sendFinishReminders();
    } catch (e) {
      console.error('studentInterviewFinishLink job:', e);
    }
  });
}

async function sendFirstFinishLinks() {
  const r = await query(
    `SELECT i.*, s.name as "studentName", s.email as "studentEmail"
     FROM "Interview" i
     JOIN "Student" s ON s.id = i."studentId"
     WHERE i.status IN ('SCHEDULED', 'RESCHEDULED')
       AND s.email IS NOT NULL
       AND btrim(s.email) <> ''
       AND i.date >= now() - interval '36 hours'
       AND i.date <= now() + interval '6 hours'`
  );
  if (!r.rows.length) return;

  const now = Date.now();
  const afterEndMs = AFTER_END_MIN * 60 * 1000;
  const catchupMs = CATCHUP_HOURS * 60 * 60 * 1000;

  for (const interview of r.rows) {
    const startAt = getInterviewStartAt(interview.date, interview.timeSlot);
    const endAt = getInterviewEndAt(interview.date, interview.timeSlot);
    if (!endAt) continue;

    const sendAt = endAt.getTime() + afterEndMs;
    if (now < sendAt) continue;
    if (now - sendAt > catchupMs) continue;

    if (await hasFinishSubmission(interview.id)) continue;

    const dup = await query(
      `SELECT 1 FROM "Notification"
       WHERE "interviewId" = $1 AND type = $2
       LIMIT 1`,
      [interview.id, NOTIF_TYPE]
    );
    if (dup.rows.length) continue;

    const email = String(interview.studentEmail || '').trim();
    if (!email) continue;

    const dateLabel = formatStartLabel(startAt || endAt);
    const finishUrl = buildPublicUrl('/interview/finish', email, interview.company);
    const questionsUrl = buildPublicUrl('/interview/questions', email, interview.company);

    let info = null;
    try {
      info = await sendStudentInterviewFinishLink(email, interview.studentName, {
        company: interview.company,
        round: interview.round,
        date: (startAt || endAt).toISOString(),
        dateLabel,
        timeSlot: interview.timeSlot,
        finishUrl,
        questionsUrl,
      });
    } catch (e) {
      console.error('Student finish-link email:', e?.message || e);
      continue;
    }
    // Do not mark as sent if SMTP failed — otherwise cron never retries
    if (!info) {
      console.warn(
        `[finish-link] SMTP failed for ${email} / ${interview.company} — will retry`
      );
      continue;
    }

    try {
      await query(
        `INSERT INTO "Notification" (type, message, channel, "toUserId", "interviewId", status)
         VALUES ($1, $2, $3, NULL, $4, $5)`,
        [
          NOTIF_TYPE,
          `Finish link mailed: ${interview.company} — ${interview.studentName}`,
          'EMAIL',
          interview.id,
          'SENT',
        ]
      );
      console.log(
        `[finish-link] sent → ${email} · ${interview.company} · end=${endAt.toISOString()}`
      );
    } catch (e) {
      console.error('[finish-link] Notification insert failed (mail already sent):', e?.message || e);
    }
  }
}

/** First mail + 2h, still no finish submit → one reminder */
async function sendFinishReminders() {
  if (
    process.env.STUDENT_FINISH_REMINDER_ENABLED === '0' ||
    process.env.STUDENT_FINISH_REMINDER_ENABLED === 'false'
  ) {
    return;
  }

  const r = await query(
    `SELECT n."interviewId", n."sentAt",
            i.company, i.round, i.date, i."timeSlot", i.status,
            s.name as "studentName", s.email as "studentEmail"
     FROM "Notification" n
     JOIN "Interview" i ON i.id = n."interviewId"
     JOIN "Student" s ON s.id = i."studentId"
     WHERE n.type = $1
       AND n."sentAt" <= now() - make_interval(hours => $2)
       AND n."sentAt" >= now() - make_interval(hours => $3)
       AND i.status IN ('SCHEDULED', 'RESCHEDULED')
       AND s.email IS NOT NULL
       AND btrim(s.email) <> ''
       AND NOT EXISTS (
         SELECT 1 FROM "Notification" r
         WHERE r."interviewId" = n."interviewId" AND r.type = $4
       )
       AND NOT EXISTS (
         SELECT 1 FROM "InterviewFinishRequest" f
         WHERE f."interviewId" = n."interviewId"
           AND f.status IN ('SUBMITTED', 'APPROVED')
       )`,
    [NOTIF_TYPE, REMINDER_HOURS, REMINDER_CATCHUP_HOURS, REMINDER_TYPE]
  );

  for (const row of r.rows) {
    const email = String(row.studentEmail || '').trim();
    if (!email) continue;

    const startAt = getInterviewStartAt(row.date, row.timeSlot);
    const endAt = getInterviewEndAt(row.date, row.timeSlot);
    const dateLabel = formatStartLabel(startAt || endAt || new Date(row.sentAt));
    const finishUrl = buildPublicUrl('/interview/finish', email, row.company);
    const questionsUrl = buildPublicUrl('/interview/questions', email, row.company);

    let info = null;
    try {
      info = await sendStudentInterviewFinishReminder(email, row.studentName, {
        company: row.company,
        round: row.round,
        dateLabel,
        timeSlot: row.timeSlot,
        finishUrl,
        questionsUrl,
      });
    } catch (e) {
      console.error('Student finish reminder email:', e?.message || e);
      continue;
    }
    if (!info) {
      console.warn(`[finish-link] reminder SMTP failed for ${email} — will retry`);
      continue;
    }

    try {
      await query(
        `INSERT INTO "Notification" (type, message, channel, "toUserId", "interviewId", status)
         VALUES ($1, $2, $3, NULL, $4, $5)`,
        [
          REMINDER_TYPE,
          `Finish reminder mailed: ${row.company} — ${row.studentName}`,
          'EMAIL',
          row.interviewId,
          'SENT',
        ]
      );
      console.log(`[finish-link] reminder sent → ${email} · ${row.company}`);
    } catch (e) {
      console.error('[finish-link] reminder Notification insert failed:', e?.message || e);
    }
  }
}
