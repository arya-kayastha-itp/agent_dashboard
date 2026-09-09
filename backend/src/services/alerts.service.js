const db = require('../db/pool');
const mailer = require('./mailer.service');

const ALERT_COLUMNS = ['id', 'agent_id as agentId', 'alert_type as alertType', 'severity', 'message', 'details', 'status', 'created_at as createdAt', 'resolved_at as resolvedAt'];

// unpriced_usage is an in-app ops todo, not an incident — everything else pages via email too.
const EMAIL_ALERT_TYPES = new Set(['expensive_call', 'high_api_error_rate', 'high_validation_error_rate']);

async function listAlerts({ status } = {}) {
  const query = db('finops_alerts as al')
    .join('agents as a', 'a.id', 'al.agent_id')
    .select(
      'al.id',
      'al.agent_id as agentId',
      'a.name as agentName',
      'al.alert_type as alertType',
      'al.severity',
      'al.message',
      'al.details',
      'al.status',
      'al.created_at as createdAt',
      'al.resolved_at as resolvedAt',
    )
    .orderBy('al.created_at', 'desc');

  if (status) query.where('al.status', status);
  return query;
}

async function updateAlertStatus(id, status) {
  const patch = { status };
  if (status === 'resolved') patch.resolved_at = db.fn.now();

  const [alert] = await db('finops_alerts').where({ id }).update(patch).returning(ALERT_COLUMNS);
  return alert;
}

// Dedupes: no repeat "open" alert of the same type/agent while one's already
// open. Runs inside the caller's ingest transaction. Email delivery is
// best-effort — a failure here must never roll back the ingestion write.
async function raiseAlert(trx, { agentId, alertType, severity, message, details }) {
  const existing = await trx('finops_alerts').where({ agent_id: agentId, alert_type: alertType, status: 'open' }).first();
  if (existing) return null;

  const [alert] = await trx('finops_alerts')
    .insert({
      agent_id: agentId,
      alert_type: alertType,
      severity,
      message,
      details: details ? JSON.stringify(details) : null,
      status: 'open',
    })
    .returning(ALERT_COLUMNS);

  if (EMAIL_ALERT_TYPES.has(alertType)) {
    try {
      await mailer.sendAlertEmail(alert);
    } catch (err) {
      console.error('Failed to send finops alert email', err);
    }
  }

  return alert;
}

module.exports = { listAlerts, updateAlertStatus, raiseAlert, ALERT_COLUMNS };
