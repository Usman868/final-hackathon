import { Router } from 'express';
import * as auditController from '../controllers/audit.controller.js';
import { protect, isAdmin } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(protect, isAdmin);
router.get('/', auditController.listAuditLogs);
export default router;
