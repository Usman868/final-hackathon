import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

/**
 * Detailed maintenance record linked to an issue.
 * Provides structured data for reports and AI summary.
 */
const maintenanceLogSchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: true,
      index: true,
    },
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workPerformed: {
      type: String,
      required: [true, 'Work performed description is required'],
      trim: true,
      maxlength: [3000, 'Work performed cannot exceed 3000 characters'],
    },
    findings: {
      type: String,
      trim: true,
      maxlength: [2000, 'Findings cannot exceed 2000 characters'],
    },
    partsUsed: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitCost: { type: Number, min: 0, default: 0 },
        totalCost: { type: Number, min: 0, default: 0 },
      },
    ],
    laborHours: {
      type: Number,
      min: 0,
      default: 0,
    },
    laborCost: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalCost: {
      type: Number,
      min: 0,
      default: 0,
    },
    finalCondition: {
      type: String,
      enum: ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'],
    },
    nextRecommendedService: {
      type: Date,
    },
    // AI-generated professional summary (optional)
    aiSummary: {
      text: String,
      generatedAt: Date,
      wasEdited: { type: Boolean, default: false },
    },
    evidence: [
      {
        public_id: String,
        url: String,
        resource_type: { type: String, enum: ['image', 'video', 'raw'] },
      },
    ],
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
maintenanceLogSchema.index({ issue: 1 });
maintenanceLogSchema.index({ asset: 1, completedAt: -1 });
maintenanceLogSchema.index({ performedBy: 1 });
maintenanceLogSchema.index({ completedAt: -1 });

// Calculate totalCost
maintenanceLogSchema.pre('save', function (next) {
  const partsTotal = (this.partsUsed || []).reduce((sum, p) => {
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

maintenanceLogSchema.plugin(mongoosePaginate);

const MaintenanceLog = mongoose.model('MaintenanceLog', maintenanceLogSchema);

export default MaintenanceLog;
