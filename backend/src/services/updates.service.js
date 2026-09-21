const crypto = require('crypto');
const db = require('../db/databricksClient');
const { AGENT_SELECT } = require('./agents.service');

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

// Upserts one day's update for one agent (via MERGE, since Delta has no
// unique index to back an ON CONFLICT), then refreshes the agent's
// denormalized current_* fields as a second, separate write — Delta has no
// cross-table transactions, so these two writes aren't atomic with each
// other. Reused by the single-update endpoint, the batch daily-sheet
// endpoint, and (in a future phase) any automated webhook/API ingestion path.
async function recordUpdate({ agentId, updateDate, status, progress, statusDescription, source = 'manual' }) {
  const date = updateDate || todayDateString();
  const now = new Date().toISOString();
  const newId = crypto.randomUUID();

  await db.query(
    `MERGE INTO agent_updates AS u
     USING (SELECT CAST(:agentId AS STRING) AS agent_id, CAST(:date AS DATE) AS update_date) AS s
     ON u.agent_id = s.agent_id AND u.update_date = s.update_date
     WHEN MATCHED THEN UPDATE SET
       status = :status, progress = :progress, status_description = :statusDescription, source = :source
     WHEN NOT MATCHED THEN INSERT (id, agent_id, update_date, status, progress, status_description, source, created_at)
       VALUES (:newId, s.agent_id, s.update_date, :status, :progress, :statusDescription, :source, CAST(:createdAt AS TIMESTAMP))`,
    { agentId, date, status, progress, statusDescription: statusDescription ?? null, source, newId, createdAt: now },
  );

  const update = await db.queryOne(
    `SELECT id, agent_id as agentId, update_date as updateDate, status, progress,
            status_description as statusDescription, source, created_at as createdAt
     FROM agent_updates WHERE agent_id = :agentId AND update_date = CAST(:date AS DATE)`,
    { agentId, date },
  );

  await db.query(
    `UPDATE agents SET
       current_status = :status,
       current_progress = :progress,
       current_status_description = :statusDescription,
       last_update_at = CAST(:now AS TIMESTAMP),
       updated_at = CAST(:now AS TIMESTAMP)
     WHERE id = :agentId`,
    { status, progress, statusDescription: statusDescription ?? null, now, agentId },
  );

  const agent = await db.queryOne(`SELECT ${AGENT_SELECT} FROM agents WHERE id = :agentId`, { agentId });

  return { update, agent };
}

async function recordUpdateStandalone(payload) {
  return recordUpdate(payload);
}

async function recordBatch({ updateDate, entries }) {
  const results = [];
  for (const entry of entries) {
    // eslint-disable-next-line no-await-in-loop
    const result = await recordUpdate({ ...entry, updateDate });
    results.push(result);
  }
  return results;
}

async function getTodayUpdates() {
  const date = todayDateString();

  const agents = await db.query(`SELECT ${AGENT_SELECT} FROM agents ORDER BY created_at ASC`);
  const todaysUpdates = await db.query(
    `SELECT agent_id as agentId, status, progress, status_description as statusDescription
     FROM agent_updates WHERE update_date = CAST(:date AS DATE)`,
    { date },
  );

  const byAgentId = new Map(todaysUpdates.map((u) => [u.agentId, u]));

  return agents.map((agent) => ({
    agent,
    todayUpdate: byAgentId.get(agent.id) || null,
  }));
}

async function getAllHistory() {
  return db.query(`
    SELECT
      u.id,
      u.agent_id as agentId,
      a.name as agentName,
      u.update_date as updateDate,
      u.status,
      u.progress,
      u.status_description as statusDescription,
      u.source,
      u.created_at as createdAt
    FROM agent_updates u
    JOIN agents a ON a.id = u.agent_id
    ORDER BY a.name ASC, u.update_date DESC
  `);
}

async function getAgentHistory(agentId, { from, to } = {}) {
  const clauses = ['agent_id = :agentId'];
  const params = { agentId };
  if (from) {
    clauses.push('update_date >= CAST(:from AS DATE)');
    params.from = from;
  }
  if (to) {
    clauses.push('update_date <= CAST(:to AS DATE)');
    params.to = to;
  }

  return db.query(
    `SELECT update_date as updateDate, status, progress, status_description as statusDescription, source, created_at as createdAt
     FROM agent_updates
     WHERE ${clauses.join(' AND ')}
     ORDER BY update_date ASC`,
    params,
  );
}

module.exports = { recordUpdate, recordUpdateStandalone, recordBatch, getTodayUpdates, getAgentHistory, getAllHistory, todayDateString };
