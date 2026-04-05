import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import * as ctrl from '../controllers/dashboard.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/pending-self-submits', ctrl.getPendingSelfSubmits);
router.get('/pending-interview-finishes', ctrl.getPendingInterviewFinishes);
router.get('/stats', ctrl.getStats);
router.get('/today', ctrl.getToday);
router.get('/activity', ctrl.getActivity);
router.get('/analytics', ctrl.getAnalytics);

export default router;
