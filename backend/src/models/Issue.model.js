import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { nanoid } from 'nanoid';
import {
  ISSUE_STATUS,
  PRIORITY,
  ISSUE_CATEGORIES,
  ISSUE_STATUS_TRANSITIONS,
} from '../constants/index.js';

const evidenceSchema = new mongoose.Schema(
  {
    public_id: { type: String, required: true },
    url: { type: String, required: true },
    resource_type: { type: String, enum: ['image', 'video', 'raw'], default: 'image' },
    format: String,
    bytes: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const partSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, min: 0, default: 0 },
    totalCost: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const aiTriageSchema = new mongoose.Schema(
  {
    // Accept both AI service shape and human-reviewed submit shape
    suggestedTitle: String,
    suggestedCategory: String,
    suggestedPriority: String,
    title: String,
    category: String,
    priority: String,
    possibleCauses: [String],
    initialChecks: [String],
    recurringPatternWarning: String,
    summary: String,
    source: String,
    rawResponse: mongoose.Schema.Types.Mixed,
    // Tracking
    wasAISuggested: { type: Boolean, default: true },
    wasEditedByUser: { type: Boolean, default: false },
    wasAccepted: { type: Boolean, default: false },
    wasRejected: { type: Boolean, default: false },
    generatedAt: { type: Date },
  },
  { _id: false }
);

const issueSchema = new mongoose.Schema(
  {
    // Unique human-readable issue number
    issueNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      immutable: true,
    },
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: [true, 'Asset is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    priority: {
      type: String,
      enum: {
        values: Object.values(PRIORITY),
        message: 'Invalid priority',
      },
      default: PRIORITY.MEDIUM,
      required: true,
    },
    category: {
      type: String,
      enum: {
        values: ISSUE_CATEGORIES,
        message: 'Invalid category',
      },
      default: 'Other',
    },
    status: {
      type: String,
      enum: {
        values: Object.values(ISSUE_STATUS),
        message: 'Invalid issue status',
      },
      default: ISSUE_STATUS.REPORTED,
      required: true,
      index: true,
    },
    // Reporter (public – no user account)
    reporterName: {
      type: String,
      trim: true,
      maxlength: [100, 'Reporter name cannot exceed 100 characters'],
    },
    reporterEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    reporterPhone: {
      type: String,
      trim: true,
    },
    // Assignment
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedAt: {
      type: Date,
    },
    // Maintenance details
    inspectionNotes: {
      type: String,
      trim: true,
      maxlength: [3000, 'Inspection notes cannot exceed 3000 characters'],
    },
    maintenanceNotes: {
      type: String,
      trim: true,
      maxlength: [3000, 'Maintenance notes cannot exceed 3000 characters'],
    },
    completionNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Completion notes cannot exceed 2000 characters'],
    },
    parts: {
      type: [partSchema],
      default: [],
    },
    laborCost: {
      type: Number,
      min: [0, 'Labor cost cannot be negative'],
      default: 0,
    },
    totalCost: {
      type: Number,
      min: [0, 'Total cost cannot be negative'],
      default: 0,
    },
    // Evidence (Cloudinary)
    evidence: {
      type: [evidenceSchema],
      default: [],
    },
    // AI Triage result (advisory)
    aiTriage: {
      type: aiTriageSchema,
      default: null,
    },
    // Timeline timestamps
    reportedAt: {
      type: Date,
      default: Date.now,
    },
    inspectionStartedAt: {
      type: Date,
    },
    maintenanceStartedAt: {
      type: Date,
    },
    resolvedAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
    reopenedAt: {
      type: Date,
    },
    // Who performed key actions
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Flags
    isCritical: {
      type: Boolean,
      default: false,
    },
    requiresParts: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
issueSchema.index({ issueNumber: 1 }, { unique: true });
issueSchema.index({ asset: 1, status: 1 });
issueSchema.index({ assignedTo: 1, status: 1 });
issueSchema.index({ priority: 1 });
issueSchema.index({ category: 1 });
issueSchema.index({ reportedAt: -1 });
issueSchema.index({ title: 'text', description: 'text', issueNumber: 'text' });
issueSchema.index({ isCritical: 1, status: 1 });

// Generate unique issue number
issueSchema.pre('validate', function (next) {
  if (this.isNew && !this.issueNumber) {
    // Format: ISS-XXXXXX
    this.issueNumber = `ISS-${nanoid(6).toUpperCase()}`;
  }
  // Auto-flag critical
  if (this.priority === PRIORITY.CRITICAL) {
    this.isCritical = true;
  }
  next();
});

// Calculate totalCost from parts + labor
issueSchema.pre('save', function (next) {
  const partsTotal = (this.parts || []).reduce((sum, p) => {
    const line = (p.quantity || 0) * (p.unitCost || 0);
    p.totalCost = line;
    return sum + line;
  }, 0);
  this.totalCost = partsTotal + (this.laborCost || 0);

  if (this.totalCost < 0) {
    return next(new Error('Total cost cannot be negative'));
  }
  next();
});

/**
 * Instance method – check if a status transition is allowed.
 * Returns { allowed: boolean, message?: string }
 */
issueSchema.methods.canTransitionTo = function (newStatus) {
  const allowed = ISSUE_STATUS_TRANSITIONS[this.status] || [];
  if (!allowed.includes(newStatus)) {
    return {
      allowed: false,
      message: `Cannot transition from "${this.status}" to "${newStatus}". Allowed: ${allowed.join(', ') || 'none'}`,
    };
  }
  // Business rule: cannot resolve without maintenance note
  if (
    newStatus === ISSUE_STATUS.RESOLVED &&
    (!this.maintenanceNotes || this.maintenanceNotes.trim().length === 0)
  ) {
    return {
      allowed: false,
      message: 'Maintenance note is required before resolving an issue',
    };
  }
  // Closed issues cannot be edited until reopened
  if (this.status === ISSUE_STATUS.CLOSED && newStatus !== ISSUE_STATUS.REOPENED) {
    return {
      allowed: false,
      message: 'Closed issue cannot be modified until reopened',
    };
  }
  return { allowed: true };
};

issueSchema.plugin(mongoosePaginate);

const Issue = mongoose.model('Issue', issueSchema);

export default Issue;
