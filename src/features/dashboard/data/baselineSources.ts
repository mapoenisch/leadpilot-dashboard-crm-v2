// Executive Dashboard, Teilauftrag 8a (Auftrag 078): Zugriff auf die Stammdaten-Quellen.
// Register der Quellmodule und reine Leser für Datensätze (`…datasets[i].data`) und
// Zeilentabellen. Keine Schätzwerte: jede Abweichung der Quelle ergibt einen Fehler mit Grund.
import * as execData from '@/domain/execData';
import * as executiveCockpitData from '@/domain/executiveCockpitData';
import * as finanzenData from '@/domain/finanzenData';
import * as kundenData from '@/domain/kundenData';
import * as organisationData from '@/domain/organisationData';
import * as produktData from '@/domain/produktData';
import * as rechtData from '@/domain/rechtData';
import * as unternehmenData from '@/domain/unternehmenData';
import * as vertriebData from '@/domain/vertriebData';
import type { CatalogSource } from '../model/dashboardCatalog';

/** Nur Module mit aktiven Einträgen; ein Eintrag mit anderem Modul löst als Fehler auf. */
const BASELINE_MODULES: Record<string, Record<string, unknown>> = {
  'src/domain/execData.ts': execData,
  'src/domain/executiveCockpitData.ts': executiveCockpitData,
  'src/domain/finanzenData.ts': finanzenData,
  'src/domain/kundenData.ts': kundenData,
  'src/domain/organisationData.ts': organisationData,
  'src/domain/produktData.ts': produktData,
  'src/domain/rechtData.ts': rechtData,
  'src/domain/unternehmenData.ts': unternehmenData,
  'src/domain/vertriebData.ts': vertriebData,
};

export function getBaselineExport(module: string, exportName: string): unknown {
  const source = BASELINE_MODULES[module];
  if (!source || !Object.prototype.hasOwnProperty.call(source, exportName)) return undefined;
  return source[exportName];
}

export function resolvePath(obj: unknown, path?: readonly (string | number)[]): unknown {
  if (!path || path.length === 0) return obj;
  let current: unknown = obj;
  for (const segment of path) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string | number, unknown>)[segment];
  }
  return current;
}

export type SeriesResult =
  { ok: true; series: { label: string; value: number }[] } | { ok: false; message: string };

/** Pfad der Form `[…präfix, 'datasets', i, 'data']`: Präfix zeigt auf das Diagrammobjekt. */
export function isDatasetPath(path?: readonly (string | number)[]): boolean {
  return (
    !!path &&
    path.length >= 3 &&
    path[path.length - 3] === 'datasets' &&
    typeof path[path.length - 2] === 'number' &&
    path[path.length - 1] === 'data'
  );
}

/** Beschriftungen des Diagrammobjekts und die Werte genau eines Datensatzes. */
export function readDatasetSeries(
  exportValue: unknown,
  path: readonly (string | number)[],
): SeriesResult {
  const chart = resolvePath(exportValue, path.slice(0, -3)) as
    { labels?: unknown; datasets?: Array<{ data?: unknown }> } | undefined;
  const labels = chart?.labels;
  const data = chart?.datasets?.[path[path.length - 2] as number]?.data;
  if (!Array.isArray(labels) || !Array.isArray(data) || labels.length !== data.length)
    return { ok: false, message: 'Beschriftungen und Datenpunkte stimmen nicht überein' };
  if (!labels.every((label) => typeof label === 'string'))
    return { ok: false, message: 'Beschriftungen sind keine Texte' };
  if (!data.every((value) => typeof value === 'number' && Number.isFinite(value)))
    return { ok: false, message: 'Werte enthalten keine gültige endliche Zahl' };
  return {
    ok: true,
    series: labels.map((label, i) => ({ label: label as string, value: data[i] as number })),
  };
}

/**
 * Formatierte deutsche Zahl aus den Stammdaten: Einheit (€, FTE, %) und Leerzeichen entfernen,
 * `.` ist Tausendertrenner, `,` Dezimaltrenner, `−`/`-` am Anfang bedeutet negativ.
 * Ergibt der Rest keine endliche Zahl, ist das Ergebnis null (Fehler).
 */
export function parseFormattedBaselineNumber(raw: string): number | null {
  if (typeof raw !== 'string') return null;
  let s = raw.trim();
  if (!s) return null;
  let isNegative = false;
  if (s.startsWith('−') || s.startsWith('-')) {
    isNegative = true;
    s = s.slice(1).trim();
  }
  s = s.replace(/[\s€%]/g, '').replace(/FTE/gi, '');
  if (!s || !/\d/.test(s) || /[^\d.,]/.test(s)) return null;
  s = s.replace(/\./g, '');
  if ((s.match(/,/g) || []).length > 1) return null;
  const num = Number(s.replace(',', '.'));
  if (!Number.isFinite(num)) return null;
  return isNegative ? -num : num;
}

/** Zeilentabelle: je Zeile eine Beschriftung und ein Wert; Summenzeilen werden ausgeschlossen. */
export function readTableSeries(
  rows: unknown,
  table: NonNullable<CatalogSource['table']>,
): SeriesResult {
  if (!Array.isArray(rows) || rows.length === 0)
    return { ok: false, message: 'Tabelle ohne Zeilen' };
  const series: { label: string; value: number }[] = [];
  for (const row of rows) {
    if (row == null || typeof row !== 'object')
      return { ok: false, message: 'Tabellenzeile hat kein gültiges Format' };
    const cells = row as Record<string | number, unknown>;
    const label = cells[table.label];
    if (typeof label !== 'string' || label.trim() === '')
      return { ok: false, message: 'Tabellenzeile ohne Beschriftung' };
    if (table.excludeLabels?.includes(label)) continue;
    const raw = cells[table.value];
    const value =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
          ? parseFormattedBaselineNumber(raw)
          : null;
    if (value === null || !Number.isFinite(value))
      return { ok: false, message: `Wert der Zeile "${label}" ist keine gültige Zahl` };
    series.push({ label, value });
  }
  if (series.length === 0) return { ok: false, message: 'Tabelle ohne auswertbare Zeilen' };
  return { ok: true, series };
}
