// G60 / Auftrag 130: Serverseitige, paginierte Leads- & Kontaktansicht mit Lead-Scoring und Qualifizierungsworkflow
import { useId, useMemo, useState } from 'react';
import { Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { ManagementChartState } from '@/components/ui/charts/ManagementChartState';
import { useUrlSyncedState } from '@/hooks/useUrlSyncedState';
import { useOrganization } from '@/auth/organizationContext';
import { useCrmListQuery } from '@/hooks/queries/useCrmListQuery';
import { downloadCrmExport, CrmServiceError } from '@/services/crm/crmExportService';
import { DataSourceStatus } from '@/components/data/DataSourceStatus';
import { useCrmProvenance } from '../hooks/useCrmProvenance';
import { CrmResponsiveList } from '../components/CrmResponsiveList';
import { LeadsKpiGrid } from '../components/LeadsKpiGrid';
import { LeadsFilterBar } from '../components/LeadsFilterBar';
import { LeadQualificationDrawer } from '../components/LeadQualificationDrawer';
import { LeadConversionModal, ConvertedDealData } from '../components/LeadConversionModal';
import { useQualifiedContactIds } from '../hooks/useLeadQualifications';
import {
  TAB_ITEMS,
  AUDIT_NOTES,
  buildContactColumns,
  buildTabConfig,
  enrichContactWithCompany,
  filterLeadsByQuality,
  exportFilteredContactsCsv,
  getCrmListStateInfo,
  type R,
} from '../utils/leadsPageConfig';

export function LeadsPage() {
  const { session } = useOrganization();
  const isViewer = session?.role === 'viewer';

  const [activeTab, setActiveTab] = useUrlSyncedState('tab', 'contacts');
  const [searchTerm, setSearchTerm] = useUrlSyncedState('suche', '');
  const [filterVal, setFilterVal] = useUrlSyncedState('filter', 'ALL');
  const [qualityFilter, setQualityFilter] = useUrlSyncedState('qualitaet', 'ALL');
  const [pageStr, setPageStr] = useUrlSyncedState('seite', '1');
  const [pageSizeStr, setPageSizeStr] = useUrlSyncedState('proSeite', '20');

  // Qualifizierungs- & Konvertierungs-State
  const [selectedLead, setSelectedLead] = useState<R | null>(null);
  const [convertingLead, setConvertingLead] = useState<R | null>(null);
  const [conversionSuccessMessage, setConversionSuccessMessage] = useState<string | null>(null);

  const contactColumns = useMemo(
    () =>
      buildContactColumns({
        onSelectLead: (lead) => setSelectedLead(lead),
        onConvertLead: (lead) => setConvertingLead(lead),
      }),
    [],
  );

  const tabConfig = useMemo(() => buildTabConfig(contactColumns), [contactColumns]);
  const conf = tabConfig[activeTab as keyof typeof tabConfig] ?? tabConfig.contacts;
  const { provenance, isLoading: isProvLoading } = useCrmProvenance(conf.resource);
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

  // Mandantengebundene Unternehmensdaten für ICP-Enrichment abrufen
  const { data: companiesData } = useCrmListQuery<R>(
    { resource: 'companies', pageSize: 100 },
    { enabled: activeTab === 'contacts' },
  );

  const companyMap = useMemo(() => {
    const map = new Map<string, R>();
    for (const comp of companiesData?.items ?? []) {
      if (comp.id) map.set(String(comp.id), comp);
    }
    return map;
  }, [companiesData?.items]);

  // Qualifizierte Kontakte kommen serverseitig aus lead_qualifications (RLS)
  const { data: qualifiedLeadIds } = useQualifiedContactIds(activeTab === 'contacts');

  const isClientQualityPaging = activeTab === 'contacts' && qualityFilter !== 'ALL';

  const { data, isLoading, isError, isPlaceholderData, error, refetch } = useCrmListQuery<R>(
    {
      resource: conf.resource,
      q: searchTerm.trim() || undefined,
      filters: activeFilters,
      sortBy: sortField,
      sortOrder: (sortOrder as 'asc' | 'desc') || conf.order,
      page: isClientQualityPaging ? 1 : page,
      pageSize: isClientQualityPaging ? 100 : pageSize,
    },
    { enabled: activeTab !== 'audit' },
  );

  const rawItems = useMemo(() => data?.items ?? [], [data?.items]);

  // Angereicherte und mandantengebundene Kontakte
  const enrichedContacts = useMemo(() => {
    if (activeTab !== 'contacts') return [];
    return rawItems.map((contact) =>
      enrichContactWithCompany(
        contact,
        contact.companyId ? companyMap.get(String(contact.companyId)) : undefined,
        qualifiedLeadIds?.has(String(contact.id)) ?? false,
      ),
    );
  }, [activeTab, rawItems, companyMap, qualifiedLeadIds]);

  const allFilteredContacts = useMemo(() => {
    if (activeTab !== 'contacts') return [];
    return filterLeadsByQuality(enrichedContacts, qualityFilter);
  }, [activeTab, enrichedContacts, qualityFilter]);

  // Clientseitige Paginierung nur beim Qualitätsfilter; sonst gilt die Serverliste
  const { items, total } = useMemo(() => {
    if (activeTab === 'contacts') {
      if (qualityFilter !== 'ALL') {
        const paged = allFilteredContacts.slice((page - 1) * pageSize, page * pageSize);
        return { items: paged, total: allFilteredContacts.length };
      }
      return { items: enrichedContacts, total: data?.total ?? 0 };
    }
    return { items: rawItems, total: data?.total ?? 0 };
  }, [
    activeTab,
    qualityFilter,
    allFilteredContacts,
    enrichedContacts,
    rawItems,
    page,
    pageSize,
    data?.total,
  ]);

  const isAudit = activeTab === 'audit';
  const hasData = data !== undefined && !isPlaceholderData;
  const countText = isAudit ? '–' : isError ? 'Nicht verfügbar' : hasData ? String(total) : '…';
  const exportBlocked = isError || !hasData;
  const exportHintId = useId();

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setPageStr('1');
    setSearchTerm('');
    setFilterVal('ALL');
    setQualityFilter('ALL');
    const next = tabConfig[newTab as keyof typeof tabConfig];
    if (next) {
      setSortField(next.sort);
      setSortOrder(next.order);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      if (activeTab === 'contacts' && qualityFilter !== 'ALL') {
        exportFilteredContactsCsv(allFilteredContacts, qualityFilter);
      } else {
        await downloadCrmExport({
          resource: conf.resource,
          q: searchTerm.trim() || undefined,
          filters: activeFilters,
          sortBy: sortField,
          sortOrder: (sortOrder as 'asc' | 'desc') || conf.order,
        });
      }
    } catch (err) {
      setExportError(err instanceof CrmServiceError ? err.message : 'Fehler beim CSV-Export.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleConversionSuccess = (deal: ConvertedDealData) => {
    setConversionSuccessMessage(
      `Deal „${deal.dealName}“ erfolgreich mit ${deal.amount.toLocaleString('de-DE')} € in Phase „${deal.stage}“ angelegt!`,
    );
    setTimeout(() => setConversionSuccessMessage(null), 6000);
  };

  const stateInfo = getCrmListStateInfo(isLoading, isError, error, items.length);

  return (
    <div className="flex flex-col gap-[var(--space-6)] max-w-full min-w-0">
      <div className="flex items-start justify-between flex-wrap gap-[var(--space-3)]">
        <SectionHeader
          eyebrow="CRM & Pipeline"
          title="Leads & Kontakte"
          description="Mandantenspezifischer CRM-Datenbestand mit automatisiertem ICP-Lead-Scoring, Qualifizierungs-Workflow und CSV-Export."
        />
        <div className="flex gap-[var(--space-2)] items-center flex-wrap">
          <Badge variant="cyan">CRM-Daten</Badge>
          <DataSourceStatus variant="compact" provenance={provenance} isLoading={isProvLoading} />
          {!isAudit && (
            <>
              <Badge variant="neutral">{countText} Einträge</Badge>
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<Download size={14} />}
                onClick={handleExport}
                disabled={isViewer || isExporting || exportBlocked}
                title={
                  isViewer
                    ? 'Viewer besitzen keine Exportberechtigung'
                    : 'Aktuelle Liste als CSV exportieren'
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
            </>
          )}
        </div>
      </div>

      {conversionSuccessMessage && (
        <div
          role="status"
          className="flex items-center gap-2 p-3 rounded-md bg-success/10 border border-success/30 text-success text-[13px]"
        >
          <CheckCircle2 size={16} />
          <span>{conversionSuccessMessage}</span>
        </div>
      )}

      {exportError && (
        <div
          role="alert"
          className="flex items-center gap-2 p-3 rounded-md bg-error/10 border border-error/30 text-error text-[13px]"
        >
          <AlertCircle size={16} />
          <span>{exportError}</span>
        </div>
      )}

      <LeadsKpiGrid
        countText={countText}
        isAudit={isAudit}
        isError={isError}
        hasData={hasData}
        page={page}
        pageSize={pageSize}
        total={total}
        confLabel={conf.label}
      />

      <div className="crm-v2-tabs-wrapper">
        <Tabs items={TAB_ITEMS} activeId={activeTab} onChange={handleTabChange} />
      </div>

      {activeTab !== 'audit' && (
        <LeadsFilterBar
          activeTab={activeTab}
          searchTerm={searchTerm}
          onSearchChange={(val) => {
            setSearchTerm(val);
            setPageStr('1');
          }}
          qualityFilter={qualityFilter}
          onQualityFilterChange={(val) => {
            setQualityFilter(val);
            setPageStr('1');
          }}
          filterLabel={conf.fLabel}
          filterOptions={conf.filters}
          filterVal={filterVal}
          onFilterChange={(val) => {
            setFilterVal(val);
            setPageStr('1');
          }}
          sortOptions={conf.sorts}
          sortField={sortField}
          onSortFieldChange={(val) => {
            setSortField(val);
            setPageStr('1');
          }}
          sortOrder={sortOrder}
          onSortOrderChange={(val) => {
            setSortOrder(val);
            setPageStr('1');
          }}
        />
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
          sourceLabel="CRM-Daten"
          height={220}
          onRetry={stateInfo.type === 'error' ? () => void refetch() : undefined}
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

      {/* Qualifizierungs-Drawer */}
      <LeadQualificationDrawer
        key={selectedLead ? String(selectedLead.id) : 'empty'}
        lead={selectedLead}
        isOpen={Boolean(selectedLead)}
        onClose={() => setSelectedLead(null)}
        organizationId={session?.organizationId}
        isViewer={isViewer}
        onConvertToDeal={(l) => {
          setSelectedLead(null);
          setConvertingLead(l);
        }}
      />

      {/* Konvertierungs-Modal */}
      <LeadConversionModal
        lead={convertingLead}
        isOpen={Boolean(convertingLead)}
        onClose={() => setConvertingLead(null)}
        onSuccess={handleConversionSuccess}
        organizationId={session?.organizationId}
      />
    </div>
  );
}
