import { Card } from '@/components/ui/Card';

export interface DealsKpiGridProps {
  countText: string;
  hasData: boolean;
  isError: boolean;
  page: number;
  pageSize: number;
  total: number;
  stageFilter: string;
  stageCount: number;
}

export function DealsKpiGrid({
  countText,
  hasData,
  isError,
  page,
  pageSize,
  total,
  stageFilter,
  stageCount,
}: DealsKpiGridProps) {
  const cards = [
    {
      t: 'Funnel Deals Gesamt',
      v: countText,
      n: 'Mandanten-geprüft',
      c: 'text-primary font-bold',
      f: true,
    },
    {
      t: 'Aktuelle Seite',
      v: isError || !hasData ? '–' : `${page} / ${Math.max(1, Math.ceil(total / pageSize))}`,
      n: `${pageSize} Deals pro Seite`,
      c: 'text-text font-semibold',
    },
    {
      t: 'Gewählte Vertriebsphase',
      v: stageFilter === 'ALL' ? 'Alle Vertriebsphasen' : stageFilter,
      n: `${stageCount} Vertriebsphasen definiert`,
      c: 'text-text font-semibold text-[20px]',
    },
    {
      t: 'Daten-Herkunft',
      v: 'Server Query',
      n: 'Edge Function / RLS geschützt',
      c: 'text-accent font-bold text-[18px]',
    },
  ];

  return (
    <div className="crm-v2-kpi-grid">
      {cards.map((k) => (
        <Card key={k.t} variant="glass" featured={Boolean(k.f)}>
          <div className="text-[13px] text-[var(--color-text-muted)]">{k.t}</div>
          <div className={`font-display text-[28px] my-[4px] truncate ${k.c}`}>{k.v}</div>
          <div className="text-[12px] text-success">{k.n}</div>
        </Card>
      ))}
    </div>
  );
}
