// Blocker details and escalation, and target-date slips with reasons.
const { describe, test, before } = require('node:test');
const assert = require('node:assert/strict');
const { useTestApp, db } = require('./helpers');
const { escalateLongBlockers } = require('../../src/services/escalations.service');

describe('Blockers and target dates', () => {
  const ctx = useTestApp();
  const { api } = ctx;
  let person;
  let agent;

  const get = async () => (await api('GET', `/agents/${agent.id}`, { token: ctx.manager.token })).data;
  const update = (body) => api('POST', '/updates', { token: ctx.manager.token, body: { agentId: agent.id, ...body } });
  const backdateBlock = (days) =>
    db.query(`UPDATE agents SET blocked_since = current_timestamp() - INTERVAL ${Number(days)} DAYS WHERE id = :id`, { id: agent.id });
  const escalatedAt = async () =>
    (await db.queryOne('SELECT CAST(blocker_escalated_at AS STRING) AS at FROM agents WHERE id = :id', { id: agent.id })).at;

  before(async () => {
    person = await ctx.createPerson(`Blocker Person ${ctx.stamp}`);
    agent = await ctx.createAgent({
      name: `Blocker Agent ${ctx.stamp}`,
      status: 'In Progress',
      progress: 20,
      eta: '2026-12-01',
      assigneeIds: [person.member.id],
    });
  });

  test('becoming Blocked needs a reason and who can unblock it', async () => {
    let r = await update({ status: 'Blocked', progress: 20 });
    assert.equal(r.status, 400);
    assert.equal(r.data.error.code, 'BLOCKER_DETAILS_REQUIRED');

    r = await update({ status: 'Blocked', progress: 20, blockerReason: 'No prod API keys', blockedBy: 'Platform team' });
    assert.equal(r.status, 201);
    let a = await get();
    assert.equal(a.currentStatus, 'Blocked');
    assert.ok(a.blockedSince);
    assert.equal(a.blockerReason, 'No prod API keys');
    assert.equal(a.blockedBy, 'Platform team');
    assert.equal(a.blockerEscalated, false);

    const since = a.blockedSince;
    r = await update({ status: 'Blocked', progress: 25 });
    a = await get();
    assert.equal(r.status, 201, 'staying Blocked needs nothing new');
    assert.equal(a.blockedSince, since, '…and keeps the clock');
    assert.equal(a.blockerReason, 'No prod API keys');

    await update({ status: 'In Progress', progress: 30 });
    a = await get();
    assert.equal(a.currentStatus, 'In Progress');
    assert.ok(!a.blockedSince && !a.blockerReason && !a.blockedBy, 'unblocking clears it all');
  });

  test('the Daily Sheet names the agent missing blocker details', async () => {
    let r = await api('POST', '/updates/batch', { token: ctx.manager.token, body: { entries: [{ agentId: agent.id, status: 'Blocked', progress: 30 }] } });
    assert.equal(r.status, 400);
    assert.ok(r.data.error.message.includes(agent.name));
    r = await api('POST', '/updates/batch', {
      token: ctx.manager.token,
      body: { entries: [{ agentId: agent.id, status: 'Blocked', progress: 30, blockerReason: 'Vendor outage', blockedBy: 'Acme support' }] },
    });
    assert.equal(r.status, 201);
    assert.equal((await get()).blockedBy, 'Acme support');
    await update({ status: 'In Progress', progress: 30 });
  });

  test('a new agent starting Blocked needs details too', async () => {
    const name = `Blocker Born Blocked ${ctx.stamp}`;
    const r = await api('POST', '/agents', { token: ctx.manager.token, body: { name, status: 'Blocked' } });
    assert.equal(r.status, 400);
    assert.equal(r.data.error.code, 'BLOCKER_DETAILS_REQUIRED');
    const born = await ctx.createAgent({ name, status: 'Blocked', blockerReason: 'Waiting on budget', blockedBy: 'Finance' });
    assert.ok(born.blockedSince);
    assert.equal(born.blockerReason, 'Waiting on budget');

    const other = await api('GET', `/agents/${born.id}/eta-history`, { token: person.token });
    assert.equal(other.status, 404, "contributors can't read an unassigned agent's date history");
  });

  test("a contributor's blocker details carry through review", async () => {
    let r = await api('POST', '/submissions', { token: person.token, body: { agentId: agent.id, status: 'Blocked', progress: 35 } });
    assert.equal(r.status, 400);
    assert.equal(r.data.error.code, 'BLOCKER_DETAILS_REQUIRED');
    r = await api('POST', '/submissions', {
      token: person.token,
      body: { agentId: agent.id, status: 'Blocked', progress: 35, blockerReason: 'SSO not approved', blockedBy: 'Security team' },
    });
    assert.equal(r.status, 201);
    assert.equal(r.data.blockerReason, 'SSO not approved');
    r = await api('POST', `/submissions/${r.data.id}/review`, { token: ctx.manager.token, body: { decision: 'approve' } });
    assert.equal(r.status, 200);
    const a = await get();
    assert.equal(a.currentStatus, 'Blocked');
    assert.equal(a.blockerReason, 'SSO not approved');
    assert.equal(a.blockedBy, 'Security team');
  });

  test('blocked past the threshold escalates once, and again after a new block', async () => {
    await backdateBlock(4);
    assert.equal((await get()).blockerEscalated, true, 'reads as escalated');

    let result = await escalateLongBlockers();
    assert.ok(result.escalated.some((x) => x.id === agent.id), 'the check picks it up');
    assert.ok(await escalatedAt(), '…and records when');
    result = await escalateLongBlockers();
    assert.ok(!result.escalated.some((x) => x.id === agent.id), 'a second check does not email again');

    const r = await api('GET', `/audit?agentId=${agent.id}&limit=5`, { token: ctx.manager.token });
    const event = r.data.events.find((e) => e.action === 'blocker_escalated');
    assert.ok(event);
    assert.ok(event.details.daysBlocked >= 4);
    assert.equal(event.details.blocker.blockedBy, 'Security team');
    assert.equal(event.actorId, null, 'the system did it, not a person');

    await update({ status: 'In Progress', progress: 40 });
    assert.equal(await escalatedAt(), null, 'unblocking clears the escalation');
    await update({ status: 'Blocked', progress: 40, blockerReason: 'Again', blockedBy: 'Platform team' });
    await backdateBlock(5);
    result = await escalateLongBlockers();
    assert.ok(result.escalated.some((x) => x.id === agent.id), 'a new block escalates again');
    await update({ status: 'In Progress', progress: 45 });
  });

  test('moving the target date later needs a reason; earlier does not', async () => {
    let r = await api('PATCH', `/agents/${agent.id}`, { token: ctx.manager.token, body: { eta: '2026-12-15' } });
    assert.equal(r.status, 400);
    assert.equal(r.data.error.code, 'ETA_REASON_REQUIRED');
    r = await api('PATCH', `/agents/${agent.id}`, { token: ctx.manager.token, body: { eta: '2026-12-15', etaChangeReason: 'Vendor delay' } });
    assert.equal(r.status, 200);
    assert.ok(String(r.data.eta).startsWith('2026-12-15'));
    assert.equal(r.data.etaSlipCount, 1);
    r = await api('PATCH', `/agents/${agent.id}`, { token: ctx.manager.token, body: { eta: '2026-12-10' } });
    assert.equal(r.status, 200);
  });

  test('contributors and reviewers give reasons for later dates too', async () => {
    let r = await api('POST', '/submissions', { token: person.token, body: { agentId: agent.id, status: 'In Progress', progress: 50, eta: '2027-01-05' } });
    assert.equal(r.status, 400);
    assert.equal(r.data.error.code, 'ETA_REASON_REQUIRED');
    r = await api('POST', '/submissions', {
      token: person.token,
      body: { agentId: agent.id, status: 'In Progress', progress: 50, eta: '2027-01-05', etaReason: 'Waiting on legal review' },
    });
    assert.equal(r.status, 201);
    assert.equal(r.data.etaReason, 'Waiting on legal review');
    await api('POST', `/submissions/${r.data.id}/review`, { token: ctx.manager.token, body: { decision: 'approve' } });
    let a = await get();
    assert.ok(String(a.eta).startsWith('2027-01-05'));
    assert.equal(a.etaSlipCount, 2);
    assert.equal(a.etaSlipDays, 35);

    r = await api('POST', '/submissions', { token: person.token, body: { agentId: agent.id, status: 'In Progress', progress: 55 } });
    const plain = r.data.id;
    r = await api('POST', `/submissions/${plain}/review`, { token: ctx.manager.token, body: { decision: 'approve', edits: { eta: '2027-01-20' } } });
    assert.equal(r.status, 400, 'reviewer pushing the date later with no reason');
    assert.equal(r.data.error.code, 'ETA_REASON_REQUIRED');
    r = await api('POST', `/submissions/${plain}/review`, { token: ctx.manager.token, body: { decision: 'approve', edits: { eta: '2027-01-20' }, comment: 'Holiday freeze' } });
    assert.equal(r.status, 200, 'the review comment is the reason');

    a = await get();
    assert.equal(a.etaSlipCount, 3);
    assert.equal(a.etaSlipDays, 50, 'net, from the first date');
  });

  test('the target date history lists every change with reasons, newest first', async () => {
    const r = await api('GET', `/agents/${agent.id}/eta-history`, { token: person.token });
    assert.equal(r.status, 200);
    const [h0, h1, h2, h3] = r.data;
    assert.equal(r.data.length, 4);
    assert.deepEqual([h0.toEta, h0.reason, h0.source, h0.changedByName], ['2027-01-20', 'Holiday freeze', 'submission', person.member.name]);
    assert.deepEqual([h1.toEta, h1.reason], ['2027-01-05', 'Waiting on legal review']);
    assert.deepEqual([h2.toEta, h2.reason ?? null, h2.source], ['2026-12-10', null, 'edit']);
    assert.deepEqual([h3.fromEta, h3.toEta, h3.reason], ['2026-12-01', '2026-12-15', 'Vendor delay']);
  });

  test("deleting the agent deletes its date history", async () => {
    await api('DELETE', `/agents/${agent.id}`, { token: ctx.manager.token });
    const [{ n }] = await db.query('SELECT COUNT(*) AS n FROM eta_changes WHERE agent_id = :id', { id: agent.id });
    assert.equal(Number(n), 0);
  });
});
