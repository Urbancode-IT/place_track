import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireTrainerOrAdmin } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { z } from 'zod';
import {
  createInterviewSchema,
  updateInterviewSchema,
  updateStatusSchema,
  interviewIdParamSchema,
  trainersBodySchema,
} from '../validators/interview.validator.js';
import * as ctrl from '../controllers/interview.controller.js';

const router = Router();

router.use(authMiddleware, requireTrainerOrAdmin);

router.get('/', ctrl.list);
router.get('/:id', validate(interviewIdParamSchema), ctrl.getById);
router.post('/', validate(createInterviewSchema), ctrl.create);
router.put('/:id', validate(interviewIdParamSchema.merge(updateInterviewSchema)), ctrl.update);
router.delete('/:id', validate(interviewIdParamSchema), ctrl.remove);
router.patch('/:id/status', validate(interviewIdParamSchema.merge(updateStatusSchema)), ctrl.updateStatus);
router.post('/:id/trainers', validate(interviewIdParamSchema.merge(trainersBodySchema)), ctrl.addTrainers);
router.delete('/:id/trainers/:trainerId', validate(interviewIdParamSchema.merge(z.object({ trainerId: z.string().uuid() }))), ctrl.removeTrainer);

export default router;
