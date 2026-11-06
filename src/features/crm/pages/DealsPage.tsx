// G60 (Auftrag 067N, Step 4) / Auftrag 129: URL-synchrone serverseitige Deals-Ansicht mit Pagination, Export und Kanban-Board
import { useState, useMemo, useCallback, useEffect, useRef, useId } from 'react';
import { Download, AlertCircle } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ManagementChartState } from '@/components/ui/charts/ManagementChartState';
import { ImportedFunnelDeal } from '@/types/crm';
import { useOrganization } from '@/auth/organizationContext';
import { useCrmListQuery } from '@/hooks/queries/useCrmListQuery';
import { CrmServiceError } from '@/services/crm/crmExportService';
import { fetchCrmList } from '@/services/crm/crmListService';
import { DataSourceStatus } from '@/components/data/DataSourceStatus';
import { useCrmProvenance } from '../hooks/useCrmProvenance';
import { DealsTableCard } from '../components/DealsTableCard';
import { DealsViewToggle } from '../components/DealsViewToggle';
import { DealsKanbanBoard } from '../components/DealsKanbanBoard';
import { DealsKpiGrid } from '../components/DealsKpiGrid';
import { DealsFilterBar, BASE_STAGE_OPTIONS } from '../components/DealsFilterBar';
import { exportCrmDealsCsv } from '../utils/crmCsvHelper';
import {
  applyClientDealView,
  buildStageOptions,
  buildDealsQueryKey,
  sliceTableDeals,
  useDealsUrlState,
} from '../utils/dealsClientView';
import {
  getDealStageOverridesStorageKey,
  normalizeCanonicalStageLabel,
  useDealStageOverrides,
} from '../utils/crmStageHelper';

export function DealsPage() {
  const { session } = useOrganization();
  const isViewer = session?.role === 'viewer';
  const { provenance, isLoading: isProvLoading } = useCrmProvenance('deals');

  const storageKey = getDealStageOverridesStorageKey(session?.organizationId, session?.userId);

  const {
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
    handleSortChange,
    handleOrderChange,
    handleSearchChange,
    handleStageChange,
  } = useDealsUrlState();

  const {
    stageOverrides,
    hasStageOverrides,
    serverStageFilter,
    serverSearchTerm,
    clientPagingActive,
    handleDealStageChange,
  } = useDealStageOverrides(storageKey, stageFilter, sortField, searchTerm);

  const pageSize = viewMode === 'kanban' || clientPagingActive ? 100 : tablePageSize;

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

  const currentQueryKey = useMemo(
    () =>
      buildDealsQueryKey({
        searchTerm,
        serverSearchTerm,
        stageFilter,
        serverStageFilter,
        sortField,
        sortOrder,
      }),
    [searchTerm, serverSearchTerm, stageFilter, serverStageFilter, sortField, sortOrder],
  );

  // Synchron an den aktuellen Query-Key gebunden: Sofort leer und fehlerfrei bei Filter-/Suchwechsel
  const extraDeals = useMemo(
    () => (extraDealsState.queryKey === currentQueryKey ? extraDealsState.items : []),
    [extraDealsState, currentQueryKey],
  );
  const loadMoreFailed =
    loadMoreErrorState.queryKey === currentQueryKey && loadMoreErrorState.error;

  // Serverseitige TanStack-Query
  const { data, isLoading, isError, isPlaceholderData, error, refetch } =
    useCrmListQuery<ImportedFunnelDeal>({
      resource: 'deals',
      q: serverSearchTerm,
      filters: serverStageFilter ? { stage: serverStageFilter } : undefined,
      sortBy: sortField,
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
      page: viewMode === 'kanban' || clientPagingActive ? 1 : page,
      pageSize,
    });

  const rawDeals = useMemo(
    () =>
      viewMode === 'kanban' || clientPagingActive
        ? [...(data?.items ?? []), ...extraDeals]
        : (data?.items ?? []),
    [viewMode, clientPagingActive, data?.items, extraDeals],
  );

  // Serverseitige Gesamtzahl und bereits geladene Zeilen (vor der Client-Auswertung)
  const serverTotal = data?.total ?? 0;
  const hasMoreOnServer = rawDeals.length < serverTotal;
  // Client-Filter, -Suche und -Sortierung brauchen die vollständige Datenbasis
  const needsFullBase = clientPagingActive && hasMoreOnServer;
  const isFullBaseError = needsFullBase && loadMoreFailed;

  const mappedDeals = useMemo(() => {
    return rawDeals.map((d) => {
      const override = stageOverrides[d.id];
      const stage = override ?? normalizeCanonicalStageLabel(d.stage);
      return stage !== d.stage ? { ...d, stage } : d;
    });
  }, [rawDeals, stageOverrides]);

  const deals = useMemo(
    () =>
      applyClientDealView(mappedDeals, {
        active: hasStageOverrides,
        searchTerm,
        stageFilter,
        sortField,
        sortOrder,
      }),
    [mappedDeals, hasStageOverrides, searchTerm, stageFilter, sortField, sortOrder],
  );

  const isClientFiltered =
    hasStageOverrides && (stageFilter !== 'ALL' || Boolean(searchTerm.trim()));
  const total = isClientFiltered ? deals.length : serverTotal;

  const tableDeals = useMemo(
    () => sliceTableDeals(deals, clientPagingActive, viewMode, page, tablePageSize),
    [clientPagingActive, viewMode, page, tablePageSize, deals],
  );

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || isPlaceholderData) return;
    const requestKey = currentQueryKey;
    activeLoadMoreQueryRef.current = requestKey;
    setIsLoadingMore(true);
    try {
      const currentCount =
        (data?.items?.length ?? 0) +
        (extraDealsState.queryKey === requestKey ? extraDealsState.items.length : 0);
      const nextPage = Math.floor(currentCount / 100) + 1;
      const res = await fetchCrmList<ImportedFunnelDeal>({
        resource: 'deals',
        q: serverSearchTerm,
        filters: serverStageFilter ? { stage: serverStageFilter } : undefined,
        sortBy: sortField,
        sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
        page: nextPage,
        pageSize: 100,
      });
      if (activeLoadMoreQueryRef.current === requestKey) {
        setExtraDealsState((prev) => ({
          queryKey: requestKey,
          items: prev.queryKey === requestKey ? [...prev.items, ...res.items] : res.items,
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
    data?.items?.length,
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

  // Bei lokalen Phasenwechseln mit Filter/Suche/Phasensortierung alle Serverseiten nachladen,
  // damit die Client-Auswertung auf der vollständigen Datenbasis läuft.
  useEffect(() => {
    if (
      needsFullBase &&
      !loadMoreFailed &&
      !isLoadingMore &&
      !isPlaceholderData &&
      data !== undefined
    ) {
      void handleLoadMore();
    }
  }, [needsFullBase, loadMoreFailed, isLoadingMore, isPlaceholderData, data, handleLoadMore]);

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      await exportCrmDealsCsv({
        serverSearchTerm,
        serverStageFilter,
        sortField,
        sortOrder,
        stageOverrides,
        stageFilter,
        searchTerm,
      });
    } catch (err) {
      setExportError(err instanceof CrmServiceError ? err.message : 'Fehler beim CSV-Export.');
    } finally {
      setIsExporting(false);
    }
  };

  const hasData = data !== undefined && !isPlaceholderData && !needsFullBase;
  const countText = isError || isFullBaseError ? 'Nicht verfügbar' : hasData ? String(total) : '…';
  const exportBlocked = isError || isFullBaseError || !hasData;
  const exportHintId = useId();

  const stageOptions = useMemo(
    () => buildStageOptions(BASE_STAGE_OPTIONS, mappedDeals),
    [mappedDeals],
  );

  return (
    <div className="flex flex-col gap-[var(--space-6)] max-w-full min-w-0">
      {/* 1. Page Header mit Ansichtsumschalter */}
      <div className="flex items-start justify-between flex-wrap gap-[var(--space-3)]">
        <SectionHeader
          eyebrow="CRM & Pipeline"
          title="Deal Pipeline"
          description="Mandantenspezifische Übersicht der Pipeline-Deals mit interaktiver Kanban-Pipeline, Tabellenansicht und CSV-Export."
        />
        <div className="flex gap-[var(--space-2)] items-center flex-wrap">
          <DealsViewToggle viewMode={viewMode} onChange={setViewModeRaw} />
          <Badge variant="cyan">CRM-Daten</Badge>
          <DataSourceStatus variant="compact" provenance={provenance} isLoading={isProvLoading} />
          <Badge variant="neutral">{countText} Funnel Deals</Badge>
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Download size={14} />}
            onClick={handleExport}
            disabled={isViewer || isExporting || exportBlocked}
            title={
              isViewer
                ? 'Viewer besitzen keine Exportberechtigung'
                : 'Gefilterte Deals als CSV exportieren'
            }
            aria-label="CSV Export"
            aria-describedby={exportBlocked && !isViewer ? exportHintId : undefined}
          >
            {isExporting ? 'Exportiere...' : 'CSV Export'}
          </Button>
          {exportBlocked && !isViewer && (
            <span id={exportHintId} className="text-[12px] text-[var(--color-text-muted)]">
              {isError || isFullBaseError
                ? 'Export gesperrt: Datenbasis nicht verfügbar'
                : 'Export nach dem Laden verfügbar'}
            </span>
          )}
        </div>
      </div>

      {exportError && (
        <div
          role="alert"
          className="flex items-center gap-[var(--space-2)] p-[var(--space-3)] rounded-md bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-error text-[13px]"
        >
          <AlertCircle size={16} />
          <span>{exportError}</span>
        </div>
      )}

      {/* 2. KPI Cards */}
      <DealsKpiGrid
        countText={countText}
        hasData={hasData}
        isError={isError}
        page={page}
        pageSize={pageSize}
        total={total}
        stageFilter={stageFilter}
        stageCount={stageOptions.length - 1}
      />

      {/* 3. Filter & Search Bar */}
      <DealsFilterBar
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        stageFilter={stageFilter}
        stageOptions={stageOptions}
        onStageChange={handleStageChange}
        sortField={sortField}
        onSortChange={handleSortChange}
        sortOrder={sortOrder}
        onOrderChange={handleOrderChange}
        resultCountText={
          isError || isFullBaseError
            ? 'Ergebnis nicht verfügbar'
            : !hasData
              ? 'Ergebnis wird geladen …'
              : `${total} ${total === 1 ? 'Deal' : 'Deals'} gefunden`
        }
      />

      {/* 4. Table OR Kanban Board */}
      {isLoading && deals.length === 0 ? (
        <ManagementChartState
          type="loading"
          message="Lade Deal-Pipeline aus CRM..."
          sourceLabel="CRM-Daten"
          height={220}
        />
      ) : isError ? (
        <ManagementChartState
          type="error"
          message={`Integritätsfehler: ${error instanceof Error ? error.message : 'Fehler beim Laden der CRM-Deals'}`}
          sourceLabel="CRM-Daten"
          height={220}
          onRetry={() => void refetch()}
        />
      ) : isFullBaseError ? (
        <ManagementChartState
          type="error"
          message="Fehler beim Nachladen der vollständigen Deal-Pipeline."
          sourceLabel="CRM-Daten"
          height={220}
          onRetry={handleRetryLoadMore}
        />
      ) : viewMode === 'kanban' ? (
        <DealsKanbanBoard
          deals={deals}
          totalDeals={total}
          onDealStageChange={handleDealStageChange}
          onLoadMore={handleLoadMore}
          hasMore={!isPlaceholderData && hasMoreOnServer && !needsFullBase}
          isLoadingMore={isLoadingMore}
        />
      ) : (
        <DealsTableCard
          deals={tableDeals}
          page={page}
          pageSize={tablePageSize}
          total={total}
          onPageChange={(newPage) => setPageStr(String(newPage))}
          onPageSizeChange={(newSize) => {
            setPageSizeStr(String(newSize));
            setPageStr('1');
          }}
        />
      )}
    </div>
  );
}
