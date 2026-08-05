import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { verifyAccessToken } from '../utils/token.js';
import User from '../models/User.model.js';
import { ROLES } from '../constants/index.js';

/**
 * Protect routes – require valid Access Token (cookie or Authorization header).
 * Attaches req.user (lean user document without sensitive fields).
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Cookie
  if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }
  // 2. Authorization: Bearer <token>
  else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Authentication required. Please login.');
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Access token expired. Please refresh.');
    }
    throw new ApiError(401, 'Invalid access token');
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'User no longer exists or is deactivated');
  }

  req.user = user;
  next();
});

/**
 * Restrict to specific roles.
 * Usage: restrictTo(ROLES.ADMIN, ROLES.SUPERVISOR)
 */
export const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ApiError(403, `Role "${req.user.role}" is not allowed to perform this action`)
      );
    }
    next();
  };
};

/**
 * Optional auth – attaches user if token present, otherwise continues as guest.
 * Useful for public endpoints that behave differently when logged in.
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;
  if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);
    if (user && user.isActive) {
      req.user = user;
    }
  } catch {
    // ignore invalid token for optional auth
  }
  next();
});

/**
 * Convenience role checkers
 */
export const isAdmin = restrictTo(ROLES.ADMIN);
export const isTechnician = restrictTo(ROLES.TECHNICIAN);
export const isSupervisor = restrictTo(ROLES.SUPERVISOR);
export const isAdminOrSupervisor = restrictTo(ROLES.ADMIN, ROLES.SUPERVISOR);
export const isAdminOrTechnician = restrictTo(ROLES.ADMIN, ROLES.TECHNICIAN);
export const isStaff = restrictTo(ROLES.ADMIN, ROLES.TECHNICIAN, ROLES.SUPERVISOR);
