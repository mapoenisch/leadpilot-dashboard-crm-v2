import { useQuery } from '@tanstack/react-query';
import { CRMRepository } from '@/services/db/crmRepository';
import { getPipelineOverview } from '@/domain/executiveCockpitData';
import { crmKeys } from '@/services/query/queryKeys';

// Gate G36 (Auftrag 051, Block D): Pipeline-Overview als useQuery. Die
// QueryFn ruft den Domain-Helper mit CRMRepository als Source — dieselbe
// Kombination wie zuvor im useEffect.
export function usePipelineOverview() {
  return useQuery({
    queryKey: crmKeys.pipelineOverview(),
    queryFn: () => getPipelineOverview(CRMRepository),
  });
}
