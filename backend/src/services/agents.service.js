const crypto = require('crypto');
const db = require('../db/databricksClient');
const { assertTeamMembersExist } = require('./team-members.service');

// Assignees live in agent_assignees (one row per agent + team member), not on
// this row — the legacy agents.assigned_to column is no longer read or written.
const AGENT_SELECT = `
  id,
  name,
  description,
  eta,
  current_status as currentStatus,
  current_progress as currentProgress,
  current_status_description as currentStatusDescription,
  last_update_at as lastUpdateAt,
  sort_order as sortOrder,
  created_at as createdAt,
  updated_at as updatedAt
`;

// Map of agentId -> [{ id, name }] for the given agents, names A-Z. Pass no ids
// to load every assignment (cheaper than a giant IN list when listing all).
async function loadAssignees(agentIds) {
  const byAgent = new Map();
  if (agentIds && agentIds.length === 0) return byAgent;

  const params = {};
  let where = '';
  if (agentIds) {
    const placeholders = agentIds.map((id, i) => {
      params[`agentId${i}`] = id;
      return `:agentId${i}`;
    });
    where = `WHERE aa.agent_id IN (${placeholders.join(', ')})`;
  }

  const rows = await db.query(
    `SELECT aa.agent_id as agentId, m.id as memberId, m.name as memberName
     FROM agent_assignees aa
     JOIN team_members m ON m.id = aa.team_member_id
     ${where}
     ORDER BY lower(m.name) ASC`,
    params,
  );
  for (const row of rows) {
    if (!byAgent.has(row.agentId)) byAgent.set(row.agentId, []);
    byAgent.get(row.agentId).push({ id: row.memberId, name: row.memberName });
  }
  return byAgent;
}

async function attachAssignees(agents, { all = false } = {}) {
  const byAgent = await loadAssignees(all ? undefined : agents.map((agent) => agent.id));
  return agents.map((agent) => ({ ...agent, assignees: byAgent.get(agent.id) || [] }));
}

async function insertAssignees(agentId, teamMemberIds, now) {
  if (teamMemberIds.length === 0) return;
  const params = { agentId, now };
  const values = teamMemberIds.map((memberId, i) => {
    params[`memberId${i}`] = memberId;
    return `(:agentId, :memberId${i}, CAST(:now AS TIMESTAMP))`;
  });
  await db.query(`INSERT INTO agent_assignees (agent_id, team_member_id, created_at) VALUES ${values.join(', ')}`, params);
}

async function listAgents({ status } = {}) {
  const params = {};
  let sql = `SELECT ${AGENT_SELECT} FROM agents`;
  if (status) {
    sql += ' WHERE current_status = :status';
    params.status = status;
  }
  sql += ' ORDER BY sort_order ASC, created_at ASC';
  const agents = await db.query(sql, params);
  return attachAssignees(agents, { all: true });
}

async function getAgentById(id) {
  const agent = await db.queryOne(`SELECT ${AGENT_SELECT} FROM agents WHERE id = :id`, { id });
  if (!agent) return agent;
  const [withAssignees] = await attachAssignees([agent]);
  return withAssignees;
}

// Delta has no cross-table transactions, so the agent row, its assignees and
// its initial history entry are written sequentially; if a later write fails,
// the earlier ones are rolled back manually so we never leave a half-created
// agent behind.
async function createAgent(data) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const assigneeIds = [...new Set(data.assigneeIds ?? [])];
  await assertTeamMembersExist(assigneeIds);

  const maxOrderRow = await db.queryOne('SELECT MAX(sort_order) as maxOrder FROM agents');
  const sortOrder = (maxOrderRow?.maxOrder ?? -1) + 1;

  const agent = {
    id,
    name: data.name,
    description: data.description ?? null,
    eta: data.eta ?? null,
    currentStatus: data.status,
    currentProgress: data.progress,
    currentStatusDescription: data.statusDescription ?? null,
    lastUpdateAt: now,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };

  await db.query(
    `INSERT INTO agents
       (id, name, description, eta, current_status, current_progress,
        current_status_description, last_update_at, sort_order, created_at, updated_at)
     VALUES
       (:id, :name, :description, CAST(:eta AS DATE), :currentStatus, :currentProgress,
        :currentStatusDescription, CAST(:lastUpdateAt AS TIMESTAMP), :sortOrder,
        CAST(:createdAt AS TIMESTAMP), CAST(:updatedAt AS TIMESTAMP))`,
    agent,
  );

  try {
    await insertAssignees(id, assigneeIds, now);
    await db.query(
      `INSERT INTO agent_updates (id, agent_id, update_date, status, progress, status_description, source, created_at)
       VALUES (:updateId, :agentId, CURRENT_DATE(), :status, :progress, :statusDescription, 'manual', CAST(:createdAt AS TIMESTAMP))`,
      {
        updateId: crypto.randomUUID(),
        agentId: id,
        status: data.status,
        progress: data.progress,
        statusDescription: data.statusDescription ?? null,
        createdAt: now,
      },
    );
  } catch (err) {
    await db.query('DELETE FROM agent_assignees WHERE agent_id = :id', { id }).catch(() => {});
    await db.query('DELETE FROM agents WHERE id = :id', { id }).catch(() => {});
    throw err;
  }

  const [created] = await attachAssignees([agent]);
  return created;
}

async function updateAgentMetadata(id, data) {
  // Checked up front so an unknown id can't leave orphan assignee rows, and so
  // an invalid assignee rejects the request before anything is written.
  const existing = await db.queryOne('SELECT id FROM agents WHERE id = :id', { id });
  if (!existing) return undefined;

  const assigneeIds = data.assigneeIds === undefined ? undefined : [...new Set(data.assigneeIds)];
  if (assigneeIds) await assertTeamMembersExist(assigneeIds);

  const sets = ['updated_at = CAST(:updatedAt AS TIMESTAMP)'];
  const params = { id, updatedAt: new Date().toISOString() };

  if (data.name !== undefined) {
    sets.push('name = :name');
    params.name = data.name;
  }
  if (data.description !== undefined) {
    sets.push('description = :description');
    params.description = data.description;
  }
  if (data.eta !== undefined) {
    sets.push('eta = CAST(:eta AS DATE)');
    params.eta = data.eta;
  }

  await db.query(`UPDATE agents SET ${sets.join(', ')} WHERE id = :id`, params);

  // The assignee list is replaced wholesale with what the form sent.
  if (assigneeIds) {
    await db.query('DELETE FROM agent_assignees WHERE agent_id = :id', { id });
    await insertAssignees(id, assigneeIds, params.updatedAt);
  }
  return getAgentById(id);
}

async function deleteAgent(id) {
  const existing = await getAgentById(id);
  if (!existing) return false;
  // The agent_id foreign keys are NOT ENFORCED in Databricks, so nothing
  // cascades on its own — clear the child rows first, or a deleted agent's
  // usage logs would keep counting toward the portfolio cost rollups.
  // Sequential for the same Delta write-conflict reason as reorderAgents.
  for (const table of ['agent_updates', 'agent_assignees', 'api_usage_logs', 'finops_alerts', 'finops_thresholds']) {
    // eslint-disable-next-line no-await-in-loop
    await db.query(`DELETE FROM ${table} WHERE agent_id = :id`, { id });
  }
  await db.query('DELETE FROM agents WHERE id = :id', { id });
  return true;
}

// Renumbers sort_order to 0..n-1 across exactly the ids given, in that order.
// Callers pass just the ids within one drag-and-drop group (e.g. the "needs
// attention" section) — cross-group comparisons never happen because
// severity rank is always the primary sort key, so groups' sort_order ranges
// can safely overlap. Writes run sequentially (not in parallel) because
// concurrent Delta writers to the same table can conflict with each other.
async function reorderAgents(ids) {
  const updatedAt = new Date().toISOString();
  for (let index = 0; index < ids.length; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await db.query('UPDATE agents SET sort_order = :sortOrder, updated_at = CAST(:updatedAt AS TIMESTAMP) WHERE id = :id', {
      sortOrder: index,
      updatedAt,
      id: ids[index],
    });
  }
  return listAgents({});
}

module.exports = { listAgents, getAgentById, createAgent, updateAgentMetadata, deleteAgent, reorderAgents, AGENT_SELECT };
