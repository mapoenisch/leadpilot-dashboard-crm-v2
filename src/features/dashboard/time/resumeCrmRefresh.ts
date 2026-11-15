// Auftrag 159 (P10a): gezieltes Neuladen nach „Fortsetzen“.
// Nur die eigenen CRM-Übersichten dieser Organisation und dieses Nutzers werden invalidiert;
// fremde Cache-Schlüssel bleiben unberührt. Aktive Abfragen laden dadurch genau einmal neu.
import type { QueryClient } from '@tanstack/react-query';

export function invalidateCrmOverviewQueries(
  queryClient: QueryClient,
  organizationId: string,
  userId: string,
): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return (
        key[0] === 'dashboard' &&
        key[1] === organizationId &&
        key[2] === 'crm' &&
        key[3] === 'crmOverview' &&
        key[4] === userId
      );
    },
  });
}
