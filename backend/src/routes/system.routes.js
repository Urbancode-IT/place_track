import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/role.middleware.js';
import { success } from '../utils/response.utils.js';
import { getSmtpHealth } from '../config/nodemailer.js';
import { query } from '../config/db.js';
import { sendToGoogleChat } from '../services/googleChat.service.js';
import { runGoogleChatBoardOnce } from '../jobs/googleChatBoard.job.js';

const router = Router();
router.use(authMiddleware);

/** Mail transport status (masked) + trainer rows missing email — why “mail varala” */
router.get('/mail-status', async (req, res, next) => {
  try {
    const mail = getSmtpHealth();
    let trainersWithoutEmail = null;
    if (req.user?.role === 'ADMIN') {
      const r = await query(
        `SELECT COUNT(*)::int as c FROM "User" WHERE role = 'TRAINER' AND (email IS NULL OR trim(email) = '')`
      );
      trainersWithoutEmail = r.rows[0]?.c ?? 0;
    }
    return success(res, { mail, trainersWithoutEmail });
  } catch (err) {
    next(err);
  }
});

/** Test Google Chat webhook (admin). Body: { "mode": "ping" | "board" } — default ping. */
router.post('/google-chat-test', requireAdmin, async (req, res, next) => {
  try {
    const mode = req.body?.mode === 'board' ? 'board' : 'ping';
    if (mode === 'board') {
      const result = await runGoogleChatBoardOnce();
      if (!result.ok) {
        return res.status(502).json({
          success: false,
          message: result.error || 'Google Chat send failed',
          data: { sent: false, error: result.error ?? null },
        });
      }
      return success(res, { sent: true }, 'Tomorrow board message sent');
    }
    const result = await sendToGoogleChat(
      `PlaceTrack ping — ${new Date().toISOString()}`
    );
    if (!result.ok) {
      return res.status(502).json({
        success: false,
        message: result.error || 'Google Chat send failed',
        data: { sent: false, error: result.error ?? null },
      });
    }
    return success(res, { sent: true }, 'Ping sent');
  } catch (err) {
    next(err);
  }
});

export default router;
