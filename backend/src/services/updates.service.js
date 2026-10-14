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
// `recordedBy` is the account making the change (the Agent Manager here —
// approved submissions are written by submissions.service.js instead).
async function recordUpdate({ agentId, updateDate, status, progress, statusDescription, source = 'manual', recordedBy = null }) {
  const date = updateDate || todayDateString();
  const now = new Date().toISOString();
  const newId = crypto.randomUUID();

  await db.query(
    `MERGE INTO agent_updates AS u
     USING (SELECT CAST(:agentId AS STRING) AS agent_id, CAST(:date AS DATE) AS update_date) AS s
     ON u.agent_id = s.agent_id AND u.update_date = s.update_date
     WHEN MATCHED THEN UPDATE SET
       status = :status, progress = :progress, status_description = :statusDescription, source = :source,
       recorded_by = :recordedBy, submission_id = NULL
     WHEN NOT MATCHED THEN INSERT (id, agent_id, update_date, status, progress, status_description, source, created_at, recorded_by, submission_id)
       VALUES (:newId, s.agent_id, s.update_date, :status, :progress, :statusDescription, :source, CAST(:createdAt AS TIMESTAMP), :recordedBy, NULL)`,
    { agentId, date, status, progress, statusDescription: statusDescription ?? null, source, newId, createdAt: now, recordedBy },
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

// Saves a whole daily sheet in a fixed number of statements (one lookup, two
// MERGEs, one read-back) instead of ~4 warehouse round-trips per agent, so a
// large sheet can't time out partway and leave only some agents saved. An
// unknown agent id rejects the whole batch before anything is written — a
// deleted agent must never silently drop out of "Submit" or leave an orphan
// history row. If a later statement still fails, the history rows are already
// written but agents' current_* fields aren't (Delta has no cross-table
// transactions); re-submitting is safe since both MERGEs are idempotent.
async function recordBatch({ updateDate, entries, source = 'manual', recordedBy = null }) {
  const date = updateDate || todayDateString();
  const now = new Date().toISOString();

  // One row per agent — MERGE rejects a source with duplicate match keys.
  const rows = [...new Map(entries.map((entry) => [entry.agentId, entry])).values()];

  const params = { date, now, source, recordedBy };
  const idPlaceholders = rows.map((row, i) => {
    params[`agentId${i}`] = row.agentId;
    return `:agentId${i}`;
  });

  const existing = await db.query(`SELECT id FROM agents WHERE id IN (${idPlaceholders.join(', ')})`, params);
  if (existing.length !== rows.length) {
    const known = new Set(existing.map((r) => r.id));
    const err = new Error(`${rows.length - known.size} agent(s) no longer exist — refresh the sheet and try again.`);
    err.status = 404;
    err.code = 'AGENT_NOT_FOUND';
    throw err;
  }

  const values = rows.map((row, i) => {
    params[`status${i}`] = row.status;
    params[`progress${i}`] = row.progress;
    params[`description${i}`] = row.statusDescription ?? null;
    params[`newId${i}`] = crypto.randomUUID();
    return `(:agentId${i}, :status${i}, CAST(:progress${i} AS INT), CAST(:description${i} AS STRING), :newId${i})`;
  });
  const sourceRows = `SELECT * FROM VALUES ${values.join(', ')} AS s(agent_id, status, progress, status_description, new_id)`;

  await db.query(
    `MERGE INTO agent_updates AS u
     USING (${sourceRows}) AS s
     ON u.agent_id = s.agent_id AND u.update_date = CAST(:date AS DATE)
     WHEN MATCHED THEN UPDATE SET
       status = s.status, progress = s.progress, status_description = s.status_description, source = :source,
       recorded_by = :recordedBy, submission_id = NULL
     WHEN NOT MATCHED THEN INSERT (id, agent_id, update_date, status, progress, status_description, source, created_at, recorded_by, submission_id)
       VALUES (s.new_id, s.agent_id, CAST(:date AS DATE), s.status, s.progress, s.status_description, :source, CAST(:now AS TIMESTAMP), :recordedBy, NULL)`,
    params,
  );

  await db.query(
    `MERGE INTO agents AS a
     USING (${sourceRows}) AS s
     ON a.id = s.agent_id
     WHEN MATCHED THEN UPDATE SET
       current_status = s.status,
       current_progress = s.progress,
       current_status_description = s.status_description,
       last_update_at = CAST(:now AS TIMESTAMP),
       updated_at = CAST(:now AS TIMESTAMP)`,
    params,
  );

  const updatedAgents = await db.query(`SELECT ${AGENT_SELECT} FROM agents WHERE id IN (${idPlaceholders.join(', ')})`, params);
  return { savedCount: rows.length, updatedAgents };
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
