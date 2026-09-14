const db = require('../db/pool');
const pricingService = require('./pricing.service');
const thresholdsService = require('./thresholds.service');
const alertsService = require('./alerts.service');
const { usageLogSchema } = require('../validators/finops.schema');

const USAGE_LOG_COLUMNS = [
  'id',
  'agent_id as agentId',
  'request_id as requestId',
  'endpoint',
  'model',
  'tokens_input as tokensInput',
  'tokens_output as tokensOutput',
  'tokens_total as tokensTotal',
  'status',
  'error_category as errorCategory',
  'error_code as errorCode',
  db.raw('cost_usd::float8 as "costUsd"'),
  'latency_ms as latencyMs',
  'source',
  'occurred_at as occurredAt',
  'created_at as createdAt',
];

// Below this many calls in the evaluation window, error-rate alerts don't
// fire — otherwise a single failed call out of one total reads as "100% error rate".
const MIN_CALLS_FOR_RATE_ALERT = 5;

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

// Per-entry batch failures are returned to the caller in the response body
// (not thrown), so they need the same Postgres-code -> friendly-message
// mapping errorHandler.js does for thrown errors — otherwise raw SQL leaks out.
function mapIngestError(err) {
  if (err.code === '23503') return { message: 'Referenced record does not exist', code: 'FOREIGN_KEY_VIOLATION' };
  if (err.code === '23514' || err.code === '22P02') return { message: 'Invalid data', code: 'BAD_INPUT' };
  return { message: 'Failed to ingest usage log', code: 'INGEST_ERROR' };
}

// Mirrors recordUpdate's pattern (updates.service.js): one function, one
// transaction, keeps the log + derived alerts consistent. See FINOPS_PLAN.md §5.
async function ingestUsageLog(data) {
  return db.transaction(async (trx) => {
    const occurredAt = data.occurredAt || new Date();
    const tokensTotal = data.tokensInput + data.tokensOutput;

    const price = await pricingService.priceFor(data.model, occurredAt, trx);
    const costUsd = price ? round6((data.tokensInput / 1000) * price.inputPricePer1kTokens + (data.tokensOutput / 1000) * price.outputPricePer1kTokens) : null;

    const [log] = await trx('api_usage_logs')
      .insert({
        agent_id: data.agentId,
        request_id: data.requestId ?? null,
        endpoint: data.endpoint ?? null,
        model: data.model,
        tokens_input: data.tokensInput,
        tokens_output: data.tokensOutput,
        tokens_total: tokensTotal,
        status: data.status,
        error_category: data.errorCategory ?? null,
        error_code: data.errorCode ?? null,
        cost_usd: costUsd,
        latency_ms: data.latencyMs ?? null,
        source: data.source || 'external',
        occurred_at: occurredAt,
        raw_metadata: data.rawMetadata ? JSON.stringify(data.rawMetadata) : null,
      })
      .returning(USAGE_LOG_COLUMNS);

    if (!price) {
      await alertsService.raiseAlert(trx, {
        agentId: data.agentId,
        alertType: 'unpriced_usage',
        severity: 'warning',
        message: `No pricing configured for model "${data.model}"`,
        details: { model: data.model, logId: log.id },
      });
    } else {
      await evaluateExpensiveCall(trx, log);
    }

    if (data.status === 'error' && data.errorCategory === 'api_error') {
      await evaluateErrorRate(trx, data.agentId, 'api_error', 'high_api_error_rate');
    }
    if (data.status === 'error' && data.errorCategory === 'validation_error') {
      await evaluateErrorRate(trx, data.agentId, 'validation_error', 'high_validation_error_rate');
    }

    return log;
  });
}

async function evaluateExpensiveCall(trx, log) {
  const threshold = await thresholdsService.resolveThreshold(trx, log.agentId, 'expensive_call');
  if (!threshold) return;

  if (Number(log.costUsd) > Number(threshold.thresholdValue)) {
    await alertsService.raiseAlert(trx, {
      agentId: log.agentId,
      alertType: 'expensive_call',
      severity: 'critical',
      message: `Call cost $${log.costUsd} exceeded threshold $${threshold.thresholdValue}`,
      details: { logId: log.id, costUsd: log.costUsd, thresholdValue: threshold.thresholdValue },
    });
  }
}

async function evaluateErrorRate(trx, agentId, errorCategory, alertType) {
  const threshold = await thresholdsService.resolveThreshold(trx, agentId, alertType);
  if (!threshold || !threshold.windowMinutes) return;

  const windowStart = new Date(Date.now() - threshold.windowMinutes * 60000);

  const row = await trx('api_usage_logs')
    .where({ agent_id: agentId })
    .andWhere('occurred_at', '>=', windowStart)
    .select(trx.raw('count(*)::int as "totalCount"'), trx.raw('count(*) FILTER (WHERE error_category = ?)::int as "errorCount"', [errorCategory]))
    .first();

  const total = row.totalCount;
  const errors = row.errorCount;
  if (total < MIN_CALLS_FOR_RATE_ALERT) return;

  const rate = (errors / total) * 100;
  if (rate > Number(threshold.thresholdValue)) {
    await alertsService.raiseAlert(trx, {
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
  const query = db('api_usage_logs').select(USAGE_LOG_COLUMNS).orderBy('occurred_at', 'desc').limit(500);
  if (agentId) query.where('agent_id', agentId);
  if (status) query.where('status', status);
  if (from) query.andWhere('occurred_at', '>=', from);
  if (to) query.andWhere('occurred_at', '<=', to);
  return query;
}

async function getUsageSummary({ agentId, from, to } = {}) {
  const conditions = [];
  const bindings = [];
  if (agentId) {
    conditions.push('agent_id = ?');
    bindings.push(agentId);
  }
  if (from) {
    conditions.push('occurred_at >= ?');
    bindings.push(from);
  }
  if (to) {
    conditions.push('occurred_at <= ?');
    bindings.push(to);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.raw(
    `SELECT date_trunc('day', occurred_at) as day,
            count(*)::int as calls,
            coalesce(sum(cost_usd), 0)::float8 as cost,
            coalesce(sum(tokens_total), 0)::int as tokens,
            count(*) FILTER (WHERE status = 'error')::int as errors
     FROM api_usage_logs
     ${where}
     GROUP BY 1
     ORDER BY 1`,
    bindings,
  );
  return rows;
}

async function getUsageTotalsByAgent({ from, to } = {}) {
  const conditions = [];
  const bindings = [];
  if (from) {
    conditions.push('occurred_at >= ?');
    bindings.push(from);
  }
  if (to) {
    conditions.push('occurred_at <= ?');
    bindings.push(to);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await db.raw(
    `SELECT agent_id as "agentId",
            count(*)::int as calls,
            coalesce(sum(cost_usd), 0)::float8 as cost,
            count(*) FILTER (WHERE status = 'error')::int as errors
     FROM api_usage_logs
     ${where}
     GROUP BY 1`,
    bindings,
  );
  return rows;
}

module.exports = { ingestUsageLog, ingestBatch, listUsage, getUsageSummary, getUsageTotalsByAgent, USAGE_LOG_COLUMNS };
