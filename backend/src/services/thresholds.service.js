const db = require('../db/pool');

const THRESHOLD_COLUMNS = [
  'id',
  'agent_id as agentId',
  'alert_type as alertType',
  db.raw('threshold_value::float8 as "thresholdValue"'),
  'window_minutes as windowMinutes',
  'created_at as createdAt',
  'updated_at as updatedAt',
];

// Final fallback when no threshold row exists at all (per-agent or global) —
// keeps alert evaluation working out of the box before an admin sets anything.
const HARDCODED_FALLBACK_THRESHOLDS = {
  expensive_call: { thresholdValue: 1, windowMinutes: null },
  high_api_error_rate: { thresholdValue: 20, windowMinutes: 60 },
  high_validation_error_rate: { thresholdValue: 20, windowMinutes: 60 },
};

async function listThresholds() {
  return db('finops_thresholds as t')
    .leftJoin('agents as a', 'a.id', 't.agent_id')
    .select(
      't.id',
      't.agent_id as agentId',
      't.alert_type as alertType',
      db.raw('t.threshold_value::float8 as "thresholdValue"'),
      't.window_minutes as windowMinutes',
      't.created_at as createdAt',
      't.updated_at as updatedAt',
      'a.name as agentName',
    )
    .orderBy(['t.alert_type', 'a.name']);
}

async function upsertThreshold(data) {
  const alertType = data.alertType;
  const thresholdValue = data.thresholdValue;
  const windowMinutes = data.windowMinutes ?? null;

  if (data.agentId) {
    const result = await db.raw(
      `INSERT INTO finops_thresholds (agent_id, alert_type, threshold_value, window_minutes)
       VALUES (:agentId, :alertType, :thresholdValue, :windowMinutes)
       ON CONFLICT (agent_id, alert_type) WHERE agent_id IS NOT NULL
       DO UPDATE SET threshold_value = EXCLUDED.threshold_value, window_minutes = EXCLUDED.window_minutes, updated_at = now()
       RETURNING id, agent_id as "agentId", alert_type as "alertType",
                 threshold_value::float8 as "thresholdValue", window_minutes as "windowMinutes",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      { agentId: data.agentId, alertType, thresholdValue, windowMinutes },
    );
    return result.rows[0];
  }

  const result = await db.raw(
    `INSERT INTO finops_thresholds (agent_id, alert_type, threshold_value, window_minutes)
     VALUES (NULL, :alertType, :thresholdValue, :windowMinutes)
     ON CONFLICT (alert_type) WHERE agent_id IS NULL
     DO UPDATE SET threshold_value = EXCLUDED.threshold_value, window_minutes = EXCLUDED.window_minutes, updated_at = now()
     RETURNING id, agent_id as "agentId", alert_type as "alertType",
               threshold_value::float8 as "thresholdValue", window_minutes as "windowMinutes",
               created_at as "createdAt", updated_at as "updatedAt"`,
    { alertType, thresholdValue, windowMinutes },
  );
  return result.rows[0];
}

// Resolution order: per-agent override -> global default -> hardcoded fallback.
async function resolveThreshold(trx, agentId, alertType) {
  const db_ = trx || db;

  const perAgent = await db_('finops_thresholds').select(THRESHOLD_COLUMNS).where({ agent_id: agentId, alert_type: alertType }).first();
  if (perAgent) return perAgent;

  const globalDefault = await db_('finops_thresholds').select(THRESHOLD_COLUMNS).whereNull('agent_id').andWhere({ alert_type: alertType }).first();
  if (globalDefault) return globalDefault;

  const fallback = HARDCODED_FALLBACK_THRESHOLDS[alertType];
  return fallback ? { agentId: null, alertType, ...fallback } : null;
}

module.exports = { listThresholds, upsertThreshold, resolveThreshold, HARDCODED_FALLBACK_THRESHOLDS };
