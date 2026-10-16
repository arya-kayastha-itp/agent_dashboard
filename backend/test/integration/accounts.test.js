// Accounts and sign-in: invite links, passwords, roles, lockout, deactivation.
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { promisify } = require('node:util');
const { execFile } = require('node:child_process');
const jwt = require('jsonwebtoken');
const { useTestApp, env, tokenFrom, strongPassword } = require('./helpers');

describe('Accounts and sign-in', () => {
  const ctx = useTestApp();
  const { api } = ctx;
  const run = promisify(execFile);

  test('the users:link script gets a new Agent Manager in', async () => {
    const member = await ctx.createMember(`E2E Second Manager ${ctx.stamp}`);
    const email = `e2e.second.manager.${ctx.stamp}@example.com`;
    let r = await api('POST', '/users', { token: ctx.manager.token, body: { teamMemberId: member.id, email, role: 'AGENT_MANAGER' } });
    assert.equal(r.status, 201);

    const { stdout } = await run(process.execPath, ['src/db/create-login-link.js', email], { cwd: path.resolve(__dirname, '../..') });
    const url = stdout.match(/https?:\/\/\S+\/set-password\?token=\S+/)?.[0];
    assert.ok(url, stdout);
    const token = tokenFrom(url);

    r = await api('POST', '/auth/link', { body: { token } });
    assert.equal(r.status, 200);
    assert.equal(r.data.name, member.name);
    assert.equal(r.data.purpose, 'invite');

    r = await api('POST', '/auth/set-password', { body: { token, password: 'short' } });
    assert.equal(r.status, 400, 'too-short password');

    const password = strongPassword();
    r = await api('POST', '/auth/set-password', { body: { token, password } });
    assert.equal(r.status, 200);
    assert.equal(r.data.persona, 'AGENT_MANAGER');
    assert.ok(r.data.token);

    r = await api('POST', '/auth/set-password', { body: { token, password: strongPassword() } });
    assert.equal(r.status, 410, 'a used link is refused');

    r = await api('POST', '/auth/login', { body: { email: `  ${email.toUpperCase()} `, password: 'wrong password!!' } });
    assert.equal(r.status, 401);
    assert.equal(r.data.error.code, 'INVALID_CREDENTIALS');

    r = await api('POST', '/auth/login', { body: { email: `  ${email.toUpperCase()} `, password } });
    assert.equal(r.status, 200, 'email is matched case- and space-insensitively');
    r = await api('GET', '/auth/me', { token: r.data.token });
    assert.equal(r.status, 200);
    assert.equal(r.data.user.email, email);
    assert.equal(r.data.persona, 'AGENT_MANAGER');
  });

  test('tokens from the old shared password are refused', async () => {
    const oldStyle = jwt.sign({ email: 'e2e.manager@example.com', persona: 'AGENT_MANAGER' }, env.auth.jwtSecret, { expiresIn: '1h' });
    const r = await api('GET', '/agents', { token: oldStyle });
    assert.equal(r.status, 401);
  });

  let contributor;

  test('inviting a contributor', async () => {
    const member = await ctx.createMember(`E2E Invitee ${ctx.stamp}`);
    const email = `e2e.invitee.${ctx.stamp}@example.com`;
    let r = await api('POST', '/users', { token: ctx.manager.token, body: { teamMemberId: member.id, email, role: 'CONTRIBUTOR' } });
    assert.equal(r.status, 201);
    assert.ok(r.data.link.url);
    assert.equal(r.data.link.emailed, false, 'email is off in tests, so the link is copy-only');
    const inviteToken = tokenFrom(r.data.link.url);

    r = await api('POST', '/auth/login', { body: { email, password: 'anything at all' } });
    assert.equal(r.status, 401, 'no password yet → cannot sign in');

    r = await api('POST', '/users', { token: ctx.manager.token, body: { teamMemberId: member.id, email: `other.${email}`, role: 'CONTRIBUTOR' } });
    assert.equal(r.status, 409);
    assert.equal(r.data.error.code, 'ACCOUNT_EXISTS');

    r = await api('GET', '/users', { token: ctx.manager.token });
    assert.equal(r.status, 200);
    const listed = r.data.find((a) => a.email === email);
    assert.equal(listed.status, 'invited');
    assert.ok(!('tokenVersion' in listed) && !('passwordHash' in listed));

    const password = strongPassword();
    r = await api('POST', '/auth/set-password', { body: { token: inviteToken, password } });
    assert.equal(r.status, 200);
    assert.equal(r.data.persona, 'CONTRIBUTOR');
    contributor = { member, email, password, token: r.data.token, accountId: listed.id };
  });

  test('a different email already in use → 409', async () => {
    const member = await ctx.createMember(`E2E Duplicate ${ctx.stamp}`);
    const r = await api('POST', '/users', { token: ctx.manager.token, body: { teamMemberId: member.id, email: contributor.email, role: 'CONTRIBUTOR' } });
    assert.equal(r.status, 409);
    assert.equal(r.data.error.code, 'DUPLICATE_EMAIL');
  });

  test('contributors cannot manage people or use the Daily Update Sheet', async () => {
    let r = await api('GET', '/users', { token: contributor.token });
    assert.equal(r.status, 403);
    r = await api('GET', '/updates/today', { token: contributor.token });
    assert.equal(r.status, 403);
    r = await api('POST', '/team-members', { token: contributor.token, body: { name: 'Nope' } });
    assert.equal(r.status, 403);
  });

  test("the Agent Manager can't change or remove their own access", async () => {
    let r = await api('PATCH', `/users/${ctx.manager.user.id}`, { token: ctx.manager.token, body: { role: 'CONTRIBUTOR' } });
    assert.equal(r.status, 400);
    assert.equal(r.data.error.code, 'CANNOT_CHANGE_SELF');
    r = await api('DELETE', `/team-members/${ctx.manager.user.teamMemberId}`, { token: ctx.manager.token });
    assert.equal(r.status, 400);
  });

  test('a role change ends existing sessions', async () => {
    let r = await api('PATCH', `/users/${contributor.accountId}`, { token: ctx.manager.token, body: { role: 'EXECUTIVE' } });
    assert.equal(r.status, 200);
    assert.equal(r.data.role, 'EXECUTIVE');
    r = await api('GET', '/agents', { token: contributor.token });
    assert.equal(r.status, 401, 'old session ended');
    r = await api('POST', '/auth/login', { body: { email: contributor.email, password: contributor.password } });
    assert.equal(r.status, 200);
    assert.equal(r.data.persona, 'EXECUTIVE', 'signs in again with the new role');
    await api('PATCH', `/users/${contributor.accountId}`, { token: ctx.manager.token, body: { role: 'CONTRIBUTOR' } });
  });

  test('5 wrong passwords lock the account for 15 minutes', async () => {
    let r;
    for (let i = 1; i <= 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      r = await api('POST', '/auth/login', { body: { email: contributor.email, password: `wrong-password-${i}` } });
    }
    assert.equal(r.status, 401);
    r = await api('POST', '/auth/login', { body: { email: contributor.email, password: contributor.password } });
    assert.equal(r.status, 429, 'locked, even with the right password');
    assert.equal(r.data.error.code, 'ACCOUNT_LOCKED');
  });

  test('deactivating ends sessions and blocks links; reactivating clears the lockout', async () => {
    let r = await api('PATCH', `/users/${contributor.accountId}`, { token: ctx.manager.token, body: { status: 'deactivated' } });
    assert.equal(r.status, 200);
    assert.equal(r.data.status, 'deactivated');
    r = await api('POST', `/users/${contributor.accountId}/link`, { token: ctx.manager.token });
    assert.equal(r.status, 409, 'no new links for a deactivated account');

    r = await api('PATCH', `/users/${contributor.accountId}`, { token: ctx.manager.token, body: { status: 'active' } });
    assert.equal(r.status, 200);
    assert.equal(r.data.status, 'active', 'has a password, so straight back to active');
    r = await api('POST', '/auth/login', { body: { email: contributor.email, password: contributor.password } });
    assert.equal(r.status, 200, 'reactivation clears the lockout');
    const live = r.data.token;

    await api('PATCH', `/users/${contributor.accountId}`, { token: ctx.manager.token, body: { status: 'deactivated' } });
    r = await api('GET', '/agents', { token: live });
    assert.equal(r.status, 401, 'deactivation ends the live session');
    await api('PATCH', `/users/${contributor.accountId}`, { token: ctx.manager.token, body: { status: 'active' } });
  });

  test('a reset link from the Agent Manager replaces the password', async () => {
    let r = await api('POST', `/users/${contributor.accountId}/link`, { token: ctx.manager.token });
    assert.equal(r.status, 200);
    assert.equal(r.data.link.purpose, 'reset');
    const password = strongPassword();
    r = await api('POST', '/auth/set-password', { body: { token: tokenFrom(r.data.link.url), password } });
    assert.equal(r.status, 200);
    r = await api('POST', '/auth/login', { body: { email: contributor.email, password: contributor.password } });
    assert.equal(r.status, 401, 'old password no longer works');
    contributor.password = password;
    r = await api('POST', '/auth/login', { body: { email: contributor.email, password } });
    assert.equal(r.status, 200);
  });

  test("forgot password gives the same answer whether or not the email exists", async () => {
    let r = await api('POST', '/auth/forgot-password', { body: { email: contributor.email } });
    assert.equal(r.status, 200);
    assert.deepEqual(r.data, { ok: true });
    r = await api('POST', '/auth/forgot-password', { body: { email: 'nobody.here@example.com' } });
    assert.equal(r.status, 200);
    assert.deepEqual(r.data, { ok: true });
  });

  test('removing a team member deletes their account', async () => {
    let r = await api('DELETE', `/team-members/${contributor.member.id}`, { token: ctx.manager.token });
    assert.equal(r.status, 204);
    r = await api('GET', '/users', { token: ctx.manager.token });
    assert.ok(!r.data.some((a) => a.id === contributor.accountId));
    r = await api('POST', '/auth/login', { body: { email: contributor.email, password: contributor.password } });
    assert.equal(r.status, 401);
  });
});
