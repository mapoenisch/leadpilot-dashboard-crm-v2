import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectOption } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Company } from '@/types/crm';
import { CrmResponsiveList, CrmColumn } from './CrmResponsiveList';

export interface CompaniesViewProps {
  companies: Company[];
  loading?: boolean;
}

export function CompaniesView({ companies, loading }: CompaniesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState<string>('ALL');

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '100%', minWidth: 0 }}>
      {/* 1. Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <SectionHeader
          eyebrow="CRM & Pipeline"
          title="Unternehmen (Accounts)"
          description="Vollständige Übersicht aller 20 importierten B2B-Unternehmen (Accounts) aus Ebene A mit Firmografie und Mitarbeiterzahlen."
        />
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Badge variant="cyan">Ebene A Import</Badge>
          <Badge variant="neutral">20 B2B Accounts</Badge>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="crm-v2-kpi-grid">
        <Card variant="glass" featured>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Unternehmen (Accounts)</div>
          <div style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: '4px 0' }}>
            {companies.length}
          </div>
          <div style={{ color: 'var(--color-success)', fontSize: '12px' }}>100 % valide Domains</div>
        </Card>

        <Card variant="glass">
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Mitarbeiter Gesamt</div>
          <div style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 600, margin: '4px 0' }}>
            {totalEmployees.toLocaleString('de-DE')} MA
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Ø {avgEmployees} MA je Account</div>
        </Card>

        <Card variant="glass">
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Branchenvielfalt</div>
          <div style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 600, margin: '4px 0' }}>
            {industryOptions.length - 1}
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Schwerpunkt: Maschinenbau & IT</div>
        </Card>

        <Card variant="glass">
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Daten-Herkunft</div>
          <div style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, margin: '8px 0 4px' }}>
            Ebene A Import
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>PostgreSQL / CRM-Repository</div>
        </Card>
      </div>

      {/* 3. Filter & Search Bar */}
      <div className="crm-v2-filter-bar">
        <div style={{ flex: '1 1 280px', maxWidth: '100%' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap', flex: '0 1 auto' }}>
          <div style={{ minWidth: '180px', width: '100%', maxWidth: '240px' }}>
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
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
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
    </div>
  );
}
