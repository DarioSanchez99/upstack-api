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

      await sendDownAlert(userEmail, monitorName, monitorUrl, new Date());

      await prisma.alertLog.create({
        data: {
          monitorId: monitor.id,
          type: 'DOWN',
          sentTo: userEmail,
        },
      });

      console.log(`[alerts] DOWN alert sent for ${monitorName} → ${userEmail}`);
    } else if (newStatus === 'UP' && previousStatus === 'DOWN') {
      // Find the time the monitor went DOWN (last DOWN alert)
      const lastDownAlert = await prisma.alertLog.findFirst({
        where: { monitorId: monitor.id, type: 'DOWN' },
        orderBy: { sentAt: 'desc' },
      });

      const downDuration = lastDownAlert
        ? formatDuration(Date.now() - lastDownAlert.sentAt.getTime())
        : 'unknown duration';

      await sendRecoveredAlert(userEmail, monitorName, monitorUrl, downDuration);

      await prisma.alertLog.create({
        data: {
          monitorId: monitor.id,
          type: 'RECOVERED',
          sentTo: userEmail,
        },
      });

      console.log(`[alerts] RECOVERED alert sent for ${monitorName} → ${userEmail}`);
    }
  } catch (err) {
    // Never let alert errors crash the check engine
    console.error(`[alerts] Failed to send alert for monitor ${monitor.id}:`, err.message);
  }
};

module.exports = { sendAlert };
