import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireTrainerOrAdmin } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { updateQaSchema, qaIdParamSchema } from '../validators/qa.validator.js';
import * as ctrl from '../controllers/qa.controller.js';

const router = Router();

router.use(authMiddleware, requireTrainerOrAdmin);

router.put('/:id', validate(qaIdParamSchema.merge(updateQaSchema)), ctrl.update);
router.delete('/:id', validate(qaIdParamSchema), ctrl.remove);

export default router;
