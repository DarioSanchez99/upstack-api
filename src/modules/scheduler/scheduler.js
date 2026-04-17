const cron = require('node-cron');
const prisma = require('../../config/database');
const { monitorQueue } = require('./checkWorker');
const config = require('../../config/env');

let schedulerTask = null;

/**
 * Find all active monitors whose nextCheck time has passed
 * and enqueue them for execution.
 */
const dispatchDueChecks = async () => {
  if (!config.CHECK_ENGINE_ENABLED) return;

  try {
    const dueMonitors = await prisma.monitor.findMany({
      where: {
        isActive: true,
        nextCheck: {
          lte: new Date(),
        },
      },
      select: { id: true, name: true },
    });

    if (dueMonitors.length === 0) return;

    console.log(`[scheduler] Dispatching ${dueMonitors.length} due checks`);

    const jobs = dueMonitors.map((monitor) => ({
      name: 'check',
      data: { monitorId: monitor.id },
      opts: {
        jobId: `check-${monitor.id}-${Date.now()}`, // unique per run
      },
    }));

    await monitorQueue.addBulk(jobs);
  } catch (err) {
    console.error('[scheduler] Error dispatching checks:', err.message);
  }
};

/**
 * Start the cron scheduler (runs every minute).
 */
const startScheduler = () => {
  if (!config.CHECK_ENGINE_ENABLED) {
    console.log('[scheduler] Check engine disabled via CHECK_ENGINE_ENABLED=false');
    return;
  }

  console.log('[scheduler] Starting check engine (every 1 minute)');

  schedulerTask = cron.schedule('* * * * *', dispatchDueChecks, {
    scheduled: true,
    timezone: 'UTC',
  });
};

/**
 * Stop the cron scheduler gracefully.
 */
const stopScheduler = () => {
  if (schedulerTask) {
    schedulerTask.stop();
    console.log('[scheduler] Check engine stopped');
  }
};

module.exports = { startScheduler, stopScheduler };
