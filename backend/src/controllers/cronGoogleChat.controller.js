import crypto from 'crypto';
import { runGoogleChatBoardOnce } from '../jobs/googleChatBoard.job.js';

function cronSecretOk(req) {
  const expected = process.env.GOOGLE_CHAT_CRON_SECRET?.trim();
  if (!expected) return false;
  const got = String(req.get('x-cron-secret') ?? req.query?.secret ?? '');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(got, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Public URL for external schedulers (cron-job.org, UptimeRobot ping, etc.).
 * Render free tier sleeps — in-process 10 PM cron may not run; call this at 22:00 IST instead.
 *
 * Auth: header `x-cron-secret: <GOOGLE_CHAT_CRON_SECRET>` or `?secret=`
 */
export async function postGoogleChatBoardCron(req, res) {
  if (!process.env.GOOGLE_CHAT_CRON_SECRET?.trim()) {
    return res.status(503).json({
      success: false,
      message: 'Set GOOGLE_CHAT_CRON_SECRET in env to enable this endpoint',
    });
  }
  if (!cronSecretOk(req)) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  try {
    const result = await runGoogleChatBoardOnce();
    if (!result.ok) {
      return res.status(502).json({
        success: false,
        message: result.error || 'Google Chat send failed',
      });
    }
    return res.json({ success: true, message: 'Tomorrow board sent to Google Chat' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, message });
  }
}
