const crypto = require('crypto');
const db = require('../db/databricksClient');
const env = require('../config/env');
const { assertTeamMembersExist } = require('./team-members.service');
const audit = require('./audit.service');
const rules = require('./agent-rules.service');

// Assignees live in agent_assignees (one row per agent + team member), not on
// this row — the legacy agents.assigned_to column is no longer read or written.
// Every caller selects FROM agents (unaliased), which the correlated subqueries
// below rely on.
//
// blockerEscalated: Blocked for at least the escalation threshold.
// etaSlipCount: how many times the target date moved later.
// etaSlipDays: today's target date minus the first one on record (the total
// delay; null when the date has never changed).
const AGENT_SELECT = `
  id,
  name,
  description,
  COALESCE(marketplace_deployment, false) as marketplaceDeployment,
  eta,
  current_status as currentStatus,
  current_progress as currentProgress,
  current_status_description as currentStatusDescription,
  last_update_at as lastUpdateAt,
  sort_order as sortOrder,
  created_at as createdAt,
  updated_at as updatedAt,
  blocked_since as blockedSince,
  blocker_reason as blockerReason,
  blocked_by as blockedBy,
  COALESCE(current_status = 'Blocked' AND blocked_since <= current_timestamp() - INTERVAL ${env.escalation.blockerDays} DAYS, false) as blockerEscalated,
  (SELECT COUNT(*) FROM update_submissions s WHERE s.agent_id = agents.id AND s.review_status = 'pending') as pendingReviewCount,
  (SELECT COUNT(*) FROM eta_changes e WHERE e.agent_id = agents.id AND e.from_eta IS NOT NULL AND e.to_eta > e.from_eta) as etaSlipCount,
  datediff(eta, (SELECT min_by(e.from_eta, e.changed_at) FROM eta_changes e WHERE e.agent_id = agents.id AND e.from_eta IS NOT NULL)) as etaSlipDays
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

// `assignedTo` (a team member id) narrows the list to that person's agents —
// how contributors see only what they work on.
async function listAgents({ status, assignedTo } = {}) {
  const clauses = [];
  const params = {};
  if (status) {
    clauses.push('current_status = :status');
    params.status = status;
  }
  if (assignedTo) {
    clauses.push('id IN (SELECT agent_id FROM agent_assignees WHERE team_member_id = :assignedTo)');
    params.assignedTo = assignedTo;
  }
  const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  const agents = await db.query(`SELECT ${AGENT_SELECT} FROM agents${where} ORDER BY sort_order ASC, created_at ASC`, params);
  return attachAssignees(agents, { all: !assignedTo });
}

async function isAssigned(agentId, teamMemberId) {
  const row = await db.queryOne('SELECT agent_id FROM agent_assignees WHERE agent_id = :agentId AND team_member_id = :teamMemberId', {
    agentId,
    teamMemberId,
  });
  return Boolean(row);
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
async function createAgent(data, actor) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const assigneeIds = [...new Set(data.assigneeIds ?? [])];
  await assertTeamMembersExist(assigneeIds);
  rules.requireBlockerDetails({ fromStatus: null, toStatus: data.status, blockerReason: data.blockerReason, blockedBy: data.blockedBy });
  const blocked = data.status === 'Blocked';

  const maxOrderRow = await db.queryOne('SELECT MAX(sort_order) as maxOrder FROM agents');
  const sortOrder = (maxOrderRow?.maxOrder ?? -1) + 1;

  const agent = {
    id,
    name: data.name,
    description: data.description ?? null,
    marketplaceDeployment: data.marketplaceDeployment ?? false,
    eta: data.eta ?? null,
    currentStatus: data.status,
    currentProgress: data.progress,
    currentStatusDescription: data.statusDescription ?? null,
    lastUpdateAt: now,
    sortOrder,
    createdAt: now,
    updatedAt: now,
    blockedSince: blocked ? now : null,
    blockerReason: blocked ? data.blockerReason.trim() : null,
    blockedBy: blocked ? data.blockedBy.trim() : null,
    blockerEscalated: false,
    pendingReviewCount: 0,
    etaSlipCount: 0,
    etaSlipDays: null,
  };

  await db.query(
    `INSERT INTO agents
       (id, name, description, marketplace_deployment, eta, current_status, current_progress,
        current_status_description, last_update_at, sort_order, created_at, updated_at,
        blocked_since, blocker_reason, blocked_by, blocker_escalated_at)
     VALUES
       (:id, :name, :description, CAST(:marketplaceDeployment AS BOOLEAN), CAST(:eta AS DATE), :currentStatus, :currentProgress,
        :currentStatusDescription, CAST(:lastUpdateAt AS TIMESTAMP), :sortOrder,
        CAST(:createdAt AS TIMESTAMP), CAST(:updatedAt AS TIMESTAMP),
        CAST(:blockedSince AS TIMESTAMP), CAST(:blockerReason AS STRING), CAST(:blockedBy AS STRING), NULL)`,
    {
      id,
      name: agent.name,
      description: agent.description,
      marketplaceDeployment: agent.marketplaceDeployment,
      eta: agent.eta,
      currentStatus: agent.currentStatus,
      currentProgress: agent.currentProgress,
      currentStatusDescription: agent.currentStatusDescription,
      lastUpdateAt: now,
      sortOrder,
      createdAt: now,
      updatedAt: now,
      blockedSince: agent.blockedSince,
      blockerReason: agent.blockerReason,
      blockedBy: agent.blockedBy,
    },
  );

  try {
    await insertAssignees(id, assigneeIds, now);
    await db.query(
      `INSERT INTO agent_updates (id, agent_id, update_date, status, progress, status_description, source, created_at, recorded_by, submission_id)
       VALUES (:updateId, :agentId, CURRENT_DATE(), :status, :progress, :statusDescription, 'manual', CAST(:createdAt AS TIMESTAMP), :recordedBy, NULL)`,
      {
        updateId: crypto.randomUUID(),
        agentId: id,
        status: data.status,
        progress: data.progress,
        statusDescription: data.statusDescription ?? null,
        createdAt: now,
        recordedBy: actor?.id ?? null,
      },
    );
  } catch (err) {
    await db.query('DELETE FROM agent_assignees WHERE agent_id = :id', { id }).catch(() => {});
    await db.query('DELETE FROM agents WHERE id = :id', { id }).catch(() => {});
    throw err;
  }

  const [created] = await attachAssignees([agent]);
  await audit.record([
    {
      action: 'agent_created',
      actor,
      agentId: id,
      agentName: agent.name,
      details: {
        status: agent.currentStatus,
        progress: agent.currentProgress,
        eta: agent.eta,
        marketplaceDeployment: agent.marketplaceDeployment,
        assignees: created.assignees.map((assignee) => assignee.name),
        ...(blocked ? { blocker: { reason: agent.blockerReason, blockedBy: agent.blockedBy } } : {}),
      },
    },
  ]);
  return created;
}

// An agent's details as the audit log compares them: eta as 'YYYY-MM-DD' and
// assignees as names, so before/after line up however the driver renders types.
async function detailsSnapshot(id) {
  const row = await db.queryOne(
    `SELECT name, description, CAST(eta AS STRING) as eta, COALESCE(marketplace_deployment, false) as marketplaceDeployment
     FROM agents WHERE id = :id`,
    { id },
  );
  if (!row) return undefined;
  const byAgent = await loadAssignees([id]);
  return { ...row, assignees: (byAgent.get(id) || []).map((assignee) => assignee.name) };
}

async function updateAgentMetadata(id, data, actor) {
  // Checked up front so an unknown id can't leave orphan assignee rows, and so
  // an invalid assignee rejects the request before anything is written.
  const before = await detailsSnapshot(id);
  if (!before) return undefined;

  const assigneeIds = data.assigneeIds === undefined ? undefined : [...new Set(data.assigneeIds)];
  if (assigneeIds) await assertTeamMembersExist(assigneeIds);
  if (data.eta !== undefined) {
    rules.requireEtaReason({ fromEta: before.eta, toEta: data.eta, reason: data.etaChangeReason });
  }

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
  if (data.marketplaceDeployment !== undefined) {
    sets.push('marketplace_deployment = CAST(:marketplaceDeployment AS BOOLEAN)');
    params.marketplaceDeployment = data.marketplaceDeployment;
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

  const after = await detailsSnapshot(id);
  const changes = audit.diff(before, after, ['name', 'description', 'eta', 'marketplaceDeployment']);
  const added = after.assignees.filter((name) => !before.assignees.includes(name));
  const removed = before.assignees.filter((name) => !after.assignees.includes(name));
  if (added.length || removed.length) changes.assignees = { added, removed };

  const etaReason = changes.eta && data.etaChangeReason?.trim() ? data.etaChangeReason.trim() : undefined;
  if (changes.eta) {
    await rules.recordEtaChanges([
      { agentId: id, fromEta: before.eta, toEta: after.eta, reason: etaReason, changedBy: actor, source: 'edit' },
    ]);
  }
  if (Object.keys(changes).length) {
    await audit.record([
      { action: 'agent_edited', actor, agentId: id, agentName: after.name, details: { changes, ...(etaReason ? { etaReason } : {}) } },
    ]);
  }
  return getAgentById(id);
}

async function deleteAgent(id, actor) {
  const existing = await getAgentById(id);
  if (!existing) return false;
  // The agent_id foreign keys are NOT ENFORCED in Databricks, so nothing
  // cascades on its own — clear the child rows first, or a deleted agent's
  // usage logs would keep counting toward the portfolio cost rollups.
  // Sequential for the same Delta write-conflict reason as reorderAgents.
  for (const table of ['update_submissions', 'agent_updates', 'eta_changes', 'agent_assignees', 'api_usage_logs', 'finops_alerts', 'finops_thresholds']) {
    // eslint-disable-next-line no-await-in-loop
    await db.query(`DELETE FROM ${table} WHERE agent_id = :id`, { id });
  }
  await db.query('DELETE FROM agents WHERE id = :id', { id });
  // The agent's audit events are deliberately kept — the log outlives the agent.
  await audit.record([{ action: 'agent_deleted', actor, agentId: id, agentName: existing.name }]);
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

module.exports = { listAgents, isAssigned, getAgentById, createAgent, updateAgentMetadata, deleteAgent, reorderAgents, AGENT_SELECT };
