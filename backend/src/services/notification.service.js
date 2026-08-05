import Notification from '../models/Notification.model.js';
import ApiError from '../utils/ApiError.js';
import { emitToUser, emitToDashboard } from '../sockets/index.js';
import logger from '../utils/logger.js';
import User from '../models/User.model.js';
import { sendNotificationEmail } from './email.service.js';

/**
 * Create a notification and push via Socket.IO
 */
export const createNotification = async ({
  recipientId,
  type,
  title,
  message,
  issue = null,
  asset = null,
  link = null,
}) => {
  try {
    const user = await User.findById(recipientId).select(
      'email name notificationPreferences'
    );
    const prefs = user?.notificationPreferences || {};

    // Skip in-app if user disabled
    let notification = null;
    if (prefs.inAppEnabled !== false) {
      notification = await Notification.create({
        recipient: recipientId,
        type,
        title,
        message,
        issue,
        asset,
        link,
      });

      emitToUser(recipientId.toString(), 'notification:new', {
        notification: {
          _id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          issue: notification.issue,
          asset: notification.asset,
          link: notification.link,
          isRead: false,
          createdAt: notification.createdAt,
        },
      });
    }

    // Email (respect type toggles)
    if (user && prefs.emailEnabled !== false) {
      const typeOk =
        (type === 'ISSUE_ASSIGNED' && prefs.emailIssueAssigned !== false) ||
        (type === 'ISSUE_STATUS_UPDATED' && prefs.emailIssueStatus !== false) ||
        (type === 'ISSUE_STATUS_CHANGED' && prefs.emailIssueStatus !== false) ||
        (type === 'MAINTENANCE_DUE' && prefs.emailMaintenanceDue !== false) ||
        !['ISSUE_ASSIGNED', 'ISSUE_STATUS_CHANGED', 'ISSUE_STATUS_UPDATED', 'MAINTENANCE_DUE'].includes(type);

      if (typeOk) {
        // fire-and-forget
        sendNotificationEmail(user, { title, message, link }).catch(() => {});
      }
    }

    return notification;
  } catch (err) {
    logger.error('Failed to create notification', { error: err.message });
    return null;
  }
};

/**
 * Notify technician of assignment
 */
export const notifyIssueAssigned = async (issue, technician) => {
  await createNotification({
    recipientId: technician._id,
    type: 'ISSUE_ASSIGNED',
    title: 'New issue assigned',
    message: `Issue ${issue.issueNumber}: "${issue.title}" has been assigned to you.`,
    issue: issue._id,
    asset: issue.asset,
    link: `/issues/${issue._id}`,
  });

  emitToDashboard('issue:updated', {
    issueId: issue._id,
    issueNumber: issue.issueNumber,
    status: issue.status,
    assignedTo: technician._id,
  });
};

/**
 * Notify on status change
 */
export const notifyIssueStatusChanged = async (issue, previousStatus, actor) => {
  // Notify assignee if different from actor
  if (
    issue.assignedTo &&
    actor &&
    issue.assignedTo.toString() !== actor._id.toString()
  ) {
    await createNotification({
      recipientId: issue.assignedTo,
      type: 'ISSUE_STATUS_UPDATED',
      title: 'Issue status updated',
      message: `Issue ${issue.issueNumber} moved from ${previousStatus} to ${issue.status}`,
      issue: issue._id,
      asset: issue.asset,
      link: `/issues/${issue._id}`,
    });
  }

  emitToDashboard('issue:updated', {
    issueId: issue._id,
    issueNumber: issue.issueNumber,
    status: issue.status,
    previousStatus,
  });
};

/**
 * Critical issue alert to admins/supervisors (via role rooms)
 */
export const notifyCriticalIssue = async (issue) => {
  emitToDashboard('issue:critical', {
    issueId: issue._id,
    issueNumber: issue.issueNumber,
    title: issue.title,
    priority: issue.priority,
  });
};

/**
 * Get notifications for a user
 */
export const getUserNotifications = async (userId, { page = 1, limit = 20, unreadOnly = false } = {}) => {
  const filter = { recipient: userId };
  if (unreadOnly) filter.isRead = false;

  const result = await Notification.paginate(filter, {
    page: parseInt(page, 10),
    limit: Math.min(parseInt(limit, 10) || 20, 50),
    sort: { createdAt: -1 },
    populate: [
      { path: 'issue', select: 'issueNumber title status' },
      { path: 'asset', select: 'name assetCode' },
    ],
  });

  return result;
};

/**
 * Mark one notification as read
 */
export const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId,
  });
  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }
  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }
  return notification;
};

/**
 * Mark all as read
 */
export const markAllAsRead = async (userId) => {
  await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return { success: true };
};

/**
 * Unread count
 */
export const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ recipient: userId, isRead: false });
};
