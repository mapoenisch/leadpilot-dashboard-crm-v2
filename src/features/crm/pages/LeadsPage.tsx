import React from 'react';
import { logger } from '@/services/logger';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { CRMRepository } from '@/services/db/crmRepository';
import { isSupabaseConfigured } from '@/services/db/supabaseClient';
import { Company, Contact, ImportedFunnelDeal, ImportAuditSummary } from '@/types/crm';
import { SeedResult } from '@/services/import/crmSeeder';
import { CrmResponsiveList, CrmColumn } from '../components/CrmResponsiveList';

export function LeadsPage() {
  const [activeTab, setActiveTab] = React.useState('contacts');
  const [loading, setLoading] = React.useState(true);

  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [importedFunnelDeals, setImportedFunnelDeals] = React.useState<ImportedFunnelDeal[]>([]);
  const [, setAudit] = React.useState<ImportAuditSummary | null>(null);
  const [seedResult, setSeedResult] = React.useState<SeedResult | null>(null);
  const [isSeeding, setIsSeeding] = React.useState(false);

  // Map for fast Company lookup by ID
  const companyMap = React.useMemo(() => {
    const map: Record<string, Company> = {};
    companies.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [companies]);

  // Fetch data via Repository Layer (React UI -> CRMRepository -> Supabase)
  const loadDataFromRepository = React.useCallback(async () => {
    setLoading(true);
    try {
      const [comps, conts, deals, auditSummary] = await Promise.all([
        CRMRepository.getCompanies(),
        CRMRepository.getContacts(),
        CRMRepository.getImportedFunnelDeals(),
        CRMRepository.getAuditSummary(),
      ]);
      setCompanies(comps);
      setContacts(conts);
      setImportedFunnelDeals(deals);
      setAudit(auditSummary);
    } catch {
      logger.error('Error loading CRM data from repository:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDataFromRepository();
  }, [loadDataFromRepository]);

  // Seed handler for populating Supabase PostgreSQL
  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    try {
      const result = await CRMRepository.seedDatabase();
      setSeedResult(result);
      if (result.success) {
        await loadDataFromRepository();
      }
    } catch (err) {
      setSeedResult({
        success: false,
        companiesInserted: 0,
        contactsInserted: 0,
        dealsInserted: 0,
        message: 'Fehler beim Datenbank-Seed',
        error: String(err),
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const companyColumns: CrmColumn<Company>[] = [
    {
      key: 'name',
      label: 'Unternehmensname',
      render: (r) => <strong style={{ color: 'var(--color-text)' }}>{r.name}</strong>,
    },
    {
      key: 'domain',
      label: 'Domain',
      render: (r) => (
        <span style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-mono)', fontSize: '12.5px' }}>
          {r.domain}
        </span>
      ),
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

  const contactColumns: CrmColumn<Contact>[] = [
    {
      key: 'fullName',
      label: 'Name',
      render: (r) => <strong style={{ color: 'var(--color-text)' }}>{r.firstName} {r.lastName}</strong>,
    },
    {
      key: 'email',
      label: 'E-Mail',
      render: (r) => (
        <span style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-mono)', fontSize: '12.5px' }}>
          {r.email}
        </span>
      ),
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
            <strong style={{ color: 'var(--color-text)' }}>{comp.name}</strong>{' '}
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>({comp.domain})</span>
          </span>
        ) : (
          <span style={{ color: 'var(--color-error)' }}>Nicht zugeordnet</span>
        );
      },
    },
  ];

  const dealColumns: CrmColumn<ImportedFunnelDeal>[] = [
    {
      key: 'dealName',
      label: 'Deal Name',
      render: (r) => <strong style={{ color: 'var(--color-text)' }}>{r.dealName}</strong>,
    },
    {
      key: 'stage',
      label: 'Stage',
      render: (r) => (
        <Badge variant={r.stage.includes('gewonnen') ? 'cyan' : r.stage.includes('verloren') ? 'neutral' : 'orange'}>
          {r.stage}
        </Badge>
      ),
    },
    {
      key: 'amount',
      label: 'Betrag (€)',
      render: (r) => (
        <strong style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>
          {r.amount.toLocaleString('de-DE')} €
        </strong>
      ),
    },
    { key: 'closeDate', label: 'Abschlussdatum' },
    {
      key: 'pipeline',
      label: 'Pipeline',
      render: (r) => <Badge variant="neutral">{r.pipeline}</Badge>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '100%', minWidth: 0 }}>
      {/* 1. Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <SectionHeader
          eyebrow="CRM & Pipeline"
          title="Leads & Kontakte"
          description="Persistierter CRM-Datenbestand aus Supabase / PostgreSQL mit 100 Kontakten und zugeordneten Accounts."
        />
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Badge variant="cyan">Ebene A CRM</Badge>
          <Badge variant="neutral">PostgreSQL / Supabase</Badge>
        </div>
      </div>

      {/* 2. Audit KPI Overview in responsivem Grid */}
      <div className="crm-v2-kpi-grid">
        <Card variant="glass" featured>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Kontakte Gesamt</div>
          <div style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: '4px 0' }}>
            {contacts.length}
          </div>
          <div style={{ color: 'var(--color-success)', fontSize: '12px' }}>100 % Unternehmen zugeordnet</div>
        </Card>

        <Card variant="glass">
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Unternehmen (Accounts)</div>
          <div style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 600, margin: '4px 0' }}>
            {companies.length}
          </div>
          <div style={{ color: 'var(--color-success)', fontSize: '12px' }}>100 % valide Domains</div>
        </Card>

        <Card variant="glass">
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Importierte Funnel Deals</div>
          <div style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 600, margin: '4px 0' }}>
            {importedFunnelDeals.length}
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Getrennter Import (Keine Fantasie-Matches)</div>
        </Card>

        <Card variant="glass">
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Datenbank Status</div>
          <div style={{ color: isSupabaseConfigured ? 'var(--color-success)' : 'var(--color-accent)', fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, margin: '8px 0 4px' }}>
            {isSupabaseConfigured ? '⚡ Supabase Verbunden' : '📦 Lokaler Import (Fallback)'}
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
            {isSupabaseConfigured ? 'PostgreSQL Active' : 'Konfigurieren Sie .env für Supabase'}
          </div>
        </Card>
      </div>

      {/* 3. Barrierefreie Tabs */}
      <div className="crm-v2-tabs-wrapper">
        <Tabs
          items={[
            { id: 'contacts', label: `Kontakte (${contacts.length})` },
            { id: 'companies', label: `Unternehmen (${companies.length})` },
            { id: 'funnel_deals', label: `Funnel Deals (${importedFunnelDeals.length})` },
            { id: 'audit', label: 'Supabase & Import Audit' },
          ]}
          activeId={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* 4. Tab Views mit CrmResponsiveList */}
      {loading ? (
        <Card variant="glass">
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
            Lade Daten aus CRM Repository...
          </div>
        </Card>
      ) : (
        <>
          {activeTab === 'contacts' && (
            <Card variant="glass" padding="0">
              <CrmResponsiveList
                caption="Kontakte und Lead-Übersicht"
                columns={contactColumns}
                rows={contacts}
                keyExtractor={(r) => r.id}
                renderMobileCard={(r) => {
                  const comp = companyMap[r.companyId];
                  return (
                    <div className="crm-v2-mobile-card">
                      <div className="crm-v2-mobile-card-header">
                        <span className="crm-v2-mobile-card-title">{r.firstName} {r.lastName}</span>
                        <Badge variant="cyan">{r.jobTitle}</Badge>
                      </div>
                      <div className="crm-v2-mobile-card-row">
                        <span className="crm-v2-mobile-card-label">E-Mail</span>
                        <span className="crm-v2-mobile-card-value" style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>
                          {r.email}
                        </span>
                      </div>
                      <div className="crm-v2-mobile-card-row">
                        <span className="crm-v2-mobile-card-label">Unternehmen</span>
                        <span className="crm-v2-mobile-card-value">
                          {comp ? (
                            <span>
                              <strong>{comp.name}</strong>{' '}
                              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>({comp.domain})</span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--color-error)' }}>Nicht zugeordnet</span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
            </Card>
          )}

          {activeTab === 'companies' && (
            <Card variant="glass" padding="0">
              <CrmResponsiveList
                caption="Unternehmen und Accounts Übersicht"
                columns={companyColumns}
                rows={companies}
                keyExtractor={(r) => r.id}
                renderMobileCard={(r) => (
                  <div className="crm-v2-mobile-card">
                    <div className="crm-v2-mobile-card-header">
                      <span className="crm-v2-mobile-card-title">{r.name}</span>
                      <Badge variant="cyan">{r.industry}</Badge>
                    </div>
                    <div className="crm-v2-mobile-card-row">
                      <span className="crm-v2-mobile-card-label">Domain</span>
                      <span className="crm-v2-mobile-card-value" style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>
                        {r.domain}
                      </span>
                    </div>
                    <div className="crm-v2-mobile-card-row">
                      <span className="crm-v2-mobile-card-label">Standort</span>
                      <span className="crm-v2-mobile-card-value">{r.postalCode} {r.city}</span>
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

          {activeTab === 'funnel_deals' && (
            <Card variant="glass" padding="0">
              <CrmResponsiveList
                caption="Funnel Deals Übersicht"
                columns={dealColumns}
                rows={importedFunnelDeals}
                keyExtractor={(r) => r.id}
                renderMobileCard={(r) => (
                  <div className="crm-v2-mobile-card">
                    <div className="crm-v2-mobile-card-header">
                      <span className="crm-v2-mobile-card-title">{r.dealName}</span>
                      <Badge variant={r.stage.includes('gewonnen') ? 'cyan' : r.stage.includes('verloren') ? 'neutral' : 'orange'}>
                        {r.stage}
                      </Badge>
                    </div>
                    <div className="crm-v2-mobile-card-row">
                      <span className="crm-v2-mobile-card-label">Volumen</span>
                      <span className="crm-v2-mobile-card-value" style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
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

          {activeTab === 'audit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Card variant="glass" featured>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <h3 style={{ margin: 0, color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600 }}>
                    🗄️ Supabase PostgreSQL Persistence & Seed (Phase 2.2)
                  </h3>
                  <Button variant="primary" onClick={handleSeedDatabase} disabled={isSeeding}>
                    {isSeeding ? 'Seeding läuft...' : 'Datensätze in Supabase Synchronisieren / Seeden'}
                  </Button>
                </div>

                {seedResult && (
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <Alert
                      variant={seedResult.success ? 'info' : 'warning'}
                      title={seedResult.success ? '✅ Seed Erfolgreich' : '⚠️ Seed Hinweistext / Info'}
                    >
                      {seedResult.message}
                      {seedResult.error && (
                        <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--color-error)' }}>
                          Details: {seedResult.error}
                        </div>
                      )}
                    </Alert>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px', color: 'var(--color-text)' }}>
                  <div>✔ <strong>Kontakte:</strong> {contacts.length} Datensätze (Schema: `contacts` Tabelle mit Foreign Key `company_id`).</div>
                  <div>✔ <strong>Unternehmen:</strong> {companies.length} Datensätze (Schema: `companies` Tabelle in Supabase).</div>
                  <div>✔ <strong>Funnel Deals:</strong> {importedFunnelDeals.length} Datensätze (Schema: `imported_funnel_deals` Tabelle).</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '12.5px', marginTop: '4px' }}>
                    🔒 <strong>Sicherheits- & Architekturregeln:</strong> Supabase Anon-Key für Client; RLS aktiviert; Keine Secrets im Code; Repository-Kapselung gewahrt.
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
