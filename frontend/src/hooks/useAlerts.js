import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAlerts, updateAlertStatus } from '../api/finops.api';

export function useAlerts({ status } = {}, options = {}) {
  return useQuery({ queryKey: ['alerts', status], queryFn: () => getAlerts({ status }), ...options });
}

// Powers the AppBar alert bell — polling is the only push channel this app has (see ARCHITECTURE.md).
export function useOpenAlertsCount() {
  return useAlerts({ status: 'open' }, { refetchInterval: 30000 });
}

export function useUpdateAlertStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => updateAlertStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });
}
