import Asset from '../models/Asset.model.js';
import Issue from '../models/Issue.model.js';
import User from '../models/User.model.js';
import AssetHistory from '../models/AssetHistory.model.js';
import {
  ASSET_STATUS,
  ISSUE_STATUS,
  ROLES,
  PRIORITY,
} from '../constants/index.js';

/**
 * Combined dashboard summary for Admin / Supervisor / Technician views.
 */
export const getDashboardSummary = async (currentUser) => {
  const isTechnician = currentUser?.role === ROLES.TECHNICIAN;
  const techFilter = isTechnician ? { assignedTo: currentUser._id } : {};

  const [
    assetStats,
    issueStats,
    technicianCount,
    recentIssues,
    criticalIssues,
    upcomingServices,
    recentActivities,
  ] = await Promise.all([
    // Asset counts by status
    Asset.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    // Issue counts by status
    Issue.aggregate([
      ...(isTechnician ? [{ $match: techFilter }] : []),
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    // Active technicians
    User.countDocuments({ role: ROLES.TECHNICIAN, isActive: true }),
    // Recent issues
    Issue.find(techFilter)
      .sort({ reportedAt: -1 })
      .limit(8)
      .populate('asset', 'name assetCode location')
      .populate('assignedTo', 'name')
      .select('issueNumber title status priority isCritical reportedAt asset assignedTo')
      .lean(),
    // Critical open issues
    Issue.find({
      ...techFilter,
      isCritical: true,
      status: { $nin: [ISSUE_STATUS.RESOLVED, ISSUE_STATUS.CLOSED] },
    })
      .sort({ reportedAt: -1 })
      .limit(5)
      .populate('asset', 'name assetCode location')
      .select('issueNumber title status priority reportedAt asset')
      .lean(),
    // Upcoming services (next 30 days)
    Asset.find({
      status: { $ne: ASSET_STATUS.RETIRED },
      nextServiceDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })
      .sort({ nextServiceDate: 1 })
      .limit(8)
      .select('name assetCode location nextServiceDate status condition')
      .lean(),
    // Recent history
    AssetHistory.find()
      .sort({ createdAt: -1 })
      .limit(12)
      .populate('asset', 'name assetCode')
      .populate('actor', 'name role')
      .select('action description actor actorName createdAt asset issueNumber')
      .lean(),
  ]);

  // Normalize asset stats
  const assetsByStatus = {};
  Object.values(ASSET_STATUS).forEach((s) => {
    assetsByStatus[s] = 0;
  });
  let totalAssets = 0;
  assetStats.forEach((row) => {
    assetsByStatus[row._id] = row.count;
    totalAssets += row.count;
  });

  // Normalize issue stats
  const issuesByStatus = {};
  Object.values(ISSUE_STATUS).forEach((s) => {
    issuesByStatus[s] = 0;
  });
  let totalIssues = 0;
  issueStats.forEach((row) => {
    issuesByStatus[row._id] = row.count;
    totalIssues += row.count;
  });

  const openIssues =
    (issuesByStatus[ISSUE_STATUS.REPORTED] || 0) +
    (issuesByStatus[ISSUE_STATUS.ASSIGNED] || 0) +
    (issuesByStatus[ISSUE_STATUS.INSPECTION_STARTED] || 0) +
    (issuesByStatus[ISSUE_STATUS.MAINTENANCE_IN_PROGRESS] || 0) +
    (issuesByStatus[ISSUE_STATUS.WAITING_FOR_PARTS] || 0) +
    (issuesByStatus[ISSUE_STATUS.REOPENED] || 0);

  // Priority breakdown for charts
  const priorityAgg = await Issue.aggregate([
    ...(isTechnician ? [{ $match: techFilter }] : []),
    { $group: { _id: '$priority', count: { $sum: 1 } } },
  ]);
  const issuesByPriority = {};
  Object.values(PRIORITY).forEach((p) => {
    issuesByPriority[p] = 0;
  });
  priorityAgg.forEach((row) => {
    issuesByPriority[row._id] = row.count;
  });

  // Category breakdown
  const categoryAgg = await Asset.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const assetsByCategory = categoryAgg.map((r) => ({
    category: r._id,
    count: r.count,
  }));

  return {
    cards: {
      totalAssets,
      operationalAssets: assetsByStatus[ASSET_STATUS.OPERATIONAL] || 0,
      openIssues,
      criticalIssues: criticalIssues.length,
      technicians: technicianCount,
      underMaintenance:
        (assetsByStatus[ASSET_STATUS.UNDER_MAINTENANCE] || 0) +
        (assetsByStatus[ASSET_STATUS.UNDER_INSPECTION] || 0),
    },
    assetsByStatus,
    issuesByStatus,
    issuesByPriority,
    assetsByCategory,
    recentIssues,
    criticalIssues,
    upcomingServices,
    recentActivities,
  };
};
