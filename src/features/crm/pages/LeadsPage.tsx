// G60 (Auftrag 067N, Step 4): Serverseitige, paginierte Leads- & Kontaktansicht mit URL-Sync und Export
import React, { useMemo, useState } from 'react';
import { Search, Download, AlertCircle } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { ManagementChartState } from '@/components/ui/charts/ManagementChartState';
import { isSupabaseConfigured } from '@/services/db/supabaseClient';
import { useUrlSyncedState } from '@/hooks/useUrlSyncedState';
import { useOrganization } from '@/auth/organizationContext';
import { useCrmListQuery } from '@/hooks/queries/useCrmListQuery';
import { downloadCrmExport, CrmServiceError } from '@/services/crm/crmExportService';
import { CrmResponsiveList, CrmColumn } from '../components/CrmResponsiveList';

const mkOpts = (csv: string) =>
  csv.split(',').map((p) => {
    const [value = '', label] = p.split(':');
    return { value, label: label || value };
  });

const ORDER_OPTS = mkOpts('asc:Aufsteigend (A-Z),desc:Absteigend (Z-A)');
type R = Record<string, unknown>;
const col = (key: string, label: string, render?: (r: R) => React.ReactNode): CrmColumn<R> => ({
  key,
  label,
  render,
});
const str = (v: unknown) => String(v ?? '');
const bCyan = (v: unknown) => <Badge variant="cyan">{str(v)}</Badge>;
const bMono = (v: unknown) => (
  <span className="font-mono text-[12.5px] text-primary">{str(v)}</span>
);
const bStrong = (v: unknown) => <strong className="text-text">{str(v)}</strong>;
const bMoney = (v: unknown) => (
  <strong className="font-mono text-primary">{Number(v ?? 0).toLocaleString('de-DE')} €</strong>
);

const COL_CONTACTS: CrmColumn<R>[] = [
  col('name', 'Name', (r) => bStrong(`${str(r.firstName)} ${str(r.lastName)}`.trim())),
  col('email', 'E-Mail', (r) => bMono(r.email)),
  col('jobTitle', 'Jobbezeichnung', (r) => bCyan(r.jobTitle)),
  col('companyId', 'Company-ID', (r) => (
    <span className="font-mono text-[11px] text-[var(--color-text-muted)]">{str(r.companyId)}</span>
  )),
];

const COL_COMPANIES: CrmColumn<R>[] = [
  col('name', 'Unternehmensname', (r) => bStrong(r.name)),
  col('domain', 'Domain', (r) => bMono(r.domain)),
  col('industry', 'Branche', (r) => bCyan(r.industry)),
  col('city', 'Stadt'),
  col('employeeCount', 'Mitarbeiter', (r) => (
    <Badge variant="neutral">{str(r.employeeCount || 0)} MA</Badge>
  )),
];

const COL_DEALS: CrmColumn<R>[] = [
  col('dealName', 'Deal Name', (r) => bStrong(r.dealName)),
  col('stage', 'Stage', (r) => {
    const s = str(r.stage);
    const v = s.includes('gewonnen') ? 'cyan' : s.includes('verloren') ? 'neutral' : 'orange';
    return <Badge variant={v}>{s}</Badge>;
  }),
  col('amount', 'Betrag (€)', (r) => bMoney(r.amount)),
  col('closeDate', 'Abschlussdatum'),
  col('pipeline', 'Pipeline', (r) => <Badge variant="neutral">{str(r.pipeline)}</Badge>),
];

const TAB_CONFIG = {
  contacts: {
    resource: 'contacts' as const,
    label: 'Kontakte',
    sort: 'last_name',
    order: 'asc',
    fKey: 'job_title',
    fLabel: 'Jobtitel:',
    sorts: mkOpts(
      'last_name:Nachname,first_name:Vorname,email:E-Mail,job_title:Jobtitel,created_at:Erstelldatum',
    ),
    filters: mkOpts(
      'ALL:Alle Jobtitel,CEO:CEO,CTO:CTO,Head of Sales:Head of Sales,VP Marketing:VP Marketing',
    ),
    cols: COL_CONTACTS,
  },
  companies: {
    resource: 'companies' as const,
    label: 'Unternehmen',
    sort: 'name',
    order: 'asc',
    fKey: 'industry',
    fLabel: 'Branche:',
    sorts: mkOpts(
      'name:Unternehmensname,city:Stadt,employee_count:Mitarbeiter,created_at:Erstelldatum',
    ),
    filters: mkOpts(
      'ALL:Alle Branchen,IT:IT,Maschinenbau:Maschinenbau,Automotive:Automotive,Finanzen:Finanzen',
    ),
    cols: COL_COMPANIES,
  },
  funnel_deals: {
    resource: 'deals' as const,
    label: 'Funnel Deals',
    sort: 'close_date',
    order: 'desc',
    fKey: 'stage',
    fLabel: 'Stage:',
    sorts: mkOpts('close_date:Abschlussdatum,amount:Betrag,deal_name:Deal Name,stage:Stage'),
    filters: mkOpts(
      'ALL:Alle Stages,Lead eingegangen,Erstgespräch geführt,Bedarfsanalyse,Angebot erstellt,Verhandlung,Deal gewonnen,Deal verloren',
    ),
    cols: COL_DEALS,
  },
};

const TAB_ITEMS = mkOpts(
  'contacts:Kontakte,companies:Unternehmen,funnel_deals:Funnel Deals,audit:Supabase & Import Audit',
).map((o) => ({ id: o.value, label: o.label }));

const AUDIT_NOTES: [string, string][] = [
  ['Mandantengebundene Abfragen', 'Kontakte, Unternehmen und Deals via `crm-query-export`.'],
  ['Paginierung', 'Serverseitig begrenzt (`pageSize: 1..100`). Keine Browser-Filterung.'],
  ['CSV-Export', 'Identische serverseitige Query mit Formel-Injection-Neutralisierung.'],
];

export function LeadsPage() {
  const { session } = useOrganization();
  const isViewer = session?.role === 'viewer';

  const [activeTab, setActiveTab] = useUrlSyncedState('tab', 'contacts');
  const [searchTerm, setSearchTerm] = useUrlSyncedState('suche', '');
  const [filterVal, setFilterVal] = useUrlSyncedState('filter', 'ALL');
  const [pageStr, setPageStr] = useUrlSyncedState('seite', '1');
  const [pageSizeStr, setPageSizeStr] = useUrlSyncedState('proSeite', '20');

  const conf = TAB_CONFIG[activeTab as keyof typeof TAB_CONFIG] ?? TAB_CONFIG.contacts;
  const [sortField, setSortField] = useUrlSyncedState('sort', conf.sort);
  const [sortOrder, setSortOrder] = useUrlSyncedState('order', conf.order);

  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr, 10) || 20));

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const activeFilters = useMemo(
    () => (filterVal === 'ALL' || !conf.fKey ? undefined : { [conf.fKey]: filterVal }),
    [filterVal, conf.fKey],
  );

  // P1-1: Ausschließlich serverseitige TanStack-Query für alle CRM-Ressourcen
  const { data, isLoading, isError, error } = useCrmListQuery<R>(
    {
      resource: conf.resource,
      q: searchTerm.trim() || undefined,
      filters: activeFilters,
      sortBy: sortField,
      sortOrder: (sortOrder as 'asc' | 'desc') || conf.order,
      page,
      pageSize,
    },
    { enabled: activeTab !== 'audit' },
  );

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.total ?? 0;

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setPageStr('1');
    setSearchTerm('');
    setFilterVal('ALL');
    const next = TAB_CONFIG[newTab as keyof typeof TAB_CONFIG];
    if (next) {
      setSortField(next.sort);
      setSortOrder(next.order);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      await downloadCrmExport({
        resource: conf.resource,
        q: searchTerm.trim() || undefined,
        filters: activeFilters,
        sortBy: sortField,
        sortOrder: (sortOrder as 'asc' | 'desc') || conf.order,
      });
    } catch (err) {
      setExportError(err instanceof CrmServiceError ? err.message : 'Fehler beim CSV-Export.');
    } finally {
      setIsExporting(false);
    }
  };

  const stateInfo =
    isLoading && items.length === 0
      ? { type: 'loading' as const, msg: 'Lade Daten aus CRM Repository...' }
      : isError
        ? {
            type: 'error' as const,
            msg: `Fehler: ${error instanceof Error ? error.message : 'Fehler beim Laden der CRM-Daten'}`,
          }
        : items.length === 0
          ? { type: 'empty' as const, msg: 'Keine CRM-Daten gefunden' }
          : null;

  return (
    <div className="flex flex-col gap-[var(--space-6)] max-w-full min-w-0">
      <div className="flex items-start justify-between flex-wrap gap-[var(--space-3)]">
        <SectionHeader
          eyebrow="CRM & Pipeline"
          title="Leads & Kontakte"
          description="Mandantenspezifischer CRM-Datenbestand mit serverseitiger Paginierung, Whitelist-Filterung und CSV-Export."
        />
        <div className="flex gap-[var(--space-2)] items-center flex-wrap">
          <Badge variant="cyan">Ebene A CRM</Badge>
          <Badge variant="neutral">{total} Einträge</Badge>
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
        {[
          ['Gefundene Datensätze', total, 'Mandanten-geprüft', 'text-primary font-bold', true],
          [
            'Aktuelle Seite',
            `${page} / ${Math.max(1, Math.ceil(total / pageSize))}`,
            `${pageSize} pro Seite`,
            'text-text font-semibold',
            false,
          ],
          [
            'Aktiver Tab',
            activeTab === 'audit' ? 'Audit' : conf.label,
            'Serverseitig abgefragt',
            'text-text font-semibold text-[20px]',
            false,
          ],
          [
            'Datenbank Status',
            isSupabaseConfigured ? '⚡ Supabase Verbunden' : '📦 Lokaler Fallback',
            'Edge Function & RLS aktiv',
            isSupabaseConfigured ? 'text-success text-[18px]' : 'text-accent text-[18px]',
            false,
          ],
        ].map(([title, val, note, cls, feat]) => (
          <Card key={title as string} variant="glass" featured={Boolean(feat)}>
            <div className="text-[13px] text-[var(--color-text-muted)]">{title}</div>
            <div className={`font-display text-[28px] my-[4px] truncate ${cls}`}>{val}</div>
            <div className="text-[12px] text-success">{note}</div>
          </Card>
        ))}
      </div>

      <div className="crm-v2-tabs-wrapper">
        <Tabs items={TAB_ITEMS} activeId={activeTab} onChange={handleTabChange} />
      </div>

      {activeTab !== 'audit' && (
        <div className="crm-v2-filter-bar">
          <div className="flex-[1_1_260px] max-w-full">
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
          <div className="flex items-center gap-[var(--space-3)] flex-wrap flex-[0_1_auto]">
            {[
              {
                l: conf.fLabel,
                opts: conf.filters,
                v: filterVal,
                s: setFilterVal,
                w: 'min-w-[150px] w-full max-w-[190px]',
              },
              {
                l: 'Sortierung:',
                opts: conf.sorts,
                v: sortField,
                s: setSortField,
                w: 'min-w-[150px] w-full max-w-[190px]',
              },
              {
                l: 'Reihenfolge:',
                opts: ORDER_OPTS,
                v: sortOrder,
                s: setSortOrder,
                w: 'min-w-[140px] w-full max-w-[170px]',
              },
            ].map((f) => (
              <div key={f.l} className={f.w}>
                <Select
                  label={f.l}
                  options={f.opts}
                  value={f.v}
                  onChange={(val) => {
                    f.s(val);
                    setPageStr('1');
                  }}
                  sizeVariant="sm"
                  fullWidth
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'audit' ? (
        <Card variant="glass" featured>
          <h3 className="m-0 mb-3 font-display text-[16px] font-semibold text-primary">
            🗄️ Supabase PostgreSQL Persistence & Serverseitiger Query-Pfad
          </h3>
          <div className="flex flex-col gap-2 text-[13.5px] text-text">
            {AUDIT_NOTES.map(([t, d]) => (
              <div key={t}>
                ✔ <strong>{t}:</strong> {d}
              </div>
            ))}
            <div className="text-[12.5px] mt-1 text-[var(--color-text-muted)]">
              🔒 <strong>Sicherheitsregeln:</strong> Nur Whitelist-Spalten; RLS erzwungen; Viewer
              erhalten 403 bei Export.
            </div>
          </div>
        </Card>
      ) : stateInfo ? (
        <ManagementChartState
          type={stateInfo.type}
          message={stateInfo.msg}
          sourceLabel="Ebene A CRM"
          height={220}
        />
      ) : (
        <Card variant="glass" padding="0">
          <CrmResponsiveList
            caption={`CRM ${conf.resource} Übersicht`}
            columns={conf.cols}
            rows={items}
            keyExtractor={(r) => String(r.id ?? Math.random())}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(p) => setPageStr(String(p))}
            onPageSizeChange={(s) => {
              setPageSizeStr(String(s));
              setPageStr('1');
            }}
          />
        </Card>
      )}
    </div>
  );
}
