import User from '../models/User.model.js';
import ApiError from '../utils/ApiError.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  buildTokenPayload,
} from '../utils/token.js';
import { COOKIE_OPTIONS } from '../constants/index.js';
import config from '../config/index.js';
import { writeAudit } from './audit.service.js';

/**
 * Register a new internal user (Admin / Technician / Supervisor).
 * Public reporters never register.
 */
export const registerUser = async ({ name, email, password, role, phone }, actor = null) => {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'Email already registered');
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role,
    phone,
  });

  if (actor) {
    await writeAudit({
      action: 'USER_CREATED',
      actor,
      targetType: 'User',
      targetId: user._id,
      summary: `${actor.name} created ${role} account for ${user.email}`,
      metadata: { role, email: user.email },
    });
  }

  return user;
};

/**
 * Login – returns user + tokens
 */
export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password +refreshToken');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account is deactivated. Contact administrator.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const payload = buildTokenPayload(user);
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Persist refresh token
  user.refreshToken = refreshToken;
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  return { user, accessToken, refreshToken };
};

/**
 * Refresh access token using valid refresh token
 */
export const refreshAccessToken = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    throw new ApiError(401, 'Refresh token missing');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(incomingRefreshToken);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || !user.isActive) {
    throw new ApiError(401, 'User not found or inactive');
  }

  // Token rotation – must match stored token
  if (user.refreshToken !== incomingRefreshToken) {
    // Possible reuse attack – invalidate
    user.refreshToken = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(401, 'Refresh token reuse detected. Please login again.');
  }

  const payload = buildTokenPayload(user);
  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
};

/**
 * Logout – clear refresh token
 */
export const logoutUser = async (userId) => {
  const user = await User.findById(userId).select('+refreshToken');
  if (user) {
    user.refreshToken = undefined;
    await user.save({ validateBeforeSave: false });
  }
};

/**
 * Get current authenticated user profile
 */
export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new ApiError(404, 'User not found');
  }
  return user;
};

/**
 * Helper – set auth cookies on response
 */
export const setAuthCookies = (res, accessToken, refreshToken) => {
  const accessMaxAge = 15 * 60 * 1000; // 15 min default
  const refreshMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

  res.cookie('accessToken', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: accessMaxAge,
  });

  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: refreshMaxAge,
  });
};

/**
 * Helper – clear auth cookies
 */
export const clearAuthCookies = (res) => {
  res.cookie('accessToken', '', { ...COOKIE_OPTIONS, maxAge: 0 });
  res.cookie('refreshToken', '', { ...COOKIE_OPTIONS, maxAge: 0 });
};

/**
 * List active technicians (for assignment dropdowns)
 */
export const listTechnicians = async () => {
  const User = (await import('../models/User.model.js')).default;
  const { ROLES } = await import('../constants/index.js');
  return User.find({ role: ROLES.TECHNICIAN, isActive: true })
    .select('name email phone skills role')
    .sort({ name: 1 })
    .lean();
};

/**
 * List users (Admin) with optional role / search
 */
export const listUsers = async ({ page = 1, limit = 20, role, search } = {}) => {
  const User = (await import('../models/User.model.js')).default;
  const filter = {};
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  return User.paginate(filter, {
    page: parseInt(page, 10) || 1,
    limit: Math.min(parseInt(limit, 10) || 20, 100),
    sort: { createdAt: -1 },
    select: 'name email role phone skills isActive createdAt lastLoginAt',
  });
};

/**
 * Activate / deactivate user (Admin)
 */
export const setUserActive = async (userId, isActive, actorId) => {
  const User = (await import('../models/User.model.js')).default;
  const ApiError = (await import('../utils/ApiError.js')).default;

  if (String(userId) === String(actorId)) {
    throw new ApiError(400, 'You cannot deactivate your own account');
  }

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const prev = user.isActive;
  user.isActive = Boolean(isActive);
  await user.save();

  try {
    const actor = await User.findById(actorId).select('name role');
    await writeAudit({
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      actor,
      targetType: 'User',
      targetId: user._id,
      summary: `${actor?.name || 'Admin'} ${isActive ? 'activated' : 'deactivated'} ${user.email}`,
      metadata: { previous: prev, next: user.isActive },
    });
  } catch {
    /* non-fatal */
  }

  return user;
};
