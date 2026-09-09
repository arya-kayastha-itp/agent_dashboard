import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPricing, getPricing } from '../api/finops.api';

export function usePricing() {
  return useQuery({ queryKey: ['pricing'], queryFn: getPricing });
}

export function useCreatePricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPricing,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pricing'] }),
  });
}
