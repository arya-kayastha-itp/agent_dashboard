const crypto = require('crypto');
const db = require('../db/databricksClient');
const mailer = require('./mailer.service');

// unpriced_usage is an in-app ops todo, not an incident — everything else pages via email too.
const EMAIL_ALERT_TYPES = new Set(['expensive_call', 'high_api_error_rate', 'high_validation_error_rate']);

function parseDetails(row) {
  if (row && typeof row.details === 'string') {
    try {
      return { ...row, details: JSON.parse(row.details) };
    } catch {
      return row;
    }
  }
  return row;
}

async function listAlerts({ status } = {}) {
  const params = {};
  let sql = `
    SELECT
      al.id,
      al.agent_id as agentId,
      a.name as agentName,
      al.alert_type as alertType,
      al.severity,
      al.message,
      al.details,
      al.status,
      al.created_at as createdAt,
      al.resolved_at as resolvedAt
    FROM finops_alerts al
    JOIN agents a ON a.id = al.agent_id
  `;
  if (status) {
    sql += ' WHERE al.status = :status';
    params.status = status;
  }
  sql += ' ORDER BY al.created_at DESC';

  const rows = await db.query(sql, params);
  return rows.map(parseDetails);
}

async function updateAlertStatus(id, status) {
  if (status === 'resolved') {
    await db.query('UPDATE finops_alerts SET status = :status, resolved_at = CAST(:now AS TIMESTAMP) WHERE id = :id', {
      status,
      now: new Date().toISOString(),
      id,
    });
  } else {
    await db.query('UPDATE finops_alerts SET status = :status WHERE id = :id', { status, id });
  }

  const row = await db.queryOne(
    `SELECT id, agent_id as agentId, alert_type as alertType, severity, message, details, status,
            created_at as createdAt, resolved_at as resolvedAt
     FROM finops_alerts WHERE id = :id`,
    { id },
  );
  return parseDetails(row);
}

// Dedupes: no repeat "open" alert of the same type/agent while one's already
// open. Email delivery is best-effort — a failure here must never fail ingestion.
async function raiseAlert({ agentId, alertType, severity, message, details }) {
  const existing = await db.queryOne('SELECT id FROM finops_alerts WHERE agent_id = :agentId AND alert_type = :alertType AND status = \'open\'', {
    agentId,
    alertType,
  });
  if (existing) return null;

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await db.query(
    `INSERT INTO finops_alerts (id, agent_id, alert_type, severity, message, details, status, created_at)
     VALUES (:id, :agentId, :alertType, :severity, :message, :details, 'open', CAST(:createdAt AS TIMESTAMP))`,
    { id, agentId, alertType, severity, message, details: details ? JSON.stringify(details) : null, createdAt },
  );

  const alert = { id, agentId, alertType, severity, message, details: details ?? null, status: 'open', createdAt, resolvedAt: null };

  if (EMAIL_ALERT_TYPES.has(alertType)) {
    try {
      await mailer.sendAlertEmail(alert);
    } catch (err) {
      console.error('Failed to send finops alert email', err);
    }
  }

  return alert;
}

module.exports = { listAlerts, updateAlertStatus, raiseAlert };
