const db = require('../db/databricksClient');
const env = require('../config/env');
const audit = require('./audit.service');
const mailer = require('./mailer.service');

const CHECK_EVERY_MS = 60 * 60 * 1000;
const FIRST_CHECK_AFTER_MS = 30 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function idList(ids, params) {
  return ids
    .map((id, i) => {
      params[`id${i}`] = id;
      return `:id${i}`;
    })
    .join(', ');
}

// Finds agents Blocked for at least the escalation threshold that haven't
// been escalated in this block yet, emails every active Agent Manager once
// about all of them, and logs it. blocker_escalated_at is claimed before
// emailing, so a second app instance (or the next run) never emails twice;
// it's cleared when the agent leaves Blocked, so a later block escalates anew.
async function escalateLongBlockers() {
  const days = env.escalation.blockerDays;
  const due = await db.query(
    `SELECT id, name, blocker_reason as blockerReason, blocked_by as blockedBy, blocked_since as blockedSince
     FROM agents
     WHERE current_status = 'Blocked' AND blocker_escalated_at IS NULL
       AND blocked_since <= current_timestamp() - INTERVAL ${days} DAYS`,
  );
  if (!due.length) return { escalated: [] };

  const now = new Date().toISOString();
  const claimParams = { now };
  const ids = idList(due.map((agent) => agent.id), claimParams);
  await db.query(
    `UPDATE agents SET blocker_escalated_at = CAST(:now AS TIMESTAMP) WHERE id IN (${ids}) AND blocker_escalated_at IS NULL`,
    claimParams,
  );
  const claimed = new Set(
    (await db.query(`SELECT id FROM agents WHERE id IN (${ids}) AND blocker_escalated_at = CAST(:now AS TIMESTAMP)`, claimParams)).map(
      (row) => row.id,
    ),
  );
  const agents = due
    .filter((agent) => claimed.has(agent.id))
    .map((agent) => ({ ...agent, daysBlocked: Math.floor((Date.now() - new Date(agent.blockedSince)) / DAY_MS) }));
  if (!agents.length) return { escalated: [] };

  const managers = await db.query(
    `SELECT u.email, m.name FROM users u JOIN team_members m ON m.id = u.team_member_id
     WHERE u.role = 'AGENT_MANAGER' AND u.status = 'active'`,
  );
  const emailedTo = [];
  for (const manager of managers) {
    // eslint-disable-next-line no-await-in-loop
    if (await mailer.sendBlockerEscalationEmail({ to: manager.email, name: manager.name, agents, days })) emailedTo.push(manager.name);
  }

  await audit.record(
    agents.map((agent) => ({
      action: 'blocker_escalated',
      actor: null,
      agentId: agent.id,
      agentName: agent.name,
      details: {
        daysBlocked: agent.daysBlocked,
        thresholdDays: days,
        blockedSince: new Date(agent.blockedSince).toISOString(),
        blocker: { reason: agent.blockerReason ?? null, blockedBy: agent.blockedBy ?? null },
        notified: managers.map((manager) => manager.name),
        emailed: emailedTo,
      },
    })),
  );
  console.log(`[escalation] ${agents.length} agent(s) blocked ${days}+ days escalated: ${agents.map((a) => a.name).join(', ')}`);
  return { escalated: agents };
}

// Hourly while the app runs (a first pass shortly after start). Single
// replica today; the claim above keeps it safe if that ever changes.
function startEscalationChecks() {
  const run = () =>
    escalateLongBlockers().catch((err) => {
      console.error(`[escalation] check failed: ${err.message}`);
    });
  setTimeout(run, FIRST_CHECK_AFTER_MS).unref();
  setInterval(run, CHECK_EVERY_MS).unref();
}

module.exports = { escalateLongBlockers, startEscalationChecks };
