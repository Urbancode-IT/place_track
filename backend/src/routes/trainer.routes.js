import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireAdmin, requireTrainerOrAdmin } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { trainerIdParamSchema, createTrainerSchema } from '../validators/trainer.validator.js';
import * as ctrl from '../controllers/trainer.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', requireTrainerOrAdmin, ctrl.list);
router.post('/', requireAdmin, validate(createTrainerSchema), ctrl.create);
router.post('/:id/allow', requireAdmin, validate(trainerIdParamSchema), ctrl.allow);
router.post('/:id/reject', requireAdmin, validate(trainerIdParamSchema), ctrl.reject);
router.post('/:id/revoke', requireAdmin, validate(trainerIdParamSchema), ctrl.revoke);
router.delete('/:id', requireAdmin, validate(trainerIdParamSchema), ctrl.remove);
router.get('/:id/interviews', validate(trainerIdParamSchema), ctrl.getInterviews);
router.post('/:id/notify', validate(trainerIdParamSchema), ctrl.notifyTrainer);

export default router;
