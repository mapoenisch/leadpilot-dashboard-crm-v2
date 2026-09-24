import { useMemo } from 'react';
import { Search } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectOption } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Company } from '@/types/crm';
import { useUrlSyncedState } from '@/hooks/useUrlSyncedState';
import { CrmResponsiveList, CrmColumn } from './CrmResponsiveList';

export interface CompaniesViewProps {
  companies: Company[];
  loading?: boolean;
}

export function CompaniesView({ companies, loading }: CompaniesViewProps) {
  // 067J / G56: Filterzustand ist über die URL wiederherstellbar.
  const [searchTerm, setSearchTerm] = useUrlSyncedState('suche', '');
  const [industryFilter, setIndustryFilter] = useUrlSyncedState('branche', 'ALL');

  const industryOptions: SelectOption[] = useMemo(() => {
    const set = new Set(companies.map((c) => c.industry).filter(Boolean));
    return [
      { value: 'ALL', label: 'Alle Branchen' },
      ...Array.from(set).map((ind) => ({ value: ind, label: ind })),
    ];
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.domain && c.domain.toLowerCase().includes(searchTerm.toLowerCase())) ||
        c.city.toLowerCase().includes(searchTerm.toLowerCase());
      const matchIndustry = industryFilter === 'ALL' || c.industry === industryFilter;
      return matchSearch && matchIndustry;
    });
  }, [companies, searchTerm, industryFilter]);

  const totalEmployees = useMemo(() => {
    return companies.reduce((sum, c) => sum + (c.employeeCount || 0), 0);
  }, [companies]);

  const avgEmployees = companies.length > 0 ? Math.round(totalEmployees / companies.length) : 0;

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
          description="Vollständige Übersicht aller 20 importierten B2B-Unternehmen (Accounts) aus Ebene A mit Firmografie und Mitarbeiterzahlen."
        />
        <div className="flex gap-[var(--space-2)] flex-wrap">
          <Badge variant="cyan">Ebene A Import</Badge>
          <Badge variant="neutral">20 B2B Accounts</Badge>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="crm-v2-kpi-grid">
        <Card variant="glass" featured>
          <div className="text-[13px] text-[var(--color-text-muted)]">Unternehmen (Accounts)</div>
          <div className="font-display text-[28px] font-bold my-[4px] text-primary">
            {companies.length}
          </div>
          <div className="text-[12px] text-success">100 % valide Domains</div>
        </Card>

        <Card variant="glass">
          <div className="text-[13px] text-[var(--color-text-muted)]">Mitarbeiter Gesamt</div>
          <div className="font-display text-[28px] font-semibold my-[4px] text-text">
            {totalEmployees.toLocaleString('de-DE')} MA
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">
            Ø {avgEmployees} MA je Account
          </div>
        </Card>

        <Card variant="glass">
          <div className="text-[13px] text-[var(--color-text-muted)]">Branchenvielfalt</div>
          <div className="font-display text-[28px] font-semibold my-[4px] text-text">
            {industryOptions.length - 1}
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">
            Schwerpunkt: Maschinenbau & IT
          </div>
        </Card>

        <Card variant="glass">
          <div className="text-[13px] text-[var(--color-text-muted)]">Daten-Herkunft</div>
          <div className="font-display text-[18px] font-bold mt-[8px] mb-[4px] text-accent">
            Ebene A Import
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">
            PostgreSQL / CRM-Repository
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
            onChange={(e) => setSearchTerm(e.target.value)}
            leadingIcon={<Search size={16} />}
            sizeVariant="sm"
          />
        </div>

        <div className="flex items-center gap-[var(--space-4)] flex-wrap flex-[0_1_auto]">
          <div className="min-w-[180px] w-full max-w-[240px]">
            <Select
              label="Branche:"
              options={industryOptions}
              value={industryFilter}
              onChange={setIndustryFilter}
              sizeVariant="sm"
              fullWidth
            />
          </div>
          <div className="crm-v2-result-count" aria-live="polite">
            {filteredCompanies.length} von {companies.length} Unternehmen
          </div>
        </div>
      </div>

      {/* 4. Table & Cards */}
      {loading ? (
        <Card variant="glass">
          <div className="text-center p-[var(--space-8)] text-[var(--color-text-muted)]">
            Lade Unternehmensdaten...
          </div>
        </Card>
      ) : (
        <Card variant="glass" padding="0">
          <CrmResponsiveList
            caption="Unternehmen und Accounts Tabelle"
            columns={columns}
            rows={filteredCompanies}
            keyExtractor={(r) => r.id}
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
