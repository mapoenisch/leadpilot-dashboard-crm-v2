import React from 'react';
import type { DashboardTileConfig, DashboardFilters } from '../../model/dashboardConfig';
import type { ReportExportConfig } from './DashboardReportModal';
import type { TileDataHook } from '../LazyDashboardTile';
import type { TileData } from '../../data/dashboardData';
import { EXEC_KPIS_1 } from '@/domain/execData';
import { PrintTileCard } from './PrintTileCard';
import { PrintAppendixRows } from './PrintAppendixTable';
import './printReport.css';

export interface DashboardPrintViewProps {
  config: ReportExportConfig | null;
  tiles: readonly DashboardTileConfig[];
  filters?: DashboardFilters;
  organizationName?: string;
  isPreview?: boolean;
  useData?: TileDataHook;
}

const DashboardPrintDocument: React.FC<
  DashboardPrintViewProps & { config: ReportExportConfig }
> = ({
  config,
  tiles,
  filters,
  organizationName = 'LeadPilot GmbH',
  isPreview = false,
  useData,
}) => {
  const selectedTiles = React.useMemo(() => {
    return config.selectedTileIds.length > 0
      ? tiles.filter((tile) => config.selectedTileIds.includes(tile.tileId))
      : tiles;
  }, [config.selectedTileIds, tiles]);

  const currentDate = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const isLandscape = config.orientation === 'landscape';

  // Ladezustands-Aggregation aus den separat gemounteten Kachelkomponenten (Codex Finding 1)
  const [tileStateMap, setTileStateMap] = React.useState<Record<string, string>>({});
  const [safetyTimeout, setSafetyTimeout] = React.useState(false);

  const handleTileResolved = React.useCallback((tileId: string, data: TileData) => {
    setTileStateMap((prev) => {
      if (prev[tileId] === data.state) return prev;
      return { ...prev, [tileId]: data.state };
    });
  }, []);

  const isAnyLoading = React.useMemo(() => {
    if (selectedTiles.length === 0) return false;
    const allReported = selectedTiles.every((t) => tileStateMap[t.tileId] !== undefined);
    if (!allReported) return true;
    return selectedTiles.some((t) => tileStateMap[t.tileId] === 'laden');
  }, [selectedTiles, tileStateMap]);

  React.useEffect(() => {
    if (isPreview) {
      setSafetyTimeout(false);
      return;
    }
    const timer = setTimeout(() => setSafetyTimeout(true), 3500);
    return () => clearTimeout(timer);
  }, [isPreview]);

  React.useEffect(() => {
    if (isPreview) return;
    if (isAnyLoading && !safetyTimeout) return;

    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [isPreview, isAnyLoading, safetyTimeout]);

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
            <div className="text-right">
              <span className="block text-xs font-bold text-slate-900">
                EXECUTIVE MANAGEMENT BRIEFING
              </span>
              <span className="text-[11px] text-slate-500">Vertrauliches Dokument</span>
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

          {/* Formale Metadaten-Tabelle mit zentralem Pipeline-Filter (Codex Finding 2) */}
          <div
            className={`grid grid-cols-2 md:grid-cols-5 gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs ${
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
                Pipeline-Filter
              </span>
              <strong className="text-slate-900 text-sm" data-testid="print-cover-pipeline">
                {filters?.pipeline ? filters.pipeline : 'Alle Pipelines'}
              </strong>
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
                  <span className="text-[11px] font-semibold text-slate-500 block truncate">
                    {kpi.label}
                  </span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-lg font-black text-slate-900">{kpi.value}</span>
                    <span className="text-[10px] text-slate-500 truncate ml-1">{kpi.note}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Management Commentary */}
          {config.commentary && (
            <div className={isLandscape ? 'mb-4' : 'mb-6'}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Strategischer Management-Kommentar
              </h2>
              <div className="p-4 rounded-lg bg-slate-50/80 border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {config.commentary}
              </div>
            </div>
          )}
        </div>

        {/* Deckblatt-Footer */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
          <span>LeadPilot Management Information System</span>
          <span>Seite 1 (Deckblatt)</span>
        </div>
      </section>

      {/* =========================================================================
          SEITE 2: KACHEL-BERICHT (Dashboard Tile Cards)
          ========================================================================= */}
      <section className="print-page-break-before p-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Kennzahlen & Leistungsindikatoren</h2>
            <p className="text-xs text-slate-500">
              Detaillierte Auswertung der {selectedTiles.length} ausgewählten Dashboard-Kacheln
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {config.title} · {config.periodText}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {selectedTiles.map((tile) => (
            <PrintTileCard
              key={tile.tileId}
              tile={tile}
              filters={filters}
              useData={useData}
              onTileResolved={handleTileResolved}
            />
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
                  <th className="py-2.5 px-3 font-semibold">Pipeline</th>
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

          <p className="mt-4 text-[11px] text-slate-400 leading-relaxed">
            Hinweis: Ausgewiesene Werte basieren auf der jeweiligen Kennzahlen-Zeitbasis (Stichtag
            des Exports: {currentDate}; Live-Werte mit Verbindungsabbruch sind gesondert als
            veraltet samt ursprünglichem Messzeitpunkt ausgewiesen). Alle Daten unterliegen den
            Datenzugriffsrechten des Mandanten {organizationName}.
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

export const DashboardPrintView: React.FC<DashboardPrintViewProps> = (props) => {
  if (!props.config) return null;
  return <DashboardPrintDocument {...props} config={props.config} />;
};
