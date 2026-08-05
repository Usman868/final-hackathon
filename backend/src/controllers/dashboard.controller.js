import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { getDashboardSummary } from '../services/dashboard.service.js';

/**
 * @desc    Dashboard summary (cards, charts data, recent activity)
 * @route   GET /api/dashboard/summary
 * @access  Staff
 */
export const getSummary = asyncHandler(async (req, res) => {
  const summary = await getDashboardSummary(req.user);
  res.status(200).json(
    new ApiResponse(200, { summary }, 'Dashboard summary fetched')
  );
});
