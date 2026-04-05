import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { trainerIdParamSchema, createTrainerSchema } from '../validators/trainer.validator.js';
import * as ctrl from '../controllers/trainer.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', requireAdmin, ctrl.list);
router.post('/', requireAdmin, validate(createTrainerSchema), ctrl.create);
router.get('/:id/interviews', validate(trainerIdParamSchema), ctrl.getInterviews);
router.post('/:id/notify', validate(trainerIdParamSchema), ctrl.notifyTrainer);

export default router;
