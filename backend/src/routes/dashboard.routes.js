import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { protect, isStaff } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protect, isStaff);

router.get('/summary', dashboardController.getSummary);

export default router;
