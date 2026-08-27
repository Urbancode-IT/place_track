import { verifyAccessToken } from '../utils/jwt.utils.js';
import { AppError } from './errorHandler.js';

export function authMiddleware(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    // Access token is Bearer-only (login returns JSON; refresh cookie is separate).
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) throw new AppError('Unauthorized', 401);
    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.userId, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    next(err.statusCode ? err : new AppError('Invalid or expired token', 401));
  }
}
