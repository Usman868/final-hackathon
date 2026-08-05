import { Router } from 'express';
import * as assetController from '../controllers/asset.controller.js';
import * as issueController from '../controllers/issue.controller.js';
import validate from '../middlewares/validate.middleware.js';
import { publicIdValidator } from '../validators/asset.validator.js';
import { createPublicIssueValidator } from '../validators/issue.validator.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Stricter rate limit for public endpoints
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Even tighter for issue reporting
const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many issue reports. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(publicLimiter);

/**
 * Public asset page data (safe fields only)
 * GET /api/public/assets/:publicId
 */
router.get(
  '/assets/:publicId',
  publicIdValidator,
  validate,
  assetController.getPublicAsset
);

/**
 * Public report issue
 * POST /api/public/assets/:publicId/issues
 */
router.post(
  '/assets/:publicId/issues',
  reportLimiter,
  createPublicIssueValidator,
  validate,
  issueController.createPublicIssue
);

export default router;
