const prisma = require('../../config/database');

/**
 * Verify a monitor belongs to the user's workspace.
 */
const assertMonitorOwnership = async (monitorId, userId) => {
  const monitor = await prisma.monitor.findFirst({
    where: {
      id: monitorId,
      workspace: { userId },
    },
  });
  if (!monitor) {
    const err = new Error('Monitor not found');
    err.status = 404;
    throw err;
  }
  return monitor;
};

/**
 * Get paginated check results for a monitor.
 */
const getResults = async (monitorId, userId, query = {}) => {
  await assertMonitorOwnership(monitorId, userId);

  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 50));
  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    prisma.checkResult.findMany({
      where: { monitorId },
      orderBy: { checkedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.checkResult.count({ where: { monitorId } }),
  ]);

  return {
    results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Calculate uptime stats for a monitor.
 * Returns uptime % for last 7 and 30 days, and avg response time.
 */
const getStats = async (monitorId, userId) => {
  await assertMonitorOwnership(monitorId, userId);

  const now = new Date();
  const day7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const day30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [results7d, results30d] = await Promise.all([
    prisma.checkResult.findMany({
      where: { monitorId, checkedAt: { gte: day7Ago } },
      select: { status: true, responseTimeMs: true },
    }),
    prisma.checkResult.findMany({
      where: { monitorId, checkedAt: { gte: day30Ago } },
      select: { status: true, responseTimeMs: true },
    }),
  ]);

  const calcUptime = (results) => {
    if (results.length === 0) return null;
    const upCount = results.filter((r) => r.status === 'UP').length;
    return parseFloat(((upCount / results.length) * 100).toFixed(2));
  };

  const avgResponseTime = (results) => {
    const withTime = results.filter((r) => r.responseTimeMs !== null);
    if (withTime.length === 0) return null;
    const sum = withTime.reduce((acc, r) => acc + r.responseTimeMs, 0);
    return Math.round(sum / withTime.length);
  };

  return {
    uptime7d: calcUptime(results7d),
    uptime30d: calcUptime(results30d),
    avgResponseTimeMs7d: avgResponseTime(results7d),
    totalChecks7d: results7d.length,
    totalChecks30d: results30d.length,
  };
};

module.exports = { getResults, getStats };
