import { Router } from 'express';
import * as maintenanceController from '../controllers/maintenance.controller.js';
import { protect, isStaff, isAdminOrSupervisor } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { body, param, query } from 'express-validator';

const router = Router();
router.use(protect, isStaff);

router.get(
  '/',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validate,
  maintenanceController.listSchedules
);

router.get(
  '/:id',
  param('id').isMongoId(),
  validate,
  maintenanceController.getSchedule
);

router.post(
  '/',
  isAdminOrSupervisor,
  body('asset').isMongoId(),
  body('title').trim().notEmpty().isLength({ max: 200 }),
  body('scheduledDate').isISO8601(),
  body('frequency').optional().isString(),
  body('assignedTo').optional().isMongoId(),
  validate,
  maintenanceController.createSchedule
);

router.patch(
  '/:id',
  isAdminOrSupervisor,
  param('id').isMongoId(),
  validate,
  maintenanceController.updateSchedule
);

router.post(
  '/:id/complete',
  param('id').isMongoId(),
  validate,
  maintenanceController.completeSchedule
);

router.post(
  '/:id/cancel',
  isAdminOrSupervisor,
  param('id').isMongoId(),
  validate,
  maintenanceController.cancelSchedule
);

export default router;
