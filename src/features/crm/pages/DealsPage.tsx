// G60 (Auftrag 067N, Step 4) / Auftrag 129: URL-synchrone serverseitige Deals-Ansicht mit Pagination, Export und Kanban-Board
import { useState, useMemo, useCallback, useEffect, useRef, useId } from 'react';
import { Download, AlertCircle } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SelectOption } from '@/components/ui/Select';
import { ManagementChartState } from '@/components/ui/charts/ManagementChartState';
import { ImportedFunnelDeal } from '@/types/crm';
import { useUrlSyncedState } from '@/hooks/useUrlSyncedState';
import { useOrganization } from '@/auth/organizationContext';
import { useCrmListQuery } from '@/hooks/queries/useCrmListQuery';
import { fetchCrmExportBlob, CrmServiceError } from '@/services/crm/crmExportService';
import { fetchCrmList } from '@/services/crm/crmListService';
import { DataSourceStatus } from '@/components/data/DataSourceStatus';
import { useCrmProvenance } from '../hooks/useCrmProvenance';
import { DealsTableCard } from '../components/DealsTableCard';
import { DealsViewToggle, DealsViewMode } from '../components/DealsViewToggle';
import { DealsKanbanBoard } from '../components/DealsKanbanBoard';
import { DealsKpiGrid } from '../components/DealsKpiGrid';
import { DealsFilterBar, BASE_STAGE_OPTIONS } from '../components/DealsFilterBar';
import { applyStageOverridesToCsv, readBlobAsText } from '../utils/crmCsvHelper';

export function DealsPage() {
  const { session } = useOrganization();
  const isViewer = session?.role === 'viewer';
  const { provenance, isLoading: isProvLoading } = useCrmProvenance('deals');

  // URL-synchroner Zustand
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

  // Phasenwechsel über Ansichtswechsel hinaus erhalten (Session-Storage)
  const [stageOverrides, setStageOverrides] = useState<Record<string, string>>(() => {
    try {
      const s = sessionStorage.getItem('leadpilot_crm_deal_stage_overrides');
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  });

  const hasStageOverrides = Object.keys(stageOverrides).length > 0;
  // Wenn lokale Phasenwechsel aktiv sind, ungefiltert vom Server laden,
  // damit verschobene Deals bei Phasenfiltern nicht serverseitig verloren gehen.
  const serverStageFilter = hasStageOverrides
    ? undefined
    : stageFilter !== 'ALL'
      ? stageFilter
      : undefined;

  const clientPagingActive = hasStageOverrides && (stageFilter !== 'ALL' || sortField === 'stage');

  const pageSize = viewMode === 'kanban' || clientPagingActive ? 100 : tablePageSize;

  const handleDealStageChange = useCallback((dealId: string, newStage: string) => {
    setStageOverrides((prev) => {
      const next = { ...prev, [dealId]: newStage };
      try {
        sessionStorage.setItem('leadpilot_crm_deal_stage_overrides', JSON.stringify(next));
      } catch {
        // Ignoriere Fehler, falls SessionStorage im Browser deaktiviert ist
      }
      return next;
    });
  }, []);

  const [extraDeals, setExtraDeals] = useState<ImportedFunnelDeal[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const activeLoadMoreQueryRef = useRef<string>('');

  const currentQueryKey = useMemo(
    () =>
      `${searchTerm.trim()}|${stageFilter}|${serverStageFilter ?? 'UNFILTERED'}|${sortField}|${sortOrder}`,
    [searchTerm, stageFilter, serverStageFilter, sortField, sortOrder],
  );

  useEffect(() => {
    setExtraDeals([]);
    activeLoadMoreQueryRef.current = '';
    setIsLoadingMore(false);
  }, [currentQueryKey]);

  const handleSortChange = (val: string) => {
    setSortField(val);
    setPageStr('1');
  };

  const handleOrderChange = (val: string) => {
    setSortOrder(val);
    setPageStr('1');
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setPageStr('1');
  };

  const handleStageChange = (val: string) => {
    setStageFilter(val);
    setPageStr('1');
  };

  // Serverseitige TanStack-Query
  const { data, isLoading, isError, isPlaceholderData, error, refetch } =
    useCrmListQuery<ImportedFunnelDeal>({
      resource: 'deals',
      q: searchTerm.trim() || undefined,
      filters: serverStageFilter ? { stage: serverStageFilter } : undefined,
      sortBy: sortField,
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
      page: viewMode === 'kanban' || clientPagingActive ? 1 : page,
      pageSize,
    });

  const rawDeals = useMemo(
    () => (viewMode === 'kanban' ? [...(data?.items ?? []), ...extraDeals] : (data?.items ?? [])),
    [viewMode, data?.items, extraDeals],
  );

  const mappedDeals = useMemo(() => {
    if (!hasStageOverrides) return rawDeals;
    return rawDeals.map((d) => (stageOverrides[d.id] ? { ...d, stage: stageOverrides[d.id]! } : d));
  }, [rawDeals, stageOverrides, hasStageOverrides]);

  const deals = useMemo(() => {
    let list = mappedDeals;
    if (hasStageOverrides && stageFilter !== 'ALL') {
      list = list.filter((d) => d.stage === stageFilter);
    }
    if (hasStageOverrides && sortField === 'stage') {
      list = [...list].sort((a, b) => {
        const cmp = a.stage.localeCompare(b.stage, 'de');
        return sortOrder === 'desc' ? -cmp : cmp;
      });
    }
    return list;
  }, [mappedDeals, stageFilter, hasStageOverrides, sortField, sortOrder]);

  const total = hasStageOverrides && stageFilter !== 'ALL' ? deals.length : (data?.total ?? 0);

  const tableDeals = useMemo(() => {
    if (clientPagingActive && viewMode === 'tabelle') {
      const start = (page - 1) * tablePageSize;
      return deals.slice(start, start + tablePageSize);
    }
    return deals;
  }, [clientPagingActive, viewMode, page, tablePageSize, deals]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || isPlaceholderData) return;
    const requestKey = currentQueryKey;
    activeLoadMoreQueryRef.current = requestKey;
    setIsLoadingMore(true);
    try {
      const currentCount = (data?.items?.length ?? 0) + extraDeals.length;
      const nextPage = Math.floor(currentCount / 100) + 1;
      const res = await fetchCrmList<ImportedFunnelDeal>({
        resource: 'deals',
        q: searchTerm.trim() || undefined,
        filters: serverStageFilter ? { stage: serverStageFilter } : undefined,
        sortBy: sortField,
        sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
        page: nextPage,
        pageSize: 100,
      });
      // Verwirf die Antwort, falls sich die Query-Parameter in der Zwischenzeit geändert haben
      if (activeLoadMoreQueryRef.current === requestKey) {
        setExtraDeals((prev) => [...prev, ...res.items]);
      }
    } finally {
      if (activeLoadMoreQueryRef.current === requestKey) {
        setIsLoadingMore(false);
      }
    }
  }, [
    currentQueryKey,
    data?.items?.length,
    extraDeals.length,
    isLoadingMore,
    isPlaceholderData,
    searchTerm,
    serverStageFilter,
    sortField,
    sortOrder,
  ]);

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const blob = await fetchCrmExportBlob({
        resource: 'deals',
        q: searchTerm.trim() || undefined,
        // Wenn stageOverrides aktiv sind, ungefiltert vom Server holen und im CSV-fähigen Parser abgleichen
        filters: serverStageFilter ? { stage: serverStageFilter } : undefined,
        sortBy: sortField,
        sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
      });
      let exportBlob = blob;
      if (hasStageOverrides) {
        const text = await readBlobAsText(blob);
        const updatedCsv = applyStageOverridesToCsv(
          text,
          stageOverrides,
          stageFilter,
          sortField,
          sortOrder,
        );
        exportBlob = new Blob([updatedCsv], { type: 'text/csv; charset=utf-8' });
      }
      const url = URL.createObjectURL(exportBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'deals-export.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof CrmServiceError ? err.message : 'Fehler beim CSV-Export.');
    } finally {
      setIsExporting(false);
    }
  };

  const hasData = data !== undefined && !isPlaceholderData;
  const countText = isError ? 'Nicht verfügbar' : hasData ? String(total) : '…';
  const exportBlocked = isError || !hasData;
  const exportHintId = useId();

  const stageOptions = useMemo(() => {
    const knownValues = new Set(BASE_STAGE_OPTIONS.map((o) => o.value));
    const extraOptions: SelectOption[] = [];
    for (const d of deals) {
      if (d.stage && !knownValues.has(d.stage)) {
        knownValues.add(d.stage);
        extraOptions.push({ value: d.stage, label: d.stage });
      }
    }
    return [...BASE_STAGE_OPTIONS, ...extraOptions];
  }, [deals]);

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
          isError
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
      ) : viewMode === 'kanban' ? (
        <DealsKanbanBoard
          deals={deals}
          totalDeals={total}
          onDealStageChange={handleDealStageChange}
          onLoadMore={handleLoadMore}
          hasMore={!isPlaceholderData && deals.length < total}
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
