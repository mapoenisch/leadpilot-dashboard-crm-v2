import { useState, useMemo } from 'react';
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
        !d.stage.toLowerCase().includes('gewonnen') && !d.stage.toLowerCase().includes('verloren'),
    );
  }, [deals]);

  const openVolume = useMemo(() => {
    return openDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
  }, [openDeals]);

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
          className={`font-mono ${
            r.stage.includes('gewonnen')
              ? 'text-primary'
              : r.stage.includes('verloren')
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
          description="Pipeline-Übersicht aller 40 historisch importierten Funnel Deals aus Ebene A mit Volumen, Stage und Abschlussdatum."
        />
        <div className="flex gap-[var(--space-2)] flex-wrap">
          <Badge variant="cyan">Ebene A Pipeline</Badge>
          <Badge variant="neutral">40 Funnel Deals</Badge>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="crm-v2-kpi-grid">
        <Card variant="glass" featured>
          <div className="text-[13px] text-[var(--color-text-muted)]">Funnel Deals Gesamt</div>
          <div className="font-display text-[28px] font-bold my-[4px] text-primary">
            {deals.length}
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">
            Importierter Funnel-Bestand
          </div>
        </Card>

        <Card variant="glass">
          <div className="text-[13px] text-[var(--color-text-muted)]">Pipeline-Gesamtvolumen</div>
          <div className="font-display text-[28px] font-semibold my-[4px] text-text">
            {totalVolume.toLocaleString('de-DE')} €
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">
            Ø{' '}
            {(totalVolume / (deals.length || 1)).toLocaleString('de-DE', {
              maximumFractionDigits: 0,
            })}{' '}
            € je Deal
          </div>
        </Card>

        <Card variant="glass">
          <div className="text-[13px] text-[var(--color-text-muted)]">Gewonnene Deals</div>
          <div className="font-display text-[28px] font-bold my-[4px] text-primary">
            {wonDeals.length}{' '}
            <span className="text-[15px] text-[var(--color-text-muted)]">
              ({wonVolume.toLocaleString('de-DE')} €)
            </span>
          </div>
          <div className="text-[12px] text-success">Closed-Won Pipeline</div>
        </Card>

        <Card variant="glass">
          <div className="text-[13px] text-[var(--color-text-muted)]">Offene Pipeline</div>
          <div className="font-display text-[28px] font-bold my-[4px] text-accent">
            {openDeals.length}{' '}
            <span className="text-[15px] text-[var(--color-text-muted)]">
              ({openVolume.toLocaleString('de-DE')} €)
            </span>
          </div>
          <div className="text-[12px] text-[var(--color-text-muted)]">
            In Qualifizierung / Verhandlung
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
            onChange={(e) => setSearchTerm(e.target.value)}
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
          <div className="text-center p-[var(--space-8)] text-[var(--color-text-muted)]">
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
                    className={`crm-v2-mobile-card-value font-mono font-semibold ${
                      r.stage.includes('gewonnen')
                        ? 'text-primary'
                        : r.stage.includes('verloren')
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
