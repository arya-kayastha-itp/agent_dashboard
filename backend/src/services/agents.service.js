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
  'created_at as createdAt',
  'updated_at as updatedAt',
];

async function listAgents({ status } = {}) {
  const query = db('agents').select(AGENT_COLUMNS).orderBy('created_at', 'asc');
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

module.exports = { listAgents, getAgentById, createAgent, updateAgentMetadata, deleteAgent, AGENT_COLUMNS };
