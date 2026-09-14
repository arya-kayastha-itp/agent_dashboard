import { HEALTH_LEVELS } from './healthLevel';

// "Needs an update" cutoff for the Dashboard rollup. Deliberately looser than
// the Daily Sheet's same-day carriedOver check, so the banner doesn't nag
// every day while the sheet still flags anything not touched today.
const STALE_DAYS_THRESHOLD = 2;

export function computeAgentHealth(agent, now = new Date()) {
  if (agent.currentStatus === 'Blocked') {
    return { level: HEALTH_LEVELS.AT_RISK, reason: 'Blocked — may need your help to move forward' };
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

const SEVERITY_RANK = {
  [HEALTH_LEVELS.AT_RISK]: 0,
  [HEALTH_LEVELS.ATTENTION]: 1,
  [HEALTH_LEVELS.HEALTHY]: 2,
  [HEALTH_LEVELS.NEUTRAL]: 3,
};

// Worst-first ordering for the Agent Manager's action queue — blocked/stale
// projects surface above ones that don't need anyone's attention today.
export function sortBySeverity(agents, now = new Date()) {
  return [...agents].sort((a, b) => SEVERITY_RANK[computeAgentHealth(a, now).level] - SEVERITY_RANK[computeAgentHealth(b, now).level]);
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
