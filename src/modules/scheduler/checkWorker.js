const { Worker, Queue } = require('bullmq');
const redis = require('../../config/redis');
const config = require('../../config/env');
const { runCheck } = require('./checkRunner');

const QUEUE_NAME = 'monitor-checks';

/**
 * BullMQ Queue — used by the scheduler to enqueue jobs.
 */
const monitorQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000, // 5s between retries
    },
    removeOnComplete: { count: 100 }, // Keep last 100 completed jobs
    removeOnFail: { count: 200 },     // Keep last 200 failed jobs
  },
});

/**
 * BullMQ Worker — processes monitor-check jobs with bounded concurrency.
 */
const monitorWorker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { monitorId } = job.data;
    await runCheck(monitorId);
  },
  {
    connection: redis,
    concurrency: config.MAX_CONCURRENT_CHECKS,
  }
);

monitorWorker.on('completed', (job) => {
  console.log(`[worker] Job ${job.id} completed (monitor: ${job.data.monitorId})`);
});

monitorWorker.on('failed', (job, err) => {
  console.error(`[worker] Job ${job?.id} failed (monitor: ${job?.data?.monitorId}):`, err.message);
});

monitorWorker.on('error', (err) => {
  console.error('[worker] Worker error:', err.message);
});

module.exports = { monitorQueue, monitorWorker };
