import { query } from '../config/db.js';
import { sendToGoogleChat, sendGoogleChatApprovalCard } from './googleChat.service.js';
import { signChatAction } from '../utils/chatActionToken.utils.js';
import { getPublicApiBaseUrl } from '../utils/publicApiUrl.utils.js';

const TZ = process.env.GOOGLE_CHAT_CRON_TZ || process.env.INTERVIEW_SCHEDULE_TZ || 'Asia/Kolkata';

function chatActionUrl(kind, id, action) {
  const token = signChatAction({ kind, id, action });
  return `${getPublicApiBaseUrl()}/api/public/chat-actions/${kind}/${id}/${action}?t=${encodeURIComponent(token)}`;
}

/** True if interview calendar day matches “today” in TZ (e.g. India). */
export function isInterviewDateTodayInTz(dateValue) {
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(d.getTime())) return false;
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const interviewStr = d.toLocaleDateString('en-CA', { timeZone: TZ });
  return todayStr === interviewStr;
}

/**
 * Immediate Google Chat ping whenever an interview is saved with a date/time.
 * Default behavior is same-day only (to avoid early alerts for future interviews).
 * Set GOOGLE_CHAT_IMMEDIATE_NOTIFY=all to notify for all dates.
 */
export async function notifyGoogleChatInterviewScheduled(interviewId) {
  if (!process.env.GOOGLE_CHAT_WEBHOOK_URL?.trim()) return;

  const mode = (process.env.GOOGLE_CHAT_IMMEDIATE_NOTIFY || 'today').trim().toLowerCase();
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

  const result = await sendToGoogleChat(msg);
  if (!result.ok) console.error('[google-chat] interview schedule notify failed:', result.error);
}

/** @deprecated use notifyGoogleChatInterviewScheduled */
export async function notifyGoogleChatTodaysInterviewIfApplicable(interviewId) {
  return notifyGoogleChatInterviewScheduled(interviewId);
}

const STATUS_LABEL = {
  SHORTLISTED: 'Shortlisted',
  SELECTED: 'Selected',
  REJECTED: 'Rejected',
  RESCHEDULED: 'Rescheduled',
  SCHEDULED: 'Scheduled',
  AWAITING_RESPONSE: 'Awaiting response',
  NO_RESPONSE: 'No response',
};

/**
 * Google Chat ping when an admin approves a trainer's submitted interview outcome
 * (Pending Interview Finishes → Approve), i.e. the interview status becomes final.
 */
export async function notifyGoogleChatInterviewOutcomeApproved(interviewId, proposedStatus) {
  if (!process.env.GOOGLE_CHAT_WEBHOOK_URL?.trim()) return;

  const r = await query(
    `SELECT i.*, s.name as "studentName", s.course
     FROM "Interview" i
     JOIN "Student" s ON s.id = i."studentId"
     WHERE i.id = $1`,
    [interviewId]
  );
  const row = r.rows[0];
  if (!row) return;

  const statusLabel = STATUS_LABEL[proposedStatus] || proposedStatus;
  const dateLabel = row.date ? new Date(row.date).toLocaleDateString('en-IN', { timeZone: TZ }) : '—';

  let msg = `*Interview outcome approved — ${statusLabel}*\n\n`;
  msg += `• ${row.studentName} (${row.course}) - ${row.company}\n`;
  msg += `  _Round:_ ${row.round}\n`;
  msg += `  _Date:_ ${dateLabel}${row.timeSlot ? ` · ${row.timeSlot}` : ''}\n`;

  const result = await sendToGoogleChat(msg);
  if (!result.ok) console.error('[google-chat] interview outcome approve notify failed:', result.error);
}

/**
 * Card with Approve / Reject when a finish outcome is waiting for placement review.
 */
export async function notifyGoogleChatFinishPendingApproval(finishRequestId) {
  if (!process.env.GOOGLE_CHAT_WEBHOOK_URL?.trim()) return;

  const r = await query(
    `SELECT f.id, f."proposedStatus", f.feedback, f."rescheduleDate", f."rescheduleTimeSlot",
            s.name as "studentName", s.course,
            i.company, i.round, i.date, i."timeSlot"
     FROM "InterviewFinishRequest" f
     JOIN "Student" s ON s.id = f."studentId"
     JOIN "Interview" i ON i.id = f."interviewId"
     WHERE f.id = $1 AND f.status = 'SUBMITTED'`,
    [finishRequestId]
  );
  const row = r.rows[0];
  if (!row) return;

  const statusLabel = STATUS_LABEL[row.proposedStatus] || row.proposedStatus;
  const dateLabel = row.date ? new Date(row.date).toLocaleDateString('en-IN', { timeZone: TZ }) : '—';
  const bodyLines = [
    `<b>Proposed:</b> ${statusLabel}`,
    `<b>Round:</b> ${row.round || '—'}`,
    `<b>When:</b> ${dateLabel}${row.timeSlot ? ` · ${row.timeSlot}` : ''}`,
  ];
  if (row.proposedStatus === 'RESCHEDULED' && row.rescheduleDate) {
    const rd = new Date(row.rescheduleDate).toLocaleDateString('en-IN', { timeZone: TZ });
    bodyLines.push(
      `<b>Reschedule:</b> ${rd}${row.rescheduleTimeSlot ? ` · ${row.rescheduleTimeSlot}` : ''}`
    );
  }
  if (row.feedback) {
    const fb = String(row.feedback).trim();
    if (fb) bodyLines.push(`<b>Feedback:</b> ${fb.slice(0, 280)}${fb.length > 280 ? '…' : ''}`);
  }

  try {
    const result = await sendGoogleChatApprovalCard({
      cardId: `finish-${row.id}`,
      headerTitle: 'Outcome — approval needed',
      headerSubtitle: `${row.studentName} (${row.course}) · ${row.company}`,
      bodyLines,
      approveUrl: chatActionUrl('finish', row.id, 'approve'),
      rejectUrl: chatActionUrl('finish', row.id, 'reject'),
    });
    if (!result.ok) console.error('[google-chat] finish pending notify failed:', result.error);
  } catch (e) {
    console.error('[google-chat] finish pending notify error:', e);
  }
}

/**
 * Card with Approve / Reject when a student self-submit is waiting for placement review.
 */
export async function notifyGoogleChatSelfSubmitPendingApproval(requestId) {
  if (!process.env.GOOGLE_CHAT_WEBHOOK_URL?.trim()) return;

  const r = await query(
    `SELECT r.id, r.company, r.round, r.date, r."timeSlot", r.room, r."hrNumber",
            s.name as "studentName", s.course
     FROM "StudentInterviewRequest" r
     JOIN "Student" s ON s.id = r."studentId"
     WHERE r.id = $1 AND r.status = 'SUBMITTED'`,
    [requestId]
  );
  const row = r.rows[0];
  if (!row) return;

  const dateLabel = row.date ? new Date(row.date).toLocaleDateString('en-IN', { timeZone: TZ }) : '—';
  const bodyLines = [
    `<b>Round:</b> ${row.round || '—'}`,
    `<b>When:</b> ${dateLabel}${row.timeSlot ? ` · ${row.timeSlot}` : ''}`,
  ];
  if (row.room) bodyLines.push(`<b>Room/Link:</b> ${row.room}`);
  if (row.hrNumber) bodyLines.push(`<b>HR:</b> ${row.hrNumber}`);
  bodyLines.push('<i>Approve adds it to the schedule (all trainers notified if none picked).</i>');

  try {
    const result = await sendGoogleChatApprovalCard({
      cardId: `self-${row.id}`,
      headerTitle: 'Self-submit — approval needed',
      headerSubtitle: `${row.studentName} (${row.course}) · ${row.company}`,
      bodyLines,
      approveUrl: chatActionUrl('self', row.id, 'approve'),
      rejectUrl: chatActionUrl('self', row.id, 'reject'),
    });
    if (!result.ok) console.error('[google-chat] self-submit pending notify failed:', result.error);
  } catch (e) {
    console.error('[google-chat] self-submit pending notify error:', e);
  }
}
