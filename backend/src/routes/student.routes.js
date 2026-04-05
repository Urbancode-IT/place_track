import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireTrainerOrAdmin } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { uploadResume } from '../middleware/upload.middleware.js';
import {
  createStudentSchema,
  updateStudentSchema,
  studentIdParamSchema,
  selfIntroSchema,
} from '../validators/student.validator.js';
import { createQaSchema } from '../validators/qa.validator.js';
import * as ctrl from '../controllers/student.controller.js';
import * as qaCtrl from '../controllers/qa.controller.js';
import { uploadResumeHandler } from '../controllers/upload.controller.js';

const router = Router();

router.use(authMiddleware, requireTrainerOrAdmin);

router.get('/', ctrl.list);
router.get('/:id', validate(studentIdParamSchema), ctrl.getById);
router.post('/', validate(createStudentSchema), ctrl.create);
router.put('/:id', validate(studentIdParamSchema.merge(updateStudentSchema)), ctrl.update);
router.delete('/:id', validate(studentIdParamSchema), ctrl.remove);
router.get('/:id/interviews', validate(studentIdParamSchema), ctrl.getInterviews);
router.get('/:id/qa', validate(studentIdParamSchema), ctrl.getQa);
router.post('/:id/qa', validate(studentIdParamSchema.merge(createQaSchema)), qaCtrl.create);
router.put('/:id/self-intro', validate(studentIdParamSchema.merge(selfIntroSchema)), ctrl.updateSelfIntro);
router.post('/:id/resume', validate(studentIdParamSchema), uploadResume, uploadResumeHandler);

export default router;
