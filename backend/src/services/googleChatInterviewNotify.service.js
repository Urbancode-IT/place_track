import { query } from '../config/db.js';
import { sendToGoogleChat } from './googleChat.service.js';

const TZ = process.env.GOOGLE_CHAT_CRON_TZ || process.env.INTERVIEW_SCHEDULE_TZ || 'Asia/Kolkata';

/** True if interview calendar day matches “today” in TZ (e.g. India). */
export function isInterviewDateTodayInTz(dateValue) {
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(d.getTime())) return false;
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const interviewStr = d.toLocaleDateString('en-CA', { timeZone: TZ });
  return todayStr === interviewStr;
}

/**
 * Immediate Google Chat ping whenever an interview is saved with a date/time — not only “today”.
 * Set GOOGLE_CHAT_IMMEDIATE_NOTIFY=today to restrict to same-day interviews only.
 */
export async function notifyGoogleChatInterviewScheduled(interviewId) {
  if (!process.env.GOOGLE_CHAT_WEBHOOK_URL?.trim()) return;

  const mode = (process.env.GOOGLE_CHAT_IMMEDIATE_NOTIFY || 'all').trim().toLowerCase();
  if (mode === 'false' || mode === 'off' || mode === '0') return;

  const r = await query(
    `SELECT i.*, s.name as "studentName", s.course
     FROM "Interview" i
     JOIN "Student" s ON s.id = i."studentId"
     WHERE i.id = $1`,
    [interviewId]
  );
  const row = r.rows[0];
  if (!row) return;

  if (mode === 'today' && !isInterviewDateTodayInTz(row.date)) return;

  const tr = await query(
    `SELECT u.name FROM "InterviewTrainer" it
     JOIN "User" u ON u.id = it."trainerId"
     WHERE it."interviewId" = $1`,
    [interviewId]
  );
  const trainerNames = tr.rows.map((t) => t.name).join(', ') || 'Unassigned';

  const dateLabel = new Date(row.date).toLocaleDateString('en-IN', { timeZone: TZ });
  const isToday = isInterviewDateTodayInTz(row.date);
  const headline = isToday
    ? `*Today's interview — just scheduled* (${dateLabel})`
    : `*Interview scheduled* (${dateLabel})`;

  let msg = `${headline}\n\n`;
  msg += `• *${row.timeSlot}*: ${row.studentName} (${row.course}) - ${row.company}\n`;
  msg += `  _Round:_ ${row.round}\n`;
  msg += `  _Trainers:_ ${trainerNames}\n`;
  if (row.room) msg += `  _Room/Link:_ ${row.room}\n`;
  msg += `\n${process.env.FRONTEND_URL || 'http://localhost:5173'}`;

  const result = await sendToGoogleChat(msg);
  if (!result.ok) console.error('[google-chat] interview schedule notify failed:', result.error);
}

/** @deprecated use notifyGoogleChatInterviewScheduled */
export async function notifyGoogleChatTodaysInterviewIfApplicable(interviewId) {
  return notifyGoogleChatInterviewScheduled(interviewId);
}
