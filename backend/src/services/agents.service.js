const crypto = require('crypto');
const db = require('../db/databricksClient');

const AGENT_SELECT = `
  id,
  name,
  description,
  assigned_to as assignedTo,
  eta,
  current_status as currentStatus,
  current_progress as currentProgress,
  current_status_description as currentStatusDescription,
  last_update_at as lastUpdateAt,
  sort_order as sortOrder,
  created_at as createdAt,
  updated_at as updatedAt
`;

async function listAgents({ status } = {}) {
  const params = {};
  let sql = `SELECT ${AGENT_SELECT} FROM agents`;
  if (status) {
    sql += ' WHERE current_status = :status';
    params.status = status;
  }
  sql += ' ORDER BY sort_order ASC, created_at ASC';
  return db.query(sql, params);
}

async function getAgentById(id) {
  return db.queryOne(`SELECT ${AGENT_SELECT} FROM agents WHERE id = :id`, { id });
}

// Delta has no cross-table transactions, so the agent row and its initial
// history entry are written sequentially; if the second write fails, the
// first is rolled back manually so we never leave an agent with no history.
async function createAgent(data) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const maxOrderRow = await db.queryOne('SELECT MAX(sort_order) as maxOrder FROM agents');
  const sortOrder = (maxOrderRow?.maxOrder ?? -1) + 1;

  const agent = {
    id,
    name: data.name,
    description: data.description ?? null,
    assignedTo: data.assignedTo ?? null,
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
       (id, name, description, assigned_to, eta, current_status, current_progress,
        current_status_description, last_update_at, sort_order, created_at, updated_at)
     VALUES
       (:id, :name, :description, :assignedTo, CAST(:eta AS DATE), :currentStatus, :currentProgress,
        :currentStatusDescription, CAST(:lastUpdateAt AS TIMESTAMP), :sortOrder,
        CAST(:createdAt AS TIMESTAMP), CAST(:updatedAt AS TIMESTAMP))`,
    agent,
  );

  try {
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
    await db.query('DELETE FROM agents WHERE id = :id', { id }).catch(() => {});
    throw err;
  }

  return agent;
}

async function updateAgentMetadata(id, data) {
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
  if (data.assignedTo !== undefined) {
    sets.push('assigned_to = :assignedTo');
    params.assignedTo = data.assignedTo;
  }
  if (data.eta !== undefined) {
    sets.push('eta = CAST(:eta AS DATE)');
    params.eta = data.eta;
  }

  await db.query(`UPDATE agents SET ${sets.join(', ')} WHERE id = :id`, params);
  return getAgentById(id);
}

async function deleteAgent(id) {
  const existing = await getAgentById(id);
  if (!existing) return false;
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
