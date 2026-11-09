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
  isPlaceholderData: boolean;
  /** true, solange ein Phasenwechsel samt Nachladen läuft; sperrt weitere Seitenabrufe. */
  suspendLoadMore?: boolean;
}

export function useKanbanExtraPages({
  currentQueryKey,
  serverSearchTerm,
  serverStageFilter,
  sortField,
  sortOrder,
  isPlaceholderData,
  suspendLoadMore = false,
}: UseKanbanExtraPagesParams) {
  const [extraDealsState, setExtraDealsState] = useState<{
    queryKey: string;
    items: ImportedFunnelDeal[];
    // Nächste abzurufende Seite. Wird unabhängig von der deduplizierten
    // Kartenanzahl hochgezählt, damit Seitenüberschneidungen den Fortschritt
    // nicht zurücksetzen (Codex-Review PR #159).
    nextPage: number;
  }>({ queryKey: '', items: [], nextPage: 2 });
  // Ref-Spiegel des States: Callbacks (z. B. reloadLoadedExtraPages im
  // onSettled einer Mutation) lesen so immer den aktuellen Seitenstand,
  // auch wenn ihre Closure älter ist (Codex-Review PR #159).
  const extraDealsRef = useRef(extraDealsState);
  const commitExtraDeals = useCallback((next: typeof extraDealsState) => {
    extraDealsRef.current = next;
    setExtraDealsState(next);
  }, []);
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
    const fetchPage = (p: number) =>
      fetchCrmList<ImportedFunnelDeal>({
        resource: 'deals',
        q: serverSearchTerm,
        filters: serverStageFilter ? { stage: serverStageFilter } : undefined,
        sortBy: sortField,
        sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
        page: p,
        pageSize: KANBAN_PAGE_SIZE,
      });
    try {
      const collected: ImportedFunnelDeal[] = [];
      // Seitenobergrenze dynamisch am aktuellen Ref-Stand ausrichten: Lädt
      // parallel „Weitere Deals nachladen" eine weitere Seite, wird auch sie
      // mitaktualisiert, statt am Ende überschrieben zu werden.
      for (let p = 2; ; p += 1) {
        const state = extraDealsRef.current;
        if (state.queryKey !== currentQueryKey || state.items.length === 0) return;
        if (p > state.nextPage - 1) break;
        const res = await fetchPage(p);
        collected.push(...res.items);
      }
      const latest = extraDealsRef.current;
      commitExtraDeals({
        queryKey: currentQueryKey,
        items: appendUniqueDeals([], collected),
        nextPage: latest.queryKey === currentQueryKey ? latest.nextPage : 2,
      });
    } catch {
      commitExtraDeals({ queryKey: currentQueryKey, items: [], nextPage: 2 });
    }
  }, [
    commitExtraDeals,
    currentQueryKey,
    serverSearchTerm,
    serverStageFilter,
    sortField,
    sortOrder,
  ]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || isPlaceholderData || suspendLoadMore) return;
    const requestKey = currentQueryKey;
    const stateMatches = extraDealsRef.current.queryKey === requestKey;
    const nextPage = stateMatches ? extraDealsRef.current.nextPage : 2;
    activeLoadMoreQueryRef.current = requestKey;
    setIsLoadingMore(true);
    try {
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
        const prev = extraDealsRef.current;
        const base =
          prev.queryKey === requestKey ? prev : { queryKey: requestKey, items: [], nextPage: 2 };
        commitExtraDeals({
          queryKey: requestKey,
          items: appendUniqueDeals(base.items, res.items),
          nextPage: nextPage + 1,
        });
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
    commitExtraDeals,
    currentQueryKey,
    isLoadingMore,
    isPlaceholderData,
    serverSearchTerm,
    serverStageFilter,
    sortField,
    sortOrder,
    suspendLoadMore,
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
