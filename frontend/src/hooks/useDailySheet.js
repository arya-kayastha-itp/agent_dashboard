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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['updates'] });
    },
  });
}
