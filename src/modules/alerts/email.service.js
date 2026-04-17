const { Resend } = require('resend');
const config = require('../../config/env');

const resend = new Resend(config.RESEND_API_KEY);

const formatDate = (date) =>
  new Date(date).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }) + ' UTC';

/**
 * Send a "monitor is DOWN" alert email.
 */
const sendDownAlert = async (to, monitorName, url, checkedAt) => {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
    <div style="background: #dc2626; padding: 24px 32px;">
      <h1 style="color: #fff; margin: 0; font-size: 20px;">🔴 Monitor Down</h1>
    </div>
    <div style="padding: 32px;">
      <p style="margin: 0 0 16px; color: #111827; font-size: 16px;">
        Your monitor <strong>${monitorName}</strong> is <strong style="color: #dc2626;">DOWN</strong>.
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">URL</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px; word-break: break-all;">${url}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Detected at</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px;">${formatDate(checkedAt)}</td>
        </tr>
      </table>
      <p style="color: #6b7280; font-size: 14px; margin: 0;">
        You will receive another email when the monitor recovers.<br>
        — The Upstack Team
      </p>
    </div>
    <div style="background: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        Powered by <a href="https://upstack.io" style="color: #6366f1;">Upstack</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  await resend.emails.send({
    from: config.RESEND_FROM_EMAIL,
    to,
    subject: `[Upstack] 🔴 ${monitorName} is DOWN`,
    html,
  });
};

/**
 * Send a "monitor has recovered" alert email.
 */
const sendRecoveredAlert = async (to, monitorName, url, downDuration) => {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
    <div style="background: #16a34a; padding: 24px 32px;">
      <h1 style="color: #fff; margin: 0; font-size: 20px;">🟢 Monitor Recovered</h1>
    </div>
    <div style="padding: 32px;">
      <p style="margin: 0 0 16px; color: #111827; font-size: 16px;">
        Your monitor <strong>${monitorName}</strong> is back <strong style="color: #16a34a;">UP</strong>.
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">URL</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px; word-break: break-all;">${url}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Down for</td>
          <td style="padding: 8px 0; color: #111827; font-size: 14px;">${downDuration}</td>
        </tr>
      </table>
      <p style="color: #6b7280; font-size: 14px; margin: 0;">
        — The Upstack Team
      </p>
    </div>
    <div style="background: #f9fafb; padding: 16px 32px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        Powered by <a href="https://upstack.io" style="color: #6366f1;">Upstack</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  await resend.emails.send({
    from: config.RESEND_FROM_EMAIL,
    to,
    subject: `[Upstack] 🟢 ${monitorName} has recovered`,
    html,
  });
};

module.exports = { sendDownAlert, sendRecoveredAlert };
