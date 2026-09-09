const prisma = require('../../config/database');

const FREE_PLAN_MONITOR_LIMIT = 3;

/**
 * Get the workspace that belongs to the given user.
 * Throws 404 if not found.
 */
const getUserWorkspace = async (userId) => {
  const workspace = await prisma.workspace.findFirst({
    where: { userId },
  });
  if (!workspace) {
    const err = new Error('Workspace not found');
    err.status = 404;
    throw err;
  }
  return workspace;
};

/**
 * Assert that a monitor belongs to the user's workspace.
 */
const assertOwnership = async (monitorId, userId) => {
  const monitor = await prisma.monitor.findFirst({
    where: {
      id: monitorId,
      workspace: { userId },
    },
    include: { workspace: true },
  });
  if (!monitor) {
    const err = new Error('Monitor not found');
    err.status = 404;
    throw err;
  }
  return monitor;
};

const listMonitors = async (userId, query = {}) => {
  const workspace = await getUserWorkspace(userId);

  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.monitor.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.monitor.count({ where: { workspaceId: workspace.id } }),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const getMonitor = async (monitorId, userId) => {
  return assertOwnership(monitorId, userId);
};

const createMonitor = async (userId, data) => {
  const workspace = await getUserWorkspace(userId);

  // Enforce free plan limit
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user.plan === 'FREE') {
    const count = await prisma.monitor.count({ where: { workspaceId: workspace.id } });
    if (count >= FREE_PLAN_MONITOR_LIMIT) {
      const err = new Error(
        `Free plan is limited to ${FREE_PLAN_MONITOR_LIMIT} monitors. Upgrade to PRO for unlimited monitors.`
      );
      err.status = 403;
      throw err;
    }
  }

  return prisma.monitor.create({
    data: {
      workspaceId: workspace.id,
      name: data.name,
      url: data.url,
      method: data.method ?? 'GET',
      headers: data.headers ?? {},
      body: data.body ?? null,
      intervalMins: data.intervalMins ?? 5,
      timeoutSecs: data.timeoutSecs ?? 30,
      expectedStatus: data.expectedStatus ?? 200,
      isActive: data.isActive ?? true,
      nextCheck: new Date(), // Schedule immediately
    },
  });
};

const updateMonitor = async (monitorId, userId, data) => {
  const monitor = await assertOwnership(monitorId, userId);

  const updateData = { ...data };

  // If interval changes, reset nextCheck so it fires on the new schedule
  if (data.intervalMins !== undefined && data.intervalMins !== monitor.intervalMins) {
    updateData.nextCheck = new Date();
  }

  return prisma.monitor.update({
    where: { id: monitorId },
    data: updateData,
  });
};

const deleteMonitor = async (monitorId, userId) => {
  await assertOwnership(monitorId, userId);
  await prisma.monitor.delete({ where: { id: monitorId } });
  return { message: 'Monitor deleted successfully' };
};

module.exports = {
  listMonitors,
  getMonitor,
  createMonitor,
  updateMonitor,
  deleteMonitor,
};
