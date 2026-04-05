import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { testInterviewEmailSchema } from '../validators/notification.validator.js';
import * as ctrl from '../controllers/notification.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', ctrl.list);
router.patch('/read-all', ctrl.readAll);
router.get('/settings', ctrl.getSettings);
router.put('/settings', ctrl.updateSettings);
router.post('/trigger', ctrl.trigger);
router.post(
  '/test-interview-email',
  requireAdmin,
  validate(testInterviewEmailSchema),
  ctrl.testInterviewEmail
);

export default router;
