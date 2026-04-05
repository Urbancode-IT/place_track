import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireTrainerOrAdmin } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { requestIdParamSchema } from '../validators/interviewFinishRequest.validator.js';
import * as ctrl from '../controllers/interviewFinishRequest.controller.js';

const router = Router();

router.use(authMiddleware, requireTrainerOrAdmin);

router.get('/', ctrl.list);
router.post('/:id/approve', validate(requestIdParamSchema), ctrl.approve);
router.post('/:id/reject', validate(requestIdParamSchema), ctrl.reject);

export default router;
