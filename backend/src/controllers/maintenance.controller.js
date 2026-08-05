import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as maintenanceService from '../services/maintenance.service.js';

export const listSchedules = asyncHandler(async (req, res) => {
  const result = await maintenanceService.listSchedules(req.query, req.user);
  res.status(200).json(
    new ApiResponse(
      200,
      {
        schedules: result.docs,
        pagination: {
          totalDocs: result.totalDocs,
          limit: result.limit,
          page: result.page,
          totalPages: result.totalPages,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
        },
      },
      'Maintenance schedules fetched'
    )
  );
});

export const getSchedule = asyncHandler(async (req, res) => {
  const schedule = await maintenanceService.getScheduleById(req.params.id);
  res.status(200).json(new ApiResponse(200, { schedule }, 'Schedule fetched'));
});

export const createSchedule = asyncHandler(async (req, res) => {
  const schedule = await maintenanceService.createSchedule(req.body, req.user);
  res.status(201).json(new ApiResponse(201, { schedule }, 'Schedule created'));
});

export const updateSchedule = asyncHandler(async (req, res) => {
  const schedule = await maintenanceService.updateSchedule(
    req.params.id,
    req.body,
    req.user
  );
  res.status(200).json(new ApiResponse(200, { schedule }, 'Schedule updated'));
});

export const completeSchedule = asyncHandler(async (req, res) => {
  const schedule = await maintenanceService.completeSchedule(
    req.params.id,
    req.body.notes,
    req.user
  );
  res.status(200).json(new ApiResponse(200, { schedule }, 'Maintenance completed'));
});

export const cancelSchedule = asyncHandler(async (req, res) => {
  const schedule = await maintenanceService.cancelSchedule(req.params.id, req.user);
  res.status(200).json(new ApiResponse(200, { schedule }, 'Schedule cancelled'));
});
