import { verifyAccessToken } from '../utils/jwt.utils.js';
import { query } from '../config/db.js';
import { AppError } from './errorHandler.js';

export const TRAINER_NOT_ALLOWED_MESSAGE =
  'This trainer account is not admitted. An admin must admit it before you can sign in.';

export async function authMiddleware(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    // Access token is Bearer-only (login returns JSON; refresh cookie is separate).
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) throw new AppError('Unauthorized', 401);
    const decoded = verifyAccessToken(token);
    const r = await query(
      'SELECT id, email, role, allowed FROM "User" WHERE id = $1',
      [decoded.userId]
    );
    const user = r.rows[0];
    if (!user) throw new AppError('Unauthorized', 401);
    if (user.role === 'TRAINER' && user.allowed !== true) {
      throw new AppError(TRAINER_NOT_ALLOWED_MESSAGE, 403);
    }
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      allowed: user.allowed === true,
    };
    next();
  } catch (err) {
    if (err?.statusCode) return next(err);
    const name = err?.name;
    if (name === 'TokenExpiredError' || name === 'JsonWebTokenError' || name === 'NotBeforeError') {
      return next(new AppError('Invalid or expired token', 401));
    }
    next(err);
  }
}
