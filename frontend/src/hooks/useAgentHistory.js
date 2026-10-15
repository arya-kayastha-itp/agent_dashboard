import { useQuery } from '@tanstack/react-query';
import { getAgentHistory, getEtaHistory } from '../api/agents.api';

export function useAgentHistory(agentId) {
  return useQuery({
    queryKey: ['agentHistory', agentId],
    queryFn: () => getAgentHistory(agentId),
    enabled: Boolean(agentId),
  });
}

// Under the 'agentHistory' key too, so everything that refreshes an agent's
// history (updates, approvals, edits) refreshes this as well.
export function useEtaHistory(agentId) {
  return useQuery({
    queryKey: ['agentHistory', agentId, 'eta'],
    queryFn: () => getEtaHistory(agentId),
    enabled: Boolean(agentId),
  });
}
