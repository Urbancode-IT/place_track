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

/**
 * GET /api/public/chat-actions/:kind/:id/:action?t=...
 * One-click Approve / Reject from Google Chat — single-use; both buttons expire after either is used.
 */
export async function handleChatAction(req, res) {
  const { kind, id, action } = req.params;
  const token = typeof req.query.t === 'string' ? req.query.t : '';

  try {
    if (!['finish', 'self'].includes(kind) || !['approve', 'reject'].includes(action)) {
      return sendHtml(res, 400, 'Invalid action', 'This approval link is not valid.', false);
    }
    if (!token) {
      return sendHtml(res, 400, 'Missing token', 'Open Approve or Reject from the Google Chat card.', false);
    }

    let payload;
    try {
      payload = verifyChatAction(token);
    } catch (e) {
      const expired = String(e?.message || '').toLowerCase().includes('expired');
      return sendHtml(
        res,
        403,
        expired ? 'Link expired' : 'Link invalid',
        expired
          ? 'This Chat Approve/Reject link has expired. Use PlaceTrack admin if still needed.'
          : 'Ask for a fresh Chat card, or approve from PlaceTrack admin.',
        false
      );
    }

    if (payload.kind !== kind || payload.id !== id || payload.action !== action) {
      return sendHtml(res, 403, 'Token mismatch', 'This approval link does not match the request.', false);
    }

    if (await isChatActionTokenUsed(token) || (await isChatActionRequestUsed(kind, id))) {
      return sendHtml(
        res,
        410,
        'Link expired',
        'This Chat action was already used. Approve and Reject buttons on that message no longer work.',
        false
      );
    }

    if (!(await requestStillPending(kind, id))) {
      await markChatActionUsed(token, kind, id, action).catch(() => {});
      return sendHtml(
        res,
        410,
        'Link expired',
        'This request was already approved or rejected. The Chat buttons are expired.',
        false
      );
    }

    if (kind === 'finish') {
      if (action === 'approve') {
        const result = await approveInterviewFinishRequest(id, null);
        await markChatActionUsed(token, kind, id, action);
        const label = result.proposedStatus || 'updated';
        return sendHtml(
          res,
          200,
          'Approved',
          `Interview outcome set to ${label}. This Chat link is now expired — you can close this tab.`,
          true
        );
      }
      await rejectInterviewFinishRequest(id, null);
      await markChatActionUsed(token, kind, id, action);
      return sendHtml(
        res,
        200,
        'Rejected',
        'Finish request rejected. This Chat link is now expired — you can close this tab.',
        true
      );
    }

    if (action === 'approve') {
      await approveStudentInterviewRequest(id, null, { trainerIds: [] });
      await markChatActionUsed(token, kind, id, action);
      return sendHtml(
        res,
        200,
        'Approved',
        'Interview added to the schedule. This Chat link is now expired — you can close this tab.',
        true
      );
    }
    await rejectStudentInterviewRequest(id, null);
    await markChatActionUsed(token, kind, id, action);
    return sendHtml(
      res,
      200,
      'Rejected',
      'Self-submit rejected. This Chat link is now expired — you can close this tab.',
      true
    );
  } catch (err) {
    const status = err instanceof AppError ? err.statusCode || 400 : 500;
    const already =
      err instanceof AppError &&
      /only submitted|already|not found/i.test(String(err.message || ''));
    if (already && token && kind && id) {
      await markChatActionUsed(token, kind, id, action).catch(() => {});
      return sendHtml(
        res,
        410,
        'Link expired',
        'This Chat action is no longer valid. The request was already handled.',
        false
      );
    }
    const msg =
      err instanceof AppError
        ? err.message
        : 'Something went wrong. Try again from PlaceTrack admin if needed.';
    console.error('[chat-action]', err);
    return sendHtml(res, status, status >= 500 ? 'Error' : 'Could not complete', msg, false);
  }
}
