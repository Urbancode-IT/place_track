import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireTrainerOrAdmin } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createTrainerHonestReviewSchema } from '../validators/trainerHonestReview.validator.js';
import * as ctrl from '../controllers/trainerHonestReview.controller.js';

const router = Router();

router.use(authMiddleware, requireTrainerOrAdmin);

router.get('/', ctrl.list);
router.post('/', validate(createTrainerHonestReviewSchema), ctrl.create);

export default router;
