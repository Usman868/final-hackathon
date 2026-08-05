import { Router } from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { protect, isStaff, optionalAuth } from '../middlewares/auth.middleware.js';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import validate from '../middlewares/validate.middleware.js';

const router = Router();

// Tight rate limit for AI endpoints (cost control)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many AI requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Public + authenticated triage
 * POST /api/ai/triage
 */
router.post(
  '/triage',
  aiLimiter,
  optionalAuth, // works for both public reporters and staff
  body('complaint')
    .trim()
    .notEmpty()
    .withMessage('Complaint is required')
    .isLength({ max: 2000 })
    .withMessage('Complaint cannot exceed 2000 characters'),
  body('assetId').optional().isMongoId().withMessage('Invalid asset ID'),
  body('publicId').optional().trim().notEmpty(),
  validate,
  aiController.triageIssue
);

/**
 * Maintenance summary – staff only
 * POST /api/ai/maintenance-summary
 */
router.post(
  '/maintenance-summary',
  protect,
  isStaff,
  aiLimiter,
  body('notes').optional().trim().isLength({ max: 3000 }),
  validate,
  aiController.maintenanceSummary
);

export default router;
