// Auftrag 129: Client-seitige Auswertung (Suche, Phasenfilter, Phasensortierung) auf wirksamen Phasen
import type { ImportedFunnelDeal } from '@/types/crm';
import type { SelectOption } from '@/components/ui/Select';
import { dealMatchesSearch } from './crmCsvHelper';
import { useUrlSyncedState } from '@/hooks/useUrlSyncedState';
import type { DealsViewMode } from '../components/DealsViewToggle';

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

export function buildDealsQueryKey(params: {
  searchTerm: string;
  serverSearchTerm?: string;
  stageFilter: string;
  serverStageFilter?: string;
  sortField: string;
  sortOrder: string;
}): string {
  const { searchTerm, serverSearchTerm, stageFilter, serverStageFilter, sortField, sortOrder } =
    params;
  return `${searchTerm.trim()}|${serverSearchTerm ?? 'UNSEARCHED'}|${stageFilter}|${serverStageFilter ?? 'UNFILTERED'}|${sortField}|${sortOrder}`;
}

export function sliceTableDeals(
  deals: ImportedFunnelDeal[],
  active: boolean,
  viewMode: string,
  page: number,
  pageSize: number,
): ImportedFunnelDeal[] {
  if (active && viewMode === 'tabelle') {
    const start = (page - 1) * pageSize;
    return deals.slice(start, start + pageSize);
  }
  return deals;
}

export function useDealsUrlState() {
  const [viewModeRaw, setViewModeRaw] = useUrlSyncedState('ansicht', 'tabelle');
  const viewMode: DealsViewMode = viewModeRaw === 'kanban' ? 'kanban' : 'tabelle';
  const [searchTerm, setSearchTerm] = useUrlSyncedState('suche', '');
  const [stageFilter, setStageFilter] = useUrlSyncedState('stufe', 'ALL');
  const [pageStr, setPageStr] = useUrlSyncedState('seite', '1');
  const [pageSizeStr, setPageSizeStr] = useUrlSyncedState('proSeite', '20');
  const [sortField, setSortField] = useUrlSyncedState('sort', 'close_date');
  const [sortOrder, setSortOrder] = useUrlSyncedState('order', 'desc');

  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const tablePageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr, 10) || 20));

  const resetPageAnd = (fn: (v: string) => void) => (v: string) => {
    fn(v);
    setPageStr('1');
  };

  return {
    viewModeRaw,
    setViewModeRaw,
    viewMode,
    searchTerm,
    stageFilter,
    page,
    setPageStr,
    tablePageSize,
    setPageSizeStr,
    sortField,
    sortOrder,
    handleSortChange: resetPageAnd(setSortField),
    handleOrderChange: resetPageAnd(setSortOrder),
    handleSearchChange: resetPageAnd(setSearchTerm),
    handleStageChange: resetPageAnd(setStageFilter),
  };
}
