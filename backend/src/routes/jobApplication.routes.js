import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireTrainerOrAdmin } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createJobApplicationSchema,
  updateJobApplicationRequestSchema,
  jobApplicationIdParamSchema,
  dailyQuerySchema,
  historyQuerySchema,
  studentsQuerySchema,
} from '../validators/jobApplication.validator.js';
import * as ctrl from '../controllers/jobApplication.controller.js';

const router = Router();

router.use(authMiddleware, requireTrainerOrAdmin);

router.get('/spocs', ctrl.listSpocs);
router.get('/students', validate(studentsQuerySchema), ctrl.listStudents);
router.get('/portals', ctrl.listPortals);
router.get('/daily', validate(dailyQuerySchema), ctrl.getDaily);
router.get('/', validate(historyQuerySchema), ctrl.listHistory);
router.post('/', validate(createJobApplicationSchema), ctrl.create);
router.put(
  '/:id',
  validate(updateJobApplicationRequestSchema),
  ctrl.update
);
router.delete('/:id', validate(jobApplicationIdParamSchema), ctrl.remove);

export default router;
