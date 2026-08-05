import AssetHistory from '../models/AssetHistory.model.js';
import { HISTORY_ACTIONS } from '../constants/index.js';
import logger from '../utils/logger.js';

/**
 * Append an immutable history record.
 * Never throws to the main flow – logs on failure.
 */
export const logAssetHistory = async ({
  assetId,
  action,
  description,
  actor = null,
  actorName = 'System',
  actorRole = null,
  issue = null,
  issueNumber = null,
  metadata = {},
  previousValue = undefined,
  newValue = undefined,
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    await AssetHistory.create({
      asset: assetId,
      action,
      description,
      actor: actor?._id || actor || null,
      actorName: actor?.name || actorName,
      actorRole: actor?.role || actorRole,
      issue,
      issueNumber,
      metadata,
      previousValue,
      newValue,
      ipAddress,
      userAgent,
    });
  } catch (err) {
    logger.error('Failed to write asset history', {
      assetId: String(assetId),
      action,
      error: err.message,
    });
  }
};

export { HISTORY_ACTIONS };
