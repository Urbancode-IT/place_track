import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/errorHandler.js';
import { validate } from '../middleware/validate.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { loginSchema, refreshSchema } from '../validators/auth.validator.js';
import * as ctrl from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', (_req, _res, next) => {
  next(new AppError('Trainer accounts are created by an admin.', 403));
});
router.post('/login', authLimiter, validate(loginSchema), ctrl.login);
router.post('/logout', ctrl.logout);
router.post('/refresh-token', authLimiter, validate(refreshSchema), ctrl.refreshToken);
router.get('/me', authMiddleware, ctrl.me);

export default router;
