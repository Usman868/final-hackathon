import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { HISTORY_ACTIONS } from '../constants/index.js';

/**
 * Permanent, append-only timeline of significant asset events.
 * Soft-delete is disabled; records should never be casually deleted.
 */
const assetHistorySchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: {
        values: Object.values(HISTORY_ACTIONS),
        message: 'Invalid history action',
      },
      required: true,
    },
    // Human-readable summary
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    // Actor – can be a User or null (public reporter)
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    actorName: {
      type: String,
      trim: true,
      default: 'System',
    },
    actorRole: {
      type: String,
      trim: true,
    },
    // Related issue (if any)
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      default: null,
    },
    issueNumber: {
      type: String,
    },
    // Snapshot of relevant data at the time of the event
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Previous → new values for status changes etc.
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    // IP / user-agent optional (for public reports)
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // immutable after creation
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for fast timeline queries
assetHistorySchema.index({ asset: 1, createdAt: -1 });
assetHistorySchema.index({ issue: 1 });
assetHistorySchema.index({ action: 1 });
assetHistorySchema.index({ actor: 1 });
assetHistorySchema.index({ createdAt: -1 });

// Prevent updates / deletes at schema level (application still enforces)
assetHistorySchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
  next(new Error('Asset history records are immutable and cannot be updated'));
});

assetHistorySchema.pre(['deleteOne', 'findOneAndDelete', 'deleteMany'], function (next) {
  next(new Error('Asset history records are permanent and cannot be deleted'));
});

assetHistorySchema.plugin(mongoosePaginate);

const AssetHistory = mongoose.model('AssetHistory', assetHistorySchema);

export default AssetHistory;
