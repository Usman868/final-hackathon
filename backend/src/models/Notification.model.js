import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'ISSUE_ASSIGNED',
        'ISSUE_STATUS_UPDATED',
        'ISSUE_RESOLVED',
        'ISSUE_REOPENED',
        'MAINTENANCE_DUE',
        'CRITICAL_ISSUE',
        'SYSTEM',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    // Related entities
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
    },
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
    },
    // Read state
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    // Optional deep-link path for frontend
    link: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for inbox queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

notificationSchema.plugin(mongoosePaginate);

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
