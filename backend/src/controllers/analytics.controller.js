import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as analyticsService from '../services/analytics.service.js';

export const getTechnicianPerformance = asyncHandler(async (req, res) => {
  const data = await analyticsService.getTechnicianPerformance(
    req.query.from,
    req.query.to
  );
  res
    .status(200)
    .json(new ApiResponse(200, data, 'Technician performance fetched'));
});

export const getAnalyticsOverview = asyncHandler(async (req, res) => {
  const data = await analyticsService.getAnalyticsOverview(
    req.query.from,
    req.query.to
  );
  res.status(200).json(new ApiResponse(200, data, 'Analytics overview fetched'));
});
