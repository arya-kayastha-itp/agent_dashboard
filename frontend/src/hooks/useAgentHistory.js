import { useQuery } from '@tanstack/react-query';
import { getAgentHistory } from '../api/agents.api';

export function useAgentHistory(agentId) {
  return useQuery({
    queryKey: ['agentHistory', agentId],
    queryFn: () => getAgentHistory(agentId),
    enabled: Boolean(agentId),
  });
}
