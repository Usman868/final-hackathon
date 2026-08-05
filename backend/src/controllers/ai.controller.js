import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import { runIssueTriage, runMaintenanceSummary } from '../ai/triage.service.js';

/**
 * @desc    AI Issue Triage – returns structured suggestion for human review
 * @route   POST /api/ai/triage
 * @access  Public (for public report flow) + Staff
 *
 * Body: { complaint, assetId? , publicId? }
 * Exactly one of assetId or publicId required.
 */
export const triageIssue = asyncHandler(async (req, res) => {
  const { complaint, assetId, publicId } = req.body;

  if (!complaint || !String(complaint).trim()) {
    throw new ApiError(400, 'Complaint is required');
  }
  if (!assetId && !publicId) {
    throw new ApiError(400, 'Either assetId or publicId is required');
  }

  const result = await runIssueTriage({
    complaint: String(complaint).trim(),
    assetId,
    publicId,
  });

  // Strip rawResponse from public response if desired (keep for debugging in dev)
  const payload = {
    title: result.title,
    category: result.category,
    priority: result.priority,
    possibleCauses: result.possibleCauses,
    initialChecks: result.initialChecks,
    recurringPatternWarning: result.recurringPatternWarning,
    wasAISuggested: result.wasAISuggested,
    wasEditedByUser: false,
    wasAccepted: false,
    wasRejected: false,
    generatedAt: result.generatedAt,
    source: result.source,
  };

  res.status(200).json(
    new ApiResponse(
      200,
      { triage: payload },
      result.source === 'openai'
        ? 'AI triage generated – please review before saving'
        : 'Triage suggestion generated (fallback) – please review before saving'
    )
  );
});

/**
 * @desc    AI Maintenance Summary (optional enhancement)
 * @route   POST /api/ai/maintenance-summary
 * @access  Staff
 */
export const maintenanceSummary = asyncHandler(async (req, res) => {
  const { notes, parts, assetName } = req.body;
  const result = await runMaintenanceSummary({ notes, parts, assetName });
  res.status(200).json(
    new ApiResponse(200, { summary: result }, 'Maintenance summary generated')
  );
});
