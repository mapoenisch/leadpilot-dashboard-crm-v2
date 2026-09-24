// G60 (Auftrag 067N, Step 3): TanStack Query Hook für serverseitige CRM-Listen
import { useQuery } from '@tanstack/react-query';
import { crmKeys } from '@/services/query/queryKeys';
import { fetchCrmList, CrmListQueryParams, CrmPageResult } from '@/services/crm/crmListService';

export function useCrmListQuery<T>(params: CrmListQueryParams, options?: { enabled?: boolean }) {
  return useQuery<CrmPageResult<T>>({
    queryKey: crmKeys.list(params.resource, params),
    queryFn: () => fetchCrmList<T>(params),
    placeholderData: (previousData) => previousData,
    enabled: options?.enabled,
  });
}
