import { body, param, query } from 'express-validator';
import {
  ISSUE_STATUS,
  PRIORITY,
  ISSUE_CATEGORIES,
} from '../constants/index.js';

export const createPublicIssueValidator = [
  param('publicId')
    .trim()
    .notEmpty()
    .withMessage('Public ID is required'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 }),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 2000 }),
  body('priority')
    .optional()
    .isIn(Object.values(PRIORITY))
    .withMessage('Invalid priority'),
  body('category')
    .optional()
    .isIn(ISSUE_CATEGORIES)
    .withMessage('Invalid category'),
  body('reporterName')
    .optional()
    .trim()
    .isLength({ max: 100 }),
  body('reporterEmail')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email')
    .normalizeEmail(),
  body('reporterPhone')
    .optional()
    .trim()
    .isLength({ max: 20 }),
  // AI triage payload (optional, already reviewed by user)
  body('aiTriage')
    .optional()
    .isObject(),
];

export const createInternalIssueValidator = [
  body('asset')
    .notEmpty()
    .withMessage('Asset ID is required')
    .isMongoId()
    .withMessage('Invalid asset ID'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 }),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 2000 }),
  body('priority')
    .optional()
    .isIn(Object.values(PRIORITY)),
  body('category')
    .optional()
    .isIn(ISSUE_CATEGORIES),
];

export const assignIssueValidator = [
  param('id').isMongoId().withMessage('Invalid issue ID'),
  body('technicianId')
    .notEmpty()
    .withMessage('Technician ID is required')
    .isMongoId()
    .withMessage('Invalid technician ID'),
];

export const transitionIssueValidator = [
  param('id').isMongoId().withMessage('Invalid issue ID'),
  body('status')
    .notEmpty()
    .withMessage('New status is required')
    .isIn(Object.values(ISSUE_STATUS))
    .withMessage('Invalid status'),
  body('inspectionNotes').optional().trim().isLength({ max: 3000 }),
  body('maintenanceNotes').optional().trim().isLength({ max: 3000 }),
  body('completionNotes').optional().trim().isLength({ max: 2000 }),
  body('laborCost').optional().isFloat({ min: 0 }).withMessage('Labor cost cannot be negative'),
  body('parts').optional().isArray(),
  body('parts.*.name').optional().trim().notEmpty(),
  body('parts.*.quantity').optional().isInt({ min: 1 }),
  body('parts.*.unitCost').optional().isFloat({ min: 0 }),
];

export const updateIssueValidator = [
  param('id').isMongoId().withMessage('Invalid issue ID'),
  body('title').optional().trim().notEmpty().isLength({ max: 200 }),
  body('description').optional().trim().notEmpty().isLength({ max: 2000 }),
  body('priority').optional().isIn(Object.values(PRIORITY)),
  body('category').optional().isIn(ISSUE_CATEGORIES),
  body('inspectionNotes').optional().trim().isLength({ max: 3000 }),
  body('maintenanceNotes').optional().trim().isLength({ max: 3000 }),
  body('completionNotes').optional().trim().isLength({ max: 2000 }),
  body('laborCost').optional().isFloat({ min: 0 }),
  body('parts').optional().isArray(),
];

export const issueIdValidator = [
  param('id').isMongoId().withMessage('Invalid issue ID'),
];

export const listIssuesValidator = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim(),
  query('status').optional().isIn(Object.values(ISSUE_STATUS)),
  query('priority').optional().isIn(Object.values(PRIORITY)),
  query('category').optional().isIn(ISSUE_CATEGORIES),
  query('sortBy').optional().isIn(['reportedAt', 'priority', 'status', 'createdAt', 'updatedAt']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];
