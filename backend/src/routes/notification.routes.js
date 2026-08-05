import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { param } from 'express-validator';
import validate from '../middlewares/validate.middleware.js';

const router = Router();

router.use(protect);

router.get('/', notificationController.getMyNotifications);

router.get('/unread-count', notificationController.getUnreadCount);

router.patch('/read-all', notificationController.markAllAsRead);

router.patch(
  '/:id/read',
  param('id').isMongoId().withMessage('Invalid notification ID'),
  validate,
  notificationController.markAsRead
);

export default router;
