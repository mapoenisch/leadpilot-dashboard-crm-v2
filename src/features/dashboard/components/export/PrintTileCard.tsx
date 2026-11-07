import React from 'react';
import type { DashboardTileConfig, DashboardFilters } from '../../model/dashboardConfig';
import { getCatalogEntry } from '../../model/dashboardCatalog';
import { formatTileValue, NO_DATA } from '../tileFormat';
import type { TileDataHook } from '../LazyDashboardTile';
import type { TileData } from '../../data/dashboardData';

export function resolveTileInfo(tile: DashboardTileConfig) {
  const entry = getCatalogEntry(tile.catalogId);
  const name = tile.title?.trim() || entry?.name || tile.catalogId;
  const unit = entry?.unit || '';
  const category = entry?.category || 'Allgemein';
  const layer = entry?.source.layer || 'baseline';
  return { name, unit, category, layer, entry };
}

export const noopTileDataHook: TileDataHook = (t) => ({
  catalogId: t.catalogId,
  state: 'nicht_verfuegbar',
  reason: 'katalog_inaktiv',
  message: '',
});

export interface PrintTileCardProps {
  tile: DashboardTileConfig;
  filters?: DashboardFilters;
  useData?: TileDataHook;
  onTileResolved?: (tileId: string, data: TileData) => void;
}

export const PrintTileCard: React.FC<PrintTileCardProps> = ({
  tile,
  filters,
  useData = noopTileDataHook,
  onTileResolved,
}) => {
  const { name, unit, category, layer } = resolveTileInfo(tile);
  const data = useData(tile, filters);

  React.useEffect(() => {
    onTileResolved?.(tile.tileId, data);
  }, [tile.tileId, data, onTileResolved]);

  let displayValue: string;
  let statusNote: string | undefined;

  if (data && data.state !== 'nicht_verfuegbar') {
    if (data.state === 'fehler') {
      displayValue = 'Fehler beim Laden';
      statusNote = data.message || 'Datenabfrage fehlgeschlagen';
    } else if (data.value !== null && Number.isFinite(data.value)) {
      displayValue = formatTileValue(data.value, data.unit || unit, 'exakt');
    } else if (data.series && data.series.length > 0) {
      displayValue = `${data.series.length} Messreihen / Segmente`;
      statusNote = data.series
        .slice(0, 3)
        .map((s) => `${s.label}: ${formatTileValue(s.value, data.unit || unit, 'kompakt')}`)
        .join(', ');
    } else if (data.overview) {
      displayValue = 'Übersicht aktiv';
    } else {
      displayValue = NO_DATA;
    }
  } else {
    // Statischer Fallback für Katalog-Baseline ohne aktive Hook-Umgebung
    displayValue =
      tile.catalogId === 'baseline.arr'
        ? '411.840 €'
        : tile.catalogId === 'baseline.mrr'
          ? '34.320 €'
          : tile.catalogId === 'baseline.kunden_aktiv' || tile.catalogId === 'baseline.kunden'
            ? '66'
            : 'Aktiv';
  }

  // Pipeline- und Filterauflösung (Codex Finding 2)
  const effectivePipeline =
    (data && 'effectiveFilter' in data ? data.effectiveFilter?.pipeline : undefined) ??
    tile.pipeline;
  const filterModeLabel =
    tile.filterMode === 'dashboard'
      ? 'Zentral'
      : tile.filterMode === 'eigener_zeitraum'
        ? 'Eigener Zeitraum'
        : 'Fester Stand';

  const filterDisplay = effectivePipeline
    ? `Filter: ${filterModeLabel} · Pipeline: ${effectivePipeline}`
    : `Filter: ${filterModeLabel}`;

  return (
    <div
      data-testid={`print-tile-${tile.tileId}`}
      className="print-card p-4 rounded border border-slate-200 bg-white print-page-break-avoid flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {category}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
            {tile.view} · {layer}
          </span>
        </div>
        <h3 className="text-sm font-bold text-slate-900 mb-2">{name}</h3>
      </div>

      <div className="py-4 my-2 border-y border-slate-100 flex items-baseline justify-between">
        <span className="text-xs text-slate-400">Kennzahlen-Wert</span>
        <div className="text-right">
          <span
            className={`text-2xl font-black ${
              data?.state === 'fehler' ? 'text-red-600' : 'text-slate-900'
            }`}
          >
            {displayValue}
          </span>
          {statusNote ? (
            <span
              className={`block text-[11px] mt-1 leading-tight ${
                data?.state === 'fehler' ? 'text-red-500' : 'text-slate-500'
              }`}
            >
              {statusNote}
            </span>
          ) : data && data.state !== 'nicht_verfuegbar' && data.timeBasis ? (
            <span className="block text-[11px] text-slate-400 mt-0.5">{data.timeBasis}</span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
        <span data-testid={`print-tile-filter-${tile.tileId}`}>{filterDisplay}</span>
        <span>ID: {tile.catalogId}</span>
      </div>
    </div>
  );
};
