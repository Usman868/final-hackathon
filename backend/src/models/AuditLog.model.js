import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    actorName: String,
    actorRole: String,
    targetType: {
      type: String,
      enum: ['User', 'Asset', 'Issue', 'Maintenance', 'System'],
      default: 'System',
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    summary: {
      type: String,
      required: true,
      maxlength: 500,
    },
    metadata: mongoose.Schema.Types.Mixed,
    ipAddress: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.plugin(mongoosePaginate);

// Immutable
auditLogSchema.pre(['updateOne', 'findOneAndUpdate', 'deleteMany', 'deleteOne'], function (next) {
  next(new Error('Audit logs are immutable'));
});

export default mongoose.model('AuditLog', auditLogSchema);
