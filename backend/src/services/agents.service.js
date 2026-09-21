const db = require('../db/pool');

const AGENT_COLUMNS = [
  'id',
  'name',
  'description',
  'assigned_to as assignedTo',
  'eta',
  'current_status as currentStatus',
  'current_progress as currentProgress',
  'current_status_description as currentStatusDescription',
  'last_update_at as lastUpdateAt',
  'sort_order as sortOrder',
  'created_at as createdAt',
  'updated_at as updatedAt',
];

async function listAgents({ status } = {}) {
  const query = db('agents')
    .select(AGENT_COLUMNS)
    .orderBy([
      { column: 'sort_order', order: 'asc' },
      { column: 'created_at', order: 'asc' },
    ]);
  if (status) {
    query.where('current_status', status);
  }
  return query;
}

async function getAgentById(id) {
  return db('agents').select(AGENT_COLUMNS).where({ id }).first();
}

async function createAgent(data) {
  return db.transaction(async (trx) => {
    const [{ maxOrder }] = await trx('agents').max({ maxOrder: 'sort_order' });

    const [agent] = await trx('agents')
      .insert({
        name: data.name,
        description: data.description ?? null,
        assigned_to: data.assignedTo ?? null,
        eta: data.eta ?? null,
        current_status: data.status,
        current_progress: data.progress,
        current_status_description: data.statusDescription ?? null,
        last_update_at: trx.fn.now(),
        sort_order: (maxOrder ?? -1) + 1,
      })
      .returning(AGENT_COLUMNS);

    await trx('agent_updates').insert({
      agent_id: agent.id,
      status: data.status,
      progress: data.progress,
      status_description: data.statusDescription ?? null,
      source: 'manual',
    });

    return agent;
  });
}

async function updateAgentMetadata(id, data) {
  const patch = { updated_at: db.fn.now() };
  if (data.name !== undefined) patch.name = data.name;
  if (data.description !== undefined) patch.description = data.description;
  if (data.assignedTo !== undefined) patch.assigned_to = data.assignedTo;
  if (data.eta !== undefined) patch.eta = data.eta;

  const [agent] = await db('agents').where({ id }).update(patch).returning(AGENT_COLUMNS);
  return agent;
}

async function deleteAgent(id) {
  const count = await db('agents').where({ id }).del();
  return count > 0;
}

// Renumbers sort_order to 0..n-1 across exactly the ids given, in that order.
// Callers pass just the ids within one drag-and-drop group (e.g. the "needs
// attention" section) — cross-group comparisons never happen because
// severity rank is always the primary sort key, so groups' sort_order ranges
// can safely overlap.
async function reorderAgents(ids) {
  await db.transaction(async (trx) => {
    await Promise.all(
      ids.map((id, index) => trx('agents').where({ id }).update({ sort_order: index, updated_at: trx.fn.now() }))
    );
  });
  return listAgents({});
}

module.exports = { listAgents, getAgentById, createAgent, updateAgentMetadata, deleteAgent, reorderAgents, AGENT_COLUMNS };
