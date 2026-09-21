import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { deriveCrmProvenanceState, type ProvenanceState } from '@/services/data/sourceFreshness';

export function getCrmSubViewQueryKeyPrefix(activeTarget: string): readonly unknown[] {
  switch (activeTarget) {
    case 'companies':
    case 's-companies':
      return ['crm', 'list', 'companies'];
    case 'deals':
    case 'funnel_deals':
    case 's-deals':
      return ['crm', 'list', 'deals'];
    case 'activities':
    case 'envelope':
    case 's-activities':
      return ['crm', 'envelope'];
    case 's-crm':
    case 'crm':
    case 'all':
      return ['crm'];
    case 'contacts':
    case 's-leads':
    default:
      return ['crm', 'list', 'contacts'];
  }
}

export interface CrmProvenanceResult {
  provenance: ProvenanceState;
  isLoading: boolean;
}

/**
 * Gate G61 / Auftrag 067O (Nacharbeit 2):
 * Reaktiver Hook für CRM-Quellenprovenienz & Datenfrische.
 * Abonniert den TanStack QueryCache und reagiert deterministisch auf:
 * 1. Initiales Laden (kein verfrühter statischer "Live"-Zustand)
 * 2. Query-Fehler (sofortiges Umschalten auf "unavailable" mit sanitized Code)
 * 3. Erfolgreiche Datenabrufe & spätere dataUpdatedAt-Updates
 */
export function useCrmProvenance(activeSubView: string = 's-leads'): CrmProvenanceResult {
  const queryClient = useQueryClient();

  const deriveCurrentState = React.useCallback((): CrmProvenanceResult => {
    const queryCache = queryClient.getQueryCache();
    const prefix = getCrmSubViewQueryKeyPrefix(activeSubView);

    // Spezifische Abfrage für aktive Unterseite / Ressource suchen
    const queries = queryCache.findAll({ queryKey: prefix });

    const hasCompletedData = queries.some((q) => q.state.dataUpdatedAt > 0);
    const errorQuery = queries.find((q) => q.state.status === 'error');
    const isPending =
      queries.length === 0 ||
      (queries.every((q) => q.state.status === 'pending') && !hasCompletedData);

    if (errorQuery) {
      return {
        provenance: deriveCrmProvenanceState('unavailable', errorQuery.state.error),
        isLoading: false,
      };
    }

    if (isPending) {
      return {
        provenance: deriveCrmProvenanceState('healthy', undefined, 0),
        isLoading: true,
      };
    }

    const latestUpdatedAt = Math.max(0, ...queries.map((q) => q.state.dataUpdatedAt));
    return {
      provenance: deriveCrmProvenanceState('healthy', undefined, latestUpdatedAt),
      isLoading: false,
    };
  }, [queryClient, activeSubView]);

  const [state, setState] = React.useState<CrmProvenanceResult>(deriveCurrentState);

  React.useEffect(() => {
    // Bei Wechsel der aktiven Unterseite sofort neu auswerten
    setState(deriveCurrentState());

    // Reaktive TanStack Query Cache Subscription
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query?.queryKey?.[0] === 'crm') {
        setState(deriveCurrentState());
      }
    });

    return unsubscribe;
  }, [queryClient, deriveCurrentState]);

  return state;
}
