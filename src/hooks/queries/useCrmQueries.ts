import { useQuery } from '@tanstack/react-query';
import { CRMRepository } from '@/services/db/crmRepository';
import { crmKeys } from '@/services/query/queryKeys';

// Gate G36 (Auftrag 051): TanStack-Query-Hooks für die CRM-Reads. Dünne
// Hüllen um CRMRepository (unverändert) — Caching/Retry/Dedup übernimmt
// der QueryClient. Muster analog useLiveKpi* (hooks → services ist
// zonen-konform).
export function useCrmCompanies() {
  return useQuery({
    queryKey: crmKeys.companies(),
    queryFn: () => CRMRepository.getCompanies(),
  });
}

export function useCrmContacts() {
  return useQuery({
    queryKey: crmKeys.contacts(),
    queryFn: () => CRMRepository.getContacts(),
  });
}

export function useCrmDeals() {
  return useQuery({
    queryKey: crmKeys.deals(),
    queryFn: () => CRMRepository.getImportedFunnelDeals(),
  });
}

export function useCrmAuditSummary() {
  return useQuery({
    queryKey: crmKeys.auditSummary(),
    queryFn: () => CRMRepository.getAuditSummary(),
  });
}
