// Auftrag 129: Client-seitige Auswertung (Suche, Phasenfilter, Phasensortierung) auf wirksamen Phasen
import type { ImportedFunnelDeal } from '@/types/crm';
import type { SelectOption } from '@/components/ui/Select';
import { dealMatchesSearch } from './crmCsvHelper';

export interface ClientViewOptions {
  active: boolean;
  searchTerm: string;
  stageFilter: string;
  sortField: string;
  sortOrder: string;
}

/** Wendet Suche, Phasenfilter und Phasensortierung auf bereits geladene Deals an (nur wenn aktiv). */
export function applyClientDealView(
  deals: ImportedFunnelDeal[],
  { active, searchTerm, stageFilter, sortField, sortOrder }: ClientViewOptions,
): ImportedFunnelDeal[] {
  if (!active) return deals;
  let list = deals;
  if (searchTerm.trim()) list = list.filter((d) => dealMatchesSearch(d, searchTerm));
  if (stageFilter !== 'ALL') list = list.filter((d) => d.stage === stageFilter);
  if (sortField === 'stage') {
    list = [...list].sort((a, b) => {
      const cmp = a.stage.localeCompare(b.stage, 'de');
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }
  return list;
}

/** Ergänzt die Basis-Phasenoptionen um zusätzliche (importierte) Phasen aus den Deals. */
export function buildStageOptions(
  base: SelectOption[],
  deals: ImportedFunnelDeal[],
): SelectOption[] {
  const known = new Set(base.map((o) => o.value));
  const extra: SelectOption[] = [];
  for (const d of deals) {
    if (d.stage && !known.has(d.stage)) {
      known.add(d.stage);
      extra.push({ value: d.stage, label: d.stage });
    }
  }
  return [...base, ...extra];
}
