// Agents reporting their own API usage (no sign-in), and FinOps reading it back.
const { describe, test, before } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { useTestApp, db, daysFromNow } = require('./helpers');

describe('Usage intake', () => {
  const ctx = useTestApp();
  const { api } = ctx;
  const model = `e2e-model-${ctx.stamp}`;
  const unpricedModel = `e2e-unpriced-${ctx.stamp}`;
  let finops;
  let agent;

  // $0.50 per 1k input tokens, $1.50 per 1k output: this call costs $0.80.
  const cheapCall = () => ({ agentId: agent.id, model, tokensInput: 1000, tokensOutput: 200, status: 'success', latencyMs: 850 });
  // …and this one $2.50, over the agent's $2 expensive-call threshold.
  const expensiveCall = () => ({ agentId: agent.id, model, tokensInput: 2000, tokensOutput: 1000, status: 'success' });
  const near = (actual, expected) => Math.abs(Number(actual) - expected) < 1e-6;

  const ingest = (body) => api('POST', '/finops/usage-logs', { body });
  const openAlerts = async (alertType) =>
    (await api('GET', '/finops/alerts?status=open', { token: finops.token })).data.filter((a) => a.agentId === agent.id && a.alertType === alertType);

  before(async () => {
    finops = await ctx.createPerson(`E2E FinOps ${ctx.stamp}`, 'FINOPS');
    agent = await ctx.createAgent({ name: `E2E Usage Agent ${ctx.stamp}` });
    // Pricing has no delete in the app — remove the test model's rows directly.
    ctx.cleanup = () => db.query('DELETE FROM model_pricing WHERE model = :model', { model });

    let r = await api('POST', '/finops/pricing', {
      token: finops.token,
      body: { model, inputPricePer1kTokens: 0.5, outputPricePer1kTokens: 1.5, effectiveFrom: daysFromNow(-1) },
    });
    assert.equal(r.status, 201);
    r = await api('PUT', '/finops/thresholds', { token: finops.token, body: { agentId: agent.id, alertType: 'expensive_call', thresholdValue: 2 } });
    assert.equal(r.status, 200);
  });

  test('a usage log is stored and priced', async () => {
    const r = await ingest(cheapCall());
    assert.equal(r.status, 201);
    assert.equal(r.data.tokensTotal, 1200);
    assert.ok(near(r.data.costUsd, 0.8), `cost ${r.data.costUsd}`);
    assert.equal(r.data.source, 'external');
    assert.deepEqual(await openAlerts('expensive_call'), []);
  });

  test('malformed logs are refused with the reason', async () => {
    let r = await ingest({ agentId: agent.id, tokensInput: 10, status: 'success' });
    assert.equal(r.status, 400);
    assert.equal(r.data.error.code, 'VALIDATION_ERROR');
    assert.ok(r.data.error.details.fieldErrors.model);

    r = await ingest({ ...cheapCall(), status: 'error' });
    assert.equal(r.status, 400, 'an error needs its category');
    assert.ok(r.data.error.details.fieldErrors.errorCategory);

    r = await ingest({ ...cheapCall(), agentId: 'not-a-uuid' });
    assert.equal(r.status, 400);
    r = await ingest({ ...cheapCall(), tokensInput: -5 });
    assert.equal(r.status, 400);
  });

  test('a log for an agent that does not exist → 400', async () => {
    const r = await ingest({ ...cheapCall(), agentId: crypto.randomUUID() });
    assert.equal(r.status, 400);
    assert.equal(r.data.error.code, 'FOREIGN_KEY_VIOLATION');
  });

  test('an expensive call raises one open alert, not one per call', async () => {
    let r = await ingest(expensiveCall());
    assert.equal(r.status, 201);
    assert.ok(near(r.data.costUsd, 2.5));
    let alerts = await openAlerts('expensive_call');
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].severity, 'critical');
    assert.equal(alerts[0].details.logId, r.data.id);

    r = await ingest(expensiveCall());
    assert.equal(r.status, 201);
    alerts = await openAlerts('expensive_call');
    assert.equal(alerts.length, 1);
  });

  test('a model with no price is stored unpriced and flagged', async () => {
    const r = await ingest({ ...cheapCall(), model: unpricedModel });
    assert.equal(r.status, 201);
    assert.equal(r.data.costUsd, null);
    const [alert] = await openAlerts('unpriced_usage');
    assert.ok(alert);
    assert.equal(alert.details.model, unpricedModel);
  });

  test('a batch stores the good entries and reports each bad one', async () => {
    let r = await api('POST', '/finops/usage-logs/batch', {
      body: { entries: [cheapCall(), { agentId: agent.id, status: 'success' }, { ...cheapCall(), agentId: crypto.randomUUID() }] },
    });
    assert.equal(r.status, 207);
    const [good, invalid, unknown] = r.data.results;
    assert.equal(good.success, true);
    assert.ok(near(good.data.costUsd, 0.8));
    assert.deepEqual([invalid.success, invalid.error.code], [false, 'VALIDATION_ERROR']);
    assert.deepEqual([unknown.success, unknown.error.code], [false, 'FOREIGN_KEY_VIOLATION']);
    assert.ok(!/SELECT|agents/i.test(unknown.error.message), 'no SQL in the message');

    r = await api('POST', '/finops/usage-logs/batch', {
      body: {
        entries: [cheapCall(), { agentId: agent.id, model, tokensInput: 0, tokensOutput: 0, status: 'error', errorCategory: 'api_error', errorCode: '429' }],
      },
    });
    assert.equal(r.status, 201, 'all stored → 201');
    assert.ok(r.data.results.every((x) => x.success));

    r = await api('POST', '/finops/usage-logs/batch', { body: { entries: [] } });
    assert.equal(r.status, 400);
  });

  test('FinOps sees every stored call, its cost and errors', async () => {
    let r = await api('GET', `/finops/usage?agentId=${agent.id}`, { token: finops.token });
    assert.equal(r.status, 200);
    // cheap, 2 × expensive, unpriced, batch 1's good entry, batch 2's two entries
    assert.equal(r.data.length, 7);
    assert.equal(r.data.filter((log) => log.status === 'error').length, 1);

    r = await api('GET', `/finops/usage/summary?agentId=${agent.id}`, { token: finops.token });
    assert.equal(r.status, 200);
    const total = (field) => r.data.reduce((sum, day) => sum + day[field], 0);
    assert.equal(total('calls'), 7);
    assert.equal(total('errors'), 1);
    // cheap + 2 × expensive + batch cheap ×2 (unpriced and the 0-token error add nothing)
    assert.ok(near(total('cost'), 0.8 + 2.5 + 2.5 + 0.8 + 0.8), `cost ${total('cost')}`);

    r = await api('GET', `/finops/usage?agentId=${agent.id}`, { token: ctx.manager.token });
    assert.equal(r.status, 403, 'usage is FinOps-only');
  });

  test("deleting the agent deletes its usage, alerts and thresholds", async () => {
    const r = await api('DELETE', `/agents/${agent.id}`, { token: ctx.manager.token });
    assert.equal(r.status, 204);
    for (const table of ['api_usage_logs', 'finops_alerts', 'finops_thresholds']) {
      // eslint-disable-next-line no-await-in-loop
      const [{ n }] = await db.query(`SELECT COUNT(*) AS n FROM ${table} WHERE agent_id = :id`, { id: agent.id });
      assert.equal(Number(n), 0, table);
    }
  });
});
