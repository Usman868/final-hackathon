import { body, param, query } from 'express-validator';
import {
  ASSET_STATUS,
  ASSET_CONDITION,
  ASSET_CATEGORIES,
} from '../constants/index.js';

export const createAssetValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Asset name is required')
    .isLength({ max: 150 })
    .withMessage('Name cannot exceed 150 characters'),
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(ASSET_CATEGORIES)
    .withMessage(`Category must be one of: ${ASSET_CATEGORIES.join(', ')}`),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ max: 200 })
    .withMessage('Location cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('model')
    .optional()
    .trim()
    .isLength({ max: 100 }),
  body('manufacturer')
    .optional()
    .trim()
    .isLength({ max: 100 }),
  body('serialNumber')
    .optional()
    .trim(),
  body('condition')
    .optional()
    .isIn(Object.values(ASSET_CONDITION))
    .withMessage('Invalid condition'),
  body('status')
    .optional()
    .isIn(Object.values(ASSET_STATUS))
    .withMessage('Invalid status'),
  body('assignedTechnician')
    .optional()
    .isMongoId()
    .withMessage('Invalid technician ID'),
  body('lastServiceDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid last service date'),
  body('nextServiceDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid next service date'),
  body('purchaseCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Purchase cost cannot be negative'),
];

export const updateAssetValidator = [
  param('id').isMongoId().withMessage('Invalid asset ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 150 }),
  body('category')
    .optional()
    .isIn(ASSET_CATEGORIES)
    .withMessage('Invalid category'),
  body('location')
    .optional()
    .trim()
    .notEmpty()
    .isLength({ max: 200 }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }),
  body('condition')
    .optional()
    .isIn(Object.values(ASSET_CONDITION)),
  body('status')
    .optional()
    .isIn(Object.values(ASSET_STATUS)),
  body('assignedTechnician')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('Invalid technician ID'),
  body('lastServiceDate')
    .optional({ nullable: true })
    .isISO8601(),
  body('nextServiceDate')
    .optional({ nullable: true })
    .isISO8601(),
];

export const assetIdValidator = [
  param('id').isMongoId().withMessage('Invalid asset ID'),
];

export const publicIdValidator = [
  param('publicId')
    .trim()
    .notEmpty()
    .withMessage('Public ID is required')
    .matches(/^[a-z0-9-]+$/i)
    .withMessage('Invalid public ID format'),
];

export const listAssetsValidator = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim(),
  query('status').optional().isIn(Object.values(ASSET_STATUS)),
  query('category').optional().isIn(ASSET_CATEGORIES),
  query('condition').optional().isIn(Object.values(ASSET_CONDITION)),
  query('sortBy').optional().isIn(['createdAt', 'name', 'status', 'nextServiceDate', 'updatedAt']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];
