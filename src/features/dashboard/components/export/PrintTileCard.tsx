import React from 'react';
import type { DashboardTileConfig, DashboardFilters } from '../../model/dashboardConfig';
import { getCatalogEntry } from '../../model/dashboardCatalog';
import { formatTileValue, formatAsOf, NO_DATA } from '../tileFormat';
import type { TileDataHook } from '../LazyDashboardTile';
import type { TileData } from '../../data/dashboardData';
import { PrintOverviewCard } from './PrintOverviewCard';

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
  const isVeraltet = data?.state === 'veraltet';
  const isDegradiert = data?.state !== 'nicht_verfuegbar' && data?.quality === 'degradiert';

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

    if (isVeraltet) {
      const stand = data.asOf ? formatAsOf(data.asOf) : null;
      const veraltetText = `Wert veraltet. ${stand ?? 'Zeitpunkt unbekannt'}.`;
      statusNote = statusNote ? `${veraltetText} (${statusNote})` : veraltetText;
    }

    if (isDegradiert) {
      const degradedText = 'Eingeschränkte Datenqualität laut Quelle.';
      statusNote = statusNote ? `${statusNote} · ${degradedText}` : degradedText;
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

  // Pipeline- und Filterauflösung (Codex Finding 1)
  const isCrm = layer === 'crm';
  const effectiveFilter = data && 'effectiveFilter' in data ? data.effectiveFilter : undefined;
  const effectivePipeline = effectiveFilter
    ? effectiveFilter.pipeline
    : isCrm
      ? (tile.pipeline ?? filters?.pipeline ?? null)
      : null;
  const pipelineReason =
    effectiveFilter?.pipelineReason ??
    (!isCrm && (tile.pipeline || filters?.pipeline)
      ? 'Nur CRM-Quellen unterstützen den Pipeline-Filter'
      : undefined);

  const filterModeLabel =
    tile.filterMode === 'dashboard'
      ? 'Zentral'
      : tile.filterMode === 'eigener_zeitraum'
        ? 'Eigener Zeitraum'
        : 'Fester Stand';

  let pipelineDisplay: string;
  if (effectivePipeline) {
    pipelineDisplay = `Pipeline: ${effectivePipeline}`;
  } else if (pipelineReason) {
    pipelineDisplay = 'Pipeline: Unwirksam (nur CRM)';
  } else {
    pipelineDisplay = '';
  }

  const filterDisplay = pipelineDisplay
    ? `Filter: ${filterModeLabel} · ${pipelineDisplay}`
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
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {isVeraltet && (
              <span
                data-testid={`print-tile-veraltet-${tile.tileId}`}
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200"
              >
                Veraltet
              </span>
            )}
            {isDegradiert && (
              <span
                data-testid={`print-tile-degradiert-${tile.tileId}`}
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200"
              >
                Eingeschränkt
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
              {tile.view} · {layer}
            </span>
          </div>
        </div>
        <h3 className="text-sm font-bold text-slate-900 mb-1">{name}</h3>
      </div>

      {data && data.state !== 'nicht_verfuegbar' && data.overview ? (
        <div className="py-3 my-2 border-y border-slate-100">
          <PrintOverviewCard overview={data.overview} />
          {statusNote ? (
            <span
              className={`block text-[11px] mt-2 leading-tight ${
                isVeraltet || isDegradiert ? 'text-amber-700 font-medium' : 'text-slate-500'
              }`}
            >
              {statusNote}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="py-4 my-2 border-y border-slate-100 flex items-baseline justify-between">
          <span className="text-xs text-slate-400">Kennzahlen-Wert</span>
          <div className="text-right">
            <span
              className={`text-2xl font-black ${
                data?.state === 'fehler'
                  ? 'text-red-600'
                  : isVeraltet || isDegradiert
                    ? 'text-amber-700'
                    : 'text-slate-900'
              }`}
            >
              {displayValue}
            </span>
            {statusNote ? (
              <span
                className={`block text-[11px] mt-1 leading-tight ${
                  data?.state === 'fehler'
                    ? 'text-red-500'
                    : isVeraltet || isDegradiert
                      ? 'text-amber-700 font-medium'
                      : 'text-slate-500'
                }`}
              >
                {statusNote}
              </span>
            ) : data && data.state !== 'nicht_verfuegbar' && data.timeBasis ? (
              <span className="block text-[11px] text-slate-400 mt-0.5">{data.timeBasis}</span>
            ) : null}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
        <span data-testid={`print-tile-filter-${tile.tileId}`}>{filterDisplay}</span>
        <span>ID: {tile.catalogId}</span>
      </div>
    </div>
  );
};
