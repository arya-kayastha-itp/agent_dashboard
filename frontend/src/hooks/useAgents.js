import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAgent, deleteAgent, getAgents, reorderAgents, updateAgent } from '../api/agents.api';

export function useAgents() {
  return useQuery({ queryKey: ['agents'], queryFn: getAgents });
}

// The Teams page lists which agents each member is on, so anything that
// changes an agent's assignees has to refresh that roster too.
export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAgent,
    onSuccess: () => {
      ['agents', 'teamMembers', 'audit'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateAgent(id, payload),
    // agentHistory covers the target date history, which an edit can extend.
    onSuccess: () => {
      ['agents', 'teamMembers', 'audit', 'agentHistory'].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAgent,
    // Removing an agent also removes its history, usage and alerts, so every
    // cache derived from them is stale, not just the agent list.
    onSuccess: (data, id) => {
      queryClient.removeQueries({ queryKey: ['agentHistory', id] });
      queryClient.removeQueries({ queryKey: ['agentInsights', id] });
      ['agents', 'teamMembers', 'updates', 'alerts', 'thresholds', 'usageSummary', 'usageLogs', 'portfolioInsights', 'agentsInsightsSummary', 'audit'].forEach(
        (key) => queryClient.invalidateQueries({ queryKey: [key] }),
      );
    },
  });
}

// Drag-and-drop reordering needs the new order to show immediately, so this
// writes it into the cache optimistically (unlike the other mutations here)
// and rolls back on failure instead of waiting for a refetch.
export function useReorderAgents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reorderAgents,
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ['agents'] });
      const previous = queryClient.getQueryData(['agents']);
      if (previous) {
        const orderById = new Map(ids.map((id, index) => [id, index]));
        queryClient.setQueryData(
          ['agents'],
          previous.map((agent) => (orderById.has(agent.id) ? { ...agent, sortOrder: orderById.get(agent.id) } : agent))
        );
      }
      return { previous };
    },
    onError: (err, ids, context) => {
      if (context?.previous) queryClient.setQueryData(['agents'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });
}
