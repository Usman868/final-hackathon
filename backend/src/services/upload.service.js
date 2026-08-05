import { cloudinary, isConfigured } from '../cloudinary/index.js';
import ApiError from '../utils/ApiError.js';
import Issue from '../models/Issue.model.js';
import { logAssetHistory, HISTORY_ACTIONS } from '../helpers/history.helper.js';
import logger from '../utils/logger.js';
import { ROLES } from '../constants/index.js';

/**
 * Upload a single buffer to Cloudinary
 */
const uploadBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'maintainiq/evidence',
        resource_type: options.resource_type || 'auto',
        transformation:
          options.resource_type === 'image'
            ? [{ quality: 'auto:good', fetch_format: 'auto' }]
            : undefined,
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

/**
 * Upload one or more evidence files and attach to an issue
 */
export const uploadIssueEvidence = async (issueId, files, actor) => {
  if (!isConfigured) {
    throw new ApiError(
      503,
      'File upload service is not configured. Please set Cloudinary credentials.'
    );
  }

  if (!files || files.length === 0) {
    throw new ApiError(400, 'No files provided');
  }

  const issue = await Issue.findById(issueId);
  if (!issue) {
    throw new ApiError(404, 'Issue not found');
  }

  // Technician may only upload to own assigned issues
  if (actor.role === ROLES.TECHNICIAN) {
    if (!issue.assignedTo || issue.assignedTo.toString() !== actor._id.toString()) {
      throw new ApiError(403, 'You can only upload evidence to issues assigned to you');
    }
  }

  const uploaded = [];

  for (const file of files) {
    const isVideo = file.mimetype.startsWith('video/');
    try {
      const result = await uploadBuffer(file.buffer, {
        folder: `maintainiq/evidence/${issue.issueNumber}`,
        resource_type: isVideo ? 'video' : 'image',
        public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '').slice(0, 40)}`,
      });

      const evidenceItem = {
        public_id: result.public_id,
        url: result.secure_url,
        resource_type: result.resource_type,
        format: result.format,
        bytes: result.bytes,
        uploadedBy: actor._id,
        uploadedAt: new Date(),
      };

      issue.evidence.push(evidenceItem);
      uploaded.push(evidenceItem);
    } catch (err) {
      logger.error('Cloudinary upload failed', {
        error: err.message,
        filename: file.originalname,
      });
      throw new ApiError(500, `Failed to upload ${file.originalname}: ${err.message}`);
    }
  }

  await issue.save();

  await logAssetHistory({
    assetId: issue.asset,
    action: HISTORY_ACTIONS.EVIDENCE_UPLOADED,
    description: `${uploaded.length} evidence file(s) uploaded to issue ${issue.issueNumber}`,
    actor,
    issue: issue._id,
    issueNumber: issue.issueNumber,
    metadata: {
      count: uploaded.length,
      files: uploaded.map((u) => ({ public_id: u.public_id, resource_type: u.resource_type })),
    },
  });

  return { issue, uploaded };
};

/**
 * Delete a single evidence item from an issue + Cloudinary
 */
export const deleteIssueEvidence = async (issueId, evidenceId, actor) => {
  if (!isConfigured) {
    throw new ApiError(503, 'File upload service is not configured');
  }

  const issue = await Issue.findById(issueId);
  if (!issue) {
    throw new ApiError(404, 'Issue not found');
  }

  if (actor.role === ROLES.TECHNICIAN) {
    if (!issue.assignedTo || issue.assignedTo.toString() !== actor._id.toString()) {
      throw new ApiError(403, 'You can only manage evidence on issues assigned to you');
    }
  }

  const evidenceItem = issue.evidence.id(evidenceId);
  if (!evidenceItem) {
    throw new ApiError(404, 'Evidence item not found');
  }

  // Delete from Cloudinary
  try {
    await cloudinary.uploader.destroy(evidenceItem.public_id, {
      resource_type: evidenceItem.resource_type || 'image',
    });
  } catch (err) {
    logger.warn('Cloudinary delete failed (continuing to remove from DB)', {
      public_id: evidenceItem.public_id,
      error: err.message,
    });
  }

  evidenceItem.deleteOne();
  await issue.save();

  return issue;
};

/**
 * Generic single-file upload (e.g. avatar later)
 */
export const uploadSingleFile = async (file, folder = 'maintainiq/misc') => {
  if (!isConfigured) {
    throw new ApiError(503, 'File upload service is not configured');
  }
  if (!file) {
    throw new ApiError(400, 'No file provided');
  }

  const isVideo = file.mimetype.startsWith('video/');
  const result = await uploadBuffer(file.buffer, {
    folder,
    resource_type: isVideo ? 'video' : 'image',
  });

  return {
    public_id: result.public_id,
    url: result.secure_url,
    resource_type: result.resource_type,
    format: result.format,
    bytes: result.bytes,
  };
};
