import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export const MAINTENANCE_STATUS = Object.freeze({
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  OVERDUE: 'Overdue',
});

export const MAINTENANCE_FREQUENCY = Object.freeze({
  ONE_TIME: 'One-time',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
});

const maintenanceScheduleSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    frequency: {
      type: String,
      enum: Object.values(MAINTENANCE_FREQUENCY),
      default: MAINTENANCE_FREQUENCY.ONE_TIME,
    },
    scheduledDate: {
      type: Date,
      required: true,
      index: true,
    },
    nextDueDate: {
      type: Date,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(MAINTENANCE_STATUS),
      default: MAINTENANCE_STATUS.SCHEDULED,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    completedAt: Date,
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

maintenanceScheduleSchema.index({ status: 1, scheduledDate: 1 });
maintenanceScheduleSchema.index({ assignedTo: 1, status: 1 });
maintenanceScheduleSchema.plugin(mongoosePaginate);

const MaintenanceSchedule = mongoose.model(
  'MaintenanceSchedule',
  maintenanceScheduleSchema
);

export default MaintenanceSchedule;
