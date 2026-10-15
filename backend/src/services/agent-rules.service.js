const crypto = require('crypto');
const db = require('../db/databricksClient');

// Rules every path that changes an agent's status or target date shares —
// direct updates, the Daily Update Sheet, new agents, edits, contributors'
// updates and approvals.

function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

const blank = (text) => !text || !String(text).trim();

// Trimmed text, or null for blank — so a blank field never overwrites a value.
const cleanText = (text) => (blank(text) ? null : String(text).trim());

// Becoming Blocked needs a reason and who or what can unblock it. Staying
// Blocked doesn't — the reason recorded when it became blocked carries on.
function needsBlockerDetails({ fromStatus, toStatus, blockerReason, blockedBy }) {
  return toStatus === 'Blocked' && fromStatus !== 'Blocked' && (blank(blockerReason) || blank(blockedBy));
}

function requireBlockerDetails({ fromStatus, toStatus, blockerReason, blockedBy, agentName }) {
  if (needsBlockerDetails({ fromStatus, toStatus, blockerReason, blockedBy })) {
    throw httpError(
      400,
      'BLOCKER_DETAILS_REQUIRED',
      `${agentName ? `${agentName}: s` : 'S'}ay why it's blocked and who or what can unblock it.`,
    );
  }
}

// Dates are 'YYYY-MM-DD' strings, so they compare as text.
function isLater(toEta, fromEta) {
  return Boolean(fromEta && toEta && toEta > fromEta);
}

// Moving a target date later (a slip) needs a reason. Setting a first date,
// moving one earlier, or clearing it doesn't.
function requireEtaReason({ fromEta, toEta, reason, agentName, message }) {
  if (isLater(toEta, fromEta) && blank(reason)) {
    throw httpError(
      400,
      'ETA_REASON_REQUIRED',
      message || `${agentName ? `${agentName}: s` : 'S'}ay why the target date is moving later.`,
    );
  }
}

// SET assignments that keep an agent's blocker fields in step with its new
// status: entering Blocked starts the clock and records why; staying Blocked
// keeps the clock (and any reason not replaced); leaving Blocked clears all of
// it, ready for next time. Arguments are SQL expressions. `target` qualifies
// the agent's own columns ('a.' inside a MERGE); `onlyIf` leaves everything
// untouched unless that SQL condition holds.
function blockerAssignments({ status, reason, blockedBy, now, target = '', onlyIf }) {
  const col = (name) => `${target}${name}`;
  const blocked = `${status} = 'Blocked'`;
  const set = (name, expr) => `${name} = ${onlyIf ? `CASE WHEN ${onlyIf} THEN ${expr} ELSE ${col(name)} END` : expr}`;
  return [
    set('blocked_since', `CASE WHEN ${blocked} THEN COALESCE(${col('blocked_since')}, ${now}) ELSE NULL END`),
    set('blocker_reason', `CASE WHEN ${blocked} THEN COALESCE(${reason}, ${col('blocker_reason')}) ELSE NULL END`),
    set('blocked_by', `CASE WHEN ${blocked} THEN COALESCE(${blockedBy}, ${col('blocked_by')}) ELSE NULL END`),
    set('blocker_escalated_at', `CASE WHEN ${blocked} THEN ${col('blocker_escalated_at')} ELSE NULL END`),
  ].join(',\n       ');
}

// Appends target-date changes to eta_changes in one INSERT. Each change:
// { agentId, fromEta, toEta, reason, changedBy: {id, name}, source, submissionId }
async function recordEtaChanges(changes) {
  if (!changes.length) return;
  const params = { now: new Date().toISOString() };
  const rows = changes.map((change, i) => {
    Object.assign(params, {
      [`id${i}`]: crypto.randomUUID(),
      [`agentId${i}`]: change.agentId,
      [`from${i}`]: change.fromEta ?? null,
      [`to${i}`]: change.toEta ?? null,
      [`reason${i}`]: cleanText(change.reason),
      [`byId${i}`]: change.changedBy?.id ?? null,
      [`byName${i}`]: change.changedBy?.name ?? null,
      [`source${i}`]: change.source,
      [`submissionId${i}`]: change.submissionId ?? null,
    });
    return `(:id${i}, :agentId${i}, CAST(:from${i} AS DATE), CAST(:to${i} AS DATE), CAST(:reason${i} AS STRING),
             CAST(:byId${i} AS STRING), CAST(:byName${i} AS STRING), :source${i}, CAST(:submissionId${i} AS STRING),
             CAST(:now AS TIMESTAMP))`;
  });
  await db.query(
    `INSERT INTO eta_changes (id, agent_id, from_eta, to_eta, reason, changed_by, changed_by_name, source, submission_id, changed_at)
     VALUES ${rows.join(', ')}`,
    params,
  );
}

async function listEtaChanges(agentId) {
  return db.query(
    `SELECT id, CAST(from_eta AS STRING) as fromEta, CAST(to_eta AS STRING) as toEta, reason,
            changed_by_name as changedByName, source, changed_at as changedAt
     FROM eta_changes WHERE agent_id = :agentId ORDER BY changed_at DESC`,
    { agentId },
  );
}

module.exports = {
  httpError,
  cleanText,
  needsBlockerDetails,
  requireBlockerDetails,
  requireEtaReason,
  isLater,
  blockerAssignments,
  recordEtaChanges,
  listEtaChanges,
};
