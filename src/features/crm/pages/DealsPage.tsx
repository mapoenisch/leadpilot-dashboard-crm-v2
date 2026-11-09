// G60 (Auftrag 067N, Step 4) / Auftrag 129 / 138: URL-synchrone serverseitige
// Deals-Ansicht mit Pagination, Export und Kanban-Board. Phasenwechsel laufen
// über die RPC `move_deal_stage`; der Browser speichert keinen Fachzustand mehr.
import { useState, useMemo, useCallback, useRef, useId } from 'react';
import { Download, AlertCircle } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ManagementChartState } from '@/components/ui/charts/ManagementChartState';
import { ImportedFunnelDeal } from '@/types/crm';
import { useOrganization } from '@/auth/organizationContext';
import { useCrmListQuery } from '@/hooks/queries/useCrmListQuery';
import { CrmServiceError } from '@/services/crm/crmExportService';
import { DataSourceStatus } from '@/components/data/DataSourceStatus';
import { useCrmProvenance } from '../hooks/useCrmProvenance';
import { useMoveDealStage } from '../hooks/useMoveDealStage';
import { MOVE_DEAL_STAGE_ERROR_MESSAGES } from '../services/dealStageService';
import { DealsTableCard } from '../components/DealsTableCard';
import { DealsViewToggle } from '../components/DealsViewToggle';
import { DealsKanbanBoard } from '../components/DealsKanbanBoard';
import { DealsKpiGrid } from '../components/DealsKpiGrid';
import { DealsFilterBar, BASE_STAGE_OPTIONS } from '../components/DealsFilterBar';
import { exportCrmDealsCsv } from '../utils/crmCsvHelper';
import {
  buildStageOptions,
  useDealsUrlState,
  mergeUniqueDeals,
  formatResultCountText,
  useKanbanExtraPages,
  KANBAN_PAGE_SIZE,
} from '../utils/dealsClientView';
import { normalizeCanonicalStageLabel } from '../utils/crmStageHelper';

interface MoveNotice {
  kind: 'success' | 'error';
  text: string;
}

export function DealsPage() {
  const { session } = useOrganization();
  const isViewer = session?.role === 'viewer';
  const { provenance, isLoading: isProvLoading } = useCrmProvenance('deals');

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

  const pageSize = viewMode === 'kanban' ? KANBAN_PAGE_SIZE : tablePageSize;
  const serverSearchTerm = searchTerm.trim() || undefined;
  const serverStageFilter = stageFilter !== 'ALL' ? stageFilter : undefined;
  const [moveNotice, setMoveNotice] = useState<MoveNotice | null>(null);
  const moveInFlightRef = useRef(false);

  const currentQueryKey = useMemo(
    () => `${serverSearchTerm ?? ''}|${serverStageFilter ?? 'ALL'}|${sortField}|${sortOrder}`,
    [serverSearchTerm, serverStageFilter, sortField, sortOrder],
  );

  // Serverseitige TanStack-Query
  const { data, isLoading, isError, isPlaceholderData, error, refetch } =
    useCrmListQuery<ImportedFunnelDeal>({
      resource: 'deals',
      q: serverSearchTerm,
      filters: serverStageFilter ? { stage: serverStageFilter } : undefined,
      sortBy: sortField,
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
      page: viewMode === 'kanban' ? 1 : page,
      pageSize,
    });

  const {
    extraDeals,
    isLoadingMore,
    loadMoreFailed,
    reloadLoadedExtraPages,
    handleLoadMore,
    handleRetryLoadMore,
  } = useKanbanExtraPages({
    currentQueryKey,
    serverSearchTerm,
    serverStageFilter,
    sortField,
    sortOrder,
    isPlaceholderData,
  });

  const rawDeals = useMemo(
    () =>
      viewMode === 'kanban' ? mergeUniqueDeals(data?.items ?? [], extraDeals) : (data?.items ?? []),
    [viewMode, data?.items, extraDeals],
  );

  // Nur Anzeige-Normalisierung; Filter, Suche, Sortierung und Paginierung sind serverseitig.
  const deals = useMemo(
    () =>
      rawDeals.map((d) => {
        const stage = normalizeCanonicalStageLabel(d.stage);
        return stage !== d.stage ? { ...d, stage } : d;
      }),
    [rawDeals],
  );

  const serverTotal = data?.total ?? 0;
  const hasMoreOnServer = rawDeals.length < serverTotal;

  const {
    mutate: mutateDealStage,
    isPending: isMovingStage,
    variables: moveVariables,
  } = useMoveDealStage(session?.organizationId);
  const lockedDealId = isMovingStage ? moveVariables?.dealId : undefined;

  const handleDealStageChange = useCallback(
    (dealId: string, newStage: string) => {
      const deal = rawDeals.find((d) => d.id === dealId);
      if (!deal || isViewer || moveInFlightRef.current) return;
      // Konfliktprüfung gegen den gespeicherten Rohwert, nicht gegen das Label.
      const expectedStage = deal.stageRaw ?? deal.stage;
      if (normalizeCanonicalStageLabel(expectedStage) === newStage) return;

      moveInFlightRef.current = true;

      setMoveNotice(null);
      mutateDealStage(
        { dealId, expectedStage, newStage },
        {
          onSuccess: () => {
            setMoveNotice({
              kind: 'success',
              text: `${deal.dealName} nach ${newStage} verschoben.`,
            });
          },
          onError: (err) => {
            setMoveNotice({
              kind: 'error',
              text: MOVE_DEAL_STAGE_ERROR_MESSAGES[err.code],
            });
          },
          onSettled: async () => {
            try {
              // Hinweis 1: Erst Seite 1 aktualisieren, danach Extra-Seiten nachladen, um Seitengrenzen-Rennen zu verhindern
              await refetch();
              await reloadLoadedExtraPages();
            } finally {
              moveInFlightRef.current = false;
            }
          },
        },
      );
    },
    [rawDeals, isViewer, mutateDealStage, refetch, reloadLoadedExtraPages],
  );

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      await exportCrmDealsCsv({
        searchTerm: serverSearchTerm,
        stageFilter: serverStageFilter,
        sortField,
        sortOrder,
      });
    } catch (err) {
      setExportError(err instanceof CrmServiceError ? err.message : 'Fehler beim CSV-Export.');
    } finally {
      setIsExporting(false);
    }
  };

  const hasData = data !== undefined && !isPlaceholderData;
  const countText = isError ? 'Nicht verfügbar' : hasData ? String(serverTotal) : '…';
  const exportBlocked = isError || !hasData;
  const exportHintId = useId();

  const stageOptions = useMemo(() => buildStageOptions(BASE_STAGE_OPTIONS, deals), [deals]);
  const canMoveDeals = !isViewer && !isMovingStage && Boolean(session?.organizationId);

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
              {isError
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

      {moveNotice?.kind === 'error' && (
        <div
          role="alert"
          className="flex items-center gap-[var(--space-2)] p-[var(--space-3)] rounded-md bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] text-error text-[13px]"
        >
          <AlertCircle size={16} />
          <span>{moveNotice.text}</span>
        </div>
      )}
      <div
        aria-live="polite"
        role="status"
        data-testid="deal-stage-announcement"
        className="sr-only"
      >
        {moveNotice?.kind === 'success' ? moveNotice.text : ''}
      </div>

      {/* 2. KPI Cards */}
      <DealsKpiGrid
        countText={countText}
        hasData={hasData}
        isError={isError}
        page={page}
        pageSize={pageSize}
        total={serverTotal}
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
        resultCountText={formatResultCountText(isError, hasData, serverTotal)}
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
      ) : viewMode === 'kanban' && loadMoreFailed ? (
        <ManagementChartState
          type="error"
          message="Fehler beim Nachladen der weiteren Deal-Seiten."
          sourceLabel="CRM-Daten"
          height={220}
          onRetry={handleRetryLoadMore}
        />
      ) : viewMode === 'kanban' ? (
        <DealsKanbanBoard
          deals={deals}
          totalDeals={serverTotal}
          onDealStageChange={handleDealStageChange}
          onLoadMore={handleLoadMore}
          hasMore={!isPlaceholderData && hasMoreOnServer}
          isLoadingMore={isLoadingMore}
          canMoveDeals={canMoveDeals}
          lockedDealId={lockedDealId}
        />
      ) : (
        <DealsTableCard
          deals={deals}
          page={page}
          pageSize={tablePageSize}
          total={serverTotal}
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
