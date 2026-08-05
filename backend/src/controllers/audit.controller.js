import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as auditService from '../services/audit.service.js';

export const listAuditLogs = asyncHandler(async (req, res) => {
  const result = await auditService.listAuditLogs({
    page: req.query.page,
    limit: req.query.limit,
    action: req.query.action,
    actor: req.query.actor,
  });
  res.status(200).json(
    new ApiResponse(
      200,
      {
        logs: result.docs,
        pagination: {
          totalDocs: result.totalDocs,
          page: result.page,
          totalPages: result.totalPages,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
        },
      },
      'Audit logs fetched'
    )
  );
});
