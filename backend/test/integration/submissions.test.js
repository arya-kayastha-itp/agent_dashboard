// Contributors submit updates; only the Agent Manager's approval changes the dashboard.
const { describe, test, before } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { useTestApp, db, MANAGER_NAME, daysFromNow, pause } = require('./helpers');

describe('Submit and review', () => {
  const ctx = useTestApp();
  const { api } = ctx;
  let alice;
  let bob;
  let carol;
  let agentId;

  const agentState = async (token = ctx.manager.token) => (await api('GET', `/agents/${agentId}`, { token })).data;
  const submit = (person, body) => api('POST', '/submissions', { token: person.token, body: { agentId, ...body } });
  const review = (id, body) => api('POST', `/submissions/${id}/review`, { token: ctx.manager.token, body });

  before(async () => {
    alice = await ctx.createPerson(`E2E Alice ${ctx.stamp}`);
    bob = await ctx.createPerson(`E2E Bob ${ctx.stamp}`);
    carol = await ctx.createPerson(`E2E Carol ${ctx.stamp}`);
    const agent = await ctx.createAgent({
      name: `E2E Review Agent ${ctx.stamp}`,
      status: 'Not Started',
      progress: 10,
      eta: '2026-12-01',
      assigneeIds: [alice.member.id, bob.member.id],
    });
    agentId = agent.id;
    assert.equal(agent.pendingReviewCount, 0);
  });

  test('only assignees can submit', async () => {
    let r = await submit(carol, { status: 'In Progress', progress: 20 });
    assert.equal(r.status, 403);
    assert.equal(r.data.error.code, 'NOT_ASSIGNED');
    r = await api('POST', '/submissions', { token: ctx.manager.token, body: { agentId, status: 'In Progress', progress: 20 } });
    assert.equal(r.status, 403, 'the Agent Manager updates directly instead');
  });

  let aliceFirst;
  let aliceSecond;
  let bobFirst;

  test('submitting leaves the dashboard alone until review', async () => {
    let r = await submit(alice, { status: 'In Progress', progress: 30, statusDescription: 'A first' });
    assert.equal(r.status, 201);
    assert.equal(r.data.reviewStatus, 'pending');
    assert.ok(r.data.submitterName.startsWith('E2E Alice'));
    aliceFirst = r.data.id;

    r = await submit(alice, { status: 'In Progress', progress: 35, statusDescription: 'A second' });
    aliceSecond = r.data.id;
    r = await api('GET', `/submissions?status=pending&agentId=${agentId}`, { token: ctx.manager.token });
    assert.deepEqual(
      r.data.map((s) => s.id),
      [aliceSecond],
      'resubmitting replaces your own pending update',
    );

    const agent = await agentState();
    assert.equal(agent.currentStatus, 'Not Started');
    assert.equal(agent.currentProgress, 10);
    assert.equal(agent.pendingReviewCount, 1);
  });

  test('everyone pending is counted; contributors see only their own submissions', async () => {
    let r = await submit(bob, {
      status: 'Blocked',
      progress: 35,
      statusDescription: 'B blocked',
      eta: '2027-01-15',
      etaReason: 'Scope grew',
      blockerReason: 'Waiting on keys',
      blockedBy: 'Platform team',
    });
    assert.equal(r.status, 201);
    bobFirst = r.data.id;
    assert.equal((await agentState(alice.token)).pendingReviewCount, 2);

    r = await api('GET', `/submissions?agentId=${agentId}`, { token: alice.token });
    assert.equal(r.status, 200);
    assert.equal(r.data.length, 2);
    assert.ok(r.data.every((s) => s.submittedBy === alice.user.id));
    assert.equal(r.data.find((s) => s.id === aliceFirst).reviewStatus, 'superseded');

    r = await api('GET', '/submissions?status=bogus', { token: ctx.manager.token });
    assert.equal(r.status, 400);
  });

  test('requesting changes needs a comment and closes the submission', async () => {
    let r = await review(aliceSecond, { decision: 'request_changes' });
    assert.equal(r.status, 400);
    r = await review(aliceSecond, { decision: 'request_changes', comment: 'Add what shipped' });
    assert.equal(r.status, 200);
    assert.equal(r.data.reviewStatus, 'changes_requested');
    assert.equal(r.data.reviewComment, 'Add what shipped');
    assert.equal(r.data.reviewerName, MANAGER_NAME);
    r = await review(aliceSecond, { decision: 'approve' });
    assert.equal(r.status, 409, 'already reviewed');
  });

  test('approving with edits moves the dashboard to the edited values', async () => {
    const r = await review(bobFirst, { decision: 'approve', edits: { progress: 40 }, comment: 'Bumped to 40' });
    assert.equal(r.status, 200);
    assert.equal(r.data.reviewStatus, 'approved');
    assert.equal(r.data.approvedProgress, 40);
    assert.equal(r.data.progress, 35, 'what was submitted is kept');

    const agent = await agentState();
    assert.equal(agent.currentStatus, 'Blocked');
    assert.equal(agent.currentProgress, 40);
    assert.equal(agent.currentStatusDescription, 'B blocked');
    assert.ok(String(agent.eta).startsWith('2027-01-15'));
    assert.equal(agent.pendingReviewCount, 0);

    const history = (await api('GET', `/agents/${agentId}/history`, { token: ctx.manager.token })).data;
    const today = history[history.length - 1];
    assert.equal(today.status, 'Blocked');
    assert.equal(today.progress, 40);
    assert.equal(today.source, 'submission');
  });

  test('bulk approve applies only the newest per agent', async () => {
    let r = await submit(alice, { status: 'In Progress', progress: 45, statusDescription: 'A third' });
    const aliceThird = r.data.id;
    await pause(1100);
    r = await submit(bob, { status: 'In Progress', progress: 50, statusDescription: 'B unblocked' });
    const bobSecond = r.data.id;

    r = await api('POST', '/submissions/approve', { token: ctx.manager.token, body: { ids: [aliceThird, bobSecond] } });
    assert.equal(r.status, 200);
    assert.equal(r.data.approvedCount, 1);
    r = await api('GET', `/submissions?agentId=${agentId}`, { token: ctx.manager.token });
    const byId = new Map(r.data.map((s) => [s.id, s]));
    assert.equal(byId.get(bobSecond).reviewStatus, 'approved');
    assert.equal(byId.get(aliceThird).reviewStatus, 'superseded');

    const agent = await agentState();
    assert.equal(agent.currentStatus, 'In Progress');
    assert.equal(agent.currentProgress, 50);
    assert.ok(String(agent.eta).startsWith('2027-01-15'));
  });

  test('rejecting leaves the dashboard alone', async () => {
    let r = await submit(alice, { status: 'Completed', progress: 100 });
    r = await review(r.data.id, { decision: 'reject', comment: 'Not done yet' });
    assert.equal(r.status, 200);
    assert.equal(r.data.reviewStatus, 'rejected');
    assert.equal((await agentState()).currentProgress, 50);
  });

  test('a late approval is recorded in history but never rolls the dashboard back', async () => {
    let r = await submit(alice, { status: 'Completed', progress: 100, statusDescription: 'late one' });
    const late = r.data.id;
    // A newer day already in history (as if the Agent Manager updated tomorrow).
    await db.query(
      `INSERT INTO agent_updates (id, agent_id, update_date, status, progress, status_description, source, created_at, recorded_by, submission_id)
       VALUES (:id, :agentId, CAST(:date AS DATE), 'In Progress', 60, 'tomorrow row', 'manual', current_timestamp(), NULL, NULL)`,
      { id: crypto.randomUUID(), agentId, date: daysFromNow(1) },
    );
    r = await review(late, { decision: 'approve' });
    assert.equal(r.status, 200);
    assert.equal(r.data.reviewStatus, 'approved');

    const agent = await agentState();
    assert.equal(agent.currentProgress, 50);
    assert.equal(agent.currentStatus, 'In Progress');
    const history = (await api('GET', `/agents/${agentId}/history`, { token: ctx.manager.token })).data;
    assert.ok(history.some((row) => row.statusDescription === 'late one'));
  });

  test("deleting the agent deletes its submissions", async () => {
    const r = await api('DELETE', `/agents/${agentId}`, { token: ctx.manager.token });
    assert.equal(r.status, 204);
    const [{ n }] = await db.query('SELECT COUNT(*) AS n FROM update_submissions WHERE agent_id = :agentId', { agentId });
    assert.equal(Number(n), 0);
  });
});
