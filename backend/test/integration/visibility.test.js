// Contributors only see the agents they're assigned to — enforced by the API.
const { describe, test, before } = require('node:test');
const assert = require('node:assert/strict');
const { useTestApp } = require('./helpers');

describe('What contributors can see', () => {
  const ctx = useTestApp();
  const { api } = ctx;
  let person;
  let mine;
  let other;

  before(async () => {
    person = await ctx.createPerson(`E2E Visibility ${ctx.stamp}`);
    mine = await ctx.createAgent({ name: `E2E Mine ${ctx.stamp}`, assigneeIds: [person.member.id] });
    other = await ctx.createAgent({ name: `E2E Other ${ctx.stamp}` });
  });

  test('the agent list is only their assigned agents; managers still see all', async () => {
    let r = await api('GET', '/agents', { token: person.token });
    assert.equal(r.status, 200);
    assert.deepEqual(
      r.data.map((a) => a.id),
      [mine.id],
    );
    r = await api('GET', '/agents', { token: ctx.manager.token });
    const ids = r.data.map((a) => a.id);
    assert.ok(ids.includes(mine.id) && ids.includes(other.id));
  });

  for (const route of ['', '/history', '/insights', '/eta-history']) {
    test(`agent${route || ' detail'}: assigned → 200, not assigned → 404`, async () => {
      let r = await api('GET', `/agents/${mine.id}${route}`, { token: person.token });
      assert.equal(r.status, 200);
      r = await api('GET', `/agents/${other.id}${route}`, { token: person.token });
      assert.equal(r.status, 404);
    });
  }

  test("another agent's AI narrative → 404", async () => {
    const r = await api('POST', `/agents/${other.id}/insights/narrative`, { token: person.token });
    assert.equal(r.status, 404);
  });

  test('portfolio-wide views are closed to contributors', async () => {
    for (const route of ['/insights/portfolio', '/insights/by-agent', '/team-members', '/audit']) {
      // eslint-disable-next-line no-await-in-loop
      let r = await api('GET', route, { token: person.token });
      assert.equal(r.status, 403, `contributor ${route}`);
      // eslint-disable-next-line no-await-in-loop
      r = await api('GET', route, { token: ctx.manager.token });
      assert.equal(r.status, 200, `manager ${route}`);
    }
  });

  test('once unassigned, the agent disappears and updates for it are refused', async () => {
    await api('PATCH', `/agents/${mine.id}`, { token: ctx.manager.token, body: { assigneeIds: [] } });
    let r = await api('GET', '/agents', { token: person.token });
    assert.deepEqual(r.data, []);
    r = await api('GET', `/agents/${mine.id}`, { token: person.token });
    assert.equal(r.status, 404);
    r = await api('POST', '/submissions', { token: person.token, body: { agentId: mine.id, status: 'In Progress', progress: 10 } });
    assert.equal(r.status, 403);
  });
});
