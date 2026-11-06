import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ImportedFunnelDeal } from '@/types/crm';
import { CrmResponsiveList, CrmColumn } from './CrmResponsiveList';

export interface DealsTableCardProps {
  deals: ImportedFunnelDeal[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
}

const COLUMNS: CrmColumn<ImportedFunnelDeal>[] = [
  {
    key: 'dealName',
    label: 'Deal Name',
    render: (r) => <strong className="text-text">{r.dealName}</strong>,
  },
  {
    key: 'stage',
    label: 'Vertriebsphase',
    render: (r) => {
      const s = r.stage.toLowerCase();
      const v = s.includes('gewonnen') ? 'cyan' : s.includes('verloren') ? 'neutral' : 'orange';
      return <Badge variant={v}>{r.stage}</Badge>;
    },
  },
  {
    key: 'amount',
    label: 'Deal-Volumen (€)',
    render: (r) => {
      const s = r.stage.toLowerCase();
      const cls = s.includes('gewonnen')
        ? 'text-primary'
        : s.includes('verloren')
          ? 'text-[var(--color-text-muted)]'
          : 'text-accent';
      return <strong className={`font-mono ${cls}`}>{r.amount.toLocaleString('de-DE')} €</strong>;
    },
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

export function DealsTableCard({
  deals,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: DealsTableCardProps) {
  return (
    <Card variant="glass" padding="0">
      <CrmResponsiveList
        caption="Deal Pipeline Tabelle"
        columns={COLUMNS}
        rows={deals}
        keyExtractor={(r) => r.id}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        renderMobileCard={(r) => (
          <div className="crm-v2-mobile-card">
            <div className="crm-v2-mobile-card-header">
              <span className="crm-v2-mobile-card-title">{r.dealName}</span>
              <Badge
                variant={
                  r.stage.toLowerCase().includes('gewonnen')
                    ? 'cyan'
                    : r.stage.toLowerCase().includes('verloren')
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
                  r.stage.toLowerCase().includes('gewonnen')
                    ? 'text-primary'
                    : r.stage.toLowerCase().includes('verloren')
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
  );
}
