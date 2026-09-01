import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createAgent, deleteAgent, getAgents, updateAgent } from '../api/agents.api';

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
