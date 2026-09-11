import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CRMRepository } from '@/services/db/crmRepository';
import { crmKeys } from '@/services/query/queryKeys';
import type { SeedResult } from '@/services/import/crmSeeder';

// Gate G36 (Auftrag 051, Block E): Optimistic-Update-Musterfall für
// `seedDatabase` — bewusst auf Metadaten-Ebene (Sync-Status), nicht
// Entity-Ebene: die granularen CRM-Schreibpfade sind absichtlich
// deaktiviert (B22/BUILD_PLAN D1) und dürfen nicht reaktiviert werden.
export type CrmSyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface SeedMutationContext {
  previousStatus: CrmSyncStatus | undefined;
}

export function useCrmSyncStatus() {
  return useQuery({
    queryKey: crmKeys.syncStatus(),
    queryFn: async (): Promise<CrmSyncStatus> => 'idle',
    staleTime: Infinity,
  });
}

export function useSeedDatabaseMutation() {
  const queryClient = useQueryClient();
  return useMutation<SeedResult, Error, void, SeedMutationContext>({
    mutationFn: () => CRMRepository.seedDatabase(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: crmKeys.syncStatus() });
      const previousStatus = queryClient.getQueryData<CrmSyncStatus>(crmKeys.syncStatus());
      queryClient.setQueryData<CrmSyncStatus>(crmKeys.syncStatus(), 'syncing');
      return { previousStatus };
    },
    onError: (_err, _variables, context) => {
      queryClient.setQueryData<CrmSyncStatus>(
        crmKeys.syncStatus(),
        context?.previousStatus ?? 'idle',
      );
    },
    onSuccess: () => {
      queryClient.setQueryData<CrmSyncStatus>(crmKeys.syncStatus(), 'success');
    },
    onSettled: () => {
      // Ersetzt den bisherigen manuellen loadDataFromRepository()-Re-Fetch.
      // Status wird hier bewusst NICHT angefasst (würde den onError-Rollback
      // mit 'idle'/'success' überschreiben).
      void queryClient.invalidateQueries({ queryKey: crmKeys.companies() });
      void queryClient.invalidateQueries({ queryKey: crmKeys.contacts() });
      void queryClient.invalidateQueries({ queryKey: crmKeys.deals() });
      void queryClient.invalidateQueries({ queryKey: crmKeys.auditSummary() });
    },
  });
}
