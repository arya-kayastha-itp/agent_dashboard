const crypto = require('crypto');
const db = require('../db/databricksClient');
const pricingService = require('./pricing.service');
const thresholdsService = require('./thresholds.service');
const alertsService = require('./alerts.service');
const { usageLogSchema } = require('../validators/finops.schema');

const USAGE_LOG_SELECT = `
  id,
  agent_id as agentId,
  request_id as requestId,
  endpoint,
  model,
  tokens_input as tokensInput,
  tokens_output as tokensOutput,
  tokens_total as tokensTotal,
  status,
  error_category as errorCategory,
  error_code as errorCode,
  CAST(cost_usd AS DOUBLE) as costUsd,
  latency_ms as latencyMs,
  source,
  occurred_at as occurredAt,
  created_at as createdAt
`;

// Below this many calls in the evaluation window, error-rate alerts don't
// fire — otherwise a single failed call out of one total reads as "100% error rate".
const MIN_CALLS_FOR_RATE_ALERT = 5;

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

// Per-entry batch failures are returned to the caller in the response body
// (not thrown), so they need the same friendly-message mapping errorHandler.js
// does for thrown errors — otherwise raw SQL leaks out.
function mapIngestError(err) {
  if (err.code === 'FK_VIOLATION') return { message: 'Referenced record does not exist', code: 'FOREIGN_KEY_VIOLATION' };
  return { message: 'Failed to ingest usage log', code: 'INGEST_ERROR' };
}

// Delta doesn't support cross-table transactions, so this runs as a sequence
// of independent statements rather than one atomic unit — see
// backend/README.md's Databricks migration section for the tradeoffs.
// agent_id existence is checked explicitly here because the FK on
// api_usage_logs is NOT ENFORCED at the Delta layer.
async function ingestUsageLog(data) {
  const agent = await db.queryOne('SELECT id FROM agents WHERE id = :agentId', { agentId: data.agentId });
  if (!agent) {
    const err = new Error(`Referenced agent "${data.agentId}" does not exist`);
    err.code = 'FK_VIOLATION';
    throw err;
  }

  const occurredAt = data.occurredAt ? new Date(data.occurredAt) : new Date();
  const tokensTotal = data.tokensInput + data.tokensOutput;

  const price = await pricingService.priceFor(data.model, occurredAt);
  const costUsd = price ? round6((data.tokensInput / 1000) * price.inputPricePer1kTokens + (data.tokensOutput / 1000) * price.outputPricePer1kTokens) : null;

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const occurredAtIso = occurredAt.toISOString();

  await db.query(
    `INSERT INTO api_usage_logs
       (id, agent_id, request_id, endpoint, model, tokens_input, tokens_output, tokens_total,
        status, error_category, error_code, cost_usd, latency_ms, source, occurred_at, created_at, raw_metadata)
     VALUES
       (:id, :agentId, :requestId, :endpoint, :model, :tokensInput, :tokensOutput, :tokensTotal,
        :status, :errorCategory, :errorCode, CAST(:costUsd AS DECIMAL(12,6)), :latencyMs, :source,
        CAST(:occurredAt AS TIMESTAMP), CAST(:createdAt AS TIMESTAMP), :rawMetadata)`,
    {
      id,
      agentId: data.agentId,
      requestId: data.requestId ?? null,
      endpoint: data.endpoint ?? null,
      model: data.model,
      tokensInput: data.tokensInput,
      tokensOutput: data.tokensOutput,
      tokensTotal,
      status: data.status,
      errorCategory: data.errorCategory ?? null,
      errorCode: data.errorCode ?? null,
      costUsd,
      latencyMs: data.latencyMs ?? null,
      source: data.source || 'external',
      occurredAt: occurredAtIso,
      createdAt,
      rawMetadata: data.rawMetadata ? JSON.stringify(data.rawMetadata) : null,
    },
  );

  const log = {
    id,
    agentId: data.agentId,
    requestId: data.requestId ?? null,
    endpoint: data.endpoint ?? null,
    model: data.model,
    tokensInput: data.tokensInput,
    tokensOutput: data.tokensOutput,
    tokensTotal,
    status: data.status,
    errorCategory: data.errorCategory ?? null,
    errorCode: data.errorCode ?? null,
    costUsd,
    latencyMs: data.latencyMs ?? null,
    source: data.source || 'external',
    occurredAt: occurredAtIso,
    createdAt,
  };

  if (!price) {
    await alertsService.raiseAlert({
      agentId: data.agentId,
      alertType: 'unpriced_usage',
      severity: 'warning',
      message: `No pricing configured for model "${data.model}"`,
      details: { model: data.model, logId: log.id },
    });
  } else {
    await evaluateExpensiveCall(log);
  }

  if (data.status === 'error' && data.errorCategory === 'api_error') {
    await evaluateErrorRate(data.agentId, 'api_error', 'high_api_error_rate');
  }
  if (data.status === 'error' && data.errorCategory === 'validation_error') {
    await evaluateErrorRate(data.agentId, 'validation_error', 'high_validation_error_rate');
  }

  return log;
}

async function evaluateExpensiveCall(log) {
  const threshold = await thresholdsService.resolveThreshold(log.agentId, 'expensive_call');
  if (!threshold) return;

  if (Number(log.costUsd) > Number(threshold.thresholdValue)) {
    await alertsService.raiseAlert({
      agentId: log.agentId,
      alertType: 'expensive_call',
      severity: 'critical',
      message: `Call cost $${log.costUsd} exceeded threshold $${threshold.thresholdValue}`,
      details: { logId: log.id, costUsd: log.costUsd, thresholdValue: threshold.thresholdValue },
    });
  }
}

async function evaluateErrorRate(agentId, errorCategory, alertType) {
  const threshold = await thresholdsService.resolveThreshold(agentId, alertType);
  if (!threshold || !threshold.windowMinutes) return;

  const windowStart = new Date(Date.now() - threshold.windowMinutes * 60000).toISOString();

  const row = await db.queryOne(
    `SELECT
       COUNT(*) as totalCount,
       SUM(CASE WHEN error_category = :errorCategory THEN 1 ELSE 0 END) as errorCount
     FROM api_usage_logs
     WHERE agent_id = :agentId AND occurred_at >= CAST(:windowStart AS TIMESTAMP)`,
    { agentId, errorCategory, windowStart },
  );

  const total = Number(row.totalCount);
  const errors = Number(row.errorCount || 0);
  if (total < MIN_CALLS_FOR_RATE_ALERT) return;

  const rate = (errors / total) * 100;
  if (rate > Number(threshold.thresholdValue)) {
    await alertsService.raiseAlert({
      agentId,
      alertType,
      severity: 'warning',
      message: `${errorCategory} rate ${rate.toFixed(1)}% exceeded ${threshold.thresholdValue}% over the last ${threshold.windowMinutes}m`,
      details: { rate: Number(rate.toFixed(2)), thresholdValue: threshold.thresholdValue, windowMinutes: threshold.windowMinutes, totalCalls: total, errorCalls: errors },
    });
  }
}

// Not all-or-nothing: each entry is validated and ingested independently, so
// one malformed/failing entry doesn't discard the rest of a buffered flush.
async function ingestBatch(rawEntries) {
  const results = [];

  for (let i = 0; i < rawEntries.length; i += 1) {
    const parsed = usageLogSchema.safeParse(rawEntries[i]);
    if (!parsed.success) {
      results.push({ index: i, success: false, error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
      continue; // eslint-disable-line no-continue
    }

    try {
      // eslint-disable-next-line no-await-in-loop
      const log = await ingestUsageLog(parsed.data);
      results.push({ index: i, success: true, data: log });
    } catch (err) {
      results.push({ index: i, success: false, error: mapIngestError(err) });
    }
  }

  return results;
}

async function listUsage({ agentId, from, to, status } = {}) {
  const clauses = [];
  const params = {};
  if (agentId) {
    clauses.push('agent_id = :agentId');
    params.agentId = agentId;
  }
  if (status) {
    clauses.push('status = :status');
    params.status = status;
  }
  if (from) {
    clauses.push('occurred_at >= CAST(:from AS TIMESTAMP)');
    params.from = new Date(from).toISOString();
  }
  if (to) {
    clauses.push('occurred_at <= CAST(:to AS TIMESTAMP)');
    params.to = new Date(to).toISOString();
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return db.query(`SELECT ${USAGE_LOG_SELECT} FROM api_usage_logs ${where} ORDER BY occurred_at DESC LIMIT 500`, params);
}

async function getUsageSummary({ agentId, from, to } = {}) {
  const clauses = [];
  const params = {};
  if (agentId) {
    clauses.push('agent_id = :agentId');
    params.agentId = agentId;
  }
  if (from) {
    clauses.push('occurred_at >= CAST(:from AS TIMESTAMP)');
    params.from = new Date(from).toISOString();
  }
  if (to) {
    clauses.push('occurred_at <= CAST(:to AS TIMESTAMP)');
    params.to = new Date(to).toISOString();
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = await db.query(
    `SELECT date_trunc('day', occurred_at) as day,
            COUNT(*) as calls,
            COALESCE(SUM(cost_usd), 0) as cost,
            COALESCE(SUM(tokens_total), 0) as tokens,
            SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
     FROM api_usage_logs
     ${where}
     GROUP BY 1
     ORDER BY 1`,
    params,
  );
  return rows.map((r) => ({ day: r.day, calls: Number(r.calls), cost: Number(r.cost), tokens: Number(r.tokens), errors: Number(r.errors) }));
}

async function getUsageTotalsByAgent({ from, to } = {}) {
  const clauses = [];
  const params = {};
  if (from) {
    clauses.push('occurred_at >= CAST(:from AS TIMESTAMP)');
    params.from = new Date(from).toISOString();
  }
  if (to) {
    clauses.push('occurred_at <= CAST(:to AS TIMESTAMP)');
    params.to = new Date(to).toISOString();
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = await db.query(
    `SELECT agent_id as agentId,
            COUNT(*) as calls,
            COALESCE(SUM(cost_usd), 0) as cost,
            SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
     FROM api_usage_logs
     ${where}
     GROUP BY 1`,
    params,
  );
  return rows.map((r) => ({ agentId: r.agentId, calls: Number(r.calls), cost: Number(r.cost), errors: Number(r.errors) }));
}

module.exports = { ingestUsageLog, ingestBatch, listUsage, getUsageSummary, getUsageTotalsByAgent };
