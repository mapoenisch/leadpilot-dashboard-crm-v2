/**
 * useMoveDealStage.ts
 * Auftrag 138: TanStack-Mutation für den serverseitigen Phasenwechsel.
 * Optimistisches Update der Deal-Listen, Rücksprung bei Fehler, danach
 * Invalidierung der Listen und der Pipeline-Übersicht.
 */
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { crmKeys } from '@/services/query/queryKeys';
import type { CrmPageResult } from '@/services/crm/crmListService';
import type { ImportedFunnelDeal } from '@/types/crm';
import {
  moveDealStage,
  MoveDealStageError,
  type MoveDealStageInput,
  type MoveDealStageResult,
} from '../services/dealStageService';

type DealsCache = CrmPageResult<ImportedFunnelDeal> | ImportedFunnelDeal[];

interface DealsListSnapshot {
  key: QueryKey;
  data: DealsCache | undefined;
}

interface MoveDealStageContext {
  previous: DealsListSnapshot[];
}

export function useMoveDealStage(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    MoveDealStageResult,
    MoveDealStageError,
    MoveDealStageInput,
    MoveDealStageContext
  >({
    mutationFn: (input) => {
      if (!organizationId) {
        return Promise.reject(new MoveDealStageError('network'));
      }
      return moveDealStage(input);
    },

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: crmKeys.listsOf('deals') });

      const previous = queryClient
        .getQueriesData<DealsCache>({
          queryKey: crmKeys.listsOf('deals'),
        })
        .map(([key, data]) => ({ key, data }));

      queryClient.setQueriesData<DealsCache>({ queryKey: crmKeys.listsOf('deals') }, (old) => {
        if (!old) return old;
        const update = (deal: ImportedFunnelDeal) =>
          deal.id === input.dealId
            ? {
                ...deal,
                stage: input.newStage,
                stageRaw: input.newStage,
                stageEnteredAt: new Date().toISOString(),
              }
            : deal;
        return Array.isArray(old) ? old.map(update) : { ...old, items: old.items.map(update) };
      });

      return { previous };
    },

    onError: (_error, _input, context) => {
      for (const entry of context?.previous ?? []) {
        queryClient.setQueryData(entry.key, entry.data);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: crmKeys.listsOf('deals') });
      void queryClient.invalidateQueries({ queryKey: crmKeys.pipelineOverview() });
    },
  });
}
