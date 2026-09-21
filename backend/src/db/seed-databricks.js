// Local-dev sample data for the Databricks datastore. Unlike the old Knex
// seeds (which inserted rows directly), this drives the same service-layer
// functions the API uses, so seeded data goes through the same validation,
// pricing lookup, and alert-evaluation logic as real traffic — including
// naturally producing an unpriced-usage alert, an expensive-call alert, and
// a high-error-rate alert, instead of hand-crafting those rows.
//
// Usage: npm run seed:databricks --workspace backend
require('dotenv').config();
const db = require('./databricksClient');
const agentsService = require('../services/agents.service');
const updatesService = require('../services/updates.service');
const pricingService = require('../services/pricing.service');
const thresholdsService = require('../services/thresholds.service');
const usageLogsService = require('../services/usage-logs.service');

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

const PRICED_MODELS = ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o-mini', 'gemini-2.5-pro', 'gemini-2.5-flash', 'claude-sonnet', 'claude-haiku', 'claude-opus'];
const UNPRICED_MODEL = 'experimental-model-x';
const ENDPOINTS = ['/v1/chat/completions', '/v1/responses', '/v1/extract', '/v1/summarize'];
const SOURCES = ['support-portal', 'invoice-app', 'meeting-notes-web', 'internal-cron'];
const ERROR_CODES = {
  api_error: ['503_service_unavailable', '429_rate_limited', 'timeout', '500_internal_error'],
  validation_error: ['missing_required_field', 'invalid_model', 'payload_too_large'],
};

async function clearAll() {
  for (const table of ['finops_alerts', 'api_usage_logs', 'model_pricing', 'finops_thresholds', 'agent_updates', 'agents']) {
    // eslint-disable-next-line no-await-in-loop
    await db.query(`DELETE FROM ${table}`);
  }
}

async function seedAgents() {
  const now = new Date();
  const specs = [
    {
      name: 'Support Triage Agent',
      description: 'Classifies and routes inbound support tickets.',
      assignedTo: 'Arya Kayastha',
      eta: '2026-09-15',
      status: 'In Progress',
      progress: 60,
      statusDescription: 'Intent classification working, routing rules in progress.',
    },
    {
      name: 'Invoice Extraction Agent',
      description: 'Extracts line items from vendor invoices into structured data.',
      assignedTo: 'Priya Sharma',
      eta: '2026-09-01',
      status: 'Blocked',
      progress: 35,
      statusDescription: 'Waiting on sample invoice set from finance team.',
    },
    {
      name: 'Meeting Notes Agent',
      description: 'Summarizes meeting transcripts and extracts action items.',
      assignedTo: 'Jordan Lee',
      eta: '2026-08-30',
      status: 'Completed',
      progress: 100,
      statusDescription: 'Shipped to pilot users.',
    },
  ];

  const agents = [];
  for (const spec of specs) {
    // eslint-disable-next-line no-await-in-loop
    const agent = await agentsService.createAgent(spec);
    agents.push(agent);

    for (let daysBack = 4; daysBack >= 1; daysBack -= 1) {
      const progress = Math.max(0, spec.progress - daysBack * 10);
      // eslint-disable-next-line no-await-in-loop
      await updatesService.recordUpdate({
        agentId: agent.id,
        updateDate: daysAgo(now, daysBack).toISOString().slice(0, 10),
        status: 'In Progress',
        progress,
        statusDescription: 'Daily progress update.',
        source: 'manual',
      });
    }
  }
  return agents;
}

async function seedThresholds() {
  await thresholdsService.upsertThreshold({ agentId: null, alertType: 'expensive_call', thresholdValue: 0.5, windowMinutes: null });
  await thresholdsService.upsertThreshold({ agentId: null, alertType: 'high_api_error_rate', thresholdValue: 15, windowMinutes: 60 });
  await thresholdsService.upsertThreshold({ agentId: null, alertType: 'high_validation_error_rate', thresholdValue: 15, windowMinutes: 60 });
}

async function seedPricing() {
  const now = new Date();
  // Two price points for gpt-4.1 so seeded data exercises effective-dated lookup.
  const rows = [
    { model: 'gpt-4.1', inputPricePer1kTokens: 0.002, outputPricePer1kTokens: 0.008, effectiveFrom: daysAgo(now, 60) },
    { model: 'gpt-4.1', inputPricePer1kTokens: 0.0018, outputPricePer1kTokens: 0.0072, effectiveFrom: daysAgo(now, 10) },
    { model: 'gpt-4.1-mini', inputPricePer1kTokens: 0.0004, outputPricePer1kTokens: 0.0016, effectiveFrom: daysAgo(now, 60) },
    { model: 'gpt-4o-mini', inputPricePer1kTokens: 0.00015, outputPricePer1kTokens: 0.0006, effectiveFrom: daysAgo(now, 60) },
    { model: 'gemini-2.5-pro', inputPricePer1kTokens: 0.00125, outputPricePer1kTokens: 0.01, effectiveFrom: daysAgo(now, 60) },
    { model: 'gemini-2.5-flash', inputPricePer1kTokens: 0.0003, outputPricePer1kTokens: 0.0025, effectiveFrom: daysAgo(now, 60) },
    { model: 'claude-sonnet', inputPricePer1kTokens: 0.003, outputPricePer1kTokens: 0.015, effectiveFrom: daysAgo(now, 60) },
    { model: 'claude-haiku', inputPricePer1kTokens: 0.0008, outputPricePer1kTokens: 0.004, effectiveFrom: daysAgo(now, 60) },
    { model: 'claude-opus', inputPricePer1kTokens: 0.015, outputPricePer1kTokens: 0.075, effectiveFrom: daysAgo(now, 60) },
    // experimental-model-x is intentionally left unpriced to seed an `unpriced_usage` alert.
  ];
  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    await pricingService.createPricing({ ...row, createdBy: 'seed' });
  }
}

async function seedUsage(agents) {
  const now = new Date();
  for (const agent of agents) {
    for (let daysBack = 13; daysBack >= 0; daysBack -= 1) {
      const day = daysAgo(now, daysBack);
      const callsToday = randInt(3, 9);

      for (let i = 0; i < callsToday; i += 1) {
        const occurredAt = randomTimeOnDay(day);
        const model = Math.random() < 0.04 ? UNPRICED_MODEL : pick(PRICED_MODELS);

        const tokensInput = randInt(200, 4000);
        const tokensOutput = Math.random() < 0.03 ? randInt(8000, 20000) : randInt(100, 2000);

        const roll = Math.random();
        let status = 'success';
        let errorCategory;
        let errorCode;
        if (roll < 0.08) {
          status = 'error';
          errorCategory = 'api_error';
          errorCode = pick(ERROR_CODES.api_error);
        } else if (roll < 0.13) {
          status = 'error';
          errorCategory = 'validation_error';
          errorCode = pick(ERROR_CODES.validation_error);
        }

        // eslint-disable-next-line no-await-in-loop
        await usageLogsService.ingestUsageLog({
          agentId: agent.id,
          endpoint: pick(ENDPOINTS),
          model,
          tokensInput,
          tokensOutput,
          status,
          errorCategory,
          errorCode,
          latencyMs: status === 'error' ? randInt(50, 8000) : randInt(150, 3500),
          source: pick(SOURCES),
          occurredAt,
          rawMetadata: { seed: true },
        });
      }
    }
  }
}

async function run() {
  console.log('Clearing existing rows...');
  await clearAll();

  console.log('Seeding thresholds and pricing...');
  await seedThresholds();
  await seedPricing();

  console.log('Seeding agents and update history...');
  const agents = await seedAgents();

  console.log('Seeding usage logs (this drives real alert evaluation, so it takes a bit)...');
  await seedUsage(agents);

  console.log('Databricks seed complete.');
}

run()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.close());
