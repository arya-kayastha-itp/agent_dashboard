const db = require('../db/pool');
const { AGENT_COLUMNS } = require('./agents.service');

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

// Inserts/upserts one day's update for one agent and refreshes the agent's
// denormalized current_* fields in the same transaction. Reused by the
// single-update endpoint, the batch daily-sheet endpoint, and (in a future
// phase) any automated webhook/API ingestion path.
async function recordUpdate(trx, { agentId, updateDate, status, progress, statusDescription, source = 'manual' }) {
  const date = updateDate || todayDateString();

  const [update] = await trx('agent_updates')
    .insert({
      agent_id: agentId,
      update_date: date,
      status,
      progress,
      status_description: statusDescription ?? null,
      source,
    })
    .onConflict(['agent_id', 'update_date'])
    .merge(['status', 'progress', 'status_description', 'source'])
    .returning(['id', 'agent_id as agentId', 'update_date as updateDate', 'status', 'progress', 'status_description as statusDescription', 'source', 'created_at as createdAt']);

  const [agent] = await trx('agents')
    .where({ id: agentId })
    .update({
      current_status: status,
      current_progress: progress,
      current_status_description: statusDescription ?? null,
      last_update_at: trx.fn.now(),
      updated_at: trx.fn.now(),
    })
    .returning(AGENT_COLUMNS);

  return { update, agent };
}

async function recordUpdateStandalone(payload) {
  return db.transaction((trx) => recordUpdate(trx, payload));
}

async function recordBatch({ updateDate, entries }) {
  return db.transaction(async (trx) => {
    const results = [];
    for (const entry of entries) {
      // eslint-disable-next-line no-await-in-loop
      const result = await recordUpdate(trx, { ...entry, updateDate });
      results.push(result);
    }
    return results;
  });
}

async function getTodayUpdates() {
  const date = todayDateString();

  const agents = await db('agents').select(AGENT_COLUMNS).orderBy('created_at', 'asc');
  const todaysUpdates = await db('agent_updates')
    .select('agent_id as agentId', 'status', 'progress', 'status_description as statusDescription')
    .where({ update_date: date });

  const byAgentId = new Map(todaysUpdates.map((u) => [u.agentId, u]));

  return agents.map((agent) => ({
    agent,
    todayUpdate: byAgentId.get(agent.id) || null,
  }));
}

async function getAllHistory() {
  return db('agent_updates as u')
    .join('agents as a', 'a.id', 'u.agent_id')
    .select(
      'u.id',
      'u.agent_id as agentId',
      'a.name as agentName',
      'u.update_date as updateDate',
      'u.status',
      'u.progress',
      'u.status_description as statusDescription',
      'u.source',
      'u.created_at as createdAt'
    )
    .orderBy([
      { column: 'a.name', order: 'asc' },
      { column: 'u.update_date', order: 'desc' },
    ]);
}

async function getAgentHistory(agentId, { from, to } = {}) {
  const query = db('agent_updates')
    .select('update_date as updateDate', 'status', 'progress', 'status_description as statusDescription', 'source', 'created_at as createdAt')
    .where({ agent_id: agentId })
    .orderBy('update_date', 'asc');

  if (from) query.where('update_date', '>=', from);
  if (to) query.where('update_date', '<=', to);

  return query;
}

module.exports = { recordUpdate, recordUpdateStandalone, recordBatch, getTodayUpdates, getAgentHistory, getAllHistory, todayDateString };
