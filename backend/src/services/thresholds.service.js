const crypto = require('crypto');
const db = require('../db/databricksClient');

const THRESHOLD_SELECT = `
  id,
  agent_id as agentId,
  alert_type as alertType,
  CAST(threshold_value AS DOUBLE) as thresholdValue,
  window_minutes as windowMinutes,
  created_at as createdAt,
  updated_at as updatedAt
`;

// Final fallback when no threshold row exists at all (per-agent or global) —
// keeps alert evaluation working out of the box before an admin sets anything.
const HARDCODED_FALLBACK_THRESHOLDS = {
  expensive_call: { thresholdValue: 1, windowMinutes: null },
  high_api_error_rate: { thresholdValue: 20, windowMinutes: 60 },
  high_validation_error_rate: { thresholdValue: 20, windowMinutes: 60 },
};

async function listThresholds() {
  return db.query(`
    SELECT
      t.id,
      t.agent_id as agentId,
      t.alert_type as alertType,
      CAST(t.threshold_value AS DOUBLE) as thresholdValue,
      t.window_minutes as windowMinutes,
      t.created_at as createdAt,
      t.updated_at as updatedAt,
      a.name as agentName
    FROM finops_thresholds t
    LEFT JOIN agents a ON a.id = t.agent_id
    ORDER BY t.alert_type ASC, a.name ASC
  `);
}

// "At most one row per (agent_id, alert_type)" and "at most one global
// default per alert_type" aren't enforceable as unique indexes in Delta, so
// this MERGE is the sole write path responsible for keeping that true.
// `<=>` is Databricks SQL's null-safe equality, needed because agent_id is
// NULL for global thresholds.
async function upsertThreshold(data) {
  const agentId = data.agentId ?? null;
  const alertType = data.alertType;
  const thresholdValue = data.thresholdValue;
  const windowMinutes = data.windowMinutes ?? null;
  const now = new Date().toISOString();
  const newId = crypto.randomUUID();

  await db.query(
    `MERGE INTO finops_thresholds AS t
     USING (SELECT CAST(:agentId AS STRING) AS agent_id, CAST(:alertType AS STRING) AS alert_type) AS s
     ON t.agent_id <=> s.agent_id AND t.alert_type = s.alert_type
     WHEN MATCHED THEN UPDATE SET
       threshold_value = CAST(:thresholdValue AS DECIMAL(12,4)),
       window_minutes = :windowMinutes,
       updated_at = CAST(:updatedAt AS TIMESTAMP)
     WHEN NOT MATCHED THEN INSERT (id, agent_id, alert_type, threshold_value, window_minutes, created_at, updated_at)
       VALUES (:newId, s.agent_id, s.alert_type, CAST(:thresholdValue AS DECIMAL(12,4)), :windowMinutes, CAST(:updatedAt AS TIMESTAMP), CAST(:updatedAt AS TIMESTAMP))`,
    { agentId, alertType, thresholdValue, windowMinutes, updatedAt: now, newId },
  );

  if (agentId === null) {
    return db.queryOne(`SELECT ${THRESHOLD_SELECT} FROM finops_thresholds WHERE agent_id IS NULL AND alert_type = :alertType`, { alertType });
  }
  return db.queryOne(`SELECT ${THRESHOLD_SELECT} FROM finops_thresholds WHERE agent_id = :agentId AND alert_type = :alertType`, { agentId, alertType });
}

// Resolution order: per-agent override -> global default -> hardcoded fallback.
async function resolveThreshold(agentId, alertType) {
  const perAgent = await db.queryOne(`SELECT ${THRESHOLD_SELECT} FROM finops_thresholds WHERE agent_id = :agentId AND alert_type = :alertType`, { agentId, alertType });
  if (perAgent) return perAgent;

  const globalDefault = await db.queryOne(`SELECT ${THRESHOLD_SELECT} FROM finops_thresholds WHERE agent_id IS NULL AND alert_type = :alertType`, { alertType });
  if (globalDefault) return globalDefault;

  const fallback = HARDCODED_FALLBACK_THRESHOLDS[alertType];
  return fallback ? { agentId: null, alertType, ...fallback } : null;
}

module.exports = { listThresholds, upsertThreshold, resolveThreshold, HARDCODED_FALLBACK_THRESHOLDS };
