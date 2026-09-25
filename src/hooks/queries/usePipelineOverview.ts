import { useQuery } from '@tanstack/react-query';
import { getPipelineOverview } from '@/domain/executiveCockpitData';
import { useCrmReadModelEnvelope } from './useCrmQueries';
import { crmKeys } from '@/services/query/queryKeys';

// Gate G36 (Auftrag 051, Block D): Pipeline-Overview als useQuery.
// 067R / G64 (PR-SOURCE-04): Die Deals stammen aus demselben
// quellenkonsistenten CRM-Envelope wie alle übrigen CRM-Ansichten (G47) —
// nicht mehr aus dem Repository mit stillem Demo-Ersatz. `unavailable` bleibt
// ein Fehler, `empty` eine leere Pipeline.
export function usePipelineOverview() {
  const envelope = useCrmReadModelEnvelope();
  const overview = useQuery({
    queryKey: [...crmKeys.pipelineOverview(), envelope.data?.sourceId, envelope.data?.contentHash],
    enabled: envelope.data !== undefined,
    queryFn: () =>
      getPipelineOverview({ getImportedFunnelDeals: async () => envelope.data?.data.deals ?? [] }),
  });
  return {
    data: overview.data,
    isLoading: envelope.isPending || (envelope.data !== undefined && overview.isPending),
    isError: envelope.isError || overview.isError,
    error: envelope.error ?? overview.error,
  };
}
