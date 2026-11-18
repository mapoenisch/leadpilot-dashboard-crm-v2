// Executive Dashboard, Teilauftrag 5 (Auftrag 074): Kachel mit Lazy-Aktivierung. Daten werden erst
// abgefragt, wenn die Kachel im Bereich war; Filter gelten erst bei Annäherung, damit außerhalb
// des Bereichs keine Abfrage startet und unter einem neuen Filter keine alten Daten stehen.
// Auftrag 166 (P13a): Schwellenwert-Bewertung und Badge-Anzeige auf der Kachel.
import { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { DashboardFilters, DashboardTileConfig } from '../model/dashboardConfig';
import type { TileThresholdRule } from '../model/thresholdRuleV2';
import { evaluateThresholdV2 } from '../model/thresholdRuleV2';
import type { TileData } from '../data/dashboardData';
import { activeEntryOf } from '../hooks/dashboardEditorReducer';
import { useTileActivation } from '../hooks/useTileActivation';
import type { ChartLoaders } from './charts/chartLoaders';
import { DashboardTile } from './DashboardTile';
import { TileThresholdBadge } from './TileThresholdBadge';

export type TileDataHook = (
  tile: DashboardTileConfig,
  filters?: DashboardFilters,
  options?: { enabled?: boolean },
) => TileData;

export interface LazyDashboardTileProps {
  tile: DashboardTileConfig;
  filters?: DashboardFilters;
  useData: TileDataHook;
  onShowDetails: (tileId: string) => void;
  detailsBlocked?: boolean;
  onActivated?: (tileId: string) => void;
  /** Hält alle Abfragen an (z. B. während der Arbeitsbereich noch lädt). */
  suspended?: boolean;
  onRetryChartLoad?: () => void;
  chartLoaders?: ChartLoaders;
  /** Auftrag 166 (P13a): Schwellenwert-Regel der Kachel */
  threshold?: TileThresholdRule;
}

export function LazyDashboardTile({
  tile,
  filters,
  useData,
  onShowDetails,
  detailsBlocked,
  onActivated,
  suspended = false,
  onRetryChartLoad,
  chartLoaders,
  threshold,
}: LazyDashboardTileProps) {
  const { ref, near, active, activate } = useTileActivation();
  const lastApplied = useRef(filters);
  const applied = near ? filters : lastApplied.current;
  useEffect(() => {
    if (near) lastApplied.current = filters;
  });

  const data = useData(tile, applied, { enabled: active && !suspended });

  const notify = useRef(onActivated);
  notify.current = onActivated;
  useEffect(() => {
    if (active) notify.current?.(tile.tileId);
  }, [active, tile.tileId]);

  const entry = activeEntryOf(tile);
  const effectiveThreshold = threshold ?? (tile as { threshold?: TileThresholdRule }).threshold;
  const isSingleValue = entry
    ? ['einzelwert', 'verhaeltnis', 'anteil'].includes(entry.shape)
    : true;
  const singleValue =
    isSingleValue && data && (data.state === 'bereit' || data.state === 'veraltet')
      ? data.value
      : null;

  const evaluation = useMemo(() => {
    if (!effectiveThreshold || !isSingleValue) return undefined;
    return evaluateThresholdV2(effectiveThreshold, singleValue, data?.state, entry?.unit);
  }, [effectiveThreshold, isSingleValue, singleValue, data?.state, entry?.unit]);

  const borderClass =
    evaluation?.stufe === 'kritisch'
      ? 'border-l-2 border-l-rose-500'
      : evaluation?.stufe === 'warnung'
        ? 'border-l-2 border-l-amber-400'
        : '';

  const hasBadge =
    evaluation &&
    (evaluation.stufe === 'warnung' ||
      evaluation.stufe === 'kritisch' ||
      evaluation.stufe === 'regel_ungueltig');

  return (
    <div
      ref={ref}
      onFocusCapture={activate}
      data-testid="lazy-tile"
      data-tile-id={tile.tileId}
      data-active={String(active)}
      className="min-w-0 relative h-full w-full"
    >
      {hasBadge && (
        <div className="absolute top-3.5 right-4 z-10 pointer-events-auto">
          <TileThresholdBadge evaluation={evaluation} />
        </div>
      )}
      <DashboardTile
        tile={tile}
        entry={entry}
        data={data}
        onShowDetails={onShowDetails}
        detailsBlocked={detailsBlocked}
        onRetryChartLoad={onRetryChartLoad}
        chartLoaders={chartLoaders}
        dashboardFilters={filters}
        className={cn(borderClass)}
      />
    </div>
  );
}
