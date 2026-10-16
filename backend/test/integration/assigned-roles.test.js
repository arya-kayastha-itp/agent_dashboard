// Being assigned to an agent makes someone a contributor on it, on top of
// their role: FinOps people send updates for review, Executives stay view-only.
const { describe, test, before } = require('node:test');
const assert = require('node:assert/strict');
const { useTestApp } = require('./helpers');

describe('Assigned people with other roles', () => {
  const ctx = useTestApp();
  const { api } = ctx;
  let finops;
  let executive;
  let mine;
  let other;

  const submit = (person, agentId, body) => api('POST', '/submissions', { token: person.token, body: { agentId, ...body } });

  before(async () => {
    finops = await ctx.createPerson(`E2E Assigned FinOps ${ctx.stamp}`, 'FINOPS');
    executive = await ctx.createPerson(`E2E Assigned Exec ${ctx.stamp}`, 'EXECUTIVE');
    mine = await ctx.createAgent({
      name: `E2E Shared Agent ${ctx.stamp}`,
      status: 'In Progress',
      progress: 20,
      assigneeIds: [finops.member.id, executive.member.id],
    });
    other = await ctx.createAgent({ name: `E2E Unassigned Agent ${ctx.stamp}` });
  });

  test('FinOps still sees the whole portfolio, not just their agents', async () => {
    const r = await api('GET', '/agents', { token: finops.token });
    assert.equal(r.status, 200);
    const ids = r.data.map((a) => a.id);
    assert.ok(ids.includes(mine.id) && ids.includes(other.id));
  });

  test('FinOps sends an update for their own agent, and it waits for review', async () => {
    let r = await submit(finops, mine.id, { status: 'In Progress', progress: 40, statusDescription: 'Cost dashboard wired up' });
    assert.equal(r.status, 201);
    assert.equal(r.data.reviewStatus, 'pending');
    const agent = (await api('GET', `/agents/${mine.id}`, { token: ctx.manager.token })).data;
    assert.equal(agent.currentProgress, 20, 'nothing changes before review');
    assert.equal(agent.pendingReviewCount, 1);

    r = await api('POST', `/submissions/${r.data.id}/review`, { token: ctx.manager.token, body: { decision: 'approve' } });
    assert.equal(r.status, 200);
    assert.equal((await api('GET', `/agents/${mine.id}`, { token: ctx.manager.token })).data.currentProgress, 40);
  });

  test("…but not for an agent they aren't assigned to", async () => {
    const r = await submit(finops, other.id, { status: 'In Progress', progress: 10 });
    assert.equal(r.status, 403);
    assert.equal(r.data.error.code, 'NOT_ASSIGNED');
  });

  test('FinOps only sees their own submissions', async () => {
    const r = await api('GET', '/submissions', { token: finops.token });
    assert.equal(r.status, 200);
    assert.ok(r.data.length >= 1);
    assert.ok(r.data.every((s) => s.submittedBy === finops.user.id));
  });

  test('Executives stay view-only, even on agents they are listed on', async () => {
    let r = await submit(executive, mine.id, { status: 'In Progress', progress: 50 });
    assert.equal(r.status, 403);
    assert.equal(r.data.error.code, 'FORBIDDEN');
    r = await api('GET', '/submissions', { token: executive.token });
    assert.equal(r.status, 403);
    r = await api('GET', `/agents/${mine.id}`, { token: executive.token });
    assert.equal(r.status, 200, 'but they can still look');
  });
});
