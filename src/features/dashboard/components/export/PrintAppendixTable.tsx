import React from 'react';
import type { DashboardTileConfig, DashboardFilters } from '../../model/dashboardConfig';
import type { TileDataHook } from '../LazyDashboardTile';
import { formatTileValue, formatAsOf, NO_DATA } from '../tileFormat';
import { resolveTileInfo, noopTileDataHook } from './PrintTileCard';

export interface PrintAppendixRowsProps {
  tile: DashboardTileConfig;
  filters?: DashboardFilters;
  useData?: TileDataHook;
}

export const PrintAppendixRows: React.FC<PrintAppendixRowsProps> = ({
  tile,
  filters,
  useData = noopTileDataHook,
}) => {
  const { name, category, layer, unit } = resolveTileInfo(tile);
  const data = useData(tile, filters);
  const isVeraltet = data?.state === 'veraltet';
  const isDegradiert = data && data.state !== 'nicht_verfuegbar' && data.quality === 'degradiert';
  const stand =
    data && data.state !== 'nicht_verfuegbar' && data.asOf ? formatAsOf(data.asOf) : null;
  const rawTimeBasis =
    data && data.state !== 'nicht_verfuegbar' && data.timeBasis
      ? data.timeBasis
      : 'Aktueller Stand';
  const timeBasis = isVeraltet ? `Veraltet (${stand ?? rawTimeBasis})` : rawTimeBasis;

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

  const pipeline = effectivePipeline
    ? effectivePipeline
    : pipelineReason
      ? 'Unwirksam (nur CRM)'
      : 'Alle';

  const scope =
    (data && 'scope' in data ? data.scope : undefined) ??
    (layer === 'live'
      ? 'organisationsuebergreifend'
      : layer === 'crm'
        ? 'organisation'
        : 'stammdaten');
  const isOrganisationsuebergreifend = scope === 'organisationsuebergreifend';

  if (data && data.state === 'fehler') {
    return (
      <tr key={tile.tileId} className="border-b border-red-100 bg-red-50/20">
        <td className="py-2 px-3 font-medium text-slate-900">{name}</td>
        <td className="py-2 px-3 text-slate-600">{category}</td>
        <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{tile.view}</td>
        <td className="py-2 px-3 text-slate-600">
          {layer}
          {isOrganisationsuebergreifend && (
            <span className="block text-[10px] text-indigo-700 font-medium">Organisationsweit</span>
          )}
        </td>
        <td className="py-2 px-3 text-slate-500">{timeBasis}</td>
        <td className={`py-2 px-3 ${pipelineReason ? 'text-amber-800' : 'text-slate-600'}`}>
          {pipeline}
        </td>
        <td className="py-2 px-3 text-right font-medium text-red-600">
          Fehler: {data.message || 'Abfrage fehlgeschlagen'}
        </td>
      </tr>
    );
  }

  if (data && data.state !== 'nicht_verfuegbar' && data.series && data.series.length > 0) {
    return (
      <>
        {data.series.map((pt, idx) => (
          <tr
            key={`${tile.tileId}-pt-${idx}`}
            className={`border-b ${
              isVeraltet || isDegradiert
                ? 'border-amber-100 bg-amber-50/20'
                : 'border-slate-100 hover:bg-slate-50/50'
            }`}
          >
            <td className="py-2 px-3 font-medium text-slate-900">
              {name} <span className="text-slate-400 font-normal">({pt.label})</span>
            </td>
            <td className="py-2 px-3 text-slate-600">{category}</td>
            <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{tile.view}</td>
            <td className="py-2 px-3 text-slate-600">
              {layer}
              {isOrganisationsuebergreifend && (
                <span className="block text-[10px] text-indigo-700 font-medium">
                  Organisationsweit
                </span>
              )}
            </td>
            <td
              className={`py-2 px-3 ${
                isVeraltet || isDegradiert ? 'text-amber-800 font-semibold' : 'text-slate-500'
              }`}
            >
              {timeBasis}
            </td>
            <td className={`py-2 px-3 ${pipelineReason ? 'text-amber-800' : 'text-slate-600'}`}>
              {pipeline}
            </td>
            <td className="py-2 px-3 text-right font-semibold text-slate-900">
              {formatTileValue(pt.value, data.unit || unit, 'exakt')}
              {isVeraltet && (
                <span className="block text-[10px] text-amber-700 font-normal">
                  Veraltet {stand ? `(${stand})` : ''}
                </span>
              )}
              {isDegradiert && (
                <span className="block text-[10px] text-amber-700 font-normal">
                  Eingeschränkte Qualität
                </span>
              )}
            </td>
          </tr>
        ))}
      </>
    );
  }

  let val = NO_DATA;
  if (data && data.state !== 'nicht_verfuegbar') {
    if (data.value !== null && Number.isFinite(data.value)) {
      val = formatTileValue(data.value, data.unit || unit, 'exakt');
    } else if (data.overview) {
      val = 'Übersicht aktiv';
    }
  } else {
    val =
      tile.catalogId === 'baseline.arr'
        ? '411.840 €'
        : tile.catalogId === 'baseline.mrr'
          ? '34.320 €'
          : tile.catalogId === 'baseline.kunden_aktiv' || tile.catalogId === 'baseline.kunden'
            ? '66'
            : 'Ausgewiesen';
  }

  return (
    <tr
      key={tile.tileId}
      className={`border-b ${
        isVeraltet || isDegradiert
          ? 'border-amber-100 bg-amber-50/20'
          : 'border-slate-100 hover:bg-slate-50/50'
      }`}
    >
      <td className="py-2 px-3 font-medium text-slate-900">{name}</td>
      <td className="py-2 px-3 text-slate-600">{category}</td>
      <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{tile.view}</td>
      <td className="py-2 px-3 text-slate-600">
        {layer}
        {isOrganisationsuebergreifend && (
          <span className="block text-[10px] text-indigo-700 font-medium">Organisationsweit</span>
        )}
      </td>
      <td
        className={`py-2 px-3 ${
          isVeraltet || isDegradiert ? 'text-amber-800 font-semibold' : 'text-slate-500'
        }`}
      >
        {timeBasis}
      </td>
      <td className={`py-2 px-3 ${pipelineReason ? 'text-amber-800' : 'text-slate-600'}`}>
        {pipeline}
      </td>
      <td className="py-2 px-3 text-right font-semibold text-slate-900">
        {val}
        {isVeraltet && (
          <span className="block text-[10px] text-amber-700 font-normal">
            Veraltet {stand ? `(${stand})` : ''}
          </span>
        )}
        {isDegradiert && (
          <span className="block text-[10px] text-amber-700 font-normal">
            Eingeschränkte Qualität
          </span>
        )}
      </td>
    </tr>
  );
};
