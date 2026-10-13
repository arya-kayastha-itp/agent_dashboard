const crypto = require('crypto');
const db = require('../db/databricksClient');
const usersService = require('./users.service');

function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

// "  Nancy   Vaghela " and "nancy vaghela" are the same person — names are
// stored trimmed with inner whitespace collapsed and compared case-insensitively.
function normalizeName(name) {
  return name.trim().replace(/\s+/g, ' ');
}

async function listTeamMembers() {
  const members = await db.query('SELECT id, name, created_at as createdAt FROM team_members ORDER BY lower(name) ASC');
  const assignments = await db.query(
    `SELECT aa.team_member_id as memberId, a.id as agentId, a.name as agentName
     FROM agent_assignees aa
     JOIN agents a ON a.id = aa.agent_id
     ORDER BY lower(a.name) ASC`,
  );

  const agentsByMember = new Map();
  for (const row of assignments) {
    if (!agentsByMember.has(row.memberId)) agentsByMember.set(row.memberId, []);
    agentsByMember.get(row.memberId).push({ id: row.agentId, name: row.agentName });
  }

  return members.map((member) => ({ ...member, agents: agentsByMember.get(member.id) || [] }));
}

async function createTeamMember({ name }) {
  const cleanName = normalizeName(name);

  const existing = await db.queryOne('SELECT id FROM team_members WHERE lower(name) = :lowerName', {
    lowerName: cleanName.toLowerCase(),
  });
  if (existing) {
    throw httpError(409, 'DUPLICATE_TEAM_MEMBER', `"${cleanName}" is already on the team.`);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.query('INSERT INTO team_members (id, name, created_at) VALUES (:id, :name, CAST(:now AS TIMESTAMP))', {
    id,
    name: cleanName,
    now,
  });

  return { id, name: cleanName, createdAt: now, agents: [] };
}

// Removing a member also unassigns them from every agent and deletes their
// sign-in account (foreign keys are NOT ENFORCED in Databricks, so nothing
// cascades on its own). Dependents go first so a failure partway never leaves
// a row pointing at a deleted person.
async function deleteTeamMember(id) {
  const existing = await db.queryOne('SELECT id FROM team_members WHERE id = :id', { id });
  if (!existing) return false;
  await usersService.deleteAccountForTeamMember(id);
  await db.query('DELETE FROM agent_assignees WHERE team_member_id = :id', { id });
  await db.query('DELETE FROM team_members WHERE id = :id', { id });
  return true;
}

// The one gate that keeps free-text names out: every assignee id an agent is
// saved with must be a current team member.
async function assertTeamMembersExist(ids) {
  if (ids.length === 0) return;

  const params = {};
  const placeholders = ids.map((id, i) => {
    params[`id${i}`] = id;
    return `:id${i}`;
  });
  const found = await db.query(`SELECT id FROM team_members WHERE id IN (${placeholders.join(', ')})`, params);
  if (found.length !== ids.length) {
    throw httpError(400, 'INVALID_ASSIGNEE', 'One or more assignees are not team members. Add them on the Teams page first.');
  }
}

module.exports = { listTeamMembers, createTeamMember, deleteTeamMember, assertTeamMembersExist };
