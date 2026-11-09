// Auftrag 129 / 138: URL-synchroner Ansichtsstatus für die Deals-Seite.
// Filter, Suche, Sortierung und Paginierung laufen serverseitig; hier bleiben
// nur URL-State und die Phasenoptionen für den Filter.
import type { ImportedFunnelDeal } from '@/types/crm';
import type { SelectOption } from '@/components/ui/Select';
import { useUrlSyncedState } from '@/hooks/useUrlSyncedState';
import type { DealsViewMode } from '../components/DealsViewToggle';

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
