// Executive Dashboard, Teilauftrag 4 (Auftrag 073): Übersichtskacheln (Team/HR, Roadmap,
// Live-Aktivität). Zeigt vorhandene Felder der Quelle vollständig; der feste Rahmen der Kachel
// scrollt. Keine neuen Kennzahlen.
import { Badge } from '@/components/ui/Badge';
import { LIVE_KPI_DEFINITIONS } from '@/services/liveKpi/liveKpiDefinitions';
import type { TileOverview as TileOverviewData } from '../data/dashboardData';
import { formatAsOf, formatTileValue } from './tileFormat';

const ROW = 'flex items-baseline justify-between gap-[12px] py-[6px]';
const LIST =
  'm-0 list-none divide-y divide-solid divide-[var(--color-border-glass,rgba(0,217,198,0.08))] p-0 text-[13px]';
const SECTION_TITLE =
  'm-0 pt-[10px] text-[11px] font-semibold uppercase tracking-[0.12em] text-primary';
const liveLabel = (id: string) => LIVE_KPI_DEFINITIONS.find((def) => def.id === id)?.label ?? id;

export function TileOverview({ overview }: { overview: TileOverviewData }) {
  if (overview.kind === 'team_hr') {
    const { metrics, structure, bottlenecks } = overview.data;
    const units = [structure.root, ...structure.units, structure.total];
    return (
      <div data-testid="tile-overview">
        <ul data-testid="tile-overview-metrics" className={LIST}>
          {metrics.map((metric) => (
            <li key={metric.label} className={ROW}>
              <span className="text-[var(--color-text-muted)]">{metric.label}</span>
              <span className="text-right font-mono text-primary">{metric.val}</span>
            </li>
          ))}
        </ul>
        <h4 className={SECTION_TITLE}>Teamstruktur</h4>
        <ul data-testid="tile-overview-structure" className={LIST}>
          {units.map((unit) => (
            <li key={`${unit.role}-${unit.fte}`} className={ROW}>
              <span className="min-w-0">
                <span className="text-[var(--color-text-primary,#e6f3f1)]">{unit.role}</span>{' '}
                <span className="text-[12px] text-[var(--color-text-muted)]">{unit.staffing}</span>
              </span>
              <span className="shrink-0 text-right font-mono text-primary">{unit.fte}</span>
            </li>
          ))}
        </ul>
        <h4 className={SECTION_TITLE}>Engpässe und Maßnahmen</h4>
        <ul data-testid="tile-overview-bottlenecks" className={LIST}>
          {bottlenecks.map((text) => (
            <li key={text} className="py-[6px] text-[var(--color-text-muted)]">
              {text}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (overview.kind === 'roadmap') {
    return (
      <ul data-testid="tile-overview" className={LIST}>
        {overview.data.releases.map((release) => (
          <li key={`${release.quarter}-${release.title}`} className={ROW}>
            <span className="min-w-0">
              <span className="font-mono text-[12px] text-primary">{release.quarter}</span>{' '}
              <span className="text-[var(--color-text-primary,#e6f3f1)]">{release.title}</span>
              <span className="block text-[12px] text-[var(--color-text-muted)]">
                {release.desc}
              </span>
            </span>
            <span className="shrink-0 text-[12px] text-[var(--color-text-muted)]">
              {release.status}
            </span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul data-testid="tile-overview" className={LIST}>
      {overview.data.map((item) => (
        <li key={`${item.kpiId}-${item.occurredAt}`} className={ROW}>
          <span className="min-w-0">
            <span className="text-[var(--color-text-primary,#e6f3f1)]">
              {liveLabel(item.kpiId)}
            </span>{' '}
            <span className="text-[12px] text-[var(--color-text-muted)]">
              {formatAsOf(item.occurredAt) ?? ''}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-[6px]">
            {item.qualityStatus === 'degraded' ? (
              <Badge variant="orange" size="sm">
                Eingeschränkt
              </Badge>
            ) : null}
            <span className="font-mono text-primary">
              {formatTileValue(item.value, item.unit, 'exakt')}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
