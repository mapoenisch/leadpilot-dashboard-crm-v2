/**
 * useLeadQualifications.ts
 * Auftrag 139: TanStack-Query-Hooks für `lead_qualifications`.
 * `useQualifiedContactIds` liefert die IDs aller Kontakte mit gesetztem
 * `qualified_at` — Datenquelle für Leads-Liste und Funnel.
 */
import { useQuery } from '@tanstack/react-query';
import {
  fetchLeadQualification,
  fetchQualifiedContactIds,
  leadQualificationKey,
  LEAD_QUALIFICATIONS_KEY,
} from '../services/leadQualificationService';

export function useLeadQualification(contactId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: leadQualificationKey(contactId ?? ''),
    queryFn: () => fetchLeadQualification(contactId ?? ''),
    enabled: enabled && Boolean(contactId),
  });
}

const toIdSet = (ids: string[]) => new Set(ids);

export function useQualifiedContactIds(enabled = true) {
  return useQuery({
    queryKey: LEAD_QUALIFICATIONS_KEY,
    queryFn: fetchQualifiedContactIds,
    enabled,
    select: toIdSet,
  });
}
