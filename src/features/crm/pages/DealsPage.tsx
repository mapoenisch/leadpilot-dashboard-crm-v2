// G60 (Auftrag 067N, Step 4): URL-synchrone serverseitige Deals-Ansicht mit Pagination und Export
import { useState, useMemo } from 'react';
import { Search, Download, AlertCircle } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select, SelectOption } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { ManagementChartState } from '@/components/ui/charts/ManagementChartState';
import { ImportedFunnelDeal } from '@/types/crm';
import { useUrlSyncedState } from '@/hooks/useUrlSyncedState';
import { useOrganization } from '@/auth/organizationContext';
import { useCrmListQuery } from '@/hooks/queries/useCrmListQuery';
import { downloadCrmExport, CrmServiceError } from '@/services/crm/crmExportService';
import { CrmResponsiveList, CrmColumn } from '../components/CrmResponsiveList';

const BASE_STAGE_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'Alle Stages' },
  { value: 'Lead', label: 'Lead' },
  { value: 'Qualifiziert', label: 'Qualifiziert' },
  { value: 'Präsentation', label: 'Präsentation' },
  { value: 'Angebot', label: 'Angebot' },
  { value: 'Verhandlung', label: 'Verhandlung' },
  { value: 'Gewonnen', label: 'Gewonnen' },
  { value: 'Verloren', label: 'Verloren' },
];

export function DealsPage() {
  const { session } = useOrganization();
  const isViewer = session?.role === 'viewer';

  // URL-synchroner Zustand
  const [searchTerm, setSearchTerm] = useUrlSyncedState('suche', '');
  const [stageFilter, setStageFilter] = useUrlSyncedState('stufe', 'ALL');
  const [pageStr, setPageStr] = useUrlSyncedState('seite', '1');
  const [pageSizeStr, setPageSizeStr] = useUrlSyncedState('proSeite', '20');
  const [sortField] = useUrlSyncedState('sort', 'closeDate');
  const [sortOrder] = useUrlSyncedState('order', 'desc');

  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr, 10) || 20));

  // Serverseitige TanStack-Query
  const { data, isLoading, isError, error } = useCrmListQuery<ImportedFunnelDeal>({
    resource: 'deals',
    q: searchTerm.trim() || undefined,
    filters: stageFilter !== 'ALL' ? { stage: stageFilter } : undefined,
    sortBy: sortField,
    sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
    page,
    pageSize,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setPageStr('1');
  };

  const handleStageChange = (val: string) => {
    setStageFilter(val);
    setPageStr('1');
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      await downloadCrmExport({
        resource: 'deals',
        q: searchTerm.trim() || undefined,
        filters: stageFilter !== 'ALL' ? { stage: stageFilter } : undefined,
        sortBy: sortField,
        sortOrder: (sortOrder as 'asc' | 'desc') || 'desc',
      });
    } catch (err) {
      if (err instanceof CrmServiceError) {
        setExportError(err.message);
      } else {
        setExportError('Fehler beim Ausführen des CSV-Exports.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const deals = useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.total ?? 0;

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

  const columns: CrmColumn<ImportedFunnelDeal>[] = [
    {
      key: 'dealName',
      label: 'Deal Name',
      render: (r) => <strong className="text-text">{r.dealName}</strong>,
    },
    {
      key: 'stage',
      label: 'Deal Stage',
      render: (r) => (
        <Badge
          variant={
            r.stage.toLowerCase().includes('gewonnen')
              ? 'cyan'
              : r.stage.toLowerCase().includes('verloren')
                ? 'neutral'
                : 'orange'
          }
        >
          {r.stage}
        </Badge>
      ),
    },
    {
      key: 'amount',
      label: 'Deal-Volumen (€)',
      render: (r) => (
        <strong
          className={`font-mono ${
            r.stage.toLowerCase().includes('gewonnen')
              ? 'text-primary'
              : r.stage.toLowerCase().includes('verloren')
                ? 'text-[var(--color-text-muted)]'
                : 'text-accent'
          }`}
        >
          {r.amount.toLocaleString('de-DE')} €
        </strong>
      ),
    },
    {
      key: 'closeDate',
      label: 'Abschlussdatum',
      render: (r) => (
        <span className="text-[13px] text-[var(--color-text-muted)]">{r.closeDate}</span>
      ),
    },
    {
      key: 'pipeline',
      label: 'Pipeline',
      render: (r) => <Badge variant="neutral">{r.pipeline}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-[var(--space-6)] max-w-full min-w-0">
      {/* 1. Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-[var(--space-3)]">
        <SectionHeader
          eyebrow="CRM & Pipeline"
          title="Deal Pipeline"
          description="Mandantenspezifische Übersicht der Pipeline-Deals mit serverseitiger Paginierung und CSV-Export."
        />
        <div className="flex gap-[var(--space-2)] items-center flex-wrap">
          <Badge variant="cyan">Ebene A Pipeline</Badge>
          <Badge variant="neutral">{total} Funnel Deals</Badge>
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Download size={14} />}
            onClick={handleExport}
            disabled={isViewer || isExporting}
            title={
              isViewer
                ? 'Viewer besitzen keine Exportberechtigung'
                : 'Gefilterte Deals als CSV exportieren'
            }
            aria-label="CSV Export"
          >
            {isExporting ? 'Exportiere...' : 'CSV Export'}
          </Button>
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
      <div className="crm-v2-kpi-grid">
        <Card variant="glass" featured>
          <div className="text-[13px] text-[var(--color-text-muted)]">Funnel Deals Gesamt</div>
          <div className="font-display text-[28px] font-bold my-[4px] text-primary">{total}</div>
          <div className="text-[12px] text-success">Mandanten-geprüft</div>
        </Card>

        <Card variant="glass">
          <div className="text-[13px] text-[var(--color-text-muted)]">Aktuelle Seite</div>
          <div className="font-display text-[28px] font-semibold my-[4px] text-text">
            {page} / {Math.max(1, Math.ceil(total / pageSize))}
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">
            {pageSize} Deals pro Seite
          </div>
        </Card>

        <Card variant="glass">
          <div className="text-[13px] text-[var(--color-text-muted)]">Gewählte Stage</div>
          <div className="font-display text-[20px] font-semibold my-[4px] text-text truncate">
            {stageFilter === 'ALL' ? 'Alle Stages' : stageFilter}
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">
            {stageOptions.length - 1} Stages definiert
          </div>
        </Card>

        <Card variant="glass">
          <div className="text-[13px] text-[var(--color-text-muted)]">Daten-Herkunft</div>
          <div className="font-display text-[18px] font-bold mt-[8px] mb-[4px] text-accent">
            Server Query
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">
            Edge Function / RLS geschützt
          </div>
        </Card>
      </div>

      {/* 3. Filter & Search Bar */}
      <div className="crm-v2-filter-bar">
        <div className="flex-[1_1_280px] max-w-full">
          <Input
            type="search"
            aria-label="Deals suchen"
            placeholder="Deal Name oder Pipeline suchen..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            leadingIcon={<Search size={16} />}
            sizeVariant="sm"
          />
        </div>

        <div className="flex items-center gap-[var(--space-4)] flex-wrap flex-[0_1_auto]">
          <div className="min-w-[180px] w-full max-w-[240px]">
            <Select
              label="Stage:"
              options={stageOptions}
              value={stageFilter}
              onChange={handleStageChange}
              sizeVariant="sm"
              fullWidth
            />
          </div>
          <div className="crm-v2-result-count" aria-live="polite">
            {total} {total === 1 ? 'Deal' : 'Deals'} gefunden
          </div>
        </div>
      </div>

      {/* 4. Table & Cards */}
      {isLoading && deals.length === 0 ? (
        <ManagementChartState
          type="loading"
          message="Lade Deal-Pipeline aus CRM..."
          sourceLabel="Ebene A CRM Funnel Deals"
          height={220}
        />
      ) : isError ? (
        <ManagementChartState
          type="error"
          message={`Integritätsfehler: ${error instanceof Error ? error.message : 'Fehler beim Laden der CRM-Deals'}`}
          sourceLabel="Ebene A CRM Funnel Deals"
          height={220}
        />
      ) : (
        <Card variant="glass" padding="0">
          <CrmResponsiveList
            caption="Deal Pipeline Tabelle"
            columns={columns}
            rows={deals}
            keyExtractor={(r) => r.id}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(newPage) => setPageStr(String(newPage))}
            onPageSizeChange={(newSize) => {
              setPageSizeStr(String(newSize));
              setPageStr('1');
            }}
            renderMobileCard={(r) => (
              <div className="crm-v2-mobile-card">
                <div className="crm-v2-mobile-card-header">
                  <span className="crm-v2-mobile-card-title">{r.dealName}</span>
                  <Badge
                    variant={
                      r.stage.toLowerCase().includes('gewonnen')
                        ? 'cyan'
                        : r.stage.toLowerCase().includes('verloren')
                          ? 'neutral'
                          : 'orange'
                    }
                  >
                    {r.stage}
                  </Badge>
                </div>
                <div className="crm-v2-mobile-card-row">
                  <span className="crm-v2-mobile-card-label">Deal-Volumen</span>
                  <span
                    className={`crm-v2-mobile-card-value font-mono font-semibold ${
                      r.stage.toLowerCase().includes('gewonnen')
                        ? 'text-primary'
                        : r.stage.toLowerCase().includes('verloren')
                          ? 'text-[var(--color-text-muted)]'
                          : 'text-accent'
                    }`}
                  >
                    {r.amount.toLocaleString('de-DE')} €
                  </span>
                </div>
                <div className="crm-v2-mobile-card-row">
                  <span className="crm-v2-mobile-card-label">Abschlussdatum</span>
                  <span className="crm-v2-mobile-card-value">{r.closeDate}</span>
                </div>
                <div className="crm-v2-mobile-card-row">
                  <span className="crm-v2-mobile-card-label">Pipeline</span>
                  <span className="crm-v2-mobile-card-value">
                    <Badge variant="neutral">{r.pipeline}</Badge>
                  </span>
                </div>
              </div>
            )}
          />
        </Card>
      )}
    </div>
  );
}
