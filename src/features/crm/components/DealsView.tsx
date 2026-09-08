import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectOption } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { ImportedFunnelDeal } from '@/types/crm';
import { CrmResponsiveList, CrmColumn } from './CrmResponsiveList';

export interface DealsViewProps {
  deals: ImportedFunnelDeal[];
  loading?: boolean;
}

export function DealsView({ deals, loading }: DealsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('ALL');

  const stageOptions: SelectOption[] = useMemo(() => {
    const set = new Set(deals.map((d) => d.stage).filter(Boolean));
    return [
      { value: 'ALL', label: 'Alle Stages' },
      ...Array.from(set).map((st) => ({ value: st, label: st })),
    ];
  }, [deals]);

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      const matchSearch =
        d.dealName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.pipeline.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStage = stageFilter === 'ALL' || d.stage === stageFilter;
      return matchSearch && matchStage;
    });
  }, [deals, searchTerm, stageFilter]);

  const totalVolume = useMemo(() => {
    return deals.reduce((sum, d) => sum + (d.amount || 0), 0);
  }, [deals]);

  const wonDeals = useMemo(() => {
    return deals.filter((d) => d.stage.toLowerCase().includes('gewonnen'));
  }, [deals]);

  const wonVolume = useMemo(() => {
    return wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
  }, [wonDeals]);

  const openDeals = useMemo(() => {
    return deals.filter(
      (d) =>
        !d.stage.toLowerCase().includes('gewonnen') &&
        !d.stage.toLowerCase().includes('verloren')
    );
  }, [deals]);

  const openVolume = useMemo(() => {
    return openDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
  }, [openDeals]);

  const columns: CrmColumn<ImportedFunnelDeal>[] = [
    {
      key: 'dealName',
      label: 'Deal Name',
      render: (r) => <strong style={{ color: 'var(--color-text)' }}>{r.dealName}</strong>,
    },
    {
      key: 'stage',
      label: 'Deal Stage',
      render: (r) => (
        <Badge
          variant={
            r.stage.includes('gewonnen')
              ? 'cyan'
              : r.stage.includes('verloren')
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
          style={{
            color: r.stage.includes('gewonnen')
              ? 'var(--color-primary)'
              : r.stage.includes('verloren')
              ? 'var(--color-text-muted)'
              : 'var(--color-accent)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {r.amount.toLocaleString('de-DE')} €
        </strong>
      ),
    },
    {
      key: 'closeDate',
      label: 'Abschlussdatum',
      render: (r) => (
        <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{r.closeDate}</span>
      ),
    },
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
          title="Deal Pipeline"
          description="Pipeline-Übersicht aller 40 historisch importierten Funnel Deals aus Ebene A mit Volumen, Stage und Abschlussdatum."
        />
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Badge variant="cyan">Ebene A Pipeline</Badge>
          <Badge variant="neutral">40 Funnel Deals</Badge>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="crm-v2-kpi-grid">
        <Card variant="glass" featured>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Funnel Deals Gesamt</div>
          <div style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: '4px 0' }}>
            {deals.length}
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Importierter Funnel-Bestand</div>
        </Card>

        <Card variant="glass">
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Pipeline-Gesamtvolumen</div>
          <div style={{ color: 'var(--color-text)', fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 600, margin: '4px 0' }}>
            {totalVolume.toLocaleString('de-DE')} €
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>
            Ø {(totalVolume / (deals.length || 1)).toLocaleString('de-DE', { maximumFractionDigits: 0 })} € je Deal
          </div>
        </Card>

        <Card variant="glass">
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Gewonnene Deals</div>
          <div style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: '4px 0' }}>
            {wonDeals.length} <span style={{ fontSize: '15px', color: 'var(--color-text-muted)' }}>({wonVolume.toLocaleString('de-DE')} €)</span>
          </div>
          <div style={{ color: 'var(--color-success)', fontSize: '12px' }}>Closed-Won Pipeline</div>
        </Card>

        <Card variant="glass">
          <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Offene Pipeline</div>
          <div style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: '4px 0' }}>
            {openDeals.length} <span style={{ fontSize: '15px', color: 'var(--color-text-muted)' }}>({openVolume.toLocaleString('de-DE')} €)</span>
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>In Qualifizierung / Verhandlung</div>
        </Card>
      </div>

      {/* 3. Filter & Search Bar */}
      <div className="crm-v2-filter-bar">
        <div style={{ flex: '1 1 280px', maxWidth: '100%' }}>
          <Input
            type="search"
            aria-label="Deals suchen"
            placeholder="Deal Name oder Pipeline suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leadingIcon={<Search size={16} />}
            sizeVariant="sm"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap', flex: '0 1 auto' }}>
          <div style={{ minWidth: '180px', width: '100%', maxWidth: '240px' }}>
            <Select
              label="Stage:"
              options={stageOptions}
              value={stageFilter}
              onChange={setStageFilter}
              sizeVariant="sm"
              fullWidth
            />
          </div>
          <div className="crm-v2-result-count" aria-live="polite">
            {filteredDeals.length} von {deals.length} Deals
          </div>
        </div>
      </div>

      {/* 4. Table & Cards */}
      {loading ? (
        <Card variant="glass">
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
            Lade Deal-Pipeline...
          </div>
        </Card>
      ) : (
        <Card variant="glass" padding="0">
          <CrmResponsiveList
            caption="Deal Pipeline Tabelle"
            columns={columns}
            rows={filteredDeals}
            keyExtractor={(r) => r.id}
            renderMobileCard={(r) => (
              <div className="crm-v2-mobile-card">
                <div className="crm-v2-mobile-card-header">
                  <span className="crm-v2-mobile-card-title">{r.dealName}</span>
                  <Badge
                    variant={
                      r.stage.includes('gewonnen')
                        ? 'cyan'
                        : r.stage.includes('verloren')
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
                    className="crm-v2-mobile-card-value"
                    style={{
                      color: r.stage.includes('gewonnen')
                        ? 'var(--color-primary)'
                        : r.stage.includes('verloren')
                        ? 'var(--color-text-muted)'
                        : 'var(--color-accent)',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                    }}
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
