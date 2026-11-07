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

  const rowClass =
    isVeraltet || isDegradiert
      ? 'border-amber-100 bg-amber-50/20'
      : 'border-slate-100 hover:bg-slate-50/50';
  const timeBasisClass = `py-2 px-3 ${
    isVeraltet || isDegradiert ? 'text-amber-800 font-semibold' : 'text-slate-500'
  }`;
  const pipelineClass = `py-2 px-3 ${pipelineReason ? 'text-amber-800' : 'text-slate-600'}`;
  const decorations = (
    <>
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
    </>
  );
  const layerCell = (
    <>
      {layer}
      {isOrganisationsuebergreifend && (
        <span className="block text-[10px] text-indigo-700 font-medium">Organisationsweit</span>
      )}
    </>
  );

  if (data && data.state === 'fehler') {
    return (
      <tr key={tile.tileId} className="border-b border-red-100 bg-red-50/20">
        <td className="py-2 px-3 font-medium text-slate-900">{name}</td>
        <td className="py-2 px-3 text-slate-600">{category}</td>
        <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{tile.view}</td>
        <td className="py-2 px-3 text-slate-600">{layerCell}</td>
        <td className="py-2 px-3 text-slate-500">{timeBasis}</td>
        <td className={pipelineClass}>{pipeline}</td>
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
          <tr key={`${tile.tileId}-pt-${idx}`} className={`border-b ${rowClass}`}>
            <td className="py-2 px-3 font-medium text-slate-900">
              {name} <span className="text-slate-400 font-normal">({pt.label})</span>
            </td>
            <td className="py-2 px-3 text-slate-600">{category}</td>
            <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{tile.view}</td>
            <td className="py-2 px-3 text-slate-600">{layerCell}</td>
            <td className={timeBasisClass}>{timeBasis}</td>
            <td className={pipelineClass}>{pipeline}</td>
            <td className="py-2 px-3 text-right font-semibold text-slate-900">
              {formatTileValue(pt.value, data.unit || unit, 'exakt')}
              {decorations}
            </td>
          </tr>
        ))}
      </>
    );
  }

  if (data && data.state !== 'nicht_verfuegbar' && data.overview) {
    const ov = data.overview;
    if (ov.kind === 'team_hr') {
      const { metrics, structure, bottlenecks } = ov.data;
      const allUnits = [structure.root, ...structure.units, structure.total];
      return (
        <>
          {metrics.map((metric, idx) => (
            <tr key={`${tile.tileId}-m-${idx}`} className={`border-b ${rowClass}`}>
              <td className="py-2 px-3 font-medium text-slate-900">
                {name} <span className="text-slate-500 font-normal">({metric.label})</span>
              </td>
              <td className="py-2 px-3 text-slate-600">{category}</td>
              <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{tile.view}</td>
              <td className="py-2 px-3 text-slate-600">{layerCell}</td>
              <td className={timeBasisClass}>{timeBasis}</td>
              <td className={pipelineClass}>{pipeline}</td>
              <td className="py-2 px-3 text-right font-semibold text-slate-900">
                {metric.val}
                {decorations}
              </td>
            </tr>
          ))}
          {allUnits.map((u, idx) => (
            <tr key={`${tile.tileId}-u-${idx}`} className={`border-b ${rowClass}`}>
              <td className="py-2 px-3 font-medium text-slate-900">
                {name} <span className="text-slate-500 font-normal">(Team: {u.role})</span>
              </td>
              <td className="py-2 px-3 text-slate-600">{category}</td>
              <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{tile.view}</td>
              <td className="py-2 px-3 text-slate-600">{layerCell}</td>
              <td className={timeBasisClass}>{timeBasis}</td>
              <td className={pipelineClass}>{pipeline}</td>
              <td className="py-2 px-3 text-right font-semibold text-slate-900">
                {u.fte} ({u.staffing}){decorations}
              </td>
            </tr>
          ))}
          {bottlenecks.map((b, idx) => (
            <tr key={`${tile.tileId}-b-${idx}`} className={`border-b ${rowClass}`}>
              <td className="py-2 px-3 font-medium text-slate-900">
                {name} <span className="text-slate-500 font-normal">(Engpass / Maßnahme)</span>
              </td>
              <td className="py-2 px-3 text-slate-600">{category}</td>
              <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{tile.view}</td>
              <td className="py-2 px-3 text-slate-600">{layerCell}</td>
              <td className={timeBasisClass}>{timeBasis}</td>
              <td className={pipelineClass}>{pipeline}</td>
              <td className="py-2 px-3 text-right text-xs text-slate-700">
                {b}
                {decorations}
              </td>
            </tr>
          ))}
        </>
      );
    }
    if (ov.kind === 'roadmap') {
      return (
        <>
          {ov.data.releases.map((rel, idx) => (
            <tr key={`${tile.tileId}-rel-${idx}`} className={`border-b ${rowClass}`}>
              <td className="py-2 px-3 font-medium text-slate-900">
                {name}{' '}
                <span className="text-slate-500 font-normal">
                  ({rel.quarter}: {rel.title})
                </span>
              </td>
              <td className="py-2 px-3 text-slate-600">{category}</td>
              <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{tile.view}</td>
              <td className="py-2 px-3 text-slate-600">{layerCell}</td>
              <td className={timeBasisClass}>{timeBasis}</td>
              <td className={pipelineClass}>{pipeline}</td>
              <td className="py-2 px-3 text-right font-semibold text-slate-900">
                <span>{rel.status}</span>{' '}
                <span className="font-normal text-slate-500 text-xs">({rel.desc})</span>
                {decorations}
              </td>
            </tr>
          ))}
        </>
      );
    }
    if (ov.kind === 'meilensteine') {
      return (
        <>
          {ov.data.map((ev, idx) => (
            <tr key={`${tile.tileId}-ev-${idx}`} className={`border-b ${rowClass}`}>
              <td className="py-2 px-3 font-medium text-slate-900">
                {name} <span className="text-slate-500 font-normal">({ev.title})</span>
              </td>
              <td className="py-2 px-3 text-slate-600">{category}</td>
              <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{tile.view}</td>
              <td className="py-2 px-3 text-slate-600">{layerCell}</td>
              <td className={timeBasisClass}>{timeBasis}</td>
              <td className={pipelineClass}>{pipeline}</td>
              <td className="py-2 px-3 text-right font-semibold text-slate-900">
                {ev.date} · <span className="font-normal text-slate-500 text-xs">{ev.desc}</span>
                {decorations}
              </td>
            </tr>
          ))}
        </>
      );
    }
    if (ov.kind === 'live_aktivitaet') {
      return (
        <>
          {ov.data.map((item, idx) => (
            <tr key={`${tile.tileId}-item-${idx}`} className={`border-b ${rowClass}`}>
              <td className="py-2 px-3 font-medium text-slate-900">
                {name} <span className="text-slate-500 font-normal">({item.kpiId})</span>
              </td>
              <td className="py-2 px-3 text-slate-600">{category}</td>
              <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{tile.view}</td>
              <td className="py-2 px-3 text-slate-600">{layerCell}</td>
              <td className={timeBasisClass}>{timeBasis}</td>
              <td className={pipelineClass}>{pipeline}</td>
              <td className="py-2 px-3 text-right font-semibold text-slate-900">
                {item.value} {item.unit}
                {decorations}
              </td>
            </tr>
          ))}
        </>
      );
    }
  }

  let val = NO_DATA;
  if (data && data.state !== 'nicht_verfuegbar') {
    if (data.value !== null && Number.isFinite(data.value)) {
      val = formatTileValue(data.value, data.unit || unit, 'exakt');
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
    <tr key={tile.tileId} className={`border-b ${rowClass}`}>
      <td className="py-2 px-3 font-medium text-slate-900">{name}</td>
      <td className="py-2 px-3 text-slate-600">{category}</td>
      <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{tile.view}</td>
      <td className="py-2 px-3 text-slate-600">{layerCell}</td>
      <td className={timeBasisClass}>{timeBasis}</td>
      <td className={pipelineClass}>{pipeline}</td>
      <td className="py-2 px-3 text-right font-semibold text-slate-900">
        {val}
        {decorations}
      </td>
    </tr>
  );
};
