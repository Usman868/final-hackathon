import MaintenanceSchedule, {
  MAINTENANCE_STATUS,
  MAINTENANCE_FREQUENCY,
} from '../models/MaintenanceSchedule.model.js';
import Asset from '../models/Asset.model.js';
import ApiError from '../utils/ApiError.js';
import { logAssetHistory, HISTORY_ACTIONS } from '../helpers/history.helper.js';
import { createNotification } from './notification.service.js';
import { ROLES } from '../constants/index.js';

function addFrequency(date, frequency) {
  const d = new Date(date);
  switch (frequency) {
    case MAINTENANCE_FREQUENCY.WEEKLY:
      d.setDate(d.getDate() + 7);
      break;
    case MAINTENANCE_FREQUENCY.MONTHLY:
      d.setMonth(d.getMonth() + 1);
      break;
    case MAINTENANCE_FREQUENCY.QUARTERLY:
      d.setMonth(d.getMonth() + 3);
      break;
    case MAINTENANCE_FREQUENCY.YEARLY:
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      return null; // one-time
  }
  return d;
}

export const listSchedules = async (query = {}, currentUser = null) => {
  const {
    page = 1,
    limit = 15,
    status,
    asset,
    assignedTo,
    search,
  } = query;

  const filter = {};
  if (status) filter.status = status;
  if (asset) filter.asset = asset;
  if (assignedTo) filter.assignedTo = assignedTo;

  if (currentUser?.role === ROLES.TECHNICIAN) {
    filter.assignedTo = currentUser._id;
  }

  if (search) {
    filter.title = { $regex: search, $options: 'i' };
  }

  return MaintenanceSchedule.paginate(filter, {
    page: parseInt(page, 10) || 1,
    limit: Math.min(parseInt(limit, 10) || 15, 50),
    sort: { scheduledDate: 1 },
    populate: [
      { path: 'asset', select: 'name assetCode location status' },
      { path: 'assignedTo', select: 'name email' },
      { path: 'createdBy', select: 'name' },
    ],
  });
};

export const getScheduleById = async (id) => {
  const doc = await MaintenanceSchedule.findById(id)
    .populate('asset', 'name assetCode location status')
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name')
    .populate('completedBy', 'name');
  if (!doc) throw new ApiError(404, 'Maintenance schedule not found');
  return doc;
};

export const createSchedule = async (payload, actor) => {
  const asset = await Asset.findById(payload.asset);
  if (!asset) throw new ApiError(404, 'Asset not found');

  const scheduledDate = new Date(payload.scheduledDate);
  const doc = await MaintenanceSchedule.create({
    asset: asset._id,
    title: payload.title.trim(),
    description: payload.description?.trim(),
    frequency: payload.frequency || MAINTENANCE_FREQUENCY.ONE_TIME,
    scheduledDate,
    nextDueDate: scheduledDate,
    status: MAINTENANCE_STATUS.SCHEDULED,
    assignedTo: payload.assignedTo || undefined,
    createdBy: actor._id,
    priority: payload.priority || 'Medium',
    notes: payload.notes?.trim(),
  });

  await logAssetHistory({
    assetId: asset._id,
    action: HISTORY_ACTIONS.SERVICE_SCHEDULED || 'SERVICE_SCHEDULED',
    description: `Maintenance scheduled: ${doc.title}`,
    actor: actor._id,
    actorName: actor.name,
    actorRole: actor.role,
  });

  if (doc.assignedTo) {
    await createNotification({
      recipientId: doc.assignedTo,
      type: 'MAINTENANCE_DUE',
      title: 'Maintenance assigned',
      message: `"${doc.title}" scheduled for ${scheduledDate.toLocaleDateString()} on ${asset.name}`,
      asset: asset._id,
      link: `/maintenance`,
    });
  }

  return getScheduleById(doc._id);
};

export const updateSchedule = async (id, payload, actor) => {
  const doc = await MaintenanceSchedule.findById(id);
  if (!doc) throw new ApiError(404, 'Maintenance schedule not found');
  if (doc.status === MAINTENANCE_STATUS.COMPLETED) {
    throw new ApiError(400, 'Completed schedules cannot be edited');
  }

  const fields = ['title', 'description', 'frequency', 'priority', 'notes'];
  fields.forEach((f) => {
    if (payload[f] !== undefined) doc[f] = payload[f];
  });
  if (payload.scheduledDate) {
    doc.scheduledDate = new Date(payload.scheduledDate);
    doc.nextDueDate = doc.scheduledDate;
  }
  if (payload.assignedTo !== undefined) {
    doc.assignedTo = payload.assignedTo || undefined;
  }
  if (payload.status && Object.values(MAINTENANCE_STATUS).includes(payload.status)) {
    doc.status = payload.status;
  }

  await doc.save();
  return getScheduleById(doc._id);
};

export const completeSchedule = async (id, notes, actor) => {
  const doc = await MaintenanceSchedule.findById(id);
  if (!doc) throw new ApiError(404, 'Maintenance schedule not found');
  if (doc.status === MAINTENANCE_STATUS.COMPLETED) {
    throw new ApiError(400, 'Already completed');
  }
  if (doc.status === MAINTENANCE_STATUS.CANCELLED) {
    throw new ApiError(400, 'Cannot complete a cancelled schedule');
  }

  doc.status = MAINTENANCE_STATUS.COMPLETED;
  doc.completedAt = new Date();
  doc.completedBy = actor._id;
  if (notes) doc.notes = notes;

  // Recurring → create next occurrence
  const next = addFrequency(doc.scheduledDate, doc.frequency);
  await doc.save();

  const asset = await Asset.findById(doc.asset);
  if (asset) {
    if (next) {
      asset.nextServiceDate = next;
      await asset.save();
      await MaintenanceSchedule.create({
        asset: doc.asset,
        title: doc.title,
        description: doc.description,
        frequency: doc.frequency,
        scheduledDate: next,
        nextDueDate: next,
        status: MAINTENANCE_STATUS.SCHEDULED,
        assignedTo: doc.assignedTo,
        createdBy: actor._id,
        priority: doc.priority,
      });
    } else if (doc.scheduledDate) {
      asset.lastServiceDate = doc.completedAt;
      await asset.save();
    }

    await logAssetHistory({
      assetId: doc.asset,
      action: HISTORY_ACTIONS.MAINTENANCE_PERFORMED || 'MAINTENANCE_PERFORMED',
      description: `Scheduled maintenance completed: ${doc.title}`,
      actor: actor._id,
      actorName: actor.name,
      actorRole: actor.role,
    });
  }

  return getScheduleById(doc._id);
};

export const cancelSchedule = async (id, actor) => {
  const doc = await MaintenanceSchedule.findById(id);
  if (!doc) throw new ApiError(404, 'Maintenance schedule not found');
  if (doc.status === MAINTENANCE_STATUS.COMPLETED) {
    throw new ApiError(400, 'Cannot cancel completed schedule');
  }
  doc.status = MAINTENANCE_STATUS.CANCELLED;
  await doc.save();
  return getScheduleById(doc._id);
};

/**
 * Mark overdue + notify assignees (cron)
 */
export const processDueMaintenance = async () => {
  const now = new Date();
  const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Overdue
  await MaintenanceSchedule.updateMany(
    {
      status: MAINTENANCE_STATUS.SCHEDULED,
      scheduledDate: { $lt: now },
    },
    { $set: { status: MAINTENANCE_STATUS.OVERDUE } }
  );

  // Due within 3 days – notify once per day roughly via type
  const upcoming = await MaintenanceSchedule.find({
    status: { $in: [MAINTENANCE_STATUS.SCHEDULED, MAINTENANCE_STATUS.OVERDUE] },
    scheduledDate: { $lte: inThreeDays },
    assignedTo: { $ne: null },
  })
    .populate('asset', 'name assetCode')
    .limit(50);

  for (const s of upcoming) {
    await createNotification({
      recipientId: s.assignedTo,
      type: 'MAINTENANCE_DUE',
      title:
        s.status === MAINTENANCE_STATUS.OVERDUE
          ? 'Maintenance overdue'
          : 'Maintenance due soon',
      message: `"${s.title}" on ${s.asset?.name || 'asset'} – ${new Date(s.scheduledDate).toLocaleDateString()}`,
      asset: s.asset?._id || s.asset,
      link: '/maintenance',
    });
  }

  return { upcoming: upcoming.length };
};
