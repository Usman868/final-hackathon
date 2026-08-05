import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { protect, isStaff, isAdmin } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { registerValidator, loginValidator } from '../validators/auth.validator.js';
import rateLimit from 'express-rate-limit';
import { query, param, body } from 'express-validator';
import { ROLES } from '../constants/index.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public
router.post('/login', authLimiter, loginValidator, validate, authController.login);
router.post('/refresh', authLimiter, authController.refresh);

// Authenticated
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.patch('/me', protect, authController.updateMe);
router.get('/technicians', protect, isStaff, authController.listTechnicians);

// Admin-only: create users (any role) + list users
router.post(
  '/register',
  protect,
  isAdmin,
  authLimiter,
  registerValidator,
  validate,
  authController.register
);

router.get(
  '/users',
  protect,
  isAdmin,
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('role').optional().isIn(Object.values(ROLES)),
  query('search').optional().trim(),
  validate,
  authController.listUsers
);

router.patch(
  '/users/:id/status',
  protect,
  isAdmin,
  param('id').isMongoId(),
  body('isActive').isBoolean(),
  validate,
  authController.setUserActive
);

export default router;
