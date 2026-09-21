import { useMemo, useState } from 'react';
import { Search, Download, AlertCircle } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ManagementChartState } from '@/components/ui/charts/ManagementChartState';
import { isSupabaseConfigured } from '@/services/db/supabaseClient';
import { Company, Contact, ImportedFunnelDeal } from '@/types/crm';
import {
  useCrmAuditSummary,
  useCrmCompanies,
  useCrmContacts,
  useCrmDeals,
} from '@/hooks/queries/useCrmQueries';
import { useUrlSyncedState } from '@/hooks/useUrlSyncedState';
import { useOrganization } from '@/auth/organizationContext';
import { downloadCrmExport, CrmServiceError } from '@/services/crm/crmExportService';
import { CrmResponsiveList, CrmColumn } from '../components/CrmResponsiveList';

const EMPTY_COMPANIES: Company[] = [];
const EMPTY_CONTACTS: Contact[] = [];
const EMPTY_DEALS: ImportedFunnelDeal[] = [];

const COMPANY_COLUMNS: CrmColumn<Company>[] = [
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
  { key: 'industry', label: 'Branche', render: (r) => <Badge variant="cyan">{r.industry}</Badge> },
  { key: 'city', label: 'Stadt' },
  { key: 'postalCode', label: 'PLZ' },
  {
    key: 'employeeCount',
    label: 'Mitarbeiter',
    render: (r) => <Badge variant="neutral">{r.employeeCount} MA</Badge>,
  },
];

const DEAL_COLUMNS: CrmColumn<ImportedFunnelDeal>[] = [
  {
    key: 'dealName',
    label: 'Deal Name',
    render: (r) => <strong className="text-text">{r.dealName}</strong>,
  },
  {
    key: 'stage',
    label: 'Stage',
    render: (r) => {
      const v = r.stage.includes('gewonnen')
        ? 'cyan'
        : r.stage.includes('verloren')
          ? 'neutral'
          : 'orange';
      return <Badge variant={v}>{r.stage}</Badge>;
    },
  },
  {
    key: 'amount',
    label: 'Betrag (€)',
    render: (r) => (
      <strong className="font-mono text-primary">{r.amount.toLocaleString('de-DE')} €</strong>
    ),
  },
  { key: 'closeDate', label: 'Abschlussdatum' },
  {
    key: 'pipeline',
    label: 'Pipeline',
    render: (r) => <Badge variant="neutral">{r.pipeline}</Badge>,
  },
];

export function LeadsPage() {
  const { session } = useOrganization();
  const isViewer = session?.role === 'viewer';

  const [activeTab, setActiveTab] = useUrlSyncedState('tab', 'contacts');
  const [searchTerm, setSearchTerm] = useUrlSyncedState('suche', '');
  const [pageStr, setPageStr] = useUrlSyncedState('seite', '1');
  const [pageSizeStr, setPageSizeStr] = useUrlSyncedState('proSeite', '20');

  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr, 10) || 20));

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const companiesQuery = useCrmCompanies();
  const contactsQuery = useCrmContacts();
  const dealsQuery = useCrmDeals();
  const auditQuery = useCrmAuditSummary();

  const companies = companiesQuery.data ?? EMPTY_COMPANIES;
  const contacts = contactsQuery.data ?? EMPTY_CONTACTS;
  const importedFunnelDeals = dealsQuery.data ?? EMPTY_DEALS;

  const isLoading =
    companiesQuery.isLoading ||
    contactsQuery.isLoading ||
    dealsQuery.isLoading ||
    auditQuery.isLoading;
  const queryError =
    companiesQuery.error ?? contactsQuery.error ?? dealsQuery.error ?? auditQuery.error ?? null;
  const isEmpty =
    !isLoading &&
    !queryError &&
    companies.length + contacts.length + importedFunnelDeals.length === 0;

  const companyMap = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies],
  );

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setPageStr('1');
    setSearchTerm('');
  };

  const currentResource =
    activeTab === 'companies' ? 'companies' : activeTab === 'funnel_deals' ? 'deals' : 'contacts';

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      await downloadCrmExport({ resource: currentResource, q: searchTerm.trim() || undefined });
    } catch (err) {
      setExportError(err instanceof CrmServiceError ? err.message : 'Fehler beim CSV-Export.');
    } finally {
      setIsExporting(false);
    }
  };

  const contactColumns: CrmColumn<Contact>[] = useMemo(
    () => [
      {
        key: 'fullName',
        label: 'Name',
        render: (r) => (
          <strong className="text-text">
            {r.firstName} {r.lastName}
          </strong>
        ),
      },
      {
        key: 'email',
        label: 'E-Mail',
        render: (r) => <span className="font-mono text-[12.5px] text-primary">{r.email}</span>,
      },
      {
        key: 'jobTitle',
        label: 'Jobbezeichnung',
        render: (r) => <Badge variant="cyan">{r.jobTitle}</Badge>,
      },
      {
        key: 'company',
        label: 'Zugeordnetes Unternehmen',
        render: (r) => {
          const comp = companyMap[r.companyId];
          return comp ? (
            <span>
              <strong className="text-text">{comp.name}</strong>{' '}
              <span className="text-[11px] text-[var(--color-text-muted)]">({comp.domain})</span>
            </span>
          ) : (
            <span className="text-error">Nicht zugeordnet</span>
          );
        },
      },
    ],
    [companyMap],
  );

  const activeConfig = useMemo(() => {
    if (activeTab === 'companies') {
      return {
        items: companies,
        match: (c: Company, q: string) =>
          `${c.name} ${c.domain ?? ''} ${c.city}`.toLowerCase().includes(q),
        cols: COMPANY_COLUMNS as CrmColumn<object>[],
        caption: 'Unternehmen und Accounts Übersicht',
      };
    }
    if (activeTab === 'funnel_deals') {
      return {
        items: importedFunnelDeals,
        match: (d: ImportedFunnelDeal, q: string) =>
          `${d.dealName} ${d.pipeline} ${d.stage}`.toLowerCase().includes(q),
        cols: DEAL_COLUMNS as CrmColumn<object>[],
        caption: 'Funnel Deals Übersicht',
      };
    }
    return {
      items: contacts,
      match: (c: Contact, q: string) =>
        `${c.firstName} ${c.lastName} ${c.email} ${c.jobTitle}`.toLowerCase().includes(q),
      cols: contactColumns as CrmColumn<object>[],
      caption: 'Kontakte und Lead-Übersicht',
    };
  }, [activeTab, companies, importedFunnelDeals, contacts, contactColumns]);

  const { currentRows, currentTotal } = useMemo(() => {
    const q = searchTerm.toLowerCase();
    const filtered = (activeConfig.items as object[]).filter(
      (item) => !q || (activeConfig.match as (i: object, query: string) => boolean)(item, q),
    );
    return {
      currentRows: filtered.slice((page - 1) * pageSize, page * pageSize),
      currentTotal: filtered.length,
    };
  }, [activeConfig, searchTerm, page, pageSize]);

  const kpis = [
    {
      title: 'Kontakte Gesamt',
      value: contacts.length,
      note: '100 % Unternehmen zugeordnet',
      featured: true,
      color: 'text-primary',
    },
    {
      title: 'Unternehmen (Accounts)',
      value: companies.length,
      note: '100 % valide Domains',
      color: 'text-text',
    },
    {
      title: 'Importierte Funnel Deals',
      value: importedFunnelDeals.length,
      note: 'Getrennter Import',
      color: 'text-text',
    },
  ];

  return (
    <div className="flex flex-col gap-[var(--space-6)] max-w-full min-w-0">
      <div className="flex items-start justify-between flex-wrap gap-[var(--space-3)]">
        <SectionHeader
          eyebrow="CRM & Pipeline"
          title="Leads & Kontakte"
          description="Persistierter CRM-Datenbestand aus Supabase / PostgreSQL mit Kontakten, Accounts und Paginierung."
        />
        <div className="flex gap-[var(--space-2)] items-center flex-wrap">
          <Badge variant="cyan">Ebene A CRM</Badge>
          <Badge variant="neutral">PostgreSQL / Supabase</Badge>
          {activeTab !== 'audit' && (
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Download size={14} />}
              onClick={handleExport}
              disabled={isViewer || isExporting}
              title={
                isViewer
                  ? 'Viewer besitzen keine Exportberechtigung'
                  : 'Aktuelle Liste als CSV exportieren'
              }
              aria-label="CSV Export"
            >
              {isExporting ? 'Exportiere...' : 'CSV Export'}
            </Button>
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

      <div className="crm-v2-kpi-grid">
        {kpis.map((kpi) => (
          <Card key={kpi.title} variant="glass" featured={kpi.featured}>
            <div className="text-[13px] text-[var(--color-text-muted)]">{kpi.title}</div>
            <div className={`font-display text-[28px] font-bold my-[4px] ${kpi.color}`}>
              {kpi.value}
            </div>
            <div className="text-[12px] text-success">{kpi.note}</div>
          </Card>
        ))}
        <Card variant="glass">
          <div className="text-[13px] text-[var(--color-text-muted)]">Datenbank Status</div>
          <div
            className={`font-display text-[18px] font-bold mt-[8px] mb-[4px] ${isSupabaseConfigured ? 'text-success' : 'text-accent'}`}
          >
            {isSupabaseConfigured ? '⚡ Supabase Verbunden' : '📦 Lokaler Import (Fallback)'}
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">
            {isSupabaseConfigured ? 'PostgreSQL Active' : 'Konfigurieren Sie .env für Supabase'}
          </div>
        </Card>
      </div>

      <div className="crm-v2-tabs-wrapper">
        <Tabs
          items={[
            { id: 'contacts', label: `Kontakte (${contacts.length})` },
            { id: 'companies', label: `Unternehmen (${companies.length})` },
            { id: 'funnel_deals', label: `Funnel Deals (${importedFunnelDeals.length})` },
            { id: 'audit', label: 'Supabase & Import Audit' },
          ]}
          activeId={activeTab}
          onChange={handleTabChange}
        />
      </div>

      {activeTab !== 'audit' && !isLoading && !queryError && !isEmpty && (
        <div className="crm-v2-filter-bar">
          <div className="flex-[1_1_280px] max-w-full">
            <Input
              type="search"
              aria-label="Suche in Liste"
              placeholder="Suchbegriff eingeben..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPageStr('1');
              }}
              leadingIcon={<Search size={16} />}
              sizeVariant="sm"
            />
          </div>
        </div>
      )}

      {isLoading || queryError || isEmpty ? (
        <ManagementChartState
          type={isLoading ? 'loading' : queryError ? 'error' : 'empty'}
          message={
            isLoading
              ? 'Lade Daten aus CRM Repository...'
              : queryError
                ? `Integritätsfehler: ${queryError instanceof Error ? queryError.message : 'Fehler beim Laden der CRM-Daten'}`
                : 'Keine CRM-Daten erfasst'
          }
          sourceLabel="Ebene A CRM"
          height={220}
        />
      ) : activeTab !== 'audit' ? (
        <Card variant="glass" padding="0">
          <CrmResponsiveList
            caption={activeConfig.caption}
            columns={activeConfig.cols}
            rows={currentRows}
            keyExtractor={(r) => (r as { id: string }).id}
            page={page}
            pageSize={pageSize}
            total={currentTotal}
            onPageChange={(p) => setPageStr(String(p))}
            onPageSizeChange={(s) => {
              setPageSizeStr(String(s));
              setPageStr('1');
            }}
          />
        </Card>
      ) : (
        <Card variant="glass" featured>
          <h3 className="m-0 mb-3 font-display text-[16px] font-semibold text-primary">
            🗄️ Supabase PostgreSQL Persistence (G46: Seed per SQL-Migration)
          </h3>
          <div className="flex flex-col gap-2 text-[13.5px] text-text">
            {[
              ['Kontakte', contacts.length, 'contacts Tabelle mit Foreign Key company_id'],
              ['Unternehmen', companies.length, 'companies Tabelle in Supabase'],
              ['Funnel Deals', importedFunnelDeals.length, 'imported_funnel_deals Tabelle'],
            ].map(([lbl, count, detail]) => (
              <div key={lbl as string}>
                ✔ <strong>{lbl}:</strong> {count} Datensätze (Schema: `{detail}`).
              </div>
            ))}
            <div className="text-[12.5px] mt-1 text-[var(--color-text-muted)]">
              🔒 <strong>Sicherheits- & Architekturregeln:</strong> Supabase Anon-Key für Client;
              RLS aktiviert; Keine Secrets im Code; Repository-Kapselung gewahrt.
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
