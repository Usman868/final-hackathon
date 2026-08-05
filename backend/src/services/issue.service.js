import Issue from '../models/Issue.model.js';
import Asset from '../models/Asset.model.js';
import User from '../models/User.model.js';
import MaintenanceLog from '../models/MaintenanceLog.model.js';
import ApiError from '../utils/ApiError.js';
import { logAssetHistory, HISTORY_ACTIONS } from '../helpers/history.helper.js';
import {
  notifyIssueAssigned,
  notifyIssueStatusChanged,
  notifyCriticalIssue,
} from './notification.service.js';
import { emitToDashboard } from '../sockets/index.js';
import {
  ISSUE_STATUS,
  SLA_HOURS_BY_PRIORITY,
  ASSET_STATUS,
  ASSET_STATUS_ON_EVENT,
  PRIORITY,
  ROLES,
} from '../constants/index.js';

/**
 * Create issue from public reporter (no login)
 */

function computeSla(priority, reportedAt = new Date()) {
  const hours = SLA_HOURS_BY_PRIORITY[priority] ?? SLA_HOURS_BY_PRIORITY.Medium ?? 72;
  const dueAt = new Date(reportedAt.getTime() + hours * 60 * 60 * 1000);
  return { slaHours: hours, dueAt };
}

export const createPublicIssue = async ({
  publicId,
  title,
  description,
  priority,
  category,
  reporterName,
  reporterEmail,
  reporterPhone,
  aiTriage,
}, meta = {}) => {
  const asset = await Asset.findOne({ publicId });
  if (!asset) {
    throw new ApiError(404, 'Asset not found');
  }
  if (asset.status === ASSET_STATUS.RETIRED) {
    throw new ApiError(400, 'Cannot report issues on a retired asset');
  }

  const reportedAt = new Date();
  const pri = priority || PRIORITY.MEDIUM;
  const sla = computeSla(pri, reportedAt);
  const issue = await Issue.create({
    asset: asset._id,
    title,
    description,
    priority: pri,
    category: category || 'Other',
    status: ISSUE_STATUS.REPORTED,
    reporterName,
    reporterEmail,
    reporterPhone,
    aiTriage: aiTriage || null,
    reportedAt,
    isCritical: pri === PRIORITY.CRITICAL,
    slaHours: sla.slaHours,
    dueAt: sla.dueAt,
  });

  // Update asset status + counters
  const previousStatus = asset.status;
  asset.status = ASSET_STATUS_ON_EVENT.ISSUE_SUBMITTED;
  asset.totalIssues = (asset.totalIssues || 0) + 1;
  asset.openIssues = (asset.openIssues || 0) + 1;
  await asset.save();

  await logAssetHistory({
    assetId: asset._id,
    action: HISTORY_ACTIONS.ISSUE_REPORTED,
    description: `Issue ${issue.issueNumber} reported: "${issue.title}"`,
    actorName: reporterName || 'Public Reporter',
    actorRole: 'PUBLIC',
    issue: issue._id,
    issueNumber: issue.issueNumber,
    previousValue: previousStatus,
    newValue: asset.status,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  if (aiTriage?.wasAccepted) {
    await logAssetHistory({
      assetId: asset._id,
      action: HISTORY_ACTIONS.AI_TRIAGE_APPLIED,
      description: `AI triage applied to ${issue.issueNumber}`,
      actorName: reporterName || 'Public Reporter',
      issue: issue._id,
      issueNumber: issue.issueNumber,
      metadata: { aiTriage },
    });
  }

  // Realtime dashboard update
  emitToDashboard('issue:created', {
    issueId: issue._id,
    issueNumber: issue.issueNumber,
    title: issue.title,
    priority: issue.priority,
    assetId: asset._id,
    assetCode: asset.assetCode,
  });

  if (issue.isCritical) {
    await notifyCriticalIssue(issue);
  }

  return issue;
};

/**
 * Create issue internally (staff)
 */
export const createInternalIssue = async (data, actor) => {
  const asset = await Asset.findById(data.asset);
  if (!asset) {
    throw new ApiError(404, 'Asset not found');
  }
  if (asset.status === ASSET_STATUS.RETIRED) {
    throw new ApiError(400, 'Cannot report issues on a retired asset');
  }

  const reportedAt = new Date();
  const pri = data.priority || PRIORITY.MEDIUM;
  const sla = computeSla(pri, reportedAt);
  const issue = await Issue.create({
    ...data,
    priority: pri,
    status: ISSUE_STATUS.REPORTED,
    reportedAt,
    isCritical: pri === PRIORITY.CRITICAL,
    slaHours: sla.slaHours,
    dueAt: sla.dueAt,
  });

  const previousStatus = asset.status;
  asset.status = ASSET_STATUS_ON_EVENT.ISSUE_SUBMITTED;
  asset.totalIssues = (asset.totalIssues || 0) + 1;
  asset.openIssues = (asset.openIssues || 0) + 1;
  await asset.save();

  await logAssetHistory({
    assetId: asset._id,
    action: HISTORY_ACTIONS.ISSUE_REPORTED,
    description: `Issue ${issue.issueNumber} reported: "${issue.title}"`,
    actor,
    issue: issue._id,
    issueNumber: issue.issueNumber,
    previousValue: previousStatus,
    newValue: asset.status,
  });

  return issue;
};

/**
 * List issues with filters / search / pagination
 */
export const getIssues = async (query = {}, currentUser = null) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    status,
    priority,
    category,
    asset,
    assignedTo,
    isCritical,
    sortBy = 'reportedAt',
    sortOrder = 'desc',
  } = query;

  const filter = {};

  // Technicians only see their assigned issues (unless Admin/Supervisor)
  if (
    currentUser &&
    currentUser.role === ROLES.TECHNICIAN
  ) {
    filter.assignedTo = currentUser._id;
  } else if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  if (search) {
    filter.$text = { $search: search };
  }
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (asset) filter.asset = asset;
  if (isCritical === 'true' || isCritical === true) filter.isCritical = true;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const options = {
    page: parseInt(page, 10),
    limit: Math.min(parseInt(limit, 10) || 10, 100),
    sort,
    populate: [
      { path: 'asset', select: 'name assetCode location category status' },
      { path: 'assignedTo', select: 'name email role' },
      { path: 'assignedBy', select: 'name email' },
      { path: 'resolvedBy', select: 'name email' },
    ],
  };

  if (search) {
    options.sort = { score: { $meta: 'textScore' }, ...sort };
  }

  return Issue.paginate(filter, options);
};

/**
 * Get single issue
 */
export const getIssueById = async (id, currentUser = null) => {
  const issue = await Issue.findById(id)
    .populate('asset', 'name assetCode location category status condition publicId')
    .populate('assignedTo', 'name email role phone')
    .populate('assignedBy', 'name email')
    .populate('resolvedBy', 'name email')
    .populate('closedBy', 'name email');

  if (!issue) {
    throw new ApiError(404, 'Issue not found');
  }

  // Technician can only view assigned issues
  if (
    currentUser?.role === ROLES.TECHNICIAN &&
    (!issue.assignedTo || issue.assignedTo._id.toString() !== currentUser._id.toString())
  ) {
    throw new ApiError(403, 'You can only view issues assigned to you');
  }

  return issue;
};

/**
 * Assign issue to technician
 */
export const assignIssue = async (issueId, technicianId, actor) => {
  const issue = await Issue.findById(issueId);
  if (!issue) {
    throw new ApiError(404, 'Issue not found');
  }

  const tech = await User.findOne({
    _id: technicianId,
    role: ROLES.TECHNICIAN,
    isActive: true,
  });
  if (!tech) {
    throw new ApiError(400, 'Technician not found or inactive');
  }

  // Allow assign from Reported or Reopened
  const transitionCheck = issue.canTransitionTo(ISSUE_STATUS.ASSIGNED);
  if (!transitionCheck.allowed && issue.status !== ISSUE_STATUS.REOPENED) {
    // From Reopened we also allow ASSIGNED
    if (issue.status !== ISSUE_STATUS.REPORTED && issue.status !== ISSUE_STATUS.REOPENED) {
      throw new ApiError(400, transitionCheck.message || 'Cannot assign in current status');
    }
  }

  issue.assignedTo = tech._id;
  issue.assignedBy = actor._id;
  issue.assignedAt = new Date();
  issue.status = ISSUE_STATUS.ASSIGNED;
  await issue.save();

  await logAssetHistory({
    assetId: issue.asset,
    action: HISTORY_ACTIONS.ISSUE_ASSIGNED,
    description: `Issue ${issue.issueNumber} assigned to ${tech.name}`,
    actor,
    issue: issue._id,
    issueNumber: issue.issueNumber,
    newValue: tech.name,
  });

  // Realtime + notification
  await notifyIssueAssigned(issue, tech);

  return issue;
};

/**
 * Transition issue status with full business rules
 */
export const transitionIssueStatus = async (issueId, newStatus, actor, extra = {}) => {
  const issue = await Issue.findById(issueId);
  if (!issue) {
    throw new ApiError(404, 'Issue not found');
  }

  // Technician may only update own assigned issues
  if (actor.role === ROLES.TECHNICIAN) {
    if (!issue.assignedTo || issue.assignedTo.toString() !== actor._id.toString()) {
      throw new ApiError(403, 'You can only update issues assigned to you');
    }
  }

  const check = issue.canTransitionTo(newStatus);
  if (!check.allowed) {
    throw new ApiError(400, check.message);
  }

  // Apply extra fields before save (maintenance notes etc.)
  if (extra.inspectionNotes !== undefined) issue.inspectionNotes = extra.inspectionNotes;
  if (extra.maintenanceNotes !== undefined) issue.maintenanceNotes = extra.maintenanceNotes;
  if (extra.completionNotes !== undefined) issue.completionNotes = extra.completionNotes;
  if (extra.parts) issue.parts = extra.parts;
  if (extra.laborCost !== undefined) {
    if (extra.laborCost < 0) throw new ApiError(400, 'Labor cost cannot be negative');
    issue.laborCost = extra.laborCost;
  }
  if (extra.requiresParts !== undefined) issue.requiresParts = extra.requiresParts;

  // Re-check resolve rule after notes applied
  if (newStatus === ISSUE_STATUS.RESOLVED) {
    const recheck = issue.canTransitionTo(ISSUE_STATUS.RESOLVED);
    if (!recheck.allowed) {
      throw new ApiError(400, recheck.message);
    }
  }

  const previousStatus = issue.status;
  issue.status = newStatus;

  // Timestamps + actor tracking
  const now = new Date();

  // First staff response + SLA breach flag
  if (!issue.firstRespondedAt && previousStatus === ISSUE_STATUS.REPORTED) {
    issue.firstRespondedAt = now;
    if (issue.dueAt && now > new Date(issue.dueAt)) {
      issue.slaBreached = true;
    }
  }
  if (
    [ISSUE_STATUS.RESOLVED, ISSUE_STATUS.CLOSED].includes(newStatus) &&
    issue.dueAt &&
    now > new Date(issue.dueAt) &&
    !issue.slaBreached
  ) {
    issue.slaBreached = true;
  }

  switch (newStatus) {
    case ISSUE_STATUS.INSPECTION_STARTED:
      issue.inspectionStartedAt = now;
      break;
    case ISSUE_STATUS.MAINTENANCE_IN_PROGRESS:
      issue.maintenanceStartedAt = now;
      break;
    case ISSUE_STATUS.RESOLVED:
      issue.resolvedAt = now;
      issue.resolvedBy = actor._id;
      break;
    case ISSUE_STATUS.CLOSED:
      issue.closedAt = now;
      issue.closedBy = actor._id;
      break;
    case ISSUE_STATUS.REOPENED:
      issue.reopenedAt = now;
      break;
    default:
      break;
  }

  await issue.save();

  // Sync asset status
  await syncAssetStatusFromIssue(issue, newStatus, actor);

  await logAssetHistory({
    assetId: issue.asset,
    action: HISTORY_ACTIONS.ISSUE_STATUS_CHANGED,
    description: `Issue ${issue.issueNumber} status: ${previousStatus} → ${newStatus}`,
    actor,
    issue: issue._id,
    issueNumber: issue.issueNumber,
    previousValue: previousStatus,
    newValue: newStatus,
  });

  // Realtime notifications
  await notifyIssueStatusChanged(issue, previousStatus, actor);
  if (issue.isCritical) {
    await notifyCriticalIssue(issue);
  }

  // Special history for resolve
  if (newStatus === ISSUE_STATUS.RESOLVED) {
    await logAssetHistory({
      assetId: issue.asset,
      action: HISTORY_ACTIONS.ISSUE_RESOLVED,
      description: `Issue ${issue.issueNumber} resolved`,
      actor,
      issue: issue._id,
      issueNumber: issue.issueNumber,
      metadata: {
        maintenanceNotes: issue.maintenanceNotes,
        totalCost: issue.totalCost,
      },
    });

    // Create MaintenanceLog
    await MaintenanceLog.create({
      issue: issue._id,
      asset: issue.asset,
      performedBy: actor._id,
      workPerformed: issue.maintenanceNotes || issue.completionNotes || 'Maintenance completed',
      findings: issue.inspectionNotes,
      partsUsed: issue.parts || [],
      laborCost: issue.laborCost || 0,
      completedAt: now,
    });
  }

  if (newStatus === ISSUE_STATUS.CLOSED) {
    await logAssetHistory({
      assetId: issue.asset,
      action: HISTORY_ACTIONS.ISSUE_CLOSED,
      description: `Issue ${issue.issueNumber} closed`,
      actor,
      issue: issue._id,
      issueNumber: issue.issueNumber,
    });
  }

  if (newStatus === ISSUE_STATUS.REOPENED) {
    await logAssetHistory({
      assetId: issue.asset,
      action: HISTORY_ACTIONS.ISSUE_REOPENED,
      description: `Issue ${issue.issueNumber} reopened`,
      actor,
      issue: issue._id,
      issueNumber: issue.issueNumber,
    });
  }

  return issue;
};

/**
 * Update issue fields (notes, parts, evidence metadata) without status change
 */
export const updateIssueDetails = async (issueId, updates, actor) => {
  const issue = await Issue.findById(issueId);
  if (!issue) {
    throw new ApiError(404, 'Issue not found');
  }

  if (issue.status === ISSUE_STATUS.CLOSED) {
    throw new ApiError(400, 'Closed issue cannot be edited until reopened');
  }

  if (actor.role === ROLES.TECHNICIAN) {
    if (!issue.assignedTo || issue.assignedTo.toString() !== actor._id.toString()) {
      throw new ApiError(403, 'You can only update issues assigned to you');
    }
  }

  const allowed = [
    'title',
    'description',
    'priority',
    'category',
    'inspectionNotes',
    'maintenanceNotes',
    'completionNotes',
    'parts',
    'laborCost',
    'requiresParts',
  ];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      if (key === 'laborCost' && updates[key] < 0) {
        throw new ApiError(400, 'Labor cost cannot be negative');
      }
      issue[key] = updates[key];
    }
  }

  if (updates.priority === PRIORITY.CRITICAL) {
    issue.isCritical = true;
  }

  await issue.save();
  return issue;
};

/**
 * Sync parent asset status based on issue event
 */
async function syncAssetStatusFromIssue(issue, newStatus, actor) {
  const asset = await Asset.findById(issue.asset);
  if (!asset || asset.status === ASSET_STATUS.RETIRED) return;

  let targetStatus = null;

  switch (newStatus) {
    case ISSUE_STATUS.INSPECTION_STARTED:
      targetStatus = ASSET_STATUS_ON_EVENT.INSPECTION_STARTED;
      break;
    case ISSUE_STATUS.MAINTENANCE_IN_PROGRESS:
    case ISSUE_STATUS.WAITING_FOR_PARTS:
      targetStatus = ASSET_STATUS_ON_EVENT.MAINTENANCE_STARTED;
      break;
    case ISSUE_STATUS.RESOLVED:
    case ISSUE_STATUS.CLOSED:
      // Only return to Operational if no other open issues
      const openCount = await Issue.countDocuments({
        asset: asset._id,
        status: {
          $nin: [ISSUE_STATUS.RESOLVED, ISSUE_STATUS.CLOSED],
        },
        _id: { $ne: issue._id },
      });
      if (openCount === 0) {
        targetStatus = ASSET_STATUS_ON_EVENT.MAINTENANCE_COMPLETED;
        asset.openIssues = Math.max(0, (asset.openIssues || 1) - 1);
      } else {
        asset.openIssues = openCount;
      }
      break;
    case ISSUE_STATUS.REOPENED:
      targetStatus = ASSET_STATUS_ON_EVENT.ISSUE_SUBMITTED;
      asset.openIssues = (asset.openIssues || 0) + 1;
      break;
    default:
      break;
  }

  // Critical safety → Out of Service
  if (issue.isCritical && issue.priority === PRIORITY.CRITICAL) {
    if (
      [ISSUE_STATUS.REPORTED, ISSUE_STATUS.ASSIGNED, ISSUE_STATUS.INSPECTION_STARTED].includes(
        newStatus
      )
    ) {
      targetStatus = ASSET_STATUS.OUT_OF_SERVICE;
    }
  }

  if (targetStatus && asset.status !== targetStatus) {
    const prev = asset.status;
    asset.status = targetStatus;
    await asset.save();

    await logAssetHistory({
      assetId: asset._id,
      action: HISTORY_ACTIONS.ASSET_STATUS_CHANGED,
      description: `Asset status → ${targetStatus} (driven by issue ${issue.issueNumber})`,
      actor,
      issue: issue._id,
      issueNumber: issue.issueNumber,
      previousValue: prev,
      newValue: targetStatus,
    });
  } else {
    await asset.save();
  }
}

/**
 * Dashboard issue stats
 */
export const getIssueStats = async () => {
  const [
    total,
    reported,
    assigned,
    inProgress,
    waitingParts,
    resolved,
    closed,
    critical,
  ] = await Promise.all([
    Issue.countDocuments(),
    Issue.countDocuments({ status: ISSUE_STATUS.REPORTED }),
    Issue.countDocuments({ status: ISSUE_STATUS.ASSIGNED }),
    Issue.countDocuments({
      status: {
        $in: [ISSUE_STATUS.INSPECTION_STARTED, ISSUE_STATUS.MAINTENANCE_IN_PROGRESS],
      },
    }),
    Issue.countDocuments({ status: ISSUE_STATUS.WAITING_FOR_PARTS }),
    Issue.countDocuments({ status: ISSUE_STATUS.RESOLVED }),
    Issue.countDocuments({ status: ISSUE_STATUS.CLOSED }),
    Issue.countDocuments({ isCritical: true, status: { $nin: [ISSUE_STATUS.CLOSED, ISSUE_STATUS.RESOLVED] } }),
  ]);

  return {
    total,
    reported,
    assigned,
    inProgress,
    waitingParts,
    resolved,
    closed,
    critical,
  };
};
