import { verifyChatAction } from '../utils/chatActionToken.utils.js';
import {
  approveInterviewFinishRequest,
  rejectInterviewFinishRequest,
} from '../services/interviewFinishApproval.service.js';
import {
  approveStudentInterviewRequest,
  rejectStudentInterviewRequest,
} from '../services/studentInterviewApproval.service.js';
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

/**
 * GET /api/public/chat-actions/:kind/:id/:action?t=...
 * One-click Approve / Reject from Google Chat card buttons (no PlaceTrack login).
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
    } catch {
      return sendHtml(
        res,
        403,
        'Link expired or invalid',
        'Ask for a fresh Chat card, or approve from PlaceTrack admin.',
        false
      );
    }

    if (payload.kind !== kind || payload.id !== id || payload.action !== action) {
      return sendHtml(res, 403, 'Token mismatch', 'This approval link does not match the request.', false);
    }

    if (kind === 'finish') {
      if (action === 'approve') {
        const result = await approveInterviewFinishRequest(id, null);
        const label = result.proposedStatus || 'updated';
        return sendHtml(
          res,
          200,
          'Approved',
          `Interview outcome set to ${label}. You can close this tab.`,
          true
        );
      }
      await rejectInterviewFinishRequest(id, null);
      return sendHtml(res, 200, 'Rejected', 'Finish request rejected. Interview unchanged. You can close this tab.', true);
    }

    // self
    if (action === 'approve') {
      await approveStudentInterviewRequest(id, null, { trainerIds: [] });
      return sendHtml(
        res,
        200,
        'Approved',
        'Interview added to the schedule. Trainers notified. You can close this tab.',
        true
      );
    }
    await rejectStudentInterviewRequest(id, null);
    return sendHtml(res, 200, 'Rejected', 'Self-submit rejected. You can close this tab.', true);
  } catch (err) {
    const status = err instanceof AppError ? err.statusCode || 400 : 500;
    const msg =
      err instanceof AppError
        ? err.message
        : 'Something went wrong. Try again from PlaceTrack admin if needed.';
    console.error('[chat-action]', err);
    return sendHtml(res, status, status >= 500 ? 'Error' : 'Could not complete', msg, false);
  }
}
