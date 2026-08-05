import { Router } from 'express';
import * as assetController from '../controllers/asset.controller.js';
import { protect, restrictTo, isAdmin, isStaff } from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import {
  createAssetValidator,
  updateAssetValidator,
  assetIdValidator,
  listAssetsValidator,
} from '../validators/asset.validator.js';
import { ROLES } from '../constants/index.js';

const router = Router();

// All internal asset routes require authentication
router.use(protect);

// Stats
router.get('/stats/summary', isStaff, assetController.getAssetStats);

// List
router.get(
  '/',
  isStaff,
  listAssetsValidator,
  validate,
  assetController.getAssets
);

// Create – Admin only
router.post(
  '/',
  isAdmin,
  createAssetValidator,
  validate,
  assetController.createAsset
);

// Single asset
router.get(
  '/:id',
  isStaff,
  assetIdValidator,
  validate,
  assetController.getAssetById
);

// Update – Admin only
router.patch(
  '/:id',
  isAdmin,
  updateAssetValidator,
  validate,
  assetController.updateAsset
);

// Retire – Admin only
router.post(
  '/:id/retire',
  isAdmin,
  assetIdValidator,
  validate,
  assetController.retireAsset
);

// QR data
router.get(
  '/:id/qr',
  isStaff,
  assetIdValidator,
  validate,
  assetController.getAssetQR
);

// History timeline
router.get(
  '/:id/history',
  isStaff,
  assetIdValidator,
  validate,
  assetController.getAssetHistory
);

export default router;
