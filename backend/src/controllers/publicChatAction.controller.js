import { verifyChatAction } from '../utils/chatActionToken.utils.js';
import {
  approveInterviewFinishRequest,
  rejectInterviewFinishRequest,
} from '../services/interviewFinishApproval.service.js';
import {
  approveStudentInterviewRequest,
  rejectStudentInterviewRequest,
} from '../services/studentInterviewApproval.service.js';
import {
  isChatActionRequestUsed,
  isChatActionTokenUsed,
  markChatActionUsed,
} from '../services/chatActionUse.service.js';
import { sendToGoogleChat } from '../services/googleChat.service.js';
import { query } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

function htmlPage(title, message, ok) {
  const color = ok ? '#166534' : '#991b1b';
  const bg = ok ? '#f0fdf4' : '#fef2f2';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center;
      font-family: system-ui, sans-serif; background: ${bg}; color: ${color}; }
    main { text-align: center; padding: 2rem; max-width: 28rem; }
    h1 { font-size: 1.35rem; margin: 0 0 0.5rem; }
    p { margin: 0; opacity: 0.9; line-height: 1.45; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
  </main>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sendHtml(res, status, title, message, ok) {
  res.status(status).type('html').send(htmlPage(title, message, ok));
}

async function requestStillPending(kind, id) {
  if (kind === 'finish') {
    const r = await query(`SELECT status FROM "InterviewFinishRequest" WHERE id = $1`, [id]);
    return r.rows[0]?.status === 'SUBMITTED';
  }
  const r = await query(`SELECT status FROM "StudentInterviewRequest" WHERE id = $1`, [id]);
  return r.rows[0]?.status === 'SUBMITTED';
}

async function loadFinishLabel(id) {
  const r = await query(
    `SELECT f."proposedStatus", s.name as "studentName", i.company
     FROM "InterviewFinishRequest" f
     JOIN "Student" s ON s.id = f."studentId"
     JOIN "Interview" i ON i.id = f."interviewId"
     WHERE f.id = $1`,
    [id]
  );
  return r.rows[0] || null;
}

async function loadSelfLabel(id) {
  const r = await query(
    `SELECT r.company, r.round, r."timeSlot", s.name as "studentName"
     FROM "StudentInterviewRequest" r
     JOIN "Student" s ON s.id = r."studentId"
     WHERE r.id = $1`,
    [id]
  );
  return r.rows[0] || null;
}

/** One Chat confirmation only (no second schedule/outcome ping). */
async function postOneChatResult(text) {
  const result = await sendToGoogleChat(text);
  if (!result.ok) console.error('[chat-action] result notify failed:', result.error);
}

/**
 * GET /api/public/chat-actions/:kind/:id/:action?t=...
 * Approve/Reject from Chat — single-use; one confirmation message in Chat after click.
 */
export async function handleChatAction(req, res) {
  const { kind, id, action } = req.params;
  const token = typeof req.query.t === 'string' ? req.query.t : '';

  try {
    if (!['finish', 'self'].includes(kind) || !['approve', 'reject'].includes(action)) {
      return sendHtml(res, 400, 'Invalid', 'This link is not valid.', false);
    }
    if (!token) {
      return sendHtml(res, 400, 'Missing token', 'Use Approve or Reject from the Google Chat card.', false);
    }

    let payload;
    try {
      payload = verifyChatAction(token);
    } catch (e) {
      const expired = String(e?.message || '').toLowerCase().includes('expired');
      return sendHtml(
        res,
        403,
        expired ? 'Expired' : 'Invalid',
        expired
          ? 'This Chat link has expired.'
          : 'This Chat link is invalid.',
        false
      );
    }

    if (payload.kind !== kind || payload.id !== id || payload.action !== action) {
      return sendHtml(res, 403, 'Invalid', 'This link does not match the request.', false);
    }

    if (await isChatActionTokenUsed(token) || (await isChatActionRequestUsed(kind, id))) {
      return sendHtml(res, 410, 'Expired', 'Already used. Chat buttons for this request are expired.', false);
    }

    if (!(await requestStillPending(kind, id))) {
      await markChatActionUsed(token, kind, id, action).catch(() => {});
      return sendHtml(res, 410, 'Expired', 'Already handled. Chat buttons are expired.', false);
    }

    if (kind === 'finish') {
      const meta = await loadFinishLabel(id);
      if (action === 'approve') {
        const result = await approveInterviewFinishRequest(id, null, { skipGoogleChatNotify: true });
        await markChatActionUsed(token, kind, id, action);
        const label = result.proposedStatus || meta?.proposedStatus || 'updated';
        const who = meta ? `${meta.studentName} · ${meta.company}` : id;
        await postOneChatResult(`*Approved* — ${who}\nOutcome: ${label}`);
        return sendHtml(res, 200, 'Approved', `Approved — ${label}. You can close this tab.`, true);
      }
      await rejectInterviewFinishRequest(id, null);
      await markChatActionUsed(token, kind, id, action);
      const who = meta ? `${meta.studentName} · ${meta.company}` : id;
      await postOneChatResult(`*Rejected* — ${who}\nFinish request not applied.`);
      return sendHtml(res, 200, 'Rejected', 'Rejected. You can close this tab.', true);
    }

    const meta = await loadSelfLabel(id);
    const who = meta
      ? `${meta.studentName} · ${meta.company}${meta.timeSlot ? ` · ${meta.timeSlot}` : ''}`
      : id;

    if (action === 'approve') {
      await approveStudentInterviewRequest(id, null, {
        trainerIds: [],
        skipGoogleChatNotify: true,
      });
      await markChatActionUsed(token, kind, id, action);
      await postOneChatResult(`*Approved* — ${who}\nAdded to the interview schedule.`);
      return sendHtml(res, 200, 'Approved', 'Approved — on the schedule. You can close this tab.', true);
    }

    await rejectStudentInterviewRequest(id, null);
    await markChatActionUsed(token, kind, id, action);
    await postOneChatResult(`*Rejected* — ${who}\nSelf-submit not added to the schedule.`);
    return sendHtml(res, 200, 'Rejected', 'Rejected. You can close this tab.', true);
  } catch (err) {
    const status = err instanceof AppError ? err.statusCode || 400 : 500;
    const already =
      err instanceof AppError &&
      /only submitted|already|not found/i.test(String(err.message || ''));
    if (already && token && kind && id) {
      await markChatActionUsed(token, kind, id, action).catch(() => {});
      return sendHtml(res, 410, 'Expired', 'Already handled. Chat buttons are expired.', false);
    }
    const msg =
      err instanceof AppError
        ? err.message
        : 'Something went wrong. Try PlaceTrack admin if needed.';
    console.error('[chat-action]', err);
    return sendHtml(res, status, status >= 500 ? 'Error' : 'Failed', msg, false);
  }
}
