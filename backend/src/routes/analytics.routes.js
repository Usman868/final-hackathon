import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller.js';
import { protect, isAdminOrSupervisor } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect, isAdminOrSupervisor);

router.get('/technicians', analyticsController.getTechnicianPerformance);
router.get('/overview', analyticsController.getAnalyticsOverview);

export default router;
