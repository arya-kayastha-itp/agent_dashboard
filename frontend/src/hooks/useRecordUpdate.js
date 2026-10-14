import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitUpdate } from '../api/updates.api';

export function useRecordUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitUpdate,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agentHistory', variables.agentId] });
      queryClient.invalidateQueries({ queryKey: ['updates'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}
