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
import { DataSourceStatus } from '@/components/data/DataSourceStatus';
import { useCrmProvenance } from '../hooks/useCrmProvenance';
import { CrmResponsiveList, CrmColumn } from '../components/CrmResponsiveList';

const toOptions = (arr: [string, string][]): SelectOption[] =>
  arr.map(([value, label]) => ({ value, label }));

const BASE_INDUSTRY_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'Alle Branchen' },
  ...'IT,Maschinenbau,Automotive,Finanzen,Consulting,Handel,Gesundheitswesen,Logistik'
    .split(',')
    .map((i) => ({ value: i, label: i })),
];

const COMPANY_SORT_OPTIONS = toOptions([
  ['name', 'Unternehmensname'],
  ['city', 'Stadt'],
  ['employee_count', 'Mitarbeiter'],
  ['created_at', 'Erstelldatum'],
]);

const ORDER_OPTIONS = toOptions([
  ['asc', 'Aufsteigend (A-Z)'],
  ['desc', 'Absteigend (Z-A)'],
]);

export function CompaniesPage() {
  const { session } = useOrganization();
  const isViewer = session?.role === 'viewer';
  const { provenance, isLoading: isProvLoading } = useCrmProvenance('companies');

  // Session-gebundener Storage-Key für Filter-Isolation (P2-1)
  const storageKey = session?.userId
    ? `lp_crm_companies_${session.userId}`
    : 'lp_crm_companies_anon';
  const bounceKey = `${storageKey}_auth_bounce`;

  // URL-State vor Initialisierung synchron wiederherstellen, falls durch Auth-Bounce temporär verloren
  if (typeof window !== 'undefined' && !window.location.search) {
    try {
      let candidate: string | null = null;
      const nav = window.performance?.getEntriesByType?.('navigation')?.[0] as
        PerformanceNavigationTiming | undefined;
      if (nav?.name) {
        const navUrl = new URL(nav.name, window.location.origin);
        if (navUrl.pathname === window.location.pathname && navUrl.search) {
          candidate = navUrl.search;
        }
      }
      if (candidate) {
        sessionStorage.removeItem(storageKey);
        sessionStorage.removeItem(bounceKey);
        window.history.replaceState(null, '', window.location.pathname + candidate);
      } else {
        // Absichtlich neutrale Route: alten Zustand zwingend löschen (P2-1)
        sessionStorage.removeItem(storageKey);
        sessionStorage.removeItem(bounceKey);
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

  const handleSortChange = (val: string) => (setSortField(val), setPageStr('1'));
  const handleOrderChange = (val: string) => (setSortOrder(val), setPageStr('1'));

  // Suchzustand für Seiten-Reload kontinuierlich sichern bzw. bei neutraler Route bereinigen (P2-1)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (window.location.search) {
        sessionStorage.setItem(storageKey, window.location.search);
      } else {
        sessionStorage.removeItem(storageKey);
        sessionStorage.removeItem(bounceKey);
      }
    } catch {
      // Storage-Fehler abfangen
    }
    const onBeforeUnload = () => {
      if (window.location.search) {
        try {
          sessionStorage.setItem(storageKey, window.location.search);
          sessionStorage.setItem(bounceKey, '1');
        } catch {
          // Storage-Fehler abfangen
        }
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [
    searchTerm,
    industryFilter,
    pageStr,
    pageSizeStr,
    sortField,
    sortOrder,
    storageKey,
    bounceKey,
  ]);

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

  const handleSearchChange = (val: string) => (setSearchTerm(val), setPageStr('1'));
  const handleIndustryChange = (val: string) => (setIndustryFilter(val), setPageStr('1'));

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
          <DataSourceStatus variant="compact" provenance={provenance} isLoading={isProvLoading} />
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
        {[
          {
            t: 'Unternehmen Gesamt',
            v: total,
            n: 'Mandanten-geprüft',
            c: 'text-primary font-bold',
            f: true,
          },
          {
            t: 'Aktuelle Seite',
            v: `${page} / ${Math.max(1, Math.ceil(total / pageSize))}`,
            n: `${pageSize} Accounts pro Seite`,
            c: 'text-text font-semibold',
          },
          {
            t: 'Gewählte Branche',
            v: industryFilter === 'ALL' ? 'Alle Branchen' : industryFilter,
            n: `${industryOptions.length - 1} Branchen verfügbar`,
            c: 'text-text font-semibold text-[20px]',
          },
          {
            t: 'Daten-Herkunft',
            v: 'Server Query',
            n: 'Edge Function / RLS geschützt',
            c: 'text-accent font-bold text-[18px]',
          },
        ].map((k) => (
          <Card key={k.t} variant="glass" featured={Boolean(k.f)}>
            <div className="text-[13px] text-[var(--color-text-muted)]">{k.t}</div>
            <div className={`font-display text-[28px] my-[4px] truncate ${k.c}`}>{k.v}</div>
            <div className="text-[12px] text-success">{k.n}</div>
          </Card>
        ))}
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
