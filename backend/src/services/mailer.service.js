// No SMTP integration is configured yet — this is a stub so alert-raising
// code has a single call site to wire real email delivery into later.
// Logs what would be sent instead of sending it. Callers must wrap this in
// try/catch (see alerts.service.js) so a delivery failure never breaks ingestion.
async function sendAlertEmail(alert) {
  console.log(`[finops] would email alert: [${alert.severity}] ${alert.alertType} — ${alert.message}`);
}

module.exports = { sendAlertEmail };
