import { useInfiniteQuery } from '@tanstack/react-query';
import { getAuditEvents } from '../api/audit.api';

// Pages of audit events, newest first; fetchNextPage() loads older ones.
export function useAuditEvents({ agentId, personId, limit } = {}) {
  return useInfiniteQuery({
    queryKey: ['audit', { agentId, personId, limit }],
    queryFn: ({ pageParam }) => getAuditEvents({ agentId, personId, limit, cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
