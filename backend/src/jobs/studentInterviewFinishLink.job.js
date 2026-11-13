import cron from 'node-cron';
import { query } from '../config/db.js';
import { sendStudentInterviewFinishLink } from '../services/email.service.js';
import { getInterviewEndAt, getInterviewStartAt } from '../utils/interviewStartAt.utils.js';
import { getPublicFrontendUrl } from '../utils/frontendUrl.utils.js';

const NOTIF_TYPE = 'STUDENT_INTERVIEW_FINISH_LINK';

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

/**
 * Once per interview: only AFTER the time slot has ended (+ small buffer),
 * email the student the public finish form. Never before the interview ends.
 */
export function runStudentInterviewFinishLink() {
  if (
    process.env.STUDENT_FINISH_LINK_ENABLED === '0' ||
    process.env.STUDENT_FINISH_LINK_ENABLED === 'false'
  ) {
    return;
  }

  cron.schedule('* * * * *', async () => {
    try {
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

        // Hard rule: never before the interview slot is over
        const sendAt = endAt.getTime() + afterEndMs;
        if (now < sendAt) continue;
        if (now - sendAt > catchupMs) continue;

        const pendingFinish = await query(
          `SELECT 1 FROM "InterviewFinishRequest"
           WHERE "interviewId" = $1 AND status IN ('PENDING', 'APPROVED')
           LIMIT 1`,
          [interview.id]
        );
        if (pendingFinish.rows.length) continue;

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

        await sendStudentInterviewFinishLink(email, interview.studentName, {
          company: interview.company,
          round: interview.round,
          date: (startAt || endAt).toISOString(),
          dateLabel,
          timeSlot: interview.timeSlot,
          finishUrl,
        }).catch((e) => console.error('Student finish-link email:', e?.message || e));

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
      }
    } catch (e) {
      console.error('studentInterviewFinishLink job:', e);
    }
  });
}
