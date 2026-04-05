import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import * as ctrl from '../controllers/push.controller.js';

const router = Router();

router.use(authMiddleware);

router.post('/register-token', ctrl.registerToken);
router.post('/unregister-token', ctrl.unregisterToken);

export default router;

