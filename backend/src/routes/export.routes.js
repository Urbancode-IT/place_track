import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireTrainerOrAdmin } from '../middleware/role.middleware.js';
import * as ctrl from '../controllers/export.controller.js';

const router = Router();

router.use(authMiddleware, requireTrainerOrAdmin);

router.get('/schedule/csv', ctrl.exportScheduleCsv);
router.get('/students/csv', ctrl.exportStudentsCsv);

export default router;
