import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import errorMiddleware from './middlewares/error.middleware.js';
import logger from './utils/logger.js';
import ApiResponse from './utils/ApiResponse.js';

const app = express();

// Trust proxy (needed for rate-limit + secure cookies behind reverse proxy)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS – allow frontend origin + credentials
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookies
app.use(cookieParser());

// Compression
app.use(compression());

// HTTP request logging
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Global rate limiter (auth + public endpoints will have tighter limits later)
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});
app.use(globalLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json(
    new ApiResponse(200, {
      status: 'ok',
      environment: config.env,
      timestamp: new Date().toISOString(),
    }, 'MaintainIQ API is healthy')
  );
});

// API root
app.get('/api', (req, res) => {
  res.status(200).json(
    new ApiResponse(200, {
      name: 'MaintainIQ API',
      version: '1.0.0',
      description: 'AI-Powered QR Maintenance & Asset History Platform',
    })
  );
});

// Routes
import authRoutes from './routes/auth.routes.js';
import assetRoutes from './routes/asset.routes.js';
import publicRoutes from './routes/public.routes.js';
import issueRoutes from './routes/issue.routes.js';
import aiRoutes from './routes/ai.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import maintenanceRoutes from './routes/maintenance.routes.js';
import auditRoutes from './routes/audit.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
// ... more routes will be mounted in later modules

app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Central error handler (must be last)
app.use(errorMiddleware);

export default app;
