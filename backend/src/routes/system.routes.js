import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { success } from '../utils/response.utils.js';
import { getSmtpHealth } from '../config/nodemailer.js';
import { query } from '../config/db.js';

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

export default router;
