import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import * as authService from '../services/auth.service.js';
import { ROLES } from '../constants/index.js';

/**
 * @desc    Register new user (Admin only in production; open for seed/demo)
 * @route   POST /api/auth/register
 * @access  Public (or Admin-only – controlled by route)
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  // Only allow ADMIN to create other roles in a real deployment.
  // For hackathon seed we keep it open; middleware can restrict later.
  const allowedRole = role && Object.values(ROLES).includes(role) ? role : ROLES.TECHNICIAN;

  const user = await authService.registerUser(
    {
      name,
      email,
      password,
      role: allowedRole,
      phone,
    },
    req.user
  );

  res.status(201).json(
    new ApiResponse(201, { user }, 'User registered successfully')
  );
});

/**
 * @desc    Login
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { user, accessToken, refreshToken } = await authService.loginUser({
    email,
    password,
  });

  authService.setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user,
        accessToken, // also returned for clients that prefer header storage
      },
      'Login successful'
    )
  );
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public (requires valid refresh cookie/token)
 */
export const refresh = asyncHandler(async (req, res) => {
  const incoming =
    req.cookies?.refreshToken ||
    req.body?.refreshToken ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);

  const { user, accessToken, refreshToken } = await authService.refreshAccessToken(incoming);

  authService.setAuthCookies(res, accessToken, refreshToken);

  res.status(200).json(
    new ApiResponse(
      200,
      { user, accessToken },
      'Token refreshed successfully'
    )
  );
});

/**
 * @desc    Logout
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.user._id);
  authService.clearAuthCookies(res);

  res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
});

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user._id);
  res.status(200).json(new ApiResponse(200, { user }, 'Profile fetched'));
});

/**
 * @desc    Update own profile (name, phone)
 * @route   PATCH /api/auth/me
 * @access  Private
 */
export const updateMe = asyncHandler(async (req, res) => {
  const { name, phone, notificationPreferences } = req.body;
  const user = req.user;

  if (name) user.name = name.trim();
  if (phone !== undefined) user.phone = phone?.trim() || undefined;

  if (notificationPreferences && typeof notificationPreferences === 'object') {
    const allowed = [
      'emailEnabled',
      'emailIssueAssigned',
      'emailIssueStatus',
      'emailMaintenanceDue',
      'inAppEnabled',
    ];
    if (!user.notificationPreferences) {
      user.notificationPreferences = {};
    }
    allowed.forEach((key) => {
      if (typeof notificationPreferences[key] === 'boolean') {
        user.notificationPreferences[key] = notificationPreferences[key];
      }
    });
    user.markModified('notificationPreferences');
  }

  await user.save();

  res.status(200).json(new ApiResponse(200, { user }, 'Profile updated'));
});

/**
 * @desc    List active technicians
 * @route   GET /api/auth/technicians
 * @access  Staff
 */
export const listTechnicians = asyncHandler(async (req, res) => {
  const technicians = await authService.listTechnicians();
  res.status(200).json(
    new ApiResponse(200, { technicians }, 'Technicians fetched')
  );
});

/**
 * @desc    List all users (Admin)
 * @route   GET /api/auth/users
 */
export const listUsers = asyncHandler(async (req, res) => {
  const result = await authService.listUsers({
    page: req.query.page,
    limit: req.query.limit,
    role: req.query.role,
    search: req.query.search,
  });
  res.status(200).json(
    new ApiResponse(200, {
      users: result.docs,
      pagination: {
        totalDocs: result.totalDocs,
        limit: result.limit,
        page: result.page,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
    }, 'Users fetched')
  );
});

/**
 * @desc    Activate / deactivate user (Admin)
 * @route   PATCH /api/auth/users/:id/status
 */
export const setUserActive = asyncHandler(async (req, res) => {
  const user = await authService.setUserActive(
    req.params.id,
    req.body.isActive,
    req.user._id
  );
  res.status(200).json(
    new ApiResponse(200, { user }, user.isActive ? 'User activated' : 'User deactivated')
  );
});
