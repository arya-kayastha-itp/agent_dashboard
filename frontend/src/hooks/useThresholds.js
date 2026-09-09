import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getThresholds, upsertThreshold } from '../api/finops.api';

export function useThresholds() {
  return useQuery({ queryKey: ['thresholds'], queryFn: getThresholds });
}

export function useUpsertThreshold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upsertThreshold,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['thresholds'] }),
  });
}
