const crypto = require('crypto');
const db = require('../db/databricksClient');
const env = require('../config/env');
const { hashPassword, verifyPassword, burnPasswordCheck, newOneTimeToken, hashOneTimeToken } = require('./credentials.service');
const mailer = require('./mailer.service');

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
// Links the Agent Manager hands out may sit in a Teams chat for a while;
// self-service "forgot password" links are for right now.
const MANAGER_LINK_TTL_MS = 48 * HOUR_MS;
const SELF_SERVICE_LINK_TTL_MS = HOUR_MS;
const SELF_SERVICE_COOLDOWN_MS = 5 * 60 * 1000;
const SESSION_CACHE_MS = 60 * 1000;

function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

const normalizeEmail = (email) => email.trim().toLowerCase();

const ACCOUNT_SELECT = `
  u.id,
  u.team_member_id as teamMemberId,
  m.name,
  u.email,
  u.role,
  u.status,
  u.token_version as tokenVersion,
  u.last_login_at as lastLoginAt,
  u.created_at as createdAt
`;
const ACCOUNT_FROM = 'FROM users u JOIN team_members m ON m.id = u.team_member_id';

// tokenVersion stays server-side — it's only for checking session tokens.
function publicAccount({ tokenVersion, passwordHash, failedLoginCount, lockedUntil, ...account }) {
  return account;
}

async function getAccount(id) {
  return db.queryOne(`SELECT ${ACCOUNT_SELECT} ${ACCOUNT_FROM} WHERE u.id = :id`, { id });
}

// --- Sessions ---------------------------------------------------------------

// Every authenticated request needs the account's current status and
// token_version (so deactivation and password changes end sessions), and a
// Databricks round trip per request is too slow. Accounts are cached briefly,
// and every write below evicts the account it changed — with the app's single
// replica that makes those changes take effect on the very next request.
const sessionCache = new Map();

async function getSessionUser(id) {
  const hit = sessionCache.get(id);
  if (hit && hit.expiresAt > Date.now()) return hit.account;
  const account = (await getAccount(id)) || null;
  sessionCache.set(id, { account, expiresAt: Date.now() + SESSION_CACHE_MS });
  return account;
}

function forgetSession(id) {
  sessionCache.delete(id);
}

// --- Sign-in ----------------------------------------------------------------

async function recordFailedLogin(account) {
  const now = new Date();
  if (Number(account.failedLoginCount) + 1 >= MAX_FAILED_LOGINS) {
    await db.query(
      `UPDATE users SET failed_login_count = 0, locked_until = CAST(:lockedUntil AS TIMESTAMP), updated_at = CAST(:now AS TIMESTAMP)
       WHERE id = :id`,
      { id: account.id, lockedUntil: new Date(now.getTime() + LOCKOUT_MS).toISOString(), now: now.toISOString() },
    );
  } else {
    await db.query(
      'UPDATE users SET failed_login_count = failed_login_count + 1, updated_at = CAST(:now AS TIMESTAMP) WHERE id = :id',
      { id: account.id, now: now.toISOString() },
    );
  }
}

// Invited (no password yet), deactivated and unknown accounts all get the same
// answer as a wrong password, so the sign-in form can't be used to find out
// who has an account.
async function signIn(email, password) {
  const invalid = httpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  const account = await db.queryOne(
    `SELECT ${ACCOUNT_SELECT}, u.password_hash as passwordHash, u.failed_login_count as failedLoginCount, u.locked_until as lockedUntil
     ${ACCOUNT_FROM} WHERE u.email = :email`,
    { email: normalizeEmail(email) },
  );

  if (!account || account.status !== 'active' || !account.passwordHash) {
    await burnPasswordCheck(password);
    throw invalid;
  }

  if (account.lockedUntil && new Date(account.lockedUntil) > new Date()) {
    const minutes = Math.ceil((new Date(account.lockedUntil) - Date.now()) / 60000);
    throw httpError(429, 'ACCOUNT_LOCKED', `Too many failed sign-ins. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`);
  }

  if (!(await verifyPassword(password, account.passwordHash))) {
    await recordFailedLogin(account);
    throw invalid;
  }

  const now = new Date().toISOString();
  await db.query(
    `UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = CAST(:now AS TIMESTAMP), updated_at = CAST(:now AS TIMESTAMP)
     WHERE id = :id`,
    { id: account.id, now },
  );
  return { ...account, lastLoginAt: now };
}

// --- One-time links ---------------------------------------------------------

// Issuing a link supersedes any earlier unused one for the same account, so
// only the newest link ever works.
async function issueLink(account, { purpose, ttlMs, createdBy }) {
  const now = new Date();
  const { token, tokenHash } = newOneTimeToken();
  const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

  await db.query('UPDATE user_tokens SET used_at = CAST(:now AS TIMESTAMP) WHERE user_id = :userId AND used_at IS NULL', {
    userId: account.id,
    now: now.toISOString(),
  });
  await db.query(
    `INSERT INTO user_tokens (id, user_id, purpose, token_hash, expires_at, used_at, created_by, created_at)
     VALUES (:id, :userId, :purpose, :tokenHash, CAST(:expiresAt AS TIMESTAMP), NULL, :createdBy, CAST(:now AS TIMESTAMP))`,
    { id: crypto.randomUUID(), userId: account.id, purpose, tokenHash, expiresAt, createdBy: createdBy ?? null, now: now.toISOString() },
  );

  const url = `${env.appUrl}/set-password?token=${token}`;
  const emailed = await mailer.sendAccountLinkEmail({ to: account.email, name: account.name, purpose, url, expiresAt });
  return { url, purpose, expiresAt, emailed };
}

async function findUsableLink(token) {
  const link = await db.queryOne(
    `SELECT t.id, t.user_id as userId, t.purpose, t.expires_at as expiresAt, t.used_at as usedAt, u.status, u.email, m.name
     FROM user_tokens t
     JOIN users u ON u.id = t.user_id
     JOIN team_members m ON m.id = u.team_member_id
     WHERE t.token_hash = :tokenHash`,
    { tokenHash: hashOneTimeToken(token) },
  );
  if (!link) {
    throw httpError(404, 'LINK_INVALID', "This link isn't valid. Ask your Agent Manager for a new one.");
  }
  if (link.usedAt || new Date(link.expiresAt) <= new Date() || link.status === 'deactivated') {
    throw httpError(410, 'LINK_EXPIRED', 'This link has expired or has already been used. Request a new one.');
  }
  return link;
}

async function describeLink(token) {
  const { purpose, name, email } = await findUsableLink(token);
  return { purpose, name, email };
}

// Setting a password activates the account, burns every outstanding link,
// and bumps token_version so any session from before the change ends.
async function setPasswordWithLink(token, password) {
  const link = await findUsableLink(token);
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  await db.query('UPDATE user_tokens SET used_at = CAST(:now AS TIMESTAMP) WHERE user_id = :userId AND used_at IS NULL', {
    userId: link.userId,
    now,
  });
  await db.query(
    `UPDATE users
     SET password_hash = :passwordHash, status = 'active', token_version = token_version + 1,
         failed_login_count = 0, locked_until = NULL,
         last_login_at = CAST(:now AS TIMESTAMP), updated_at = CAST(:now AS TIMESTAMP)
     WHERE id = :userId`,
    { userId: link.userId, passwordHash, now },
  );

  forgetSession(link.userId);
  return getSessionUser(link.userId);
}

// "Forgot password" never says whether the email matched an account. Invited
// accounts get a fresh invite (their first link may have expired), and one
// request per account per few minutes is enough to stop inbox flooding.
async function requestPasswordReset(email) {
  const account = await db.queryOne(`SELECT ${ACCOUNT_SELECT} ${ACCOUNT_FROM} WHERE u.email = :email`, {
    email: normalizeEmail(email),
  });
  if (!account || account.status === 'deactivated') return;

  const recent = await db.queryOne(
    'SELECT id FROM user_tokens WHERE user_id = :userId AND created_by IS NULL AND created_at > CAST(:since AS TIMESTAMP) LIMIT 1',
    { userId: account.id, since: new Date(Date.now() - SELF_SERVICE_COOLDOWN_MS).toISOString() },
  );
  if (recent) return;

  await issueLink(account, {
    purpose: account.status === 'invited' ? 'invite' : 'reset',
    ttlMs: SELF_SERVICE_LINK_TTL_MS,
    createdBy: null,
  });
}

// --- Account management (Agent Manager) -------------------------------------

async function listAccounts() {
  const accounts = await db.query(
    `SELECT ${ACCOUNT_SELECT},
       (SELECT max(t.expires_at) FROM user_tokens t WHERE t.user_id = u.id AND t.used_at IS NULL) as linkExpiresAt
     ${ACCOUNT_FROM}
     ORDER BY lower(m.name) ASC`,
  );
  return accounts.map(publicAccount);
}

async function createAccount({ teamMemberId, email, role }, actor) {
  const cleanEmail = normalizeEmail(email);
  const member = await db.queryOne('SELECT id, name FROM team_members WHERE id = :id', { id: teamMemberId });
  if (!member) throw httpError(404, 'NOT_FOUND', 'Team member not found');

  // No unique constraints in Delta — "one account per email" and "one account
  // per team member" are enforced here.
  const clash = await db.queryOne(
    'SELECT email, team_member_id as teamMemberId FROM users WHERE email = :email OR team_member_id = :teamMemberId LIMIT 1',
    { email: cleanEmail, teamMemberId },
  );
  if (clash?.teamMemberId === teamMemberId) {
    throw httpError(409, 'ACCOUNT_EXISTS', `${member.name} already has an account.`);
  }
  if (clash) {
    throw httpError(409, 'DUPLICATE_EMAIL', `${cleanEmail} is already used by another account.`);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.query(
    `INSERT INTO users (id, team_member_id, email, role, status, password_hash, token_version,
                        failed_login_count, locked_until, last_login_at, created_at, updated_at)
     VALUES (:id, :teamMemberId, :email, :role, 'invited', NULL, 0, 0, NULL, NULL, CAST(:now AS TIMESTAMP), CAST(:now AS TIMESTAMP))`,
    { id, teamMemberId, email: cleanEmail, role, now },
  );

  const account = await getAccount(id);
  const link = await issueLink(account, { purpose: 'invite', ttlMs: MANAGER_LINK_TTL_MS, createdBy: actor.id });
  return { account: publicAccount(account), link };
}

// A fresh invite for someone who hasn't set a password yet, otherwise a
// password-reset link.
async function sendNewLink(id, actor) {
  const account = await getAccount(id);
  if (!account) throw httpError(404, 'NOT_FOUND', 'Account not found');
  if (account.status === 'deactivated') {
    throw httpError(409, 'ACCOUNT_DEACTIVATED', `${account.name}'s account is deactivated. Reactivate it first.`);
  }
  return issueLink(account, {
    purpose: account.status === 'invited' ? 'invite' : 'reset',
    ttlMs: MANAGER_LINK_TTL_MS,
    createdBy: actor.id,
  });
}

// Role changes and deactivation bump token_version, which signs the person
// out everywhere — a changed role takes effect from their next sign-in.
async function updateAccount(id, { role, status }, actor) {
  const account = await getAccount(id);
  if (!account) throw httpError(404, 'NOT_FOUND', 'Account not found');
  if (account.id === actor.id) {
    throw httpError(400, 'CANNOT_CHANGE_SELF', "You can't change your own access.");
  }

  const now = new Date().toISOString();
  if (role && role !== account.role) {
    await db.query(
      'UPDATE users SET role = :role, token_version = token_version + 1, updated_at = CAST(:now AS TIMESTAMP) WHERE id = :id',
      { id, role, now },
    );
  }
  if (status === 'deactivated' && account.status !== 'deactivated') {
    await db.query('UPDATE user_tokens SET used_at = CAST(:now AS TIMESTAMP) WHERE user_id = :id AND used_at IS NULL', { id, now });
    await db.query(
      `UPDATE users SET status = 'deactivated', token_version = token_version + 1, updated_at = CAST(:now AS TIMESTAMP)
       WHERE id = :id`,
      { id, now },
    );
  }
  // Reactivating someone who never set a password puts them back to invited.
  if (status === 'active' && account.status === 'deactivated') {
    await db.query(
      `UPDATE users SET status = CASE WHEN password_hash IS NULL THEN 'invited' ELSE 'active' END,
         failed_login_count = 0, locked_until = NULL, updated_at = CAST(:now AS TIMESTAMP)
       WHERE id = :id`,
      { id, now },
    );
  }

  forgetSession(id);
  return publicAccount(await getAccount(id));
}

// Called when a team member is removed — their account and links go with them.
async function deleteAccountForTeamMember(teamMemberId) {
  const account = await db.queryOne('SELECT id FROM users WHERE team_member_id = :teamMemberId', { teamMemberId });
  if (!account) return;
  await db.query('DELETE FROM user_tokens WHERE user_id = :id', { id: account.id });
  await db.query('DELETE FROM users WHERE id = :id', { id: account.id });
  forgetSession(account.id);
}

module.exports = {
  getSessionUser,
  signIn,
  describeLink,
  setPasswordWithLink,
  requestPasswordReset,
  listAccounts,
  createAccount,
  sendNewLink,
  updateAccount,
  deleteAccountForTeamMember,
  publicAccount,
};
