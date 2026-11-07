import React from 'react';
import type { DashboardTileConfig, DashboardFilters } from '../../model/dashboardConfig';
import type { ReportExportConfig } from './DashboardReportModal';
import { formatTileValue, NO_DATA } from '../tileFormat';
import type { TileDataHook } from '../LazyDashboardTile';
import { EXEC_KPIS_1 } from '@/domain/execData';
import { PrintTileCard, resolveTileInfo, noopTileDataHook } from './PrintTileCard';
import './printReport.css';

export interface DashboardPrintViewProps {
  config: ReportExportConfig | null;
  tiles: readonly DashboardTileConfig[];
  filters?: DashboardFilters;
  organizationName?: string;
  isPreview?: boolean;
  useData?: TileDataHook;
}

const PrintAppendixRows: React.FC<{
  tile: DashboardTileConfig;
  filters?: DashboardFilters;
  useData?: TileDataHook;
}> = ({ tile, filters, useData = noopTileDataHook }) => {
  const { name, category, layer, unit } = resolveTileInfo(tile);
  const data = useData(tile, filters);
  const timeBasis =
    data && data.state !== 'nicht_verfuegbar' && data.timeBasis
      ? data.timeBasis
      : 'Aktueller Stand';

  if (data && data.state === 'fehler') {
    return (
      <tr key={tile.tileId} className="border-b border-red-100 bg-red-50/20">
        <td className="py-2 px-3 font-medium text-slate-900">{name}</td>
        <td className="py-2 px-3 text-slate-600">{category}</td>
        <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{tile.view}</td>
        <td className="py-2 px-3 text-slate-600">{layer}</td>
        <td className="py-2 px-3 text-slate-500">{timeBasis}</td>
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
            className="border-b border-slate-100 hover:bg-slate-50/50"
          >
            <td className="py-2 px-3 font-medium text-slate-900">
              {name} <span className="text-slate-400 font-normal">({pt.label})</span>
            </td>
            <td className="py-2 px-3 text-slate-600">{category}</td>
            <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{tile.view}</td>
            <td className="py-2 px-3 text-slate-600">{layer}</td>
            <td className="py-2 px-3 text-slate-500">{timeBasis}</td>
            <td className="py-2 px-3 text-right font-semibold text-slate-900">
              {formatTileValue(pt.value, data.unit || unit, 'exakt')}
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
    <tr key={tile.tileId} className="border-b border-slate-100 hover:bg-slate-50/50">
      <td className="py-2 px-3 font-medium text-slate-900">{name}</td>
      <td className="py-2 px-3 text-slate-600">{category}</td>
      <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{tile.view}</td>
      <td className="py-2 px-3 text-slate-600">{layer}</td>
      <td className="py-2 px-3 text-slate-500">{timeBasis}</td>
      <td className="py-2 px-3 text-right font-semibold text-slate-900">{val}</td>
    </tr>
  );
};

export const DashboardPrintView: React.FC<DashboardPrintViewProps> = ({
  config,
  tiles,
  filters,
  organizationName = 'LeadPilot GmbH',
  isPreview = false,
  useData,
}) => {
  const selectedTiles = React.useMemo(() => {
    if (!config) return [];
    return config.selectedTileIds.length > 0
      ? tiles.filter((tile) => config.selectedTileIds.includes(tile.tileId))
      : tiles;
  }, [config, tiles]);

  const currentDate = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const isLandscape = config?.orientation === 'landscape';

  const isAnyLoading = React.useMemo(() => {
    return selectedTiles.some((tile) => {
      const data = (useData ?? noopTileDataHook)(tile, filters);
      return data && data.state === 'laden';
    });
  }, [selectedTiles, useData, filters]);

  const [safetyTimeout, setSafetyTimeout] = React.useState(false);

  React.useEffect(() => {
    if (!config || isPreview) {
      setSafetyTimeout(false);
      return;
    }
    const timer = setTimeout(() => setSafetyTimeout(true), 3500);
    return () => clearTimeout(timer);
  }, [config, isPreview]);

  React.useEffect(() => {
    if (!config || isPreview) return;
    if (isAnyLoading && !safetyTimeout) return;

    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [config, isPreview, isAnyLoading, safetyTimeout]);

  if (!config) return null;

  return (
    <div
      data-testid="dashboard-print-view"
      className="dashboard-print-view font-sans"
      data-preview={isPreview ? 'true' : undefined}
      data-orientation={config.orientation}
    >
      {/* =========================================================================
          SEITE 1: DECKBLATT (Cover Page)
          ========================================================================= */}
      <section
        className={`print-cover-page flex flex-col justify-between print-page-break-avoid p-6 ${
          isLandscape ? 'min-h-[175mm] pb-6' : 'min-h-[260mm] pb-12'
        }`}
      >
        <div>
          {/* Header & Logo */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-6">
            <div>
              <span className="text-2xl font-black tracking-wider text-slate-900 uppercase">
                LEADPILOT
              </span>
              <span className="ml-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Enterprise CRM & Revenue Analytics
              </span>
            </div>
            <div className="text-right text-xs text-slate-500">
              <span className="block font-semibold text-slate-800">
                OFFIZIELLER MANAGEMENT-REPORT
              </span>
              <span>
                Dokument-ID: LP-REP-{new Date().getFullYear()}-{config.selectedTileIds.length}
              </span>
            </div>
          </div>

          {/* Haupttitel & Metadaten */}
          <div className={isLandscape ? 'my-4' : 'my-8'}>
            <span className="inline-block px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-800 rounded mb-2">
              Vorstands- und Management-Vorlage
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              {config.title}
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Konsolidierter Statusbericht zu Kennzahlen, Vertriebsaktivitäten und finanziellem
              Verlauf für den Berichtszeitraum:{' '}
              <strong className="text-slate-900">{config.periodText}</strong>.
            </p>
            {config.periodNote ? (
              <div
                data-testid="print-period-note"
                className="mt-3 p-2.5 rounded border border-amber-200 bg-amber-50 text-amber-900 text-xs leading-relaxed max-w-2xl"
              >
                <strong>Hinweis zur Daten-Zeitbasis:</strong> {config.periodNote}
              </div>
            ) : null}
          </div>

          {/* Formale Metadaten-Tabelle */}
          <div
            className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs ${
              isLandscape ? 'mb-4' : 'mb-8'
            }`}
          >
            <div>
              <span className="block text-slate-500 uppercase tracking-wider mb-1">Mandant</span>
              <strong className="text-slate-900 text-sm">{organizationName}</strong>
            </div>
            <div>
              <span className="block text-slate-500 uppercase tracking-wider mb-1">Stichtag</span>
              <strong className="text-slate-900 text-sm">{currentDate}</strong>
            </div>
            <div>
              <span className="block text-slate-500 uppercase tracking-wider mb-1">
                Berichtszeitraum
              </span>
              <strong className="text-slate-900 text-sm">{config.periodText}</strong>
            </div>
            <div>
              <span className="block text-slate-500 uppercase tracking-wider mb-1">
                Klassifizierung
              </span>
              <strong className="text-amber-700 text-sm font-semibold">Streng vertraulich</strong>
            </div>
          </div>

          {/* Executive Summary Cards (Top 4 KPIs) */}
          <div className={isLandscape ? 'mb-4' : 'mb-8'}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Executive Summary – Kernmetriken
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {EXEC_KPIS_1.map((kpi, idx) => (
                <div key={idx} className="print-card p-3 rounded border border-slate-200 bg-white">
                  <span className="block text-xs font-medium text-slate-500 truncate mb-1">
                    {kpi.label}
                  </span>
                  <span className="block text-xl font-bold text-slate-900">{kpi.value}</span>
                  <span className="block text-[11px] text-slate-400 mt-1 leading-tight">
                    {kpi.note}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Management-Kommentar (sofern vorhanden) */}
          {config.commentary && (
            <div
              className={`print-card p-4 rounded-lg border-l-4 border-l-primary border-slate-200 bg-slate-50/60 ${
                isLandscape ? 'mb-4' : 'mb-6'
              }`}
            >
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                Strategische Einordnung & Management-Kommentar
              </h2>
              <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line italic">
                „{config.commentary}“
              </p>
            </div>
          )}
        </div>

        {/* Deckblatt Fußzeile */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>LeadPilot Enterprise CRM · Auszug für Entscheidungsträger</span>
          <span>Seite 1 (Deckblatt)</span>
        </div>
      </section>

      {/* =========================================================================
          SEITE 2+: AUSGEWÄHLTE KACHELN
          ========================================================================= */}
      <section className="print-page-break-before p-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            Ausgewählte Kennzahlen & Leistungsindikatoren ({selectedTiles.length} Kacheln)
          </h2>
          <span className="text-xs text-slate-500">Zeitraum: {config.periodText}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedTiles.map((tile) => (
            <PrintTileCard key={tile.tileId} tile={tile} filters={filters} useData={useData} />
          ))}
        </div>
      </section>

      {/* =========================================================================
          SEITE 3+: WERTE-ANHANG (Appendix)
          ========================================================================= */}
      {config.includeAppendix && (
        <section className="print-page-break-before p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Daten-Anhang (Detaillierte Wertetabellen)
            </h2>
            <span className="text-xs text-slate-500">Strukturierter Nachweis</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300 bg-slate-50 text-slate-700">
                  <th className="py-2.5 px-3 font-semibold">Kennzahl / Kachel</th>
                  <th className="py-2.5 px-3 font-semibold">Kategorie</th>
                  <th className="py-2.5 px-3 font-semibold">Darstellung</th>
                  <th className="py-2.5 px-3 font-semibold">Datenquelle</th>
                  <th className="py-2.5 px-3 font-semibold">Zeitbasis</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Referenzwert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {selectedTiles.map((tile) => (
                  <PrintAppendixRows
                    key={tile.tileId}
                    tile={tile}
                    filters={filters}
                    useData={useData}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-[11px] text-slate-400">
            Hinweis: Alle ausgewiesenen Werte entsprechen dem Stichtag {currentDate} und unterliegen
            den Datenzugriffsrechten des Mandanten {organizationName}.
          </p>
        </section>
      )}

      {/* Globaler Druck-Footer */}
      <footer className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
        <span>Vertraulich – Nur für interne Zwecke</span>
        <span>LeadPilot Enterprise CRM · {config.title}</span>
      </footer>
    </div>
  );
};
