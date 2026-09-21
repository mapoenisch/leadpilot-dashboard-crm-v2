// G60 (Auftrag 067N, Step 4): URL-synchrone serverseitige Companies-Ansicht mit Pagination und Export
import { useState, useMemo, useEffect } from 'react';
import { Search, Download, AlertCircle } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select, SelectOption } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { ManagementChartState } from '@/components/ui/charts/ManagementChartState';
import { Company } from '@/types/crm';
import { useUrlSyncedState } from '@/hooks/useUrlSyncedState';
import { useOrganization } from '@/auth/organizationContext';
import { useCrmListQuery } from '@/hooks/queries/useCrmListQuery';
import { downloadCrmExport, CrmServiceError } from '@/services/crm/crmExportService';
import { CrmResponsiveList, CrmColumn } from '../components/CrmResponsiveList';

const BASE_INDUSTRY_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'Alle Branchen' },
  { value: 'IT', label: 'IT' },
  { value: 'Maschinenbau', label: 'Maschinenbau' },
  { value: 'Automotive', label: 'Automotive' },
  { value: 'Finanzen', label: 'Finanzen' },
  { value: 'Consulting', label: 'Consulting' },
  { value: 'Handel', label: 'Handel' },
  { value: 'Gesundheitswesen', label: 'Gesundheitswesen' },
  { value: 'Logistik', label: 'Logistik' },
];

const COMPANY_SORT_OPTIONS: SelectOption[] = [
  { value: 'name', label: 'Unternehmensname' },
  { value: 'city', label: 'Stadt' },
  { value: 'employee_count', label: 'Mitarbeiter' },
  { value: 'created_at', label: 'Erstelldatum' },
];

const ORDER_OPTIONS: SelectOption[] = [
  { value: 'asc', label: 'Aufsteigend (A-Z)' },
  { value: 'desc', label: 'Absteigend (Z-A)' },
];

export function CompaniesPage() {
  const { session } = useOrganization();
  const isViewer = session?.role === 'viewer';

  // URL-State vor Initialisierung synchron wiederherstellen, falls durch Auth-Bounce nach Reload temporär verloren
  if (typeof window !== 'undefined' && !window.location.search) {
    try {
      const navEntry = window.performance?.getEntriesByType?.('navigation')?.[0] as
        PerformanceNavigationTiming | undefined;
      const isReload =
        sessionStorage.getItem('lp_crm_companies_reload') === '1' || navEntry?.type === 'reload';
      if (isReload) {
        sessionStorage.removeItem('lp_crm_companies_reload');
        const saved = sessionStorage.getItem('lp_crm_companies_search');
        if (saved) {
          sessionStorage.removeItem('lp_crm_companies_search');
          window.history.replaceState(null, '', window.location.pathname + saved);
        }
      }
    } catch {
      // Storage-Fehler abfangen
    }
  }

  // URL-synchroner Zustand
  const [searchTerm, setSearchTerm] = useUrlSyncedState('suche', '');
  const [industryFilter, setIndustryFilter] = useUrlSyncedState('branche', 'ALL');
  const [pageStr, setPageStr] = useUrlSyncedState('seite', '1');
  const [pageSizeStr, setPageSizeStr] = useUrlSyncedState('proSeite', '20');
  const [sortField, setSortField] = useUrlSyncedState('sort', 'name');
  const [sortOrder, setSortOrder] = useUrlSyncedState('order', 'asc');

  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr, 10) || 20));

  const handleSortChange = (val: string) => {
    setSortField(val);
    setPageStr('1');
  };

  const handleOrderChange = (val: string) => {
    setSortOrder(val);
    setPageStr('1');
  };

  // Suchzustand für Seiten-Reload kontinuierlich und vor Unload sichern
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      try {
        sessionStorage.setItem('lp_crm_companies_search', window.location.search);
      } catch {
        // Storage-Fehler abfangen
      }
    }
    const onBeforeUnload = () => {
      if (typeof window !== 'undefined' && window.location.search) {
        try {
          sessionStorage.setItem('lp_crm_companies_search', window.location.search);
          sessionStorage.setItem('lp_crm_companies_reload', '1');
        } catch {
          // Storage-Fehler abfangen
        }
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [searchTerm, industryFilter, pageStr, pageSizeStr, sortField, sortOrder]);

  // Serverseitige TanStack-Query
  const { data, isLoading, isError, error } = useCrmListQuery<Company>({
    resource: 'companies',
    q: searchTerm.trim() || undefined,
    filters: industryFilter !== 'ALL' ? { industry: industryFilter } : undefined,
    sortBy: sortField,
    sortOrder: (sortOrder as 'asc' | 'desc') || 'asc',
    page,
    pageSize,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setPageStr('1');
  };

  const handleIndustryChange = (val: string) => {
    setIndustryFilter(val);
    setPageStr('1');
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      await downloadCrmExport({
        resource: 'companies',
        q: searchTerm.trim() || undefined,
        filters: industryFilter !== 'ALL' ? { industry: industryFilter } : undefined,
        sortBy: sortField,
        sortOrder: (sortOrder as 'asc' | 'desc') || 'asc',
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

  const companies = useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.total ?? 0;

  const industryOptions = useMemo(() => {
    const knownValues = new Set(BASE_INDUSTRY_OPTIONS.map((o) => o.value));
    const extraOptions: SelectOption[] = [];
    for (const c of companies) {
      if (c.industry && !knownValues.has(c.industry)) {
        knownValues.add(c.industry);
        extraOptions.push({ value: c.industry, label: c.industry });
      }
    }
    return [...BASE_INDUSTRY_OPTIONS, ...extraOptions];
  }, [companies]);

  const columns: CrmColumn<Company>[] = [
    {
      key: 'name',
      label: 'Unternehmensname',
      render: (r) => <strong className="text-text">{r.name}</strong>,
    },
    {
      key: 'domain',
      label: 'Domain',
      render: (r) => <span className="font-mono text-[12.5px] text-primary">{r.domain}</span>,
    },
    {
      key: 'industry',
      label: 'Branche',
      render: (r) => <Badge variant="cyan">{r.industry}</Badge>,
    },
    { key: 'city', label: 'Stadt' },
    { key: 'postalCode', label: 'PLZ' },
    {
      key: 'employeeCount',
      label: 'Mitarbeiter',
      render: (r) => <Badge variant="neutral">{r.employeeCount} MA</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-[var(--space-6)] max-w-full min-w-0">
      {/* 1. Page Header */}
      <div className="flex items-start justify-between flex-wrap gap-[var(--space-3)]">
        <SectionHeader
          eyebrow="CRM & Pipeline"
          title="Unternehmen (Accounts)"
          description="Mandantenspezifische Übersicht der B2B-Unternehmen (Accounts) mit serverseitiger Paginierung und Export."
        />
        <div className="flex gap-[var(--space-2)] items-center flex-wrap">
          <Badge variant="cyan">Ebene A Import</Badge>
          <Badge variant="neutral">{total} B2B Accounts</Badge>
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Download size={14} />}
            onClick={handleExport}
            disabled={isViewer || isExporting}
            title={
              isViewer
                ? 'Viewer besitzen keine Exportberechtigung'
                : 'Gefilterte Unternehmensliste als CSV exportieren'
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
          <div className="text-[13px] text-[var(--color-text-muted)]">Unternehmen Gesamt</div>
          <div className="font-display text-[28px] font-bold my-[4px] text-primary">{total}</div>
          <div className="text-[12px] text-success">Mandanten-geprüft</div>
        </Card>

        <Card variant="glass">
          <div className="text-[13px] text-[var(--color-text-muted)]">Aktuelle Seite</div>
          <div className="font-display text-[28px] font-semibold my-[4px] text-text">
            {page} / {Math.max(1, Math.ceil(total / pageSize))}
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">
            {pageSize} Accounts pro Seite
          </div>
        </Card>

        <Card variant="glass">
          <div className="text-[13px] text-[var(--color-text-muted)]">Gewählte Branche</div>
          <div className="font-display text-[20px] font-semibold my-[4px] text-text truncate">
            {industryFilter === 'ALL' ? 'Alle Branchen' : industryFilter}
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">
            {industryOptions.length - 1} Branchen verfügbar
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
            aria-label="Unternehmen suchen"
            placeholder="Unternehmen, Domain oder Stadt suchen..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            leadingIcon={<Search size={16} />}
            sizeVariant="sm"
          />
        </div>

        <div className="flex items-center gap-[var(--space-4)] flex-wrap flex-[0_1_auto]">
          <div className="min-w-[170px] w-full max-w-[210px]">
            <Select
              label="Branche:"
              options={industryOptions}
              value={industryFilter}
              onChange={handleIndustryChange}
              sizeVariant="sm"
              fullWidth
            />
          </div>
          <div className="min-w-[170px] w-full max-w-[210px]">
            <Select
              label="Sortierung:"
              options={COMPANY_SORT_OPTIONS}
              value={sortField}
              onChange={handleSortChange}
              sizeVariant="sm"
              fullWidth
            />
          </div>
          <div className="min-w-[150px] w-full max-w-[180px]">
            <Select
              label="Reihenfolge:"
              options={ORDER_OPTIONS}
              value={sortOrder}
              onChange={handleOrderChange}
              sizeVariant="sm"
              fullWidth
            />
          </div>
          <div className="crm-v2-result-count" aria-live="polite">
            {total} {total === 1 ? 'Unternehmen' : 'Unternehmen'} gefunden
          </div>
        </div>
      </div>

      {/* 4. Table & Cards */}
      {isLoading && companies.length === 0 ? (
        <ManagementChartState
          type="loading"
          message="Lade Unternehmensdaten aus CRM..."
          sourceLabel="Ebene A CRM Accounts"
          height={220}
        />
      ) : isError ? (
        <ManagementChartState
          type="error"
          message={`Integritätsfehler: ${error instanceof Error ? error.message : 'Fehler beim Laden der Unternehmen'}`}
          sourceLabel="Ebene A CRM Accounts"
          height={220}
        />
      ) : (
        <Card variant="glass" padding="0">
          <CrmResponsiveList
            caption="Unternehmen und Accounts Tabelle"
            columns={columns}
            rows={companies}
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
                  <span className="crm-v2-mobile-card-title">{r.name}</span>
                  <Badge variant="cyan">{r.industry}</Badge>
                </div>
                <div className="crm-v2-mobile-card-row">
                  <span className="crm-v2-mobile-card-label">Domain</span>
                  <span className="crm-v2-mobile-card-value font-mono text-primary">
                    {r.domain}
                  </span>
                </div>
                <div className="crm-v2-mobile-card-row">
                  <span className="crm-v2-mobile-card-label">Standort</span>
                  <span className="crm-v2-mobile-card-value">
                    {r.postalCode} {r.city}
                  </span>
                </div>
                <div className="crm-v2-mobile-card-row">
                  <span className="crm-v2-mobile-card-label">Mitarbeiter</span>
                  <span className="crm-v2-mobile-card-value">
                    <Badge variant="neutral">{r.employeeCount} MA</Badge>
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
