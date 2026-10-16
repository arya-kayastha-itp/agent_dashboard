// Shared set-up for the integration suites: each one runs the real app
// in-process against Databricks, as a dedicated test Agent Manager, and
// removes the people and agents it created when it's done.
//
// They write to the database, so they refuse to run unless DATABRICKS_SCHEMA
// is a test schema (ends in "-test") — never the one the live dashboard uses.
require('dotenv').config();

const schema = process.env.DATABRICKS_SCHEMA || '';
if (!schema.endsWith('-test')) {
  throw new Error(
    `Integration tests only run against a test schema (DATABRICKS_SCHEMA ending in "-test"), not "${schema}". ` +
      'Point backend/.env at agent-dashboard-test.',
  );
}

// Never send real email from a test run: invites go to made-up addresses and
// escalations would reach real Agent Managers. An empty value (rather than
// deleting it) keeps dotenv from loading the .env value back in.
process.env.ACS_CONNECTION_STRING = '';
process.env.EMAIL_SENDER = '';
// The suites sign in far more often than a person would, all from one IP.
// The limits themselves are covered by test/unit/request-guards.test.js.
process.env.RATE_LIMITS = 'off';
// The escalation test backdates a block by 4 days.
process.env.BLOCKER_ESCALATION_DAYS = '3';

const crypto = require('node:crypto');
const { once } = require('node:events');
const { before, after } = require('node:test');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const env = require('../../src/config/env');
const db = require('../../src/db/databricksClient');
const usersService = require('../../src/services/users.service');

const MANAGER_EMAIL = 'e2e.manager@example.com';
const MANAGER_NAME = 'Test Manager (automated tests)';

const tokenFrom = (url) => new URL(url).searchParams.get('token');
const strongPassword = () => `pw-${crypto.randomBytes(9).toString('base64url')}`;
const daysFromNow = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The test manager lives in the test schema only. Created on first use; after
// that it keeps its password, and sessions are minted the way sign-in does
// (auth.controller.js) — so concurrent runs, or someone running the suites
// locally while CI does, never sign each other out.
async function ensureTestManager() {
  let member = await db.queryOne('SELECT id FROM team_members WHERE name = :name', { name: MANAGER_NAME });
  if (!member) {
    member = { id: crypto.randomUUID() };
    await db.query('INSERT INTO team_members (id, name, created_at) VALUES (:id, :name, current_timestamp())', {
      id: member.id,
      name: MANAGER_NAME,
    });
  }
  let account = await db.queryOne('SELECT id, status FROM users WHERE email = :email', { email: MANAGER_EMAIL });
  if (!account) {
    account = { id: crypto.randomUUID(), status: 'invited' };
    await db.query(
      `INSERT INTO users (id, team_member_id, email, role, status, password_hash, token_version, failed_login_count,
                          locked_until, last_login_at, created_at, updated_at)
       VALUES (:id, :memberId, :email, 'AGENT_MANAGER', 'invited', NULL, 0, 0, NULL, NULL, current_timestamp(), current_timestamp())`,
      { id: account.id, memberId: member.id, email: MANAGER_EMAIL },
    );
  }
  if (account.status !== 'active') {
    const link = await usersService.sendNewLink(account.id, { id: null });
    await usersService.setPasswordWithLink(tokenFrom(link.url), strongPassword());
  }
  const session = await usersService.getSessionUser(account.id);
  if (session.role !== 'AGENT_MANAGER') throw new Error(`${MANAGER_EMAIL} is no longer an Agent Manager`);
  return session;
}

function sessionToken(account) {
  return jwt.sign({ sub: account.id, tv: Number(account.tokenVersion) }, env.auth.jwtSecret, { expiresIn: '1h' });
}

// Suites clean up after themselves, but a run cut off midway (network drop,
// laptop asleep, cancelled CI job) can't. Whatever a test run made that's
// over two hours old is from such a run — live runs finish well before that
// — so each suite clears it first: agents the test manager created, and
// people named with a run stamp who have no account or an @example.com one.
// Best-effort: a failure here is logged, not fatal.
const LEFTOVER_HOURS = 2;

async function sweepLeftovers(api, manager) {
  try {
    const agents = await db.query(
      `SELECT a.id FROM agents a
       WHERE a.created_at < current_timestamp() - INTERVAL ${LEFTOVER_HOURS} HOURS
         AND EXISTS (SELECT 1 FROM audit_events e
                     WHERE e.agent_id = a.id AND e.action = 'agent_created' AND e.actor_id = :managerId)`,
      { managerId: manager.user.id },
    );
    const members = await db.query(
      `SELECT m.id FROM team_members m
       LEFT JOIN users u ON u.team_member_id = m.id
       WHERE m.name RLIKE ' [0-9]{13}$'
         AND (u.id IS NULL OR u.email LIKE '%@example.com')
         AND m.id <> :managerMemberId
         AND m.created_at < current_timestamp() - INTERVAL ${LEFTOVER_HOURS} HOURS`,
      { managerMemberId: manager.user.teamMemberId },
    );
    for (const { id } of agents) {
      // eslint-disable-next-line no-await-in-loop
      await api('DELETE', `/agents/${id}`, { token: manager.token });
    }
    for (const { id } of members) {
      // eslint-disable-next-line no-await-in-loop
      await api('DELETE', `/team-members/${id}`, { token: manager.token });
    }
    await db.query(
      `DELETE FROM model_pricing
       WHERE model RLIKE '^e2e-model-[0-9]{13}$' AND created_at < current_timestamp() - INTERVAL ${LEFTOVER_HOURS} HOURS`,
    );
    if (agents.length || members.length) {
      console.log(`Removed ${agents.length} agent(s) and ${members.length} person/people left by an interrupted test run.`);
    }
  } catch (err) {
    console.warn('Could not sweep leftovers from earlier test runs:', err.message);
  }
}

// Starts the app and signs the test manager in before the suite's tests, and
// cleans up after them, even when tests fail. Returns the context the tests
// share; its fields are filled in by the time the first test runs.
//
// Call it first thing inside the suite's describe(): hooks there run in the
// order they're registered, so the suite's own before() can rely on it. (A
// top-level before() starts as soon as it's registered, alongside any other.)
function useTestApp() {
  const ctx = { stamp: Date.now() };
  const createdAgents = [];
  const createdMembers = [];
  let server;

  async function api(method, route, { token, body, raw } = {}) {
    const res = await fetch(ctx.base + route, {
      method,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
    const text = await res.text();
    return { status: res.status, data: text ? JSON.parse(text) : null };
  }

  // An agent created by the test manager, deleted after the suite.
  async function createAgent(fields) {
    const r = await api('POST', '/agents', { token: ctx.manager.token, body: { name: `E2E Agent ${ctx.stamp}`, ...fields } });
    if (r.status !== 201) throw new Error(`Creating agent failed: ${r.status} ${JSON.stringify(r.data)}`);
    createdAgents.push(r.data.id);
    return r.data;
  }

  // A team member, removed (with their account) after the suite. Names end
  // in the run's stamp, which is how sweepLeftovers() recognises them.
  async function createMember(name) {
    if (!name.endsWith(` ${ctx.stamp}`)) throw new Error(`Test member names must end in the run stamp: "${name}"`);
    const r = await api('POST', '/team-members', { token: ctx.manager.token, body: { name } });
    if (r.status !== 201) throw new Error(`Creating team member failed: ${r.status} ${JSON.stringify(r.data)}`);
    createdMembers.push(r.data.id);
    return r.data;
  }

  // A team member with an account who has followed their invite link —
  // signed in, with a known password.
  async function createPerson(name, role = 'CONTRIBUTOR') {
    const member = await createMember(name);
    const email = `${name.replace(/[^a-z0-9]+/gi, '.').toLowerCase()}.${crypto.randomBytes(3).toString('hex')}@example.com`;
    const invite = await api('POST', '/users', { token: ctx.manager.token, body: { teamMemberId: member.id, email, role } });
    if (invite.status !== 201) throw new Error(`Inviting ${name} failed: ${invite.status} ${JSON.stringify(invite.data)}`);
    const password = strongPassword();
    const session = await api('POST', '/auth/set-password', { body: { token: tokenFrom(invite.data.link.url), password } });
    if (session.status !== 200) throw new Error(`Setting ${name}'s password failed: ${session.status} ${JSON.stringify(session.data)}`);
    return { member, email, password, token: session.data.token, user: session.data.user, accountId: invite.data.account.id };
  }

  before(async () => {
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    ctx.base = `http://127.0.0.1:${server.address().port}/api`;
    const account = await ensureTestManager();
    ctx.manager = { token: sessionToken(account), user: account };
    await sweepLeftovers(api, ctx.manager);
  });

  after(async () => {
    try {
      // Agents first (they reference members as assignees), one at a time —
      // concurrent Delta writes to the same table can conflict.
      for (const id of createdAgents) {
        // eslint-disable-next-line no-await-in-loop
        await api('DELETE', `/agents/${id}`, { token: ctx.manager.token });
      }
      for (const id of createdMembers) {
        // eslint-disable-next-line no-await-in-loop
        await api('DELETE', `/team-members/${id}`, { token: ctx.manager.token });
      }
      if (ctx.cleanup) await ctx.cleanup();
    } finally {
      server?.close();
      await db.close();
    }
  });

  Object.assign(ctx, { api, createAgent, createMember, createPerson });
  return ctx;
}

module.exports = {
  useTestApp,
  db,
  env,
  MANAGER_NAME,
  tokenFrom,
  strongPassword,
  daysFromNow,
  pause,
};
