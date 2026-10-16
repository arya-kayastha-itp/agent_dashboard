// The audit log: every change to an agent, by whom, before → after.
const { describe, test, before } = require('node:test');
const assert = require('node:assert/strict');
const { useTestApp, MANAGER_NAME } = require('./helpers');

describe('Audit log', () => {
  const ctx = useTestApp();
  const { api } = ctx;
  let person;
  let agent;
  let events;

  const eventsFor = async (query) => (await api('GET', `/audit?${query}&limit=100`, { token: ctx.manager.token })).data.events;
  const byAction = (action) => events.filter((e) => e.action === action).reverse();

  // One of every kind of change, plus two that change nothing and must not log.
  before(async () => {
    const manager = ctx.manager.token;
    person = await ctx.createPerson(`Audit Person ${ctx.stamp}`);
    agent = await ctx.createAgent({ name: `Audit Agent ${ctx.stamp}`, status: 'Not Started', progress: 0, eta: '2026-12-01' });

    await api('PATCH', `/agents/${agent.id}`, {
      token: manager,
      body: { name: `Audit Agent ${ctx.stamp} v2`, eta: '2026-12-15', assigneeIds: [person.member.id], etaChangeReason: 'More scope' },
    });
    await api('PATCH', `/agents/${agent.id}`, { token: manager, body: { eta: '2026-12-15' } }); // no-op

    await api('POST', '/updates', { token: manager, body: { agentId: agent.id, status: 'In Progress', progress: 20, statusDescription: 'Kickoff' } });
    const sheetEntry = { agentId: agent.id, status: 'In Progress', progress: 30, statusDescription: 'Kickoff' };
    await api('POST', '/updates/batch', { token: manager, body: { entries: [sheetEntry] } });
    await api('POST', '/updates/batch', { token: manager, body: { entries: [sheetEntry] } }); // unchanged re-save

    let s = (await api('POST', '/submissions', { token: person.token, body: { agentId: agent.id, status: 'In Progress', progress: 40 } })).data;
    await api('POST', `/submissions/${s.id}/review`, { token: manager, body: { decision: 'request_changes', comment: 'More detail please' } });
    s = (
      await api('POST', '/submissions', {
        token: person.token,
        body: { agentId: agent.id, status: 'In Progress', progress: 45, statusDescription: 'Detail added', eta: '2027-01-10', etaReason: 'Legal review' },
      })
    ).data;
    await api('POST', `/submissions/${s.id}/review`, { token: manager, body: { decision: 'approve', edits: { progress: 50 }, comment: 'Rounded up' } });
    s = (await api('POST', '/submissions', { token: person.token, body: { agentId: agent.id, status: 'Completed', progress: 100 } })).data;
    await api('POST', `/submissions/${s.id}/review`, { token: manager, body: { decision: 'reject', comment: 'Not done yet' } });

    events = await eventsFor(`agentId=${agent.id}`);
  });

  test('every change is logged once, in order', () => {
    assert.deepEqual(
      events.map((e) => e.action).reverse(),
      [
        'agent_created',
        'agent_edited',
        'update_recorded',
        'update_recorded',
        'update_submitted',
        'changes_requested',
        'update_submitted',
        'update_approved',
        'update_submitted',
        'update_rejected',
      ],
    );
  });

  test('created and edited: who, starting values, and a diff', () => {
    const [created] = byAction('agent_created');
    assert.equal(created.actorName, MANAGER_NAME);
    assert.equal(created.details.eta, '2026-12-01');
    assert.equal(created.details.status, 'Not Started');

    const [{ details }] = byAction('agent_edited');
    assert.equal(details.changes.name.to, `Audit Agent ${ctx.stamp} v2`);
    assert.deepEqual(details.changes.eta, { from: '2026-12-01', to: '2026-12-15' });
    assert.deepEqual(details.changes.assignees.added, [person.member.name]);
    assert.equal(details.changes.marketplaceDeployment, undefined, 'unchanged fields are left out');
    assert.equal(details.etaReason, 'More scope');
  });

  test('direct and Daily Sheet updates: before → after', () => {
    const [direct, sheet] = byAction('update_recorded');
    assert.equal(direct.details.changes.status.from, 'Not Started');
    assert.equal(direct.details.changes.progress.to, 20);
    assert.equal(direct.details.via, undefined);
    assert.deepEqual(Object.keys(sheet.details.changes), ['progress']);
    assert.equal(sheet.details.via, 'daily_sheet');
  });

  test('submissions and reviews: who acted, whose update, comments and edits', () => {
    const [submitted] = byAction('update_submitted');
    assert.equal(submitted.actorName, person.member.name);
    assert.equal(submitted.details.proposed.progress, 40);

    const [changes] = byAction('changes_requested');
    assert.equal(changes.actorName, MANAGER_NAME);
    assert.equal(changes.subjectName, person.member.name);
    assert.equal(changes.subjectUserId, person.user.id);
    assert.equal(changes.details.comment, 'More detail please');

    const [approved] = byAction('update_approved');
    assert.deepEqual(approved.details.changes.progress, { from: 30, to: 50 });
    assert.equal(approved.details.changes.eta.to, '2027-01-10');
    assert.deepEqual(approved.details.editedByReviewer, ['progress']);
    assert.equal(approved.details.appliedToCurrent, true);
    assert.equal(approved.details.comment, 'Rounded up');

    const [rejected] = byAction('update_rejected');
    assert.equal(rejected.details.comment, 'Not done yet');
    assert.equal(rejected.details.proposed.progress, 100);
  });

  test('the person filter shows what they did and what was done to their updates', async () => {
    const personEvents = await eventsFor(`agentId=${agent.id}&personId=${person.user.id}`);
    assert.deepEqual(
      personEvents.map((e) => e.action).reverse(),
      ['update_submitted', 'changes_requested', 'update_submitted', 'update_approved', 'update_submitted', 'update_rejected'],
    );
  });

  test('paging walks every event exactly once', async () => {
    const seen = [];
    let cursor = '';
    for (let page = 0; page < 10; page += 1) {
      // eslint-disable-next-line no-await-in-loop
      const r = await api('GET', `/audit?agentId=${agent.id}&limit=3${cursor ? `&cursor=${cursor}` : ''}`, { token: ctx.manager.token });
      seen.push(...r.data.events.map((e) => e.id));
      if (!r.data.nextCursor) break;
      cursor = r.data.nextCursor;
    }
    assert.equal(seen.length, events.length);
    assert.equal(new Set(seen).size, events.length);
  });

  test('the log outlives the agent and the person', async () => {
    await api('DELETE', `/agents/${agent.id}`, { token: ctx.manager.token });
    let after = await eventsFor(`agentId=${agent.id}`);
    assert.equal(after.length, events.length + 1);
    assert.equal(after[0].action, 'agent_deleted');
    assert.equal(after[0].agentName, `Audit Agent ${ctx.stamp} v2`);

    await api('DELETE', `/team-members/${person.member.id}`, { token: ctx.manager.token });
    after = await eventsFor(`personId=${person.user.id}`);
    assert.ok(after.length >= 6);
    assert.ok(after.every((e) => e.actorName === person.member.name || e.subjectName === person.member.name));
  });
});
