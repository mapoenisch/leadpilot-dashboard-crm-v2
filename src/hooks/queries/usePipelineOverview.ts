import { useQuery } from '@tanstack/react-query';
import { CRMRepository } from '@/services/db/crmRepository';
import { getPipelineOverview } from '@/domain/executiveCockpitData';
import { crmKeys } from '@/services/query/queryKeys';
import { isSupabaseConfigured } from '@/services/db/supabaseClient';
import { fetchCrmPipelineOverview } from '@/features/dashboard/data/crmAggregateSource';

// Gate G36 (Auftrag 051, Block D) & Auftrag 156 (§2.3 Nr. 6):
// Wenn Supabase aktiv ist, nutzt usePipelineOverview die serverseitige Vollbestands-RPC
// dashboard_crm_pipeline_overview; andernfalls transparenter Fallback auf getPipelineOverview(CRMRepository).
export function usePipelineOverview() {
  return useQuery({
    queryKey: crmKeys.pipelineOverview(),
    queryFn: () =>
      isSupabaseConfigured ? fetchCrmPipelineOverview() : getPipelineOverview(CRMRepository),
  });
}
