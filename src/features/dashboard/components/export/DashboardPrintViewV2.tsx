// Executive Dashboard V2 (Auftrag 172 / P15b §2.3):
// Druck/PDF-Report des V2-Editors. Kopf mit Dashboard, Organisation, Analysezeitpunkt, Datenstand je
// Quelle und Ersteller; je Kachel Schwellenwert-Status, Alarmvermerk, Vergleich und Umformung als Text;
// Fuß mit Seitenzahl (CSS @page) und Vertraulichkeitsvermerk.
// Rechte: Der Report nutzt ausschließlich die Kacheln der aktuellen Ansicht und denselben Daten-Hook
// wie der Bildschirm (`useData`), Alarmstatus aus demselben Abfrage-Cache. Er löst keine eigenen
// Abfragen aus.

import React from 'react';
import type { DashboardConfigV2 } from '../../model/dashboardConfigV2';
import type { TileData } from '../../data/dashboardData';
import type { TileDataHook } from '../LazyDashboardTile';
import type { ReportExportConfig } from './DashboardReportModal';
import { convertV2TileToV1 } from '../editor/canvas/CanvasTileCard';
import { PrintTileCard } from './PrintTileCard';
import { PrintAppendixRows } from './PrintAppendixTable';
import {
  reportCompareNote,
  reportDataStandBySource,
  reportPeriodText,
} from '../../model/reportTileStatus';
import { useOptionalTimeControl } from '../../time/TimeControlProvider';
import './printReport.css';
import './printReportV2.css';

function reportDataKey(d: TileData): string {
  return d.state === 'nicht_verfuegbar'
    ? d.state
    : `${d.state}|${d.asOf ?? ''}|${d.timeBasis}|${d.origin.layer}|${d.value ?? ''}`;
}

export const REPORT_CONFIDENTIAL_NOTE = 'Vertraulich – nur für berechtigte Empfänger';

export interface DashboardPrintViewV2Props {
  dashboard: DashboardConfigV2;
  report: ReportExportConfig;
  useData: TileDataHook;
  organizationName: string;
  createdBy: string;
  alarmStatusByTile: Record<string, string | undefined>;
  /** Abruf der Alarmregeln: Druck wartet auf „bereit“; Fehler/Zeitablauf wird im Kopf vermerkt */
  alarmsState?: 'laden' | 'fehler' | 'bereit';
  /** Vorschau: kein automatischer Druckdialog */
  isPreview?: boolean;
}

const dateTime = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function DashboardPrintViewV2({
  dashboard,
  report,
  useData,
  organizationName,
  createdBy,
  alarmStatusByTile,
  alarmsState = 'bereit',
  isPreview = false,
}: DashboardPrintViewV2Props) {
  const [createdAt] = React.useState(() => dateTime.format(new Date()));
  // Analysezeitpunkt aus der gemeinsamen Zeitsteuerung (pausiert/historisch), sonst „jetzt“ (live)
  const control = useOptionalTimeControl()?.state;
  const analyzedAt =
    control && control.mode !== 'live' && control.analysisAt
      ? `${dateTime.format(new Date(control.analysisAt))} (${
          control.mode === 'pausiert' ? 'pausierter Stand' : 'historischer Zeitpunkt'
        })`
      : createdAt;
  const v2Tiles = React.useMemo(
    () =>
      report.selectedTileIds.length > 0
        ? dashboard.tiles.filter((t) => report.selectedTileIds.includes(t.id))
        : dashboard.tiles,
    [dashboard.tiles, report.selectedTileIds],
  );
  const filters = React.useMemo(
    () => ({ pipeline: dashboard.globalPipeline }),
    [dashboard.globalPipeline],
  );

  const [resolved, setResolved] = React.useState<Record<string, TileData>>({});
  const handleResolved = React.useCallback((tileId: string, data: TileData) => {
    // Inhaltlicher Vergleich: Daten-Hooks liefern nicht zwingend stabile Objekte (sonst Endlosschleife)
    setResolved((prev) =>
      prev[tileId] && reportDataKey(prev[tileId]) === reportDataKey(data)
        ? prev
        : { ...prev, [tileId]: data },
    );
  }, []);
  const stand = React.useMemo(() => reportDataStandBySource(Object.values(resolved)), [resolved]);
  const periodText = React.useMemo(() => reportPeriodText(Object.values(resolved)), [resolved]);

  const allResolved =
    v2Tiles.every((t) => resolved[t.id] !== undefined) &&
    !v2Tiles.some((t) => resolved[t.id]?.state === 'laden') &&
    alarmsState !== 'laden';
  const [timedOut, setTimedOut] = React.useState(false);
  React.useEffect(() => {
    if (isPreview) return;
    const timer = setTimeout(() => setTimedOut(true), 3500);
    return () => clearTimeout(timer);
  }, [isPreview]);
  React.useEffect(() => {
    if (isPreview || (!allResolved && !timedOut)) return;
    const timer = setTimeout(() => window.print?.(), 150);
    return () => clearTimeout(timer);
  }, [isPreview, allResolved, timedOut]);

  return (
    <div
      data-testid="dashboard-print-view-v2"
      className="dashboard-print-view dashboard-print-view-v2 font-sans"
      data-preview={isPreview ? 'true' : undefined}
      data-orientation={report.orientation}
    >
      {/* Kein <header>: das globale Druck-CSS blendet header-Elemente der App aus. */}
      <div data-testid="print-report-header" className="mb-4 border-b-2 border-slate-900 pb-3">
        <h1 className="text-2xl font-extrabold text-slate-900">{report.title}</h1>
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-800">
          <dt className="font-semibold">Dashboard</dt>
          <dd data-testid="print-report-dashboard">{dashboard.title}</dd>
          <dt className="font-semibold">Organisation</dt>
          <dd data-testid="print-report-organisation">{organizationName}</dd>
          <dt className="font-semibold">Analysezeitpunkt</dt>
          <dd data-testid="print-report-analysed-at">{analyzedAt}</dd>
          <dt className="font-semibold">Erstellt am</dt>
          <dd data-testid="print-report-created-at">{createdAt}</dd>
          {alarmsState !== 'bereit' && (
            <>
              <dt className="font-semibold">Alarme</dt>
              <dd data-testid="print-report-alarms-note">
                {alarmsState === 'fehler'
                  ? 'Alarmregeln konnten nicht geladen werden – Alarmvermerke fehlen.'
                  : 'Alarmregeln noch nicht geladen – Alarmvermerke können fehlen.'}
              </dd>
            </>
          )}
          <dt className="font-semibold">Erstellt von</dt>
          <dd data-testid="print-report-creator">{createdBy}</dd>
          <dt className="font-semibold">Berichtszeitraum</dt>
          {/* Aus den Kachelabfragen statt des V1-Standardtexts (FY 2025) */}
          <dd data-testid="print-report-period">{periodText}</dd>
          <dt className="font-semibold">Datenstand je Quelle</dt>
          <dd>
            <ul data-testid="print-report-stand" className="m-0 list-none p-0">
              {stand.length === 0 ? (
                <li>Wird ermittelt …</li>
              ) : (
                stand.map((s) => (
                  <li key={s.layer} data-layer={s.layer}>
                    {s.label}: {s.stand}
                  </li>
                ))
              )}
            </ul>
          </dd>
        </dl>
        {report.commentary && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{report.commentary}</p>
        )}
      </div>

      <section aria-label="Kacheln" className="grid grid-cols-2 gap-4">
        {v2Tiles.map((tile) => (
          <PrintTileCard
            key={tile.id}
            tile={convertV2TileToV1(tile, dashboard.globalTimeframe, dashboard.globalPipeline)}
            filters={filters}
            useData={useData}
            onTileResolved={handleResolved}
            v2={{
              threshold: tile.threshold,
              alarmStatus: alarmStatusByTile[tile.id],
              compareNote: reportCompareNote(tile.query),
            }}
          />
        ))}
      </section>

      {report.includeAppendix && (
        <section className="print-page-break-before mt-6" aria-label="Anhang">
          <h2 className="mb-3 text-lg font-bold text-slate-900">Anhang: Wertetabelle</h2>
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b-2 border-slate-300 bg-slate-50 text-slate-700">
                <th className="px-3 py-2 font-semibold">Kennzahl / Kachel</th>
                <th className="px-3 py-2 font-semibold">Kategorie</th>
                <th className="px-3 py-2 font-semibold">Darstellung</th>
                <th className="px-3 py-2 font-semibold">Datenquelle</th>
                <th className="px-3 py-2 font-semibold">Zeitbasis</th>
                <th className="px-3 py-2 font-semibold">Pipeline</th>
                <th className="px-3 py-2 text-right font-semibold">Referenzwert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {v2Tiles.map((tile) => (
                <PrintAppendixRows
                  key={tile.id}
                  tile={convertV2TileToV1(
                    tile,
                    dashboard.globalTimeframe,
                    dashboard.globalPipeline,
                  )}
                  filters={filters}
                  useData={useData}
                  enableData
                />
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer
        data-testid="print-report-footer"
        className="mt-6 flex justify-between border-t border-slate-300 pt-2 text-[11px] text-slate-700"
      >
        <span>{REPORT_CONFIDENTIAL_NOTE}</span>
        <span>
          {dashboard.title} · {analyzedAt}
        </span>
      </footer>
    </div>
  );
}
