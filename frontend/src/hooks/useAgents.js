import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAgent, deleteAgent, getAgents, reorderAgents, updateAgent } from '../api/agents.api';

export function useAgents() {
  return useQuery({ queryKey: ['agents'], queryFn: getAgents });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAgent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateAgent(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
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
