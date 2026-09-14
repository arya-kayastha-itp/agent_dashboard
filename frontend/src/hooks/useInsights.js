import { useMutation, useQuery } from '@tanstack/react-query';
import { getAgentInsights, regenerateAgentNarrative } from '../api/agents.api';
import { getAgentsInsightsSummary, getPortfolioInsights, regeneratePortfolioNarrative } from '../api/insights.api';

export function useAgentInsights(agentId) {
  return useQuery({
    queryKey: ['agentInsights', agentId],
    queryFn: () => getAgentInsights(agentId),
    enabled: Boolean(agentId),
  });
}

// AI narrative is intentionally ephemeral — held in the component that calls
// this, not cached in React Query — so a re-render never silently replays a
// stale (and billed) AI response.
export function useRegenerateNarrative(agentId) {
  return useMutation({ mutationFn: () => regenerateAgentNarrative(agentId) });
}

export function usePortfolioInsights() {
  return useQuery({ queryKey: ['portfolioInsights'], queryFn: () => getPortfolioInsights() });
}

export function useRegeneratePortfolioNarrative() {
  return useMutation({ mutationFn: () => regeneratePortfolioNarrative() });
}

// Per-agent monthly totals for the Dashboard's agent cards — one request for
// every agent instead of mounting an insights fetch per card.
export function useAgentsInsightsSummary() {
  return useQuery({ queryKey: ['agentsInsightsSummary'], queryFn: () => getAgentsInsightsSummary() });
}
