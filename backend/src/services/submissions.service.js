const crypto = require('crypto');
const db = require('../db/databricksClient');
const { todayDateString } = require('./updates.service');
const audit = require('./audit.service');
const rules = require('./agent-rules.service');

const { httpError } = rules;
const PROPOSED_FIELDS = ['status', 'progress', 'statusDescription', 'eta'];

// Dates come back as 'YYYY-MM-DD' strings (CAST in SQL), so nothing here
// depends on how the driver or the server's timezone would render a DATE.
const SUBMISSION_SELECT = `
  s.id,
  s.agent_id as agentId,
  a.name as agentName,
  s.submitted_by as submittedBy,
  COALESCE(sm.name, 'Former team member') as submitterName,
  s.submitted_at as submittedAt,
  CAST(s.update_date AS STRING) as updateDate,
  s.status,
  s.progress,
  s.status_description as statusDescription,
  CAST(s.eta AS STRING) as eta,
  s.eta_reason as etaReason,
  s.blocker_reason as blockerReason,
  s.blocked_by as blockedBy,
  s.review_status as reviewStatus,
  s.reviewed_at as reviewedAt,
  rm.name as reviewerName,
  s.review_comment as reviewComment,
  s.approved_status as approvedStatus,
  s.approved_progress as approvedProgress,
  s.approved_status_description as approvedStatusDescription,
  CAST(s.approved_eta AS STRING) as approvedEta,
  a.current_status as currentStatus,
  a.current_progress as currentProgress,
  a.current_status_description as currentStatusDescription,
  CAST(a.eta AS STRING) as currentEta,
  a.blocker_reason as currentBlockerReason,
  a.blocked_by as currentBlockedBy
`;
const SUBMISSION_FROM = `
  FROM update_submissions s
  JOIN agents a ON a.id = s.agent_id
  LEFT JOIN users su ON su.id = s.submitted_by
  LEFT JOIN team_members sm ON sm.id = su.team_member_id
  LEFT JOIN users ru ON ru.id = s.reviewed_by
  LEFT JOIN team_members rm ON rm.id = ru.team_member_id
`;

function idList(prefix, ids, params) {
  return ids
    .map((id, i) => {
      params[`${prefix}${i}`] = id;
      return `:${prefix}${i}`;
    })
    .join(', ');
}

// What a submission proposed, as the audit log records it.
function proposedForAudit(values) {
  return {
    status: values.status,
    progress: values.progress,
    statusDescription: values.statusDescription ?? null,
    eta: values.eta ?? null,
    ...(values.etaReason ? { etaReason: values.etaReason } : {}),
    ...(values.status === 'Blocked' && (values.blockerReason || values.blockedBy)
      ? { blocker: { reason: values.blockerReason ?? null, blockedBy: values.blockedBy ?? null } }
      : {}),
  };
}

// --- Contributors -----------------------------------------------------------

// Only an agent's assignees can propose updates for it. A newer submission
// from the same person replaces their earlier pending one, so the reviewer
// only ever sees each person's latest word. A later target date needs a
// reason, and becoming Blocked needs the blocker details — checked against
// the agent as it stands now.
async function submitUpdate({ agentId, status, progress, statusDescription, eta, etaReason, blockerReason, blockedBy }, user) {
  const agent = await db.queryOne(
    'SELECT id, name, current_status as status, CAST(eta AS STRING) as eta FROM agents WHERE id = :agentId',
    { agentId },
  );
  if (!agent) throw httpError(404, 'NOT_FOUND', 'Agent not found');

  const assigned = await db.queryOne(
    'SELECT agent_id FROM agent_assignees WHERE agent_id = :agentId AND team_member_id = :teamMemberId',
    { agentId, teamMemberId: user.teamMemberId },
  );
  if (!assigned) {
    throw httpError(403, 'NOT_ASSIGNED', "You can only send updates for agents you're assigned to.");
  }
  rules.requireEtaReason({ fromEta: agent.eta, toEta: eta, reason: etaReason });
  rules.requireBlockerDetails({ fromStatus: agent.status, toStatus: status, blockerReason, blockedBy });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const proposed = {
    status,
    progress,
    statusDescription: statusDescription ?? null,
    eta: eta ?? null,
    etaReason: rules.isLater(eta, agent.eta) ? rules.cleanText(etaReason) : null,
    blockerReason: status === 'Blocked' ? rules.cleanText(blockerReason) : null,
    blockedBy: status === 'Blocked' ? rules.cleanText(blockedBy) : null,
  };

  await db.query(
    `UPDATE update_submissions SET review_status = 'superseded', updated_at = CAST(:now AS TIMESTAMP)
     WHERE agent_id = :agentId AND submitted_by = :userId AND review_status = 'pending'`,
    { agentId, userId: user.id, now },
  );
  await db.query(
    `INSERT INTO update_submissions
       (id, agent_id, submitted_by, submitted_at, update_date, status, progress, status_description, eta,
        review_status, reviewed_by, reviewed_at, review_comment,
        approved_status, approved_progress, approved_status_description, approved_eta, updated_at,
        eta_reason, blocker_reason, blocked_by)
     VALUES
       (:id, :agentId, :userId, CAST(:now AS TIMESTAMP), CAST(:date AS DATE), :status, :progress, :statusDescription, CAST(:eta AS DATE),
        'pending', NULL, NULL, NULL,
        NULL, NULL, NULL, NULL, CAST(:now AS TIMESTAMP),
        CAST(:etaReason AS STRING), CAST(:blockerReason AS STRING), CAST(:blockedBy AS STRING))`,
    { id, agentId, userId: user.id, now, date: todayDateString(), ...proposed },
  );

  await audit.record([
    {
      action: 'update_submitted',
      actor: user,
      agentId,
      agentName: agent.name,
      details: { submissionId: id, proposed: proposedForAudit(proposed) },
    },
  ]);
  return getSubmission(id);
}

async function getSubmission(id) {
  return db.queryOne(`SELECT ${SUBMISSION_SELECT} ${SUBMISSION_FROM} WHERE s.id = :id`, { id });
}

// The Agent Manager sees everyone's submissions; anyone else only their own.
async function listSubmissions({ reviewStatus, agentId } = {}, user, { allUsers }) {
  const clauses = [];
  const params = {};
  if (!allUsers) {
    clauses.push('s.submitted_by = :userId');
    params.userId = user.id;
  }
  if (reviewStatus) {
    clauses.push('s.review_status = :reviewStatus');
    params.reviewStatus = reviewStatus;
  }
  if (agentId) {
    clauses.push('s.agent_id = :agentId');
    params.agentId = agentId;
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  // The inbox reads oldest-first (first come, first reviewed); history reads newest-first.
  const order = reviewStatus === 'pending' ? 'ASC' : 'DESC';
  return db.query(`SELECT ${SUBMISSION_SELECT} ${SUBMISSION_FROM} ${where} ORDER BY s.submitted_at ${order} LIMIT 200`, params);
}

// --- Review (Agent Manager) -------------------------------------------------

async function loadPending(ids) {
  const params = {};
  const rows = await db.query(
    `SELECT s.id, s.agent_id as agentId, a.name as agentName, s.submitted_by as submittedBy,
            COALESCE(sm.name, 'Former team member') as submitterName, s.submitted_at as submittedAt,
            CAST(s.update_date AS STRING) as updateDate, s.status, s.progress,
            s.status_description as statusDescription, CAST(s.eta AS STRING) as eta,
            s.eta_reason as etaReason, s.blocker_reason as blockerReason, s.blocked_by as blockedBy,
            s.review_status as reviewStatus,
            a.current_status as currentStatus, CAST(a.eta AS STRING) as currentEta
     FROM update_submissions s
     JOIN agents a ON a.id = s.agent_id
     LEFT JOIN users su ON su.id = s.submitted_by
     LEFT JOIN team_members sm ON sm.id = su.team_member_id
     WHERE s.id IN (${idList('id', ids, params)})`,
    params,
  );
  if (rows.length !== ids.length) {
    throw httpError(404, 'NOT_FOUND', 'One or more updates no longer exist — refresh and try again.');
  }
  const done = rows.filter((row) => row.reviewStatus !== 'pending');
  if (done.length) {
    throw httpError(409, 'ALREADY_REVIEWED', 'Some of these updates were already reviewed or replaced — refresh and try again.');
  }
  return rows;
}

// Applies approvals in a fixed number of statements however many there are
// (same reasoning as updates.service.js recordBatch). For each agent only the
// newest selected submission is applied; the rest, and any other pending
// submission for that agent sent no later than it, are closed as superseded.
//
// Each approved submission becomes the history row for the day it was sent
// (not the day it was approved), authored by its submitter. It only becomes
// the agent's current status if no later day already has an update — an old
// submission approved late must not roll the dashboard back. A proposed
// target date applies either way, and is added to the target-date history.
async function applyApprovals(approvals, reviewer) {
  const newestByAgent = new Map();
  for (const approval of approvals) {
    const kept = newestByAgent.get(approval.submission.agentId);
    if (!kept || new Date(approval.submission.submittedAt) > new Date(kept.submission.submittedAt)) {
      newestByAgent.set(approval.submission.agentId, approval);
    }
  }
  const items = [...newestByAgent.values()];
  const now = new Date().toISOString();
  const params = { now, reviewerId: reviewer.id };

  const rows = items.map(({ submission, values, comment }, i) => {
    Object.assign(params, {
      [`sid${i}`]: submission.id,
      [`agentId${i}`]: submission.agentId,
      [`date${i}`]: submission.updateDate,
      [`status${i}`]: values.status,
      [`progress${i}`]: values.progress,
      [`description${i}`]: values.statusDescription ?? null,
      [`eta${i}`]: values.eta ?? null,
      [`by${i}`]: submission.submittedBy,
      [`at${i}`]: new Date(submission.submittedAt).toISOString(),
      [`comment${i}`]: comment ?? null,
      [`blockerReason${i}`]: values.status === 'Blocked' ? rules.cleanText(values.blockerReason) : null,
      [`blockedBy${i}`]: values.status === 'Blocked' ? rules.cleanText(values.blockedBy) : null,
      [`newId${i}`]: crypto.randomUUID(),
    });
    return `(:sid${i}, :agentId${i}, CAST(:date${i} AS DATE), :status${i}, CAST(:progress${i} AS INT), CAST(:description${i} AS STRING),
             CAST(:eta${i} AS DATE), :by${i}, CAST(:at${i} AS TIMESTAMP), CAST(:comment${i} AS STRING), :newId${i})`;
  });
  const source = `SELECT * FROM VALUES ${rows.join(', ')}
    AS s(submission_id, agent_id, update_date, status, progress, status_description, eta, submitted_by, submitted_at, review_comment, new_id)`;

  await db.query(
    `MERGE INTO update_submissions AS t
     USING (${source}) AS s
     ON t.id = s.submission_id
     WHEN MATCHED AND t.review_status = 'pending' THEN UPDATE SET
       review_status = 'approved', reviewed_by = :reviewerId, reviewed_at = CAST(:now AS TIMESTAMP),
       review_comment = s.review_comment,
       approved_status = s.status, approved_progress = s.progress,
       approved_status_description = s.status_description, approved_eta = s.eta,
       updated_at = CAST(:now AS TIMESTAMP)`,
    params,
  );

  await db.query(
    `MERGE INTO update_submissions AS t
     USING (${source}) AS s
     ON t.agent_id = s.agent_id
     WHEN MATCHED AND t.review_status = 'pending' AND t.id <> s.submission_id AND t.submitted_at <= s.submitted_at THEN UPDATE SET
       review_status = 'superseded', reviewed_by = :reviewerId, reviewed_at = CAST(:now AS TIMESTAMP),
       updated_at = CAST(:now AS TIMESTAMP)`,
    params,
  );

  await db.query(
    `MERGE INTO agent_updates AS u
     USING (${source}) AS s
     ON u.agent_id = s.agent_id AND u.update_date = s.update_date
     WHEN MATCHED THEN UPDATE SET
       status = s.status, progress = s.progress, status_description = s.status_description,
       source = 'submission', recorded_by = s.submitted_by, submission_id = s.submission_id
     WHEN NOT MATCHED THEN INSERT (id, agent_id, update_date, status, progress, status_description, source, created_at, recorded_by, submission_id)
       VALUES (s.new_id, s.agent_id, s.update_date, s.status, s.progress, s.status_description, 'submission',
               CAST(:now AS TIMESTAMP), s.submitted_by, s.submission_id)`,
    params,
  );

  // An agent's newest history day decides whether this approval is "current".
  const agentIds = items.map((item) => item.submission.agentId);
  const latestParams = {};
  const latest = await db.query(
    `SELECT agent_id as agentId, CAST(MAX(update_date) AS STRING) as latestDate
     FROM agent_updates WHERE agent_id IN (${idList('a', agentIds, latestParams)})
     GROUP BY agent_id`,
    latestParams,
  );
  // What the dashboard showed before, for the audit log's before/after.
  const beforeParams = {};
  const befores = await db.query(
    `SELECT id, current_status as status, current_progress as progress,
            current_status_description as statusDescription, CAST(eta AS STRING) as eta
     FROM agents WHERE id IN (${idList('b', agentIds, beforeParams)})`,
    beforeParams,
  );
  const latestByAgent = new Map(latest.map((row) => [row.agentId, row.latestDate]));
  items.forEach(({ submission }, i) => {
    params[`current${i}`] = submission.updateDate >= (latestByAgent.get(submission.agentId) || '');
  });
  const currentRows = items.map(
    (_, i) => `(:agentId${i}, :status${i}, CAST(:progress${i} AS INT), CAST(:description${i} AS STRING), CAST(:eta${i} AS DATE),
                CAST(:current${i} AS BOOLEAN), CAST(:blockerReason${i} AS STRING), CAST(:blockedBy${i} AS STRING))`,
  );

  await db.query(
    `MERGE INTO agents AS a
     USING (SELECT * FROM VALUES ${currentRows.join(', ')}
            AS s(agent_id, status, progress, status_description, eta, is_current, blocker_reason, blocked_by)) AS s
     ON a.id = s.agent_id
     WHEN MATCHED THEN UPDATE SET
       current_status = CASE WHEN s.is_current THEN s.status ELSE a.current_status END,
       current_progress = CASE WHEN s.is_current THEN s.progress ELSE a.current_progress END,
       current_status_description = CASE WHEN s.is_current THEN s.status_description ELSE a.current_status_description END,
       ${rules.blockerAssignments({ status: 's.status', reason: 's.blocker_reason', blockedBy: 's.blocked_by', now: 'CAST(:now AS TIMESTAMP)', target: 'a.', onlyIf: 's.is_current' })},
       last_update_at = CASE WHEN s.is_current THEN CAST(:now AS TIMESTAMP) ELSE a.last_update_at END,
       eta = COALESCE(s.eta, a.eta),
       updated_at = CAST(:now AS TIMESTAMP)`,
    params,
  );

  const beforeById = new Map(befores.map((before) => [before.id, before]));
  const etaMoved = ({ submission, values }) => values.eta && values.eta !== beforeById.get(submission.agentId)?.eta;
  await rules.recordEtaChanges(
    items.filter(etaMoved).map(({ submission, values }) => ({
      agentId: submission.agentId,
      fromEta: beforeById.get(submission.agentId)?.eta ?? null,
      toEta: values.eta,
      reason: values.etaReason,
      changedBy: { id: submission.submittedBy, name: submission.submitterName },
      source: 'submission',
      submissionId: submission.id,
    })),
  );

  // Superseded leftovers aren't logged; each applied approval records what
  // changed on the dashboard and which fields the reviewer edited.
  await audit.record(
    items.map((item, i) => {
      const { submission, values, comment } = item;
      const before = beforeById.get(submission.agentId);
      const isCurrent = params[`current${i}`];
      const after = {
        ...before,
        ...(isCurrent ? { status: values.status, progress: values.progress, statusDescription: values.statusDescription } : {}),
        ...(values.eta ? { eta: values.eta } : {}),
      };
      const becameBlocked = isCurrent && values.status === 'Blocked' && before?.status !== 'Blocked';
      return {
        action: 'update_approved',
        actor: reviewer,
        agentId: submission.agentId,
        agentName: submission.agentName,
        subject: { id: submission.submittedBy, name: submission.submitterName },
        details: {
          submissionId: submission.id,
          updateDate: submission.updateDate,
          changes: audit.diff(before, after, PROPOSED_FIELDS),
          editedByReviewer: Object.keys(audit.diff(submission, values, PROPOSED_FIELDS)),
          appliedToCurrent: isCurrent,
          comment: comment ?? null,
          ...(etaMoved(item) && values.etaReason ? { etaReason: rules.cleanText(values.etaReason) } : {}),
          ...(becameBlocked ? { blocker: { reason: rules.cleanText(values.blockerReason), blockedBy: rules.cleanText(values.blockedBy) } } : {}),
        },
      };
    }),
  );

  return { approvedCount: items.length };
}

// The values an approval would apply, and the checks they must pass against
// the agent as it stands now. A later target date takes the submitter's
// reason, or else the reviewer's comment; becoming Blocked needs the blocker
// details (the submitter's, or the reviewer's edits).
function approvalValues(submission, { edits, comment } = {}) {
  const pick = (field) => (edits?.[field] !== undefined ? edits[field] : submission[field]);
  return {
    status: pick('status'),
    progress: pick('progress'),
    statusDescription: pick('statusDescription'),
    eta: pick('eta'),
    etaReason: rules.cleanText(submission.etaReason) || rules.cleanText(comment),
    blockerReason: pick('blockerReason'),
    blockedBy: pick('blockedBy'),
  };
}

function checkApproval(submission, values) {
  rules.requireEtaReason({
    fromEta: submission.currentEta,
    toEta: values.eta,
    reason: values.etaReason,
    message: 'The target date moves later — add a comment saying why.',
  });
  rules.requireBlockerDetails({
    fromStatus: submission.currentStatus,
    toStatus: values.status,
    blockerReason: values.blockerReason,
    blockedBy: values.blockedBy,
  });
}

// One submission, optionally with the reviewer's edits on top of what was proposed.
async function approveSubmission(id, { edits, comment } = {}, reviewer) {
  const [submission] = await loadPending([id]);
  const values = approvalValues(submission, { edits, comment });
  checkApproval(submission, values);
  await applyApprovals([{ submission, values, comment }], reviewer);
  return getSubmission(id);
}

// Bulk approval applies each submission exactly as proposed. Anything that
// can't be approved as-is is named so it can be opened and approved alone.
async function approveSubmissions(ids, reviewer) {
  const submissions = await loadPending([...new Set(ids)]);
  const approvals = submissions.map((submission) => ({ submission, values: approvalValues(submission) }));
  const stuck = approvals.filter(({ submission, values }) => {
    try {
      checkApproval(submission, values);
      return false;
    } catch {
      return true;
    }
  });
  if (stuck.length) {
    throw httpError(
      400,
      'NEEDS_REVIEWER_INPUT',
      `Approve these one at a time — they need a reason or blocker details first: ${stuck.map((a) => a.submission.agentName).join(', ')}.`,
    );
  }
  return applyApprovals(approvals, reviewer);
}

// "Request changes" and "reject" both close the submission with a comment;
// the difference is what the submitter is told to do next.
async function closeSubmission(id, { decision, comment }, reviewer) {
  const [submission] = await loadPending([id]);
  await db.query(
    `UPDATE update_submissions
     SET review_status = :decision, review_comment = :comment, reviewed_by = :reviewerId,
         reviewed_at = CAST(:now AS TIMESTAMP), updated_at = CAST(:now AS TIMESTAMP)
     WHERE id = :id AND review_status = 'pending'`,
    { id, decision, comment, reviewerId: reviewer.id, now: new Date().toISOString() },
  );
  await audit.record([
    {
      action: decision === 'rejected' ? 'update_rejected' : 'changes_requested',
      actor: reviewer,
      agentId: submission.agentId,
      agentName: submission.agentName,
      subject: { id: submission.submittedBy, name: submission.submitterName },
      details: { submissionId: id, comment, proposed: proposedForAudit(submission) },
    },
  ]);
  return getSubmission(id);
}

module.exports = { submitUpdate, listSubmissions, approveSubmission, approveSubmissions, closeSubmission };
