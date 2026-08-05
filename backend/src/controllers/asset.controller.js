import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as assetService from '../services/asset.service.js';
import AssetHistory from '../models/AssetHistory.model.js';

/**
 * @desc    Create asset
 * @route   POST /api/assets
 * @access  Admin
 */
export const createAsset = asyncHandler(async (req, res) => {
  const { asset, publicUrl } = await assetService.createAsset(req.body, req.user);

  res.status(201).json(
    new ApiResponse(
      201,
      { asset, publicUrl },
      'Asset created successfully'
    )
  );
});

/**
 * @desc    List assets with search / filters / pagination
 * @route   GET /api/assets
 * @access  Staff (Admin, Technician, Supervisor)
 */
export const getAssets = asyncHandler(async (req, res) => {
  const result = await assetService.getAssets(req.query);

  res.status(200).json(
    new ApiResponse(200, {
      assets: result.docs,
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
    }, 'Assets fetched')
  );
});

/**
 * @desc    Get single asset (full)
 * @route   GET /api/assets/:id
 * @access  Staff
 */
export const getAssetById = asyncHandler(async (req, res) => {
  const asset = await assetService.getAssetById(req.params.id);
  res.status(200).json(new ApiResponse(200, { asset }, 'Asset fetched'));
});

/**
 * @desc    Update asset
 * @route   PATCH /api/assets/:id
 * @access  Admin
 */
export const updateAsset = asyncHandler(async (req, res) => {
  const asset = await assetService.updateAsset(req.params.id, req.body, req.user);
  res.status(200).json(new ApiResponse(200, { asset }, 'Asset updated'));
});

/**
 * @desc    Retire asset
 * @route   POST /api/assets/:id/retire
 * @access  Admin
 */
export const retireAsset = asyncHandler(async (req, res) => {
  const asset = await assetService.retireAsset(
    req.params.id,
    req.body.reason,
    req.user
  );
  res.status(200).json(new ApiResponse(200, { asset }, 'Asset retired'));
});

/**
 * @desc    Get QR code + label data
 * @route   GET /api/assets/:id/qr
 * @access  Staff
 */
export const getAssetQR = asyncHandler(async (req, res) => {
  const data = await assetService.getAssetQR(req.params.id);
  res.status(200).json(new ApiResponse(200, data, 'QR data fetched'));
});

/**
 * @desc    Get asset history timeline
 * @route   GET /api/assets/:id/history
 * @access  Staff
 */
export const getAssetHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

  const result = await AssetHistory.paginate(
    { asset: req.params.id },
    {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [
        { path: 'actor', select: 'name role' },
        { path: 'issue', select: 'issueNumber title status' },
      ],
    }
  );

  res.status(200).json(
    new ApiResponse(200, {
      history: result.docs,
      pagination: {
        totalDocs: result.totalDocs,
        limit: result.limit,
        page: result.page,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
    }, 'History fetched')
  );
});

/**
 * @desc    Asset stats for dashboard
 * @route   GET /api/assets/stats/summary
 * @access  Staff
 */
export const getAssetStats = asyncHandler(async (req, res) => {
  const stats = await assetService.getAssetStats();
  res.status(200).json(new ApiResponse(200, { stats }, 'Asset stats fetched'));
});

/**
 * @desc    Public safe asset page data
 * @route   GET /api/public/assets/:publicId
 * @access  Public (no auth)
 */
export const getPublicAsset = asyncHandler(async (req, res) => {
  const asset = await assetService.getPublicAsset(req.params.publicId);
  res.status(200).json(new ApiResponse(200, { asset }, 'Public asset data'));
});
