import { useQuery } from '@tanstack/react-query';
import { dataSourceRegistry } from '@/services/data';
import { DEMO_ORGANIZATION_ID, loadCrmReadModel } from '@/services/data/crmReadModelService';
import { useOrganization } from '@/auth/organizationContext';
import type { CrmReadModelEnvelope } from '@/types/dataSource';
import type { Company, Contact, ImportedFunnelDeal, ImportAuditSummary } from '@/types/crm';
import { crmKeys } from '@/services/query/queryKeys';

// Gate G47 (Auftrag 067D, Nacharbeit zum Review): Jede CRM-Query lädt genau
// einen quellenkonsistenten Envelope aus genau einer Quelle (Design §6).
// Leer ist `empty`, Fehler ist `unavailable` — kein stiller Demo-Fallback,
// kein Split in Einzel-Reads mit getActive-Notlösung. Die Slice-Hooks teilen
// sich dieselbe Envelope-Query (gleicher Key → ein Fetch) und selektieren nur
// ihre Entität.
//
// Fail-closed (Review-Befund 1): Es gibt KEINE Demo-Defaults mehr. Die
// Organisation stammt aus dem tatsächlichen Sitzungskontext
// (`useOrganization`, G45) oder aus einer expliziten Übergabe; fehlt beides,
// schlägt die Query mit INVALID_ORG fehl statt Demo-Daten zu wählen. Die
// Demo-Freigabe (`allowSynthetic`) stammt aus expliziter Übergabe oder aus dem
// tatsächlichen Kontext (Sitzungs-Mitgliedschaft im Demo-Mandanten — das ist
// die bewusste Demo-Auswahl). Ein explizites `false` gewinnt immer. Für reale
// oder fehlende Auswahl ist das Ergebnis fail-closed `unavailable`.

export interface CrmEnvelopeScope {
  organizationId?: string;
  sourceId?: string;
  allowSynthetic?: boolean;
}

function activeSourceId(): string {
  try {
    return dataSourceRegistry.getActive().info.id;
  } catch {
    return 'unknown';
  }
}

export function useCrmReadModelEnvelope(scope: CrmEnvelopeScope = {}) {
  const { session, isLoading: isOrgLoading } = useOrganization();
  const contextOrgId = session?.organizationId ?? null;
  const explicitOrgId = scope.organizationId;
  const organizationId = explicitOrgId ?? contextOrgId;
  const resolvedSourceId = scope.sourceId ?? activeSourceId();
  const allowSynthetic =
    scope.allowSynthetic === true ||
    (scope.allowSynthetic !== false &&
      explicitOrgId === undefined &&
      contextOrgId === DEMO_ORGANIZATION_ID);
  return useQuery({
    queryKey: [...crmKeys.all, 'envelope', organizationId, resolvedSourceId, allowSynthetic],
    enabled: !isOrgLoading,
    queryFn: async (): Promise<CrmReadModelEnvelope> => {
      if (!organizationId) {
        throw new Error('INVALID_ORG');
      }
      const envelope = await loadCrmReadModel(organizationId, resolvedSourceId, {
        allowSynthetic,
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
