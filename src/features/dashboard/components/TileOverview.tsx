// Executive Dashboard, Teilauftrag 4 (Auftrag 073): Übersichtskacheln (Team/HR, Roadmap,
// Live-Aktivität). Zeigt vorhandene Felder der Quelle kompakt; keine neuen Kennzahlen.
import { LIVE_KPI_DEFINITIONS } from '@/services/liveKpi/liveKpiDefinitions';
import type { TileOverview as TileOverviewData } from '../data/dashboardData';
import { formatAsOf, formatTileValue } from './tileFormat';

const MAX_ROWS = 6;
const ROW = 'flex items-baseline justify-between gap-[12px] py-[6px]';
const LIST =
  'm-0 list-none divide-y divide-solid divide-[var(--color-border-glass,rgba(0,217,198,0.08))] p-0 text-[13px]';
const liveLabel = (id: string) => LIVE_KPI_DEFINITIONS.find((def) => def.id === id)?.label ?? id;

export function TileOverview({ overview }: { overview: TileOverviewData }) {
  if (overview.kind === 'team_hr') {
    return (
      <ul data-testid="tile-overview" className={LIST}>
        {overview.data.metrics.slice(0, MAX_ROWS).map((metric) => (
          <li key={metric.label} className={ROW}>
            <span className="text-[var(--color-text-muted)]">{metric.label}</span>
            <span className="text-right font-mono text-primary">{metric.val}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (overview.kind === 'roadmap') {
    return (
      <ul data-testid="tile-overview" className={LIST}>
        {overview.data.releases.slice(0, MAX_ROWS).map((release) => (
          <li key={`${release.quarter}-${release.title}`} className={ROW}>
            <span className="min-w-0">
              <span className="font-mono text-[12px] text-primary">{release.quarter}</span>{' '}
              <span className="text-[var(--color-text-primary,#e6f3f1)]">{release.title}</span>
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
      {overview.data.slice(0, MAX_ROWS).map((item) => (
        <li key={`${item.kpiId}-${item.occurredAt}`} className={ROW}>
          <span className="min-w-0">
            <span className="text-[var(--color-text-primary,#e6f3f1)]">
              {liveLabel(item.kpiId)}
            </span>{' '}
            <span className="text-[12px] text-[var(--color-text-muted)]">
              {formatAsOf(item.occurredAt) ?? ''}
            </span>
          </span>
          <span className="shrink-0 font-mono text-primary">
            {formatTileValue(item.value, item.unit, 'exakt')}
          </span>
        </li>
      ))}
    </ul>
  );
}
