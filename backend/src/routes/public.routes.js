import { Router } from 'express';
import { validate } from '../middleware/validate.middleware.js';
import {
  tokenParamSchema,
  publicSubmitSchema,
  publicApplySchema,
} from '../validators/studentInterviewRequest.validator.js';
import * as ctrl from '../controllers/publicStudentInterview.controller.js';
import * as applyCtrl from '../controllers/publicInterviewApply.controller.js';
import { publicFinishApplySchema, publicFinishPreviewSchema } from '../validators/interviewFinishRequest.validator.js';
import * as finishCtrl from '../controllers/publicInterviewFinish.controller.js';
import {
  honestReviewTokenParamSchema,
  publicHonestReviewSubmitSchema,
  publicHonestReviewCommonSubmitSchema,
} from '../validators/honestReview.validator.js';
import * as honestCtrl from '../controllers/publicHonestReview.controller.js';
import { createStudentSchema } from '../validators/student.validator.js';
import { publicCreateStudent } from '../controllers/publicStudent.controller.js';

const router = Router();

router.post('/students', validate(createStudentSchema), publicCreateStudent);

router.post('/interview-finish/preview', validate(publicFinishPreviewSchema), finishCtrl.previewFinish);
router.post('/interview-finish/apply', validate(publicFinishApplySchema), finishCtrl.applyFinishOpen);
router.post('/self-interview/apply', validate(publicApplySchema), applyCtrl.applyOpen);
router.get('/self-interview/:token', validate(tokenParamSchema), ctrl.getByToken);
router.put(
  '/self-interview/:token',
  validate(tokenParamSchema.merge(publicSubmitSchema)),
  ctrl.submitByToken
);

router.get('/honest-review/common', honestCtrl.getCommonMeta);
router.post(
  '/honest-review/common',
  validate(publicHonestReviewCommonSubmitSchema),
  honestCtrl.submitCommon
);

router.get('/honest-review/:token', validate(honestReviewTokenParamSchema), honestCtrl.getByToken);
router.post(
  '/honest-review/:token',
  validate(honestReviewTokenParamSchema.merge(publicHonestReviewSubmitSchema)),
  honestCtrl.submitByToken
);

export default router;
