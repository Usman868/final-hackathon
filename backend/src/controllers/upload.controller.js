import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import * as uploadService from '../services/upload.service.js';
import { getIssueById } from '../services/issue.service.js';

/**
 * @desc    Upload evidence files to an issue
 * @route   POST /api/issues/:id/evidence
 * @access  Staff (technician only own)
 */
export const uploadEvidence = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'At least one file is required');
  }

  const { issue, uploaded } = await uploadService.uploadIssueEvidence(
    req.params.id,
    req.files,
    req.user
  );

  const populated = await getIssueById(issue._id, req.user);

  res.status(201).json(
    new ApiResponse(
      201,
      { issue: populated, uploaded },
      `${uploaded.length} file(s) uploaded successfully`
    )
  );
});

/**
 * @desc    Delete one evidence item from an issue
 * @route   DELETE /api/issues/:id/evidence/:evidenceId
 * @access  Staff
 */
export const deleteEvidence = asyncHandler(async (req, res) => {
  await uploadService.deleteIssueEvidence(
    req.params.id,
    req.params.evidenceId,
    req.user
  );

  const populated = await getIssueById(req.params.id, req.user);

  res.status(200).json(
    new ApiResponse(200, { issue: populated }, 'Evidence deleted')
  );
});
