import Issue from '../models/Issue.model.js';
import User from '../models/User.model.js';
import Asset from '../models/Asset.model.js';
import MaintenanceSchedule from '../models/MaintenanceSchedule.model.js';
import { ROLES, ISSUE_STATUS, PRIORITY, SLA_HOURS_BY_PRIORITY } from '../constants/index.js';

function parseRange(from, to) {
  const end = to ? new Date(to) : new Date();
  end.setHours(23, 59, 59, 999);
  const start = from
    ? new Date(from)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function hoursBetween(a, b) {
  if (!a || !b) return null;
  return Math.round(((new Date(b) - new Date(a)) / 36e5) * 10) / 10;
}

/**
 * Technician scorecards for a date range (performance — not live ops snapshot).
 */
export const getTechnicianPerformance = async (from, to) => {
  const { start, end } = parseRange(from, to);

  const technicians = await User.find({
    role: ROLES.TECHNICIAN,
    isActive: true,
  })
    .select('name email')
    .lean();

  const issues = await Issue.find({
    $or: [
      { assignedTo: { $ne: null }, reportedAt: { $gte: start, $lte: end } },
      { resolvedAt: { $gte: start, $lte: end } },
      { assignedTo: { $ne: null }, status: { $nin: [ISSUE_STATUS.RESOLVED, ISSUE_STATUS.CLOSED] } },
    ],
  })
    .select(
      'assignedTo resolvedBy status priority reportedAt resolvedAt dueAt slaHours firstRespondedAt slaBreached isCritical'
    )
    .lean();

  const maintenanceDone = await MaintenanceSchedule.find({
    status: 'Completed',
    completedAt: { $gte: start, $lte: end },
  })
    .select('assignedTo completedAt scheduledDate')
    .lean();

  const idEq = (ref, tid) => ref && ref.toString() === tid;
  const techOwns = (i, tid) => idEq(i.assignedTo, tid) || idEq(i.resolvedBy, tid);

  const effectiveDueAt = (i) => {
    if (i.dueAt) return new Date(i.dueAt);
    if (!i.reportedAt) return null;
    const hours = i.slaHours ?? SLA_HOURS_BY_PRIORITY[i.priority] ?? 72;
    return new Date(new Date(i.reportedAt).getTime() + hours * 3600000);
  };

  const byTech = technicians.map((tech) => {
    const tid = tech._id.toString();
    const assignedInRange = issues.filter(
      (i) =>
        idEq(i.assignedTo, tid) &&
        i.reportedAt &&
        new Date(i.reportedAt) >= start &&
        new Date(i.reportedAt) <= end
    );
    const resolvedInRange = issues.filter(
      (i) =>
        techOwns(i, tid) &&
        i.resolvedAt &&
        new Date(i.resolvedAt) >= start &&
        new Date(i.resolvedAt) <= end
    );
    const openAssigned = issues.filter(
      (i) =>
        idEq(i.assignedTo, tid) &&
        ![ISSUE_STATUS.RESOLVED, ISSUE_STATUS.CLOSED].includes(i.status)
    );

    const resolutionHours = resolvedInRange
      .map((i) => hoursBetween(i.reportedAt, i.resolvedAt))
      .filter((h) => h != null);
    const avgResolutionHours =
      resolutionHours.length > 0
        ? Math.round(
            (resolutionHours.reduce((a, b) => a + b, 0) / resolutionHours.length) * 10
          ) / 10
        : null;

    // SLA: prefer dueAt; else derive from reportedAt + priority window
    const withSla = resolvedInRange.map((i) => {
      const due =
        effectiveDueAt(i) ||
        (i.reportedAt
          ? new Date(new Date(i.reportedAt).getTime() + 72 * 3600000)
          : new Date(new Date(i.resolvedAt).getTime()));
      return { ...i, _due: due };
    });
    const slaMet = withSla.filter((i) => {
      if (i.slaBreached === true) return false;
      return new Date(i.resolvedAt).getTime() <= new Date(i._due).getTime();
    }).length;
    // Always show a % when there is at least one resolve in range
    const slaPercent =
      resolvedInRange.length > 0
        ? Math.round((slaMet / withSla.length) * 100)
        : null;

    const criticalResolved = resolvedInRange.filter(
      (i) => i.isCritical || i.priority === PRIORITY.CRITICAL
    ).length;

    const maintCompleted = maintenanceDone.filter(
      (m) => m.assignedTo && m.assignedTo.toString() === tid
    ).length;

    return {
      technician: {
        _id: tech._id,
        name: tech.name,
        email: tech.email,
      },
      assignedInRange: assignedInRange.length,
      resolvedInRange: resolvedInRange.length,
      openAssigned: openAssigned.length,
      avgResolutionHours,
      slaPercent,
      criticalResolved,
      maintenanceCompleted: maintCompleted,
      score:
        resolvedInRange.length * 10 +
        criticalResolved * 5 +
        maintCompleted * 3 +
        (slaPercent != null ? Math.round(slaPercent / 10) : 0),
    };
  });

  byTech.sort((a, b) => b.score - a.score);

  return {
    range: { from: start, to: end },
    technicians: byTech,
    rankings: {
      byResolved: [...byTech]
        .sort((a, b) => b.resolvedInRange - a.resolvedInRange)
        .slice(0, 5)
        .map((t) => ({
          name: t.technician.name,
          value: t.resolvedInRange,
        })),
      bySla: [...byTech]
        .filter((t) => t.slaPercent != null)
        .sort((a, b) => b.slaPercent - a.slaPercent)
        .slice(0, 5)
        .map((t) => ({
          name: t.technician.name,
          value: t.slaPercent,
        })),
      byOpenLoad: [...byTech]
        .sort((a, b) => b.openAssigned - a.openAssigned)
        .slice(0, 5)
        .map((t) => ({
          name: t.technician.name,
          value: t.openAssigned,
        })),
    },
  };
};

/**
 * Asset failure ranking + weekly volume (range-scoped — not live dashboard counts).
 */
export const getAnalyticsOverview = async (from, to) => {
  const { start, end } = parseRange(from, to);

  const rangeMatch = {
    reportedAt: { $gte: start, $lte: end },
  };

  const [byWeek, worstAssets, byPriority, resolvedCount, openedCount, breachedCount] =
    await Promise.all([
      Issue.aggregate([
        { $match: rangeMatch },
        {
          $group: {
            _id: {
              y: { $year: '$reportedAt' },
              w: { $isoWeek: '$reportedAt' },
            },
            opened: { $sum: 1 },
          },
        },
        { $sort: { '_id.y': 1, '_id.w': 1 } },
      ]),
      Issue.aggregate([
        { $match: rangeMatch },
        {
          $group: {
            _id: '$asset',
            count: { $sum: 1 },
            critical: {
              $sum: { $cond: [{ $eq: ['$isCritical', true] }, 1, 0] },
            },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 8 },
        {
          $lookup: {
            from: 'assets',
            localField: '_id',
            foreignField: '_id',
            as: 'asset',
          },
        },
        { $unwind: { path: '$asset', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            count: 1,
            critical: 1,
            name: '$asset.name',
            assetCode: '$asset.assetCode',
            location: '$asset.location',
          },
        },
      ]),
      Issue.aggregate([
        { $match: rangeMatch },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Issue.countDocuments({
        resolvedAt: { $gte: start, $lte: end },
      }),
      Issue.countDocuments(rangeMatch),
      Issue.countDocuments({
        ...rangeMatch,
        slaBreached: true,
      }),
    ]);

  // Resolved per week in range
  const resolvedByWeek = await Issue.aggregate([
    {
      $match: {
        resolvedAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: {
          y: { $year: '$resolvedAt' },
          w: { $isoWeek: '$resolvedAt' },
        },
        resolved: { $sum: 1 },
      },
    },
    { $sort: { '_id.y': 1, '_id.w': 1 } },
  ]);

  const weekKey = (y, w) => `${y}-W${String(w).padStart(2, '0')}`;
  const weekMap = {};
  byWeek.forEach((r) => {
    const k = weekKey(r._id.y, r._id.w);
    weekMap[k] = { week: k, opened: r.opened, resolved: 0 };
  });
  resolvedByWeek.forEach((r) => {
    const k = weekKey(r._id.y, r._id.w);
    if (!weekMap[k]) weekMap[k] = { week: k, opened: 0, resolved: 0 };
    weekMap[k].resolved = r.resolved;
  });
  const weeklyTrend = Object.values(weekMap).sort((a, b) =>
    a.week.localeCompare(b.week)
  );

  const priorityBreakdown = {};
  byPriority.forEach((p) => {
    priorityBreakdown[p._id || 'Unknown'] = p.count;
  });

  return {
    range: { from: start, to: end },
    totals: {
      opened: openedCount,
      resolved: resolvedCount,
      slaBreached: breachedCount,
      resolveRate:
        openedCount > 0 ? Math.round((resolvedCount / openedCount) * 100) : null,
    },
    weeklyTrend,
    worstAssets,
    priorityBreakdown,
  };
};
