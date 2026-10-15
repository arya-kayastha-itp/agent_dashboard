import { HEALTH_LEVELS } from './healthLevel';

// "Needs an update" cutoff for the Dashboard rollup. Deliberately looser than
// the Daily Sheet's same-day carriedOver check, so the banner doesn't nag
// every day while the sheet still flags anything not touched today.
const STALE_DAYS_THRESHOLD = 2;
const DAY_MS = 1000 * 60 * 60 * 24;

// Whole days an agent has been Blocked (0 on the day it became blocked), or
// null when it isn't Blocked or the start wasn't recorded.
export function daysBlocked(agent, now = new Date()) {
  if (agent.currentStatus !== 'Blocked' || !agent.blockedSince) return null;
  return Math.max(0, Math.floor((now - new Date(agent.blockedSince)) / DAY_MS));
}

function blockedReason(agent, now) {
  const days = daysBlocked(agent, now);
  const howLong = days === null ? 'Blocked' : days === 0 ? 'Blocked since today' : `Blocked ${days} day${days === 1 ? '' : 's'}`;
  return agent.blockedBy ? `${howLong} — waiting on ${agent.blockedBy}` : `${howLong} — may need your help to move forward`;
}

export function computeAgentHealth(agent, now = new Date()) {
  if (agent.currentStatus === 'Blocked') {
    return { level: HEALTH_LEVELS.AT_RISK, reason: blockedReason(agent, now) };
  }

  if (agent.eta && agent.currentStatus !== 'Completed') {
    const eta = new Date(agent.eta);
    if (eta < now) {
      return { level: HEALTH_LEVELS.AT_RISK, reason: 'Past its target date' };
    }
  }

  if (agent.currentStatus === 'On Hold') {
    return { level: HEALTH_LEVELS.ATTENTION, reason: 'Paused for now' };
  }

  if (agent.currentStatus !== 'Completed') {
    if (!agent.lastUpdateAt) {
      return { level: HEALTH_LEVELS.ATTENTION, reason: 'No update recorded yet' };
    }
    const daysSinceUpdate = (now - new Date(agent.lastUpdateAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > STALE_DAYS_THRESHOLD) {
      return { level: HEALTH_LEVELS.ATTENTION, reason: `No update in ${Math.floor(daysSinceUpdate)} days` };
    }
  }

  if (agent.currentStatus === 'Completed') {
    return { level: HEALTH_LEVELS.HEALTHY, reason: 'Completed' };
  }

  if (agent.currentStatus === 'In Progress') {
    return { level: HEALTH_LEVELS.HEALTHY, reason: 'On track' };
  }

  return { level: HEALTH_LEVELS.NEUTRAL, reason: 'Not started' };
}

// The two-bucket split ("Needs attention today" vs "All caught up") that the
// Agent Manager's and Executive's list pages both render as section labels.
// This must be the only rank sortBySeverity enforces — anything finer (e.g.
// ranking AT_RISK above ATTENTION, or HEALTHY above NEUTRAL) would fight the
// manual sortOrder tie-break below, since a drag within one visual section
// would keep snapping back to health-level order instead of staying put.
export const FLAGGED_HEALTH_LEVELS = [HEALTH_LEVELS.AT_RISK, HEALTH_LEVELS.ATTENTION];

function bucketRank(level) {
  return FLAGGED_HEALTH_LEVELS.includes(level) ? 0 : 1;
}

// Worst-first ordering for the Agent Manager's action queue — flagged
// projects surface above ones that don't need anyone's attention today.
// Within a bucket, agents sort by their drag-and-drop sortOrder so manual
// reordering is free to place any agent anywhere within its section.
export function sortBySeverity(agents, now = new Date()) {
  return [...agents].sort((a, b) => {
    const rankDiff = bucketRank(computeAgentHealth(a, now).level) - bucketRank(computeAgentHealth(b, now).level);
    if (rankDiff !== 0) return rankDiff;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
}

export function summarizeAgents(agents, now = new Date()) {
  const summary = { total: agents.length, onTrack: 0, attention: 0, atRisk: 0, neutral: 0 };

  agents.forEach((agent) => {
    const { level } = computeAgentHealth(agent, now);
    if (level === HEALTH_LEVELS.HEALTHY) summary.onTrack += 1;
    else if (level === HEALTH_LEVELS.ATTENTION) summary.attention += 1;
    else if (level === HEALTH_LEVELS.AT_RISK) summary.atRisk += 1;
    else summary.neutral += 1;
  });

  return summary;
}
