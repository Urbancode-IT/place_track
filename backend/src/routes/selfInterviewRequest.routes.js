import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireTrainerOrAdmin } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createLinkSchema,
  listRequestsQuerySchema,
  requestIdParamSchema,
  approveRequestSchema,
} from '../validators/studentInterviewRequest.validator.js';
import * as ctrl from '../controllers/studentInterviewRequest.controller.js';

const router = Router();

router.use(authMiddleware, requireTrainerOrAdmin);

router.post('/', validate(createLinkSchema), ctrl.createLink);
router.get('/', validate(listRequestsQuerySchema), ctrl.list);
router.post('/:id/approve', validate(requestIdParamSchema.merge(approveRequestSchema)), ctrl.approve);
router.post('/:id/reject', validate(requestIdParamSchema), ctrl.reject);

export default router;
