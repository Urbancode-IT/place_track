import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireTrainerOrAdmin } from '../middleware/role.middleware.js';
import { uploadResume, uploadPhoto } from '../middleware/upload.middleware.js';
import { uploadResumeHandler, uploadPhotoHandler } from '../controllers/upload.controller.js';

const router = Router();

router.use(authMiddleware, requireTrainerOrAdmin);

router.post('/resume', uploadResume, uploadResumeHandler);
router.post('/photo', uploadPhoto, uploadPhotoHandler);

export default router;
