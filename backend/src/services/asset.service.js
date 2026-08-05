import Asset from '../models/Asset.model.js';
import User from '../models/User.model.js';
import ApiError from '../utils/ApiError.js';
import { generateAssetQRDataURL, buildAssetLabelData } from '../helpers/qr.helper.js';
import { logAssetHistory, HISTORY_ACTIONS } from '../helpers/history.helper.js';
import { writeAudit } from './audit.service.js';
import {
  ASSET_STATUS,
  ASSET_CONDITION,
  ASSET_CATEGORIES,
  ROLES,
} from '../constants/index.js';
import config from '../config/index.js';

/**
 * Create a new asset + generate QR + write history
 */
export const createAsset = async (data, actor) => {
  // Optional technician validation
  if (data.assignedTechnician) {
    const tech = await User.findOne({
      _id: data.assignedTechnician,
      role: ROLES.TECHNICIAN,
      isActive: true,
    });
    if (!tech) {
      throw new ApiError(400, 'Assigned technician not found or inactive');
    }
  }

  const asset = await Asset.create({
    ...data,
    organizationName: data.organizationName || config.orgName,
    createdBy: actor._id,
    updatedBy: actor._id,
  });

  // Generate QR data URL
  const { dataUrl, publicUrl } = await generateAssetQRDataURL(asset.publicId);
  asset.qrCodeUrl = dataUrl;
  await asset.save();

  await logAssetHistory({
    assetId: asset._id,
    action: HISTORY_ACTIONS.ASSET_CREATED,
    description: `Asset "${asset.name}" (${asset.assetCode}) created`,
    actor,
    metadata: {
      category: asset.category,
      location: asset.location,
      status: asset.status,
    },
  });

  return { asset, publicUrl };
};

/**
 * Get paginated, searchable, filterable asset list
 */
export const getAssets = async (query = {}) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status,
    category,
    location,
    condition,
    assignedTechnician,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  const filter = {};

  if (search) {
    filter.$text = { $search: search };
  }
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (location) filter.location = { $regex: location, $options: 'i' };
  if (condition) filter.condition = condition;
  if (assignedTechnician) filter.assignedTechnician = assignedTechnician;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const options = {
    page: parseInt(page, 10),
    limit: Math.min(parseInt(limit, 10) || 10, 100),
    sort,
    populate: [
      { path: 'assignedTechnician', select: 'name email role' },
      { path: 'createdBy', select: 'name email' },
    ],
    lean: false,
  };

  // If text search, prefer textScore
  if (search) {
    options.sort = { score: { $meta: 'textScore' }, ...sort };
  }

  const result = await Asset.paginate(filter, options);
  return result;
};

/**
 * Get single asset by ID (internal – full data)
 */
export const getAssetById = async (id) => {
  const asset = await Asset.findById(id)
    .populate('assignedTechnician', 'name email role phone')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  if (!asset) {
    throw new ApiError(404, 'Asset not found');
  }
  return asset;
};

/**
 * Get asset by publicId – SAFE fields only (for public page)
 */
export const getPublicAsset = async (publicId) => {
  const asset = await Asset.findOne({ publicId })
    .select(
      'name assetCode publicId category location description model manufacturer condition status lastServiceDate nextServiceDate organizationName totalIssues openIssues createdAt updatedAt'
    )
    .lean();

  if (!asset) {
    throw new ApiError(404, 'Asset not found');
  }

  // Safe activity only – no costs, private notes, or actor emails
  let safeHistory = [];
  try {
    const AssetHistory = (await import('../models/AssetHistory.model.js')).default;
    safeHistory = await AssetHistory.find({ asset: asset._id })
      .sort({ createdAt: -1 })
      .limit(15)
      .select('action description createdAt actorName issueNumber')
      .lean();
  } catch {
    safeHistory = [];
  }

  return {
    ...asset,
    publicUrl: `/public/asset/${asset.publicId}`,
    isRetired: asset.status === ASSET_STATUS.RETIRED,
    history: safeHistory,
  };
};

/**
 * Update asset (name/location etc. do NOT change publicId or assetCode)
 */
export const updateAsset = async (id, updates, actor) => {
  const asset = await Asset.findById(id);
  if (!asset) {
    throw new ApiError(404, 'Asset not found');
  }

  if (asset.status === ASSET_STATUS.RETIRED) {
    throw new ApiError(400, 'Cannot update a retired asset');
  }

  // Forbidden fields
  const forbidden = ['assetCode', 'publicId', 'createdBy', 'qrCodeUrl'];
  forbidden.forEach((f) => delete updates[f]);

  // Validate technician if changing
  if (updates.assignedTechnician) {
    const tech = await User.findOne({
      _id: updates.assignedTechnician,
      role: ROLES.TECHNICIAN,
      isActive: true,
    });
    if (!tech) {
      throw new ApiError(400, 'Assigned technician not found or inactive');
    }
  }

  const previousStatus = asset.status;
  const previousLocation = asset.location;

  Object.assign(asset, updates);
  asset.updatedBy = actor._id;
  await asset.save();

  // History for meaningful changes
  if (updates.status && updates.status !== previousStatus) {
    await logAssetHistory({
      assetId: asset._id,
      action: HISTORY_ACTIONS.ASSET_STATUS_CHANGED,
      description: `Status changed from "${previousStatus}" to "${updates.status}"`,
      actor,
      previousValue: previousStatus,
      newValue: updates.status,
    });
  } else {
    await logAssetHistory({
      assetId: asset._id,
      action: HISTORY_ACTIONS.ASSET_UPDATED,
      description: `Asset "${asset.name}" updated`,
      actor,
      metadata: { updatedFields: Object.keys(updates) },
    });
  }

  if (updates.location && updates.location !== previousLocation) {
    // QR mapping stays intact because publicId never changes
  }

  return asset;
};

/**
 * Retire an asset
 */
export const retireAsset = async (id, reason, actor) => {
  const asset = await Asset.findById(id);
  if (!asset) {
    throw new ApiError(404, 'Asset not found');
  }
  if (asset.status === ASSET_STATUS.RETIRED) {
    throw new ApiError(400, 'Asset is already retired');
  }

  const previousStatus = asset.status;
  asset.status = ASSET_STATUS.RETIRED;
  asset.isRetired = true;
  asset.retiredAt = new Date();
  asset.retiredReason = reason || 'Permanently removed';
  asset.updatedBy = actor._id;
  await asset.save();

  await logAssetHistory({
    assetId: asset._id,
    action: HISTORY_ACTIONS.ASSET_RETIRED,
    description: `Asset retired. Reason: ${asset.retiredReason}`,
    actor,
    previousValue: previousStatus,
    newValue: ASSET_STATUS.RETIRED,
  });

  await writeAudit({
    action: 'ASSET_RETIRED',
    actor,
    targetType: 'Asset',
    targetId: asset._id,
    summary: `${actor.name} retired asset ${asset.assetCode} (${asset.name})`,
    metadata: { reason: asset.retiredReason },
  });

  return asset;
};

/**
 * Get QR + label data for an asset
 */
export const getAssetQR = async (id) => {
  const asset = await Asset.findById(id).select(
    'name assetCode publicId location organizationName qrCodeUrl'
  );
  if (!asset) {
    throw new ApiError(404, 'Asset not found');
  }

  // Regenerate if missing
  if (!asset.qrCodeUrl) {
    const { dataUrl } = await generateAssetQRDataURL(asset.publicId);
    asset.qrCodeUrl = dataUrl;
    await asset.save();
  }

  const label = buildAssetLabelData(asset);
  return {
    qrCodeUrl: asset.qrCodeUrl,
    publicUrl: `${config.clientUrl}/public/asset/${asset.publicId}`,
    label,
  };
};

/**
 * Soft stats for dashboard cards
 */
export const getAssetStats = async () => {
  const [
    total,
    operational,
    issueReported,
    underInspection,
    underMaintenance,
    outOfService,
    retired,
  ] = await Promise.all([
    Asset.countDocuments(),
    Asset.countDocuments({ status: ASSET_STATUS.OPERATIONAL }),
    Asset.countDocuments({ status: ASSET_STATUS.ISSUE_REPORTED }),
    Asset.countDocuments({ status: ASSET_STATUS.UNDER_INSPECTION }),
    Asset.countDocuments({ status: ASSET_STATUS.UNDER_MAINTENANCE }),
    Asset.countDocuments({ status: ASSET_STATUS.OUT_OF_SERVICE }),
    Asset.countDocuments({ status: ASSET_STATUS.RETIRED }),
  ]);

  return {
    total,
    operational,
    issueReported,
    underInspection,
    underMaintenance,
    outOfService,
    retired,
  };
};
