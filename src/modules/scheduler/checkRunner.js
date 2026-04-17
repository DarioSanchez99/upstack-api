const axios = require('axios');
const prisma = require('../../config/database');
const { sendAlert } = require('../alerts/alerts.service');

/**
 * Determine check status from response time and status code.
 */
const determineStatus = (statusCode, responseTimeMs, expectedStatus, timeoutSecs) => {
  const timeoutMs = timeoutSecs * 1000;

  if (statusCode !== expectedStatus) return 'DOWN';
  if (responseTimeMs >= timeoutMs) return 'DOWN';
  if (responseTimeMs >= timeoutMs * 0.5) return 'DEGRADED';
  return 'UP';
};

/**
 * Run a single HTTP check for a monitor, persist the result, and trigger alerts.
 */
const runCheck = async (monitorId) => {
  const monitor = await prisma.monitor.findUnique({ where: { id: monitorId } });
  if (!monitor) {
    console.warn(`[checkRunner] Monitor ${monitorId} not found, skipping`);
    return;
  }

  const previousStatus = monitor.status;
  let statusCode = null;
  let responseTimeMs = null;
  let errorMessage = null;
  let newStatus = 'DOWN';

  const startTime = Date.now();

  try {
    const response = await axios({
      method: monitor.method.toLowerCase(),
      url: monitor.url,
      headers: monitor.headers ?? {},
      data: monitor.body ?? undefined,
      timeout: monitor.timeoutSecs * 1000,
      validateStatus: () => true, // Don't throw on non-2xx
      maxRedirects: 5,
    });

    responseTimeMs = Date.now() - startTime;
    statusCode = response.status;
    newStatus = determineStatus(statusCode, responseTimeMs, monitor.expectedStatus, monitor.timeoutSecs);
  } catch (err) {
    responseTimeMs = Date.now() - startTime;
    newStatus = 'DOWN';

    if (axios.isAxiosError(err)) {
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        errorMessage = `Request timed out after ${monitor.timeoutSecs}s`;
      } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
        errorMessage = `Connection failed: ${err.code}`;
      } else {
        errorMessage = err.message;
      }
    } else {
      errorMessage = err.message;
    }
  }

  const now = new Date();
  const nextCheck = new Date(now.getTime() + monitor.intervalMins * 60 * 1000);

  // Persist check result
  await prisma.checkResult.create({
    data: {
      monitorId: monitor.id,
      status: newStatus,
      statusCode,
      responseTimeMs,
      errorMessage,
    },
  });

  // Update monitor
  await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      status: newStatus,
      lastChecked: now,
      nextCheck,
    },
  });

  // Trigger alert if status changed
  const statusChanged =
    (previousStatus !== newStatus) &&
    (previousStatus === 'PENDING' ? false : true) &&
    !(previousStatus === 'DEGRADED' && newStatus === 'UP'); // DEGRADED→UP isn't an alertable event

  if (
    (newStatus === 'DOWN' && previousStatus !== 'DOWN') ||
    (newStatus === 'UP' && previousStatus === 'DOWN')
  ) {
    await sendAlert(monitor, newStatus, previousStatus);
  }

  console.log(
    `[checkRunner] ${monitor.name} (${monitor.url}) → ${newStatus} ` +
    `[${statusCode ?? 'N/A'}] ${responseTimeMs}ms`
  );
};

module.exports = { runCheck };
