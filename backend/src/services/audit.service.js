import AuditLog from '../models/AuditLog.model.js';
import logger from '../utils/logger.js';

/**
 * Write an audit entry – never throws to callers
 */
export const writeAudit = async ({
  action,
  actor,
  targetType = 'System',
  targetId = null,
  summary,
  metadata = {},
  ipAddress,
}) => {
  try {
    await AuditLog.create({
      action,
      actor: actor?._id || actor || null,
      actorName: actor?.name,
      actorRole: actor?.role,
      targetType,
      targetId,
      summary,
      metadata,
      ipAddress,
    });
  } catch (err) {
    logger.error('Audit write failed', { error: err.message });
  }
};

export const listAuditLogs = async ({ page = 1, limit = 25, action, actor } = {}) => {
  const filter = {};
  if (action) filter.action = action;
  if (actor) filter.actor = actor;

  return AuditLog.paginate(filter, {
    page: parseInt(page, 10) || 1,
    limit: Math.min(parseInt(limit, 10) || 25, 100),
    sort: { createdAt: -1 },
    populate: [{ path: 'actor', select: 'name email role' }],
  });
};
