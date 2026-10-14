const crypto = require('crypto');
const db = require('../db/databricksClient');

// Strings compare with null and '' treated alike, so clearing an empty field
// isn't reported as a change.
function same(a, b) {
  return (a ?? '') === (b ?? '') || (a != null && b != null && String(a) === String(b));
}

// Empty text is recorded as null, so a cleared note reads as "nothing".
const recorded = (value) => (value === '' || value === undefined ? null : value);

// { field: { from, to } } for each field whose value differs.
function diff(before, after, fields) {
  const changes = {};
  for (const field of fields) {
    if (!same(before?.[field], after?.[field])) {
      changes[field] = { from: recorded(before?.[field]), to: recorded(after?.[field]) };
    }
  }
  return changes;
}

// Writes events in one INSERT however many there are. Each event:
// { action, actor: {id, name}, agentId, agentName, subject: {id, name}?, details? }
//
// Best-effort by design: the change an event describes has already been
// written (Delta has no cross-table transactions), so a failure here is
// logged rather than reported as a failure of the change itself.
async function record(events) {
  if (!events.length) return;
  const occurredAt = new Date().toISOString();
  const params = { occurredAt };
  const rows = events.map((event, i) => {
    Object.assign(params, {
      [`id${i}`]: crypto.randomUUID(),
      [`actorId${i}`]: event.actor?.id ?? null,
      [`actorName${i}`]: event.actor?.name ?? null,
      [`agentId${i}`]: event.agentId ?? null,
      [`agentName${i}`]: event.agentName ?? null,
      [`subjectId${i}`]: event.subject?.id ?? null,
      [`subjectName${i}`]: event.subject?.name ?? null,
      [`action${i}`]: event.action,
      [`details${i}`]: event.details ? JSON.stringify(event.details) : null,
    });
    return `(:id${i}, CAST(:occurredAt AS TIMESTAMP), CAST(:actorId${i} AS STRING), CAST(:actorName${i} AS STRING),
             CAST(:agentId${i} AS STRING), CAST(:agentName${i} AS STRING), CAST(:subjectId${i} AS STRING),
             CAST(:subjectName${i} AS STRING), :action${i}, CAST(:details${i} AS STRING))`;
  });
  try {
    await db.query(
      `INSERT INTO audit_events (id, occurred_at, actor_id, actor_name, agent_id, agent_name, subject_user_id, subject_name, action, details)
       VALUES ${rows.join(', ')}`,
      params,
    );
  } catch (err) {
    console.error(`[audit] failed to record ${events.length} event(s): ${err.message}`);
  }
}

// Paging is by (occurred_at, id), newest first; events written together share
// a timestamp, so the id breaks ties. The cursor is opaque to callers.
function encodeCursor(event) {
  return Buffer.from(`${new Date(event.occurredAt).toISOString()}|${event.id}`).toString('base64url');
}

function decodeCursor(cursor) {
  const [at, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  if (!id || Number.isNaN(Date.parse(at))) return null;
  return { at, id };
}

// `personId` (a user id) matches events a person did and events about them,
// e.g. their update being approved.
async function listEvents({ agentId, personId, cursor, limit = 50 } = {}) {
  const clauses = [];
  const params = {};
  if (agentId) {
    clauses.push('agent_id = :agentId');
    params.agentId = agentId;
  }
  if (personId) {
    clauses.push('(actor_id = :personId OR subject_user_id = :personId)');
    params.personId = personId;
  }
  const after = cursor ? decodeCursor(cursor) : null;
  if (after) {
    clauses.push('(occurred_at < CAST(:cursorAt AS TIMESTAMP) OR (occurred_at = CAST(:cursorAt AS TIMESTAMP) AND id < :cursorId))');
    params.cursorAt = after.at;
    params.cursorId = after.id;
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 100);

  const rows = await db.query(
    `SELECT id, occurred_at as occurredAt, actor_id as actorId, actor_name as actorName, agent_id as agentId,
            agent_name as agentName, subject_user_id as subjectUserId, subject_name as subjectName, action, details
     FROM audit_events ${where}
     ORDER BY occurred_at DESC, id DESC
     LIMIT ${pageSize + 1}`,
    params,
  );
  const page = rows.slice(0, pageSize);
  return {
    events: page.map((row) => ({ ...row, details: row.details ? JSON.parse(row.details) : {} })),
    nextCursor: rows.length > pageSize ? encodeCursor(page[page.length - 1]) : null,
  };
}

module.exports = { diff, record, listEvents };
