import { useMutation, useQuery } from '@tanstack/react-query';
import { getAgentInsights, regenerateAgentNarrative } from '../api/agents.api';

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
