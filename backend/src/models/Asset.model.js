import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { nanoid } from 'nanoid';
import {
  ASSET_STATUS,
  ASSET_CONDITION,
  ASSET_CATEGORIES,
} from '../constants/index.js';

const assetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Asset name is required'],
      trim: true,
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    // Unique human-readable code – never changes once set
    assetCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      immutable: true, // cannot be changed after creation
    },
    // Public slug used in QR URL – derived from assetCode, also immutable
    publicId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: ASSET_CATEGORIES,
        message: 'Invalid category',
      },
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    // Safe fields visible on public page
    model: {
      type: String,
      trim: true,
      maxlength: [100, 'Model cannot exceed 100 characters'],
    },
    manufacturer: {
      type: String,
      trim: true,
      maxlength: [100, 'Manufacturer cannot exceed 100 characters'],
    },
    // Private – never exposed on public page
    serialNumber: {
      type: String,
      trim: true,
      select: false,
    },
    purchaseDate: {
      type: Date,
    },
    purchaseCost: {
      type: Number,
      min: [0, 'Purchase cost cannot be negative'],
      select: false,
    },
    condition: {
      type: String,
      enum: {
        values: Object.values(ASSET_CONDITION),
        message: 'Invalid condition',
      },
      default: ASSET_CONDITION.GOOD,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(ASSET_STATUS),
        message: 'Invalid asset status',
      },
      default: ASSET_STATUS.OPERATIONAL,
      required: true,
    },
    assignedTechnician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastServiceDate: {
      type: Date,
    },
    nextServiceDate: {
      type: Date,
    },
    // QR related
    qrCodeUrl: {
      type: String, // Cloudinary or data URL of generated QR
    },
    // Organization label text
    organizationName: {
      type: String,
      default: 'MaintainIQ Demo Organization',
    },
    // Soft flags
    isRetired: {
      type: Boolean,
      default: false,
    },
    retiredAt: {
      type: Date,
    },
    retiredReason: {
      type: String,
      trim: true,
    },
    // Counters for quick dashboard
    totalIssues: {
      type: Number,
      default: 0,
    },
    openIssues: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
assetSchema.index({ assetCode: 1 }, { unique: true });
assetSchema.index({ publicId: 1 }, { unique: true });
assetSchema.index({ status: 1 });
assetSchema.index({ category: 1 });
assetSchema.index({ location: 1 });
assetSchema.index({ assignedTechnician: 1 });
assetSchema.index({ nextServiceDate: 1 });
assetSchema.index({ name: 'text', assetCode: 'text', location: 'text', category: 'text' });
assetSchema.index({ createdAt: -1 });

// Virtual – public URL path (frontend will prepend base)
assetSchema.virtual('publicUrl').get(function () {
  return `/public/asset/${this.publicId}`;
});

// Virtual – populate issues if needed
assetSchema.virtual('issues', {
  ref: 'Issue',
  localField: '_id',
  foreignField: 'asset',
});

// Virtual – history
assetSchema.virtual('history', {
  ref: 'AssetHistory',
  localField: '_id',
  foreignField: 'asset',
});

// Pre-validate: generate assetCode + publicId if not provided
assetSchema.pre('validate', function (next) {
  if (this.isNew && !this.assetCode) {
    // Format: AST-XXXXXX (nanoid 6 chars, uppercase)
    this.assetCode = `AST-${nanoid(6).toUpperCase()}`;
  }
  if (this.isNew && !this.publicId) {
    // publicId is a stable, URL-safe version of assetCode
    this.publicId = this.assetCode.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }
  next();
});

// Ensure nextServiceDate is not before lastServiceDate
assetSchema.pre('save', function (next) {
  if (
    this.nextServiceDate &&
    this.lastServiceDate &&
    this.nextServiceDate < this.lastServiceDate
  ) {
    return next(new Error('Next service date cannot be before last service date'));
  }
  next();
});

assetSchema.plugin(mongoosePaginate);

const Asset = mongoose.model('Asset', assetSchema);

export default Asset;
