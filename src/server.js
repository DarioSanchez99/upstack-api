require('dotenv').config();
const app = require('./app');
const config = require('./config/env');
const prisma = require('./config/database');
const { startScheduler, stopScheduler } = require('./modules/scheduler/scheduler');
const { monitorWorker } = require('./modules/scheduler/checkWorker');

const PORT = config.PORT;

const start = async () => {
  // Verify database connection
  try {
    await prisma.$connect();
    console.log('[db] Connected to PostgreSQL');
  } catch (err) {
    console.error('[db] Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  }

  // Start HTTP server
  const server = app.listen(PORT, () => {
    console.log(`[server] Upstack API running on http://localhost:${PORT}`);
    console.log(`[server] Environment: ${config.NODE_ENV}`);
  });

  // Start check engine
  startScheduler();

  // ─── Graceful shutdown ───────────────────────────────────────────────────
  const shutdown = async (signal) => {
    console.log(`\n[server] Received ${signal}. Shutting down gracefully...`);

    // Stop accepting new connections
    server.close(async () => {
      console.log('[server] HTTP server closed');

      try {
        stopScheduler();
        await monitorWorker.close();
        console.log('[worker] BullMQ worker closed');

        await prisma.$disconnect();
        console.log('[db] Database connection closed');

        console.log('[server] Shutdown complete');
        process.exit(0);
      } catch (err) {
        console.error('[server] Error during shutdown:', err.message);
        process.exit(1);
      }
    });

    // Force exit if shutdown takes too long
    setTimeout(() => {
      console.error('[server] Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('[server] Unhandled rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('[server] Uncaught exception:', err.message);
    shutdown('uncaughtException');
  });
};

start();
