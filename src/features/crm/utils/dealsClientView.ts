import { useState, useMemo, useCallback, useRef } from 'react';
import type { ImportedFunnelDeal } from '@/types/crm';
import type { SelectOption } from '@/components/ui/Select';
import { useUrlSyncedState } from '@/hooks/useUrlSyncedState';
import { fetchCrmList } from '@/services/crm/crmListService';
import type { DealsViewMode } from '../components/DealsViewToggle';

export const KANBAN_PAGE_SIZE = 100;

export interface UseKanbanExtraPagesParams {
  currentQueryKey: string;
  serverSearchTerm: string | undefined;
  serverStageFilter: string | undefined;
  sortField: string;
  sortOrder: string;
  firstPageCount: number;
  isPlaceholderData: boolean;
}

export function useKanbanExtraPages({
  currentQueryKey,
  serverSearchTerm,
  serverStageFilter,
  sortField,
  sortOrder,
  firstPageCount,
  isPlaceholderData,
}: UseKanbanExtraPagesParams) {
  const [extraDealsState, setExtraDealsState] = useState<{
    queryKey: string;
    items: ImportedFunnelDeal[];
  }>({ queryKey: '', items: [] });
  const [loadMoreErrorState, setLoadMoreErrorState] = useState<{
    queryKey: string;
    error: boolean;
  }>({ queryKey: '', error: false });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const activeLoadMoreQueryRef = useRef<string>('');

  const extraDeals = useMemo(
    () => (extraDealsState.queryKey === currentQueryKey ? extraDealsState.items : []),
    [extraDealsState, currentQueryKey],
  );
  const loadMoreFailed =
    loadMoreErrorState.queryKey === currentQueryKey && loadMoreErrorState.error;

  const reloadLoadedExtraPages = useCallback(async () => {
    const loadedCount =
      extraDealsState.queryKey === currentQueryKey ? extraDealsState.items.length : 0;
    if (loadedCount === 0) return;
    const pages = Math.ceil(loadedCount / KANBAN_PAGE_SIZE);
    try {
      const collected: ImportedFunnelDeal[] = [];
      for (let p = 2; p <= pages + 1; p += 1) {
        const res = await fetchCrmList<ImportedFunnelDeal>({
          resource: 'deals',
          q: serverSearchTerm,
          filters: serverStageFilter ? { stage: serverStageFilter } : undefined,
          sortBy: sortField,
          sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
          page: p,
          pageSize: KANBAN_PAGE_SIZE,
        });
        collected.push(...res.items);
      }
      setExtraDealsState({
        queryKey: currentQueryKey,
        items: appendUniqueDeals([], collected),
      });
    } catch {
      setExtraDealsState({ queryKey: currentQueryKey, items: [] });
    }
  }, [currentQueryKey, extraDealsState, serverSearchTerm, serverStageFilter, sortField, sortOrder]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || isPlaceholderData) return;
    const requestKey = currentQueryKey;
    activeLoadMoreQueryRef.current = requestKey;
    setIsLoadingMore(true);
    try {
      const currentCount =
        firstPageCount +
        (extraDealsState.queryKey === requestKey ? extraDealsState.items.length : 0);
      const nextPage = Math.floor(currentCount / KANBAN_PAGE_SIZE) + 1;
      const res = await fetchCrmList<ImportedFunnelDeal>({
        resource: 'deals',
        q: serverSearchTerm,
        filters: serverStageFilter ? { stage: serverStageFilter } : undefined,
        sortBy: sortField,
        sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
        page: nextPage,
        pageSize: KANBAN_PAGE_SIZE,
      });
      if (activeLoadMoreQueryRef.current === requestKey) {
        setExtraDealsState((prev) => ({
          queryKey: requestKey,
          items:
            prev.queryKey === requestKey ? appendUniqueDeals(prev.items, res.items) : res.items,
        }));
      }
    } catch {
      if (activeLoadMoreQueryRef.current === requestKey) {
        setLoadMoreErrorState({ queryKey: requestKey, error: true });
      }
    } finally {
      if (activeLoadMoreQueryRef.current === requestKey) {
        setIsLoadingMore(false);
      }
    }
  }, [
    currentQueryKey,
    firstPageCount,
    extraDealsState,
    isLoadingMore,
    isPlaceholderData,
    serverSearchTerm,
    serverStageFilter,
    sortField,
    sortOrder,
  ]);

  const handleRetryLoadMore = useCallback(() => {
    setLoadMoreErrorState({ queryKey: currentQueryKey, error: false });
    void handleLoadMore();
  }, [currentQueryKey, handleLoadMore]);

  return {
    extraDeals,
    isLoadingMore,
    loadMoreFailed,
    reloadLoadedExtraPages,
    handleLoadMore,
    handleRetryLoadMore,
  };
}

/** Führt Seite 1 und nachgeladene Seiten dedupliziert nach ID zusammen. */
export function mergeUniqueDeals(
  firstPage: ImportedFunnelDeal[],
  extra: ImportedFunnelDeal[],
): ImportedFunnelDeal[] {
  if (extra.length === 0) return firstPage;
  const seen = new Set<string>();
  const merged: ImportedFunnelDeal[] = [];
  for (const item of firstPage) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  for (const item of extra) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}

/** Hängt eingehende Deals an vorhandene an, ohne IDs zu duplizieren. */
export function appendUniqueDeals(
  existing: ImportedFunnelDeal[],
  incoming: ImportedFunnelDeal[],
): ImportedFunnelDeal[] {
  if (existing.length === 0) return incoming;
  const existingIds = new Set(existing.map((d) => d.id));
  const fresh = incoming.filter((d) => !existingIds.has(d.id));
  return [...existing, ...fresh];
}

export function formatResultCountText(isError: boolean, hasData: boolean, total: number): string {
  if (isError) return 'Ergebnis nicht verfügbar';
  if (!hasData) return 'Ergebnis wird geladen …';
  return `${total} ${total === 1 ? 'Deal' : 'Deals'} gefunden`;
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
