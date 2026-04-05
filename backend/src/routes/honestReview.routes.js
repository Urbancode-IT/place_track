import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireTrainerOrAdmin } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { studentHonestReviewListQuerySchema } from '../validators/honestReview.validator.js';
import * as listCtrl from '../controllers/studentHonestReview.controller.js';

const router = Router();

router.use(authMiddleware, requireTrainerOrAdmin);

router.get('/recent', listCtrl.listRecent);
router.get('/', validate(studentHonestReviewListQuerySchema), listCtrl.listByStudent);

export default router;
