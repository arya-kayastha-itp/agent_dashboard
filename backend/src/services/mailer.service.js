const { EmailClient } = require('@azure/communication-email');
const env = require('../config/env');

let client = null;

function emailClient() {
  if (!env.email.acsConnectionString || !env.email.sender) return null;
  client = client || new EmailClient(env.email.acsConnectionString);
  return client;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

// Returns true once Azure has accepted the message, false if email isn't
// configured or the send failed — never throws, so a mail problem can't
// break the request that triggered it. Callers that hand out links always
// return the link too, so a false here just means "share it another way".
async function sendEmail({ to, subject, text, html }) {
  const emails = emailClient();
  if (!emails) {
    console.log(`[mail] not configured — would email ${to}: ${subject}`);
    return false;
  }
  try {
    // beginSend resolves after the service accepts the message; delivery
    // itself isn't awaited.
    await emails.beginSend({
      senderAddress: env.email.sender,
      recipients: { to: [{ address: to }] },
      content: { subject, plainText: text, html },
    });
    return true;
  } catch (err) {
    console.error(`[mail] failed to send "${subject}" to ${to}: ${err.message}`);
    return false;
  }
}

const LINK_COPY = {
  invite: {
    subject: "You're invited to the Agents Dashboard",
    intro: "You've been given access to the AI Garage Agents Dashboard. Set your password to sign in:",
    action: 'Set your password',
    outro: "If you weren't expecting this, you can ignore this email.",
  },
  reset: {
    subject: 'Reset your Agents Dashboard password',
    intro: 'Someone asked to reset the password for your Agents Dashboard account. Choose a new one here:',
    action: 'Reset your password',
    outro: "If you didn't ask for this, ignore this email — your password won't change.",
  },
};

async function sendAccountLinkEmail({ to, name, purpose, url, expiresAt }) {
  const copy = LINK_COPY[purpose];
  const firstName = name.split(' ')[0];
  const hours = Math.max(1, Math.round((new Date(expiresAt) - Date.now()) / 3_600_000));
  const expiry = `This link works once and expires in ${hours} hour${hours === 1 ? '' : 's'}.`;

  return sendEmail({
    to,
    subject: copy.subject,
    text: `Hi ${firstName},\n\n${copy.intro}\n${url}\n\n${expiry}\n\n${copy.outro}`,
    html: `<p>Hi ${escapeHtml(firstName)},</p>
<p>${escapeHtml(copy.intro)}</p>
<p><a href="${escapeHtml(url)}">${escapeHtml(copy.action)}</a></p>
<p>${escapeHtml(expiry)}</p>
<p style="color:#666">${escapeHtml(copy.outro)}</p>`,
  });
}

// FinOps alert delivery isn't wired up yet — this is a stub so alert-raising
// code has a single call site to wire real email delivery into later.
// Logs what would be sent instead of sending it. Callers must wrap this in
// try/catch (see alerts.service.js) so a delivery failure never breaks ingestion.
async function sendAlertEmail(alert) {
  console.log(`[finops] would email alert: [${alert.severity}] ${alert.alertType} — ${alert.message}`);
}

module.exports = { sendAccountLinkEmail, sendAlertEmail };
