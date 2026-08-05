import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as issueService from '../services/issue.service.js';

/**
 * @desc    Public report issue against asset
 * @route   POST /api/public/assets/:publicId/issues
 * @access  Public
 */
export const createPublicIssue = asyncHandler(async (req, res) => {
  const issue = await issueService.createPublicIssue(
    {
      publicId: req.params.publicId,
      ...req.body,
    },
    {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    }
  );

  res.status(201).json(
    new ApiResponse(
      201,
      {
        issue: {
          _id: issue._id,
          issueNumber: issue.issueNumber,
          title: issue.title,
          status: issue.status,
          priority: issue.priority,
          reportedAt: issue.reportedAt,
        },
      },
      'Issue reported successfully'
    )
  );
});

/**
 * @desc    Create issue internally
 * @route   POST /api/issues
 * @access  Staff
 */
export const createInternalIssue = asyncHandler(async (req, res) => {
  const issue = await issueService.createInternalIssue(req.body, req.user);
  res.status(201).json(new ApiResponse(201, { issue }, 'Issue created'));
});

/**
 * @desc    List issues
 * @route   GET /api/issues
 * @access  Staff
 */
export const getIssues = asyncHandler(async (req, res) => {
  const result = await issueService.getIssues(req.query, req.user);

  res.status(200).json(
    new ApiResponse(200, {
      issues: result.docs,
      pagination: {
        totalDocs: result.totalDocs,
        limit: result.limit,
        page: result.page,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
        nextPage: result.nextPage,
        prevPage: result.prevPage,
      },
    }, 'Issues fetched')
  );
});

/**
 * @desc    Get single issue
 * @route   GET /api/issues/:id
 * @access  Staff
 */
export const getIssueById = asyncHandler(async (req, res) => {
  const issue = await issueService.getIssueById(req.params.id, req.user);
  res.status(200).json(new ApiResponse(200, { issue }, 'Issue fetched'));
});

/**
 * @desc    Assign issue to technician
 * @route   POST /api/issues/:id/assign
 * @access  Admin / Supervisor
 */
export const assignIssue = asyncHandler(async (req, res) => {
  const issue = await issueService.assignIssue(
    req.params.id,
    req.body.technicianId,
    req.user
  );
  // Re-fetch populated
  const populated = await issueService.getIssueById(issue._id, req.user);
  res.status(200).json(new ApiResponse(200, { issue: populated }, 'Issue assigned'));
});

/**
 * @desc    Transition issue status
 * @route   PATCH /api/issues/:id/status
 * @access  Staff (technician only own)
 */
export const transitionStatus = asyncHandler(async (req, res) => {
  const { status, ...extra } = req.body;
  const issue = await issueService.transitionIssueStatus(
    req.params.id,
    status,
    req.user,
    extra
  );
  const populated = await issueService.getIssueById(issue._id, req.user);
  res.status(200).json(new ApiResponse(200, { issue: populated }, 'Status updated'));
});

/**
 * @desc    Update issue details (notes, parts, etc.)
 * @route   PATCH /api/issues/:id
 * @access  Staff (technician only own)
 */
export const updateIssue = asyncHandler(async (req, res) => {
  const issue = await issueService.updateIssueDetails(
    req.params.id,
    req.body,
    req.user
  );
  const populated = await issueService.getIssueById(issue._id, req.user);
  res.status(200).json(new ApiResponse(200, { issue: populated }, 'Issue updated'));
});

/**
 * @desc    Issue stats for dashboard
 * @route   GET /api/issues/stats/summary
 * @access  Staff
 */
export const getIssueStats = asyncHandler(async (req, res) => {
  const stats = await issueService.getIssueStats();
  res.status(200).json(new ApiResponse(200, { stats }, 'Issue stats fetched'));
});
