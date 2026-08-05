import { Server } from 'socket.io';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { verifyAccessToken } from '../utils/token.js';
import User from '../models/User.model.js';

let io = null;

/**
 * Initialize Socket.IO on the HTTP server.
 * Call once from server.js after createServer.
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.clientUrl,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Auth middleware for sockets
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        // Allow anonymous connection for public pages (limited events)
        socket.user = null;
        return next();
      }

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id).select('name email role isActive');
      if (!user || !user.isActive) {
        return next(new Error('Unauthorized'));
      }
      socket.user = user;
      next();
    } catch {
      // Invalid token → treat as guest
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    const userLabel = socket.user
      ? `${socket.user.name} (${socket.user.role})`
      : 'Guest';
    logger.debug(`Socket connected: ${socket.id} – ${userLabel}`);

    // Join personal room for targeted notifications
    if (socket.user) {
      socket.join(`user:${socket.user._id}`);
      socket.join(`role:${socket.user.role}`);
    }

    // Optional: join asset room for public page live updates
    socket.on('join:asset', (publicId) => {
      if (typeof publicId === 'string' && publicId.length < 50) {
        socket.join(`asset:${publicId}`);
      }
    });

    socket.on('leave:asset', (publicId) => {
      if (typeof publicId === 'string') {
        socket.leave(`asset:${publicId}`);
      }
    });

    // Dashboard room for staff
    socket.on('join:dashboard', () => {
      if (socket.user) {
        socket.join('dashboard');
      }
    });

    socket.on('disconnect', (reason) => {
      logger.debug(`Socket disconnected: ${socket.id} – ${reason}`);
    });
  });

  logger.info('Socket.IO initialized');
  return io;
};

/**
 * Get the Socket.IO server instance
 */
export const getIO = () => {
  if (!io) {
    logger.warn('Socket.IO not initialized yet');
  }
  return io;
};

/**
 * Emit helpers
 */
export const emitToUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

export const emitToRole = (role, event, data) => {
  if (!io) return;
  io.to(`role:${role}`).emit(event, data);
};

export const emitToDashboard = (event, data) => {
  if (!io) return;
  io.to('dashboard').emit(event, data);
};

export const emitToAsset = (publicId, event, data) => {
  if (!io) return;
  io.to(`asset:${publicId}`).emit(event, data);
};

export const emitToAll = (event, data) => {
  if (!io) return;
  io.emit(event, data);
};

export default { initSocket, getIO, emitToUser, emitToRole, emitToDashboard, emitToAsset, emitToAll };
