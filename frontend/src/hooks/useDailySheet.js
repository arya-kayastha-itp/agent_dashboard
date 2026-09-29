import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAllUpdatesHistory, getTodayUpdates, submitDailyUpdates } from '../api/updates.api';

export function useTodayUpdates() {
  return useQuery({ queryKey: ['updates', 'today'], queryFn: getTodayUpdates });
}

export function useAllUpdatesHistory() {
  return useQuery({ queryKey: ['updates', 'history'], queryFn: getAllUpdatesHistory });
}

export function useSubmitDailyUpdates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitDailyUpdates,
    onSuccess: (data) => {
      // The sheet redirects to the dashboard as soon as this resolves, so put
      // the saved values straight into the agents cache — otherwise the
      // dashboard would flash the old statuses until the refetch lands.
      const savedById = new Map((data?.updatedAgents || []).map((agent) => [agent.id, agent]));
      // Merged, not replaced: the saved rows carry status fields only, so
      // replacing would drop each agent's assignees until the refetch lands.
      queryClient.setQueryData(['agents'], (previous) =>
        previous?.map((agent) => (savedById.has(agent.id) ? { ...agent, ...savedById.get(agent.id) } : agent)),
      );
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['updates'] });
    },
  });
}
