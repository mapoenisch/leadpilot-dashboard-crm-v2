import React from 'react';
import type { DashboardTileConfig, DashboardFilters } from '../../model/dashboardConfig';
import { getCatalogEntry } from '../../model/dashboardCatalog';
import type { ReportExportConfig } from './DashboardReportModal';
import { EXEC_KPIS_1 } from '@/domain/execData';
import './printReport.css';

export interface DashboardPrintViewProps {
  config: ReportExportConfig | null;
  tiles: readonly DashboardTileConfig[];
  filters?: DashboardFilters;
  organizationName?: string;
  isPreview?: boolean;
}

function resolveTileInfo(tile: DashboardTileConfig) {
  const entry = getCatalogEntry(tile.catalogId);
  const name = tile.title?.trim() || entry?.name || tile.catalogId;
  const unit = entry?.unit || '';
  const category = entry?.category || 'Allgemein';
  const layer = entry?.source.layer || 'baseline';
  return { name, unit, category, layer, entry };
}

export const DashboardPrintView: React.FC<DashboardPrintViewProps> = ({
  config,
  tiles,
  organizationName = 'LeadPilot GmbH',
  isPreview = false,
}) => {
  if (!config) return null;

  const selectedTiles = tiles.filter((tile) => config.selectedTileIds.includes(tile.tileId));

  const currentDate = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

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
      <section className="print-cover-page flex flex-col justify-between min-h-[920px] p-6 pb-12 print-page-break-avoid">
        <div>
          {/* Header & Logo */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-8">
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
          <div className="my-8">
            <span className="inline-block px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-800 rounded mb-3">
              Vorstands- und Management-Vorlage
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
              {config.title}
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Konsolidierter Statusbericht zu Kennzahlen, Vertriebsaktivitäten und finanziellem
              Verlauf für den Berichtszeitraum:{' '}
              <strong className="text-slate-900">{config.periodText}</strong>.
            </p>
          </div>

          {/* Formale Metadaten-Tabelle */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 mb-8 text-xs">
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
          <div className="mb-8">
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
            <div className="print-card p-4 rounded-lg border-l-4 border-l-primary border-slate-200 bg-slate-50/60 mb-6">
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
          {selectedTiles.map((tile) => {
            const { name, unit, category, layer } = resolveTileInfo(tile);
            return (
              <div
                key={tile.tileId}
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
                    <span className="text-2xl font-black text-slate-900">
                      {tile.catalogId === 'baseline.arr'
                        ? '411.840 €'
                        : tile.catalogId === 'baseline.mrr'
                          ? '34.320 €'
                          : tile.catalogId === 'baseline.kunden'
                            ? '66'
                            : 'Aktiv'}
                    </span>
                    {unit && (
                      <span className="ml-1 text-xs text-slate-500 font-medium">{unit}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>
                    Filter: {tile.filterMode === 'dashboard' ? 'Zentral' : tile.filterMode}
                  </span>
                  <span>ID: {tile.catalogId}</span>
                </div>
              </div>
            );
          })}
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
                  <th className="py-2.5 px-3 font-semibold text-right">Referenzwert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {selectedTiles.map((tile) => {
                  const { name, category, layer } = resolveTileInfo(tile);
                  const val =
                    tile.catalogId === 'baseline.arr'
                      ? '411.840 €'
                      : tile.catalogId === 'baseline.mrr'
                        ? '34.320 €'
                        : tile.catalogId === 'baseline.kunden'
                          ? '66'
                          : 'Ausgewiesen';
                  return (
                    <tr key={tile.tileId} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-medium text-slate-900">{name}</td>
                      <td className="py-2 px-3 text-slate-600">{category}</td>
                      <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                        {tile.view}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{layer}</td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900">{val}</td>
                    </tr>
                  );
                })}
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
