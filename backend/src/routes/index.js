import { Router } from 'express';
import authRoutes from './auth.routes.js';
import studentRoutes from './student.routes.js';
import interviewRoutes from './interview.routes.js';
import trainerRoutes from './trainer.routes.js';
import notificationRoutes from './notification.routes.js';
import pushRoutes from './push.routes.js';
import qaRoutes from './qa.routes.js';
import uploadRoutes from './upload.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import exportRoutes from './export.routes.js';
import publicRoutes from './public.routes.js';
import selfInterviewRequestRoutes from './selfInterviewRequest.routes.js';
import interviewFinishRequestRoutes from './interviewFinishRequest.routes.js';
import honestReviewRoutes from './honestReview.routes.js';
import systemRoutes from './system.routes.js';

const router = Router();

router.use('/public', publicRoutes);
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/interviews', interviewRoutes);
router.use('/trainers', trainerRoutes);
router.use('/notifications', notificationRoutes);
router.use('/push', pushRoutes);
router.use('/qa', qaRoutes);
router.use('/upload', uploadRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/export', exportRoutes);
router.use('/self-interview-requests', selfInterviewRequestRoutes);
router.use('/interview-finish-requests', interviewFinishRequestRoutes);
router.use('/honest-review', honestReviewRoutes);
router.use('/system', systemRoutes);

export default router;
