import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import config from "./config/index.js";
import logger from "./utils/logger.js";
import { initSocket } from "./sockets/index.js";
import { startMaintenanceCron } from "./jobs/maintenance.cron.js";

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Create HTTP server
    const server = http.createServer(app);

    // Attach Socket.IO
    initSocket(server);

    // Daily maintenance reminders
    startMaintenanceCron();

    server.listen(config.port, () => {
      logger.info(
        `MaintainIQ API running on port ${config.port} [${config.env}]`,
      );
      logger.info(`Health check → http://localhost:${config.port}/api/health`);
      logger.info(`Socket.IO ready`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });
      // Force exit after 10s
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    process.on("unhandledRejection", (reason) => {
      logger.error("Unhandled Rejection", { reason: String(reason) });
    });

    process.on("uncaughtException", (err) => {
      logger.error("Uncaught Exception", {
        message: err.message,
        stack: err.stack,
      });
      process.exit(1);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
