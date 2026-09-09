const prisma = require('../../config/database');
const { sendDownAlert, sendRecoveredAlert } = require('./email.service');

/**
 * Format milliseconds into a human-readable duration string.
 */
const formatDuration = (ms) => {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${Math.round(ms / 3_600_000)}h`;
};

/**
 * Attempt to send an email with retry logic.
 * Returns 'SENT' on success, 'FAILED' after all retries are exhausted.
 * Never throws — errors are logged but suppressed so the check engine keeps running.
 *
 * @param {Function} sendFn - Async function that calls the email provider
 * @param {string}   label  - Human-readable label for log messages
 * @param {number}   maxRetries - Number of attempts (default: 3)
 */
const sendWithRetry = async (sendFn, label, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sendFn();
      return 'SENT';
    } catch (err) {
      console.error(
        `[alerts] Email send failed (${label}) — attempt ${attempt}/${maxRetries}: ${err.message}`
      );
      if (attempt < maxRetries) {
        // Brief back-off before retrying: 500ms, 1000ms, …
        await new Promise((r) => setTimeout(r, attempt * 500));
      }
    }
  }
  return 'FAILED';
};

/**
 * Send an alert when a monitor changes status.
 *
 * Anti-spam rules:
 * - DOWN alert: only after 2 consecutive DOWN results (avoids flapping alerts)
 * - RECOVERED alert: only when transitioning from DOWN → UP
 */
const sendAlert = async (monitor, newStatus, previousStatus) => {
  try {
    // Load monitor with user email
    const fullMonitor = await prisma.monitor.findUnique({
      where: { id: monitor.id },
      include: {
        workspace: {
          include: { user: true },
        },
      },
    });

    if (!fullMonitor) return;

    const userEmail = fullMonitor.workspace.user.email;
    const monitorName = fullMonitor.name;
    const monitorUrl = fullMonitor.url;

    if (newStatus === 'DOWN') {
      // Anti-spam: check last 2 results to confirm 2 consecutive failures
      const lastTwo = await prisma.checkResult.findMany({
        where: { monitorId: monitor.id },
        orderBy: { checkedAt: 'desc' },
        take: 2,
      });

      const bothDown = lastTwo.length === 2 && lastTwo.every((r) => r.status === 'DOWN');
      if (!bothDown) {
        console.log(`[alerts] Skipping DOWN alert for ${monitorName} — not yet 2 consecutive failures`);
        return;
      }

      const deliveryStatus = await sendWithRetry(
        () => sendDownAlert(userEmail, monitorName, monitorUrl, new Date()),
        `DOWN / ${monitorName}`
      );

      await prisma.alertLog.create({
        data: {
          monitorId: monitor.id,
          type: 'DOWN',
          sentTo: userEmail,
          deliveryStatus,
        },
      });

      if (deliveryStatus === 'SENT') {
        console.log(`[alerts] DOWN alert sent for ${monitorName} → ${userEmail}`);
      } else {
        console.error(`[alerts] DOWN alert FAILED for ${monitorName} → ${userEmail} after all retries`);
      }
    } else if (newStatus === 'UP' && previousStatus === 'DOWN') {
      // Find the time the monitor went DOWN (last DOWN alert)
      const lastDownAlert = await prisma.alertLog.findFirst({
        where: { monitorId: monitor.id, type: 'DOWN' },
        orderBy: { sentAt: 'desc' },
      });

      const downDuration = lastDownAlert
        ? formatDuration(Date.now() - lastDownAlert.sentAt.getTime())
        : 'unknown duration';

      const deliveryStatus = await sendWithRetry(
        () => sendRecoveredAlert(userEmail, monitorName, monitorUrl, downDuration),
        `RECOVERED / ${monitorName}`
      );

      await prisma.alertLog.create({
        data: {
          monitorId: monitor.id,
          type: 'RECOVERED',
          sentTo: userEmail,
          deliveryStatus,
        },
      });

      if (deliveryStatus === 'SENT') {
        console.log(`[alerts] RECOVERED alert sent for ${monitorName} → ${userEmail}`);
      } else {
        console.error(`[alerts] RECOVERED alert FAILED for ${monitorName} → ${userEmail} after all retries`);
      }
    }
  } catch (err) {
    // Never let alert errors crash the check engine
    console.error(`[alerts] Failed to process alert for monitor ${monitor.id}:`, err.message);
  }
};

module.exports = { sendAlert };
