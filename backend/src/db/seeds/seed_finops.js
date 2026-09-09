const { randomUUID } = require('node:crypto');

function daysAgo(now, n) {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d;
}

function randomTimeOnDay(day) {
  const d = new Date(day);
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60), 0);
  return d;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const PRICED_MODELS = [
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4o-mini',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'claude-sonnet',
  'claude-haiku',
  'claude-opus',
  'meta-llama/Llama-3.1-8B',
  'mistralai/Mistral-7B',
];
const UNPRICED_MODEL = 'experimental-model-x';
const ENDPOINTS = ['/v1/chat/completions', '/v1/responses', '/v1/extract', '/v1/summarize'];
const SOURCES = ['support-portal', 'invoice-app', 'meeting-notes-web', 'internal-cron'];
const ERROR_CODES = {
  api_error: ['503_service_unavailable', '429_rate_limited', 'timeout', '500_internal_error'],
  validation_error: ['missing_required_field', 'invalid_model', 'payload_too_large'],
};

exports.seed = async function (knex) {
  await knex('finops_alerts').del();
  await knex('api_usage_logs').del();
  await knex('model_pricing').del();
  await knex('finops_thresholds').del();

  const agents = await knex('agents').select('id', 'name');
  if (agents.length === 0) return;

  // Global defaults so the thresholds admin page and alert evaluation both
  // have something to show/use out of the box, before any admin edits them.
  await knex('finops_thresholds').insert([
    { agent_id: null, alert_type: 'expensive_call', threshold_value: 0.5, window_minutes: null },
    { agent_id: null, alert_type: 'high_api_error_rate', threshold_value: 15, window_minutes: 60 },
    { agent_id: null, alert_type: 'high_validation_error_rate', threshold_value: 15, window_minutes: 60 },
  ]);

  const now = new Date();

  // Two price points for gpt-4.1 so seeded data exercises effective-dated lookup.
  const pricingRows = [
    { model: 'gpt-4.1', input_price_per_1k_tokens: 0.0020, output_price_per_1k_tokens: 0.0080, effective_from: daysAgo(now, 60) },
    { model: 'gpt-4.1', input_price_per_1k_tokens: 0.0018, output_price_per_1k_tokens: 0.0072, effective_from: daysAgo(now, 10) },
    { model: 'gpt-4.1-mini', input_price_per_1k_tokens: 0.0004, output_price_per_1k_tokens: 0.0016, effective_from: daysAgo(now, 60) },
    { model: 'gpt-4o-mini', input_price_per_1k_tokens: 0.00015, output_price_per_1k_tokens: 0.00060, effective_from: daysAgo(now, 60) },
    { model: 'gemini-2.5-pro', input_price_per_1k_tokens: 0.00125, output_price_per_1k_tokens: 0.0100, effective_from: daysAgo(now, 60) },
    { model: 'gemini-2.5-flash', input_price_per_1k_tokens: 0.00030, output_price_per_1k_tokens: 0.00250, effective_from: daysAgo(now, 60) },
    { model: 'claude-sonnet', input_price_per_1k_tokens: 0.0030, output_price_per_1k_tokens: 0.0150, effective_from: daysAgo(now, 60) },
    { model: 'claude-haiku', input_price_per_1k_tokens: 0.0008, output_price_per_1k_tokens: 0.0040, effective_from: daysAgo(now, 60) },
    { model: 'claude-opus', input_price_per_1k_tokens: 0.0150, output_price_per_1k_tokens: 0.0750, effective_from: daysAgo(now, 60) },
    { model: 'meta-llama/Llama-3.1-8B', input_price_per_1k_tokens: 0.0004, output_price_per_1k_tokens: 0.0004, effective_from: daysAgo(now, 60) },
    { model: 'mistralai/Mistral-7B', input_price_per_1k_tokens: 0.0002, output_price_per_1k_tokens: 0.0002, effective_from: daysAgo(now, 60) },
    // experimental-model-x is intentionally left unpriced to seed an `unpriced_usage` case.
  ];

  await knex('model_pricing').insert(
    pricingRows.map((p) => ({
      model: p.model,
      input_price_per_1k_tokens: p.input_price_per_1k_tokens,
      output_price_per_1k_tokens: p.output_price_per_1k_tokens,
      effective_from: p.effective_from,
      created_by: 'seed',
    })),
  );

  function priceFor(model, occurredAt) {
    const candidates = pricingRows.filter((p) => p.model === model && p.effective_from <= occurredAt);
    if (candidates.length === 0) return null;
    return candidates.reduce((latest, p) => (p.effective_from > latest.effective_from ? p : latest));
  }

  const rows = [];

  agents.forEach((agent) => {
    for (let daysBack = 13; daysBack >= 0; daysBack -= 1) {
      const day = daysAgo(now, daysBack);
      const callsToday = randInt(3, 9);

      for (let i = 0; i < callsToday; i += 1) {
        const occurredAt = randomTimeOnDay(day);
        const model = Math.random() < 0.04 ? UNPRICED_MODEL : pick(PRICED_MODELS);

        const tokensInput = randInt(200, 4000);
        const tokensOutput = Math.random() < 0.03 ? randInt(8000, 20000) : randInt(100, 2000);
        const tokensTotal = tokensInput + tokensOutput;

        const roll = Math.random();
        let status = 'success';
        let errorCategory = null;
        let errorCode = null;
        if (roll < 0.08) {
          status = 'error';
          errorCategory = 'api_error';
          errorCode = pick(ERROR_CODES.api_error);
        } else if (roll < 0.13) {
          status = 'error';
          errorCategory = 'validation_error';
          errorCode = pick(ERROR_CODES.validation_error);
        }

        const price = priceFor(model, occurredAt);
        const costUsd = price
          ? Number(
              (
                (tokensInput / 1000) * price.input_price_per_1k_tokens +
                (tokensOutput / 1000) * price.output_price_per_1k_tokens
              ).toFixed(6),
            )
          : null;

        rows.push({
          agent_id: agent.id,
          request_id: randomUUID(),
          endpoint: pick(ENDPOINTS),
          model,
          tokens_input: tokensInput,
          tokens_output: tokensOutput,
          tokens_total: tokensTotal,
          status,
          error_category: errorCategory,
          error_code: errorCode,
          cost_usd: costUsd,
          latency_ms: status === 'error' ? randInt(50, 8000) : randInt(150, 3500),
          source: pick(SOURCES),
          occurred_at: occurredAt,
          raw_metadata: JSON.stringify({ seed: true }),
        });
      }
    }
  });

  const CHUNK = 500;
  const inserted = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    // eslint-disable-next-line no-await-in-loop
    const chunkRows = await knex('api_usage_logs')
      .insert(rows.slice(i, i + CHUNK))
      .returning(['id', 'agent_id as agentId', 'model', 'status', 'error_category as errorCategory', knex.raw('cost_usd::float8 as "costUsd"')]);
    inserted.push(...chunkRows);
  }

  // A handful of illustrative alerts so the /finops page and alert bell have
  // something to show on a fresh seed, exercising both alert types and both
  // an "open" and a "resolved" state.
  const unpriced = inserted.find((r) => r.costUsd === null);
  const mostExpensive = inserted.reduce((max, r) => (r.costUsd !== null && (!max || r.costUsd > max.costUsd) ? r : max), null);
  const apiErrorSample = inserted.find((r) => r.errorCategory === 'api_error');

  const alerts = [];
  if (unpriced) {
    alerts.push({
      agent_id: unpriced.agentId,
      alert_type: 'unpriced_usage',
      severity: 'warning',
      message: `No pricing configured for model "${unpriced.model}"`,
      details: JSON.stringify({ model: unpriced.model, logId: unpriced.id }),
      status: 'open',
    });
  }
  if (mostExpensive) {
    alerts.push({
      agent_id: mostExpensive.agentId,
      alert_type: 'expensive_call',
      severity: 'critical',
      message: `Call cost $${mostExpensive.costUsd} exceeded threshold $0.5`,
      details: JSON.stringify({ logId: mostExpensive.id, costUsd: mostExpensive.costUsd, thresholdValue: 0.5 }),
      status: 'open',
    });
  }
  if (apiErrorSample) {
    alerts.push({
      agent_id: apiErrorSample.agentId,
      alert_type: 'high_api_error_rate',
      severity: 'warning',
      message: 'api_error rate 22.0% exceeded 15% over the last 60m',
      details: JSON.stringify({ rate: 22, thresholdValue: 15, windowMinutes: 60, totalCalls: 9, errorCalls: 2 }),
      status: 'resolved',
      resolved_at: daysAgo(now, 2),
    });
  }

  if (alerts.length > 0) {
    await knex('finops_alerts').insert(alerts);
  }
};
