import { useQuery } from '@tanstack/react-query';
import { getUsageLogs, getUsageSummary } from '../api/finops.api';

export function useUsageSummary(params = {}) {
  return useQuery({ queryKey: ['usageSummary', params], queryFn: () => getUsageSummary(params) });
}

export function useUsageLogs(params = {}) {
  return useQuery({ queryKey: ['usageLogs', params], queryFn: () => getUsageLogs(params) });
}
