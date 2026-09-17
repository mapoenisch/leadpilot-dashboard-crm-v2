import { useQuery } from '@tanstack/react-query';
import { dataSourceRegistry } from '@/services/data';
import { DEMO_ORGANIZATION_ID, loadCrmReadModel } from '@/services/data/crmReadModelService';
import type { CrmReadModelEnvelope } from '@/types/dataSource';
import type { Company, Contact, ImportedFunnelDeal, ImportAuditSummary } from '@/types/crm';
import { crmKeys } from '@/services/query/queryKeys';

// Gate G47 (Auftrag 067D): Jede CRM-Query lädt genau einen quellenkonsistenten
// Envelope aus genau einer Quelle (Design §6). Leer ist `empty`, Fehler ist
// `unavailable` — kein stiller Demo-Fallback, kein Split in Einzel-Reads mit
// getActive-Notlösung. Die Slice-Hooks teilen sich dieselbe Envelope-Query
// (gleicher Key → ein Fetch) und selektieren nur ihre Entität.

function activeSourceId(): string {
  try {
    return dataSourceRegistry.getActive().info.id;
  } catch {
    return 'unknown';
  }
}

export function useCrmReadModelEnvelope(
  organizationId: string = DEMO_ORGANIZATION_ID,
  sourceId?: string,
) {
  const resolvedSourceId = sourceId ?? activeSourceId();
  return useQuery({
    // Bewusste Demo-Auswahl: Demo-Mandant + synthetische Quellen sind hier
    // ausdrücklich gewollt (Design §6). Echte Mandanten verdrahtet 067M/067O.
    queryKey: [...crmKeys.all, 'envelope', organizationId, resolvedSourceId],
    queryFn: async (): Promise<CrmReadModelEnvelope> => {
      const envelope = await loadCrmReadModel(organizationId, resolvedSourceId, {
        allowSynthetic: true,
      });
      if (envelope.status === 'unavailable') {
        throw new Error(envelope.errorCode ?? 'DATA_SOURCE_UNAVAILABLE');
      }
      return envelope;
    },
  });
}

function useEnvelopeSlice<T>(select: (envelope: CrmReadModelEnvelope) => T) {
  const query = useCrmReadModelEnvelope();
  return { ...query, data: query.data === undefined ? undefined : select(query.data) };
}

export function useCrmCompanies() {
  return useEnvelopeSlice<Company[]>((envelope) => envelope.data.companies);
}

export function useCrmContacts() {
  return useEnvelopeSlice<Contact[]>((envelope) => envelope.data.contacts);
}

export function useCrmDeals() {
  return useEnvelopeSlice<ImportedFunnelDeal[]>((envelope) => envelope.data.deals);
}

export function useCrmAuditSummary() {
  return useEnvelopeSlice<ImportAuditSummary>((envelope) => envelope.data.audit);
}
