import { useQuery } from '@tanstack/react-query';
import { fetchCrmList, CrmResource, CrmPageResult } from '@/services/crm/crmListService';
import { crmKeys } from '@/services/query/queryKeys';

export const CRM_QUERY_MAX_PAGE_SIZE = 100;

/**
 * Lädt alle Datensätze einer CRM-Ressource über aufeinanderfolgende Seiten,
 * da das Backend (crm-query-export) maximal 100 Datensätze pro Abfrage erlaubt.
 */
export async function fetchAllCrmEntities<T>(
  resource: CrmResource,
  pageSize: number = CRM_QUERY_MAX_PAGE_SIZE,
): Promise<T[]> {
  const safePageSize = Math.min(Math.max(1, pageSize), CRM_QUERY_MAX_PAGE_SIZE);

  const firstPage = await fetchCrmList<T>({
    resource,
    page: 1,
    pageSize: safePageSize,
  });

  const total = typeof firstPage.total === 'number' ? firstPage.total : firstPage.items.length;
  const allItems: T[] = [...firstPage.items];

  if (total <= safePageSize || allItems.length >= total) {
    return allItems;
  }

  const totalPages = Math.ceil(total / safePageSize);
  const remainingPromises: Promise<CrmPageResult<T>>[] = [];

  for (let page = 2; page <= totalPages; page++) {
    remainingPromises.push(
      fetchCrmList<T>({
        resource,
        page,
        pageSize: safePageSize,
      }),
    );
  }

  const remainingResults = await Promise.all(remainingPromises);
  for (const pageResult of remainingResults) {
    if (Array.isArray(pageResult.items)) {
      allItems.push(...pageResult.items);
    }
  }

  return allItems;
}

/**
 * Gibt den Query-Key für Funnel-CRM-Listen zurück, angebunden an crmKeys.listsOf(resource),
 * damit Mutationen wie convertLeadToDeal die Abfragen automatisch invalidieren.
 */
export function getFunnelAllCrmQueryKey(resource: CrmResource, orgId?: string) {
  return crmKeys.list(resource, { scope: 'all', orgId: orgId ?? 'default' });
}

/**
 * TanStack Query Hook zum vollständigen Laden aller CRM-Entities einer Ressource.
 */
export function useAllCrmEntitiesQuery<T>(
  resource: CrmResource,
  orgId?: string,
  options?: { enabled?: boolean },
) {
  return useQuery<T[]>({
    queryKey: getFunnelAllCrmQueryKey(resource, orgId),
    queryFn: () => fetchAllCrmEntities<T>(resource),
    placeholderData: (previousData) => previousData,
    enabled: options?.enabled,
  });
}
