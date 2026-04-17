const IORedis = require('ioredis');
const config = require('./env');

const redis = new IORedis(config.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,    // Improves startup reliability
  lazyConnect: false,
});

redis.on('connect', () => {
  console.log('[redis] Connected to Redis');
});

redis.on('error', (err) => {
  console.error('[redis] Connection error:', err.message);
});

redis.on('reconnecting', () => {
  console.warn('[redis] Reconnecting...');
});

module.exports = redis;
