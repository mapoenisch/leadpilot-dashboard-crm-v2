import { Card } from '@/components/ui/Card';

export interface LeadsKpiGridProps {
  countText: string;
  isAudit: boolean;
  isError: boolean;
  hasData: boolean;
  page: number;
  pageSize: number;
  total: number;
  confLabel: string;
}

export function LeadsKpiGrid({
  countText,
  isAudit,
  isError,
  hasData,
  page,
  pageSize,
  total,
  confLabel,
}: LeadsKpiGridProps) {
  const kpis = [
    {
      t: 'Gefundene Datensätze',
      v: countText,
      n: isAudit ? 'Im Audit-Tab keine Listenabfrage' : 'Mandanten-geprüft',
      c: 'text-primary font-bold',
      f: true,
    },
    {
      t: 'Aktuelle Seite',
      v:
        isAudit || isError || !hasData
          ? '–'
          : `${page} / ${Math.max(1, Math.ceil(total / pageSize))}`,
      n: `${pageSize} pro Seite`,
      c: 'text-text font-semibold',
    },
    {
      t: 'Aktiver Tab',
      v: isAudit ? 'Audit' : confLabel,
      n: 'Serverseitig abgefragt',
      c: 'text-text font-semibold text-[20px]',
    },
    {
      t: 'Lead-Scoring',
      v: '🔥 ICP-Scoring aktiv',
      n: 'BANT-Qualifizierung bereit',
      c: 'text-success text-[18px]',
    },
  ];

  return (
    <div className="crm-v2-kpi-grid">
      {kpis.map((k) => (
        <Card key={k.t} variant="glass" featured={Boolean(k.f)}>
          <div className="text-[13px] text-[var(--color-text-muted)]">{k.t}</div>
          <div className={`font-display text-[28px] my-[4px] truncate ${k.c}`}>{k.v}</div>
          <div className="text-[12px] text-success">{k.n}</div>
        </Card>
      ))}
    </div>
  );
}
