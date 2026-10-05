// Executive Dashboard, Teilauftrag 5 (Auftrag 074): Kachel mit Lazy-Aktivierung. Daten werden erst
// abgefragt, wenn die Kachel im Bereich war; Filter gelten erst bei Annäherung, damit außerhalb
// des Bereichs keine Abfrage startet und unter einem neuen Filter keine alten Daten stehen.
import { useEffect, useRef } from 'react';
import type { DashboardFilters, DashboardTileConfig } from '../model/dashboardConfig';
import type { TileData } from '../data/dashboardData';
import { activeEntryOf } from '../hooks/dashboardEditorReducer';
import { useTileActivation } from '../hooks/useTileActivation';
import type { ChartLoaders } from './charts/chartLoaders';
import { DashboardTile } from './DashboardTile';

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
  onActivated?: (tileId: string) => void;
  /** Hält alle Abfragen an (z. B. während der Arbeitsbereich noch lädt). */
  suspended?: boolean;
  onRetryChartLoad?: () => void;
  chartLoaders?: ChartLoaders;
}

export function LazyDashboardTile({
  tile,
  filters,
  useData,
  onShowDetails,
  onActivated,
  suspended = false,
  onRetryChartLoad,
  chartLoaders,
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

  return (
    <div
      ref={ref}
      onFocusCapture={activate}
      data-testid="lazy-tile"
      data-tile-id={tile.tileId}
      data-active={String(active)}
      className="min-w-0"
    >
      <DashboardTile
        tile={tile}
        entry={activeEntryOf(tile)}
        data={data}
        onShowDetails={onShowDetails}
        onRetryChartLoad={onRetryChartLoad}
        chartLoaders={chartLoaders}
        dashboardFilters={filters}
      />
    </div>
  );
}
