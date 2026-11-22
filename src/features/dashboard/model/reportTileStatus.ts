// Executive Dashboard V2 (Auftrag 172 / P15b §2.3 Nr. 7–8):
// Textliche Status-Angaben für Druck/PDF. Farbe allein trägt im Report keine Information:
// Schwellenwert-Status, Alarm, Vergleich und Datenstand erscheinen immer als Text.
// Die Bewertung folgt exakt der Kachel in der Ansicht (LazyDashboardTile), damit der Report
// dieselbe Aussage trifft wie der Bildschirm.

import type { TileData } from '../data/dashboardData';
import { formatAsOf } from '../components/tileFormat';
import { isDataOlderThanMaxAlarmAge } from './alarmDataAge';
import { getCatalogEntry, type SourceLayer } from './dashboardCatalog';
import type { TileQueryConfig } from './dashboardConfigV2';
import { evaluateThresholdV2, type ThresholdEvaluationLevel } from './thresholdRuleV2';

export interface ReportThresholdStatus {
  stufe: ThresholdEvaluationLevel;
  text: string;
}

const SINGLE_VALUE_SHAPES = ['einzelwert', 'verhaeltnis', 'anteil'];

/** „Warnung (ab 200 EUR)“ → „Warnung: ab 200 EUR“ */
function asLabelText(raw: string): string {
  const m = /^(Warnung|Kritisch) \((.+)\)$/.exec(raw);
  return m ? `${m[1]}: ${m[2]}` : raw;
}

/**
 * Schwellenwert-Status einer Kachel als Drucktext; `null`, wenn keine aktive Regel bewertet wird
 * (keine Regel, Regel inaktiv oder keine Einzelwertkachel).
 */
export function reportThresholdStatus(
  catalogId: string,
  rule: unknown,
  data: TileData | undefined,
): ReportThresholdStatus | null {
  if (!rule) return null;
  const entry = getCatalogEntry(catalogId);
  if (entry && 'shape' in entry && !SINGLE_VALUE_SHAPES.includes(entry.shape)) return null;

  const resolved = data && data.state !== 'nicht_verfuegbar' ? data : undefined;
  if (resolved && isDataOlderThanMaxAlarmAge(resolved.asOf)) {
    return { stufe: 'nicht_bewertet', text: 'Nicht bewertet: Letzter Wert älter als 24 Stunden' };
  }
  const value =
    resolved && (resolved.state === 'bereit' || resolved.state === 'veraltet')
      ? resolved.value
      : null;
  const unit = resolved?.unit || entry?.unit || '';
  const evaluation = evaluateThresholdV2(rule, value, resolved?.state ?? null, unit);

  switch (evaluation.stufe) {
    case 'warnung':
    case 'kritisch':
      return { stufe: evaluation.stufe, text: asLabelText(evaluation.text) };
    case 'normal':
      return { stufe: 'normal', text: 'Schwellenwert: im Normalbereich' };
    case 'regel_ungueltig':
      return { stufe: 'regel_ungueltig', text: `Schwellenwert prüfen: ${evaluation.text}` };
    case 'keine_daten':
      return { stufe: 'keine_daten', text: `Nicht bewertet: ${evaluation.text}` };
    default:
      // Inaktive Regel erscheint nicht im Report
      if (evaluation.text === 'Schwellenwert-Regel inaktiv') return null;
      return { stufe: 'nicht_bewertet', text: `Nicht bewertet: ${evaluation.text}` };
  }
}

/** Vermerk für Kacheln mit aktivem Alarm (Server-Status der Alarmregel). */
export function reportAlarmNote(status: string | undefined | null): string | null {
  if (status === 'aktiv') return 'Alarm aktiv';
  if (status === 'pausiert') return 'Alarm pausiert';
  return null;
}

/** Vergleich, Verknüpfung und Erwartungsband (Auftrag 170) als Fußnotentext. */
export function reportCompareNote(query: TileQueryConfig | undefined): string | null {
  if (!query) return null;
  const parts: string[] = [];
  if (query.compare === 'vorperiode') parts.push('Vergleich mit der Vorperiode');
  if (query.compare === 'vorjahr') parts.push('Vergleich mit dem Vorjahr');
  if (query.join) {
    const name = getCatalogEntry(query.join.metricId)?.name ?? query.join.metricId;
    const typ = query.join.typ === 'inner' ? 'nur gemeinsame Zeitpunkte' : 'alle Zeitpunkte';
    parts.push(`Verknüpft mit ${name} (${typ})`);
  }
  if (query.bands) {
    parts.push(
      `Erwartungsband 10.–90. Perzentil aus ${query.bands.periodCount} Vergleichsperioden`,
    );
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export const SOURCE_LAYER_LABEL: Record<SourceLayer, string> = {
  baseline: 'Stammdaten',
  crm: 'CRM',
  live: 'Live-Kennzahlen',
  kombination: 'Kombinationen',
};

/** Datenstand je Quelle aus den tatsächlich geladenen Kacheldaten (keine Zusatzabfragen). */
export function reportDataStandBySource(
  resolved: Iterable<TileData>,
): Array<{ layer: SourceLayer; label: string; stand: string }> {
  const byLayer = new Map<SourceLayer, { latest: string | null; basis: Set<string> }>();
  for (const data of resolved) {
    if (data.state === 'nicht_verfuegbar' || data.state === 'laden') continue;
    const layer = data.origin.layer;
    const slot = byLayer.get(layer) ?? { latest: null, basis: new Set<string>() };
    if (data.asOf && (!slot.latest || data.asOf > slot.latest)) slot.latest = data.asOf;
    if (data.timeBasis) slot.basis.add(data.timeBasis);
    byLayer.set(layer, slot);
  }
  const order: SourceLayer[] = ['baseline', 'crm', 'live', 'kombination'];
  return order
    .filter((layer) => byLayer.has(layer))
    .map((layer) => {
      const slot = byLayer.get(layer)!;
      const stand =
        (slot.latest ? formatAsOf(slot.latest) : null) ??
        ([...slot.basis].slice(0, 2).join('; ') || 'Kein Datenstand gemeldet');
      return { layer, label: SOURCE_LAYER_LABEL[layer], stand };
    });
}

const reportDay = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Europe/Berlin',
});

function formatReportDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : reportDay.format(d);
}

/**
 * Codex-Befund PR #213: Zeitraum einer Kachel aus ihrer tatsächlichen Abfrage – Zeitreihenfenster,
 * sonst wirksamer Zeitraumfilter, sonst Zeitbasis der Quelle (z. B. „Geschäftsjahr 2025“).
 */
export function reportTilePeriod(data: TileData): string | null {
  if (data.state === 'nicht_verfuegbar' || data.state === 'laden') return null;
  if (data.timeSeries) {
    return `${formatReportDay(data.timeSeries.from)} – ${formatReportDay(data.timeSeries.to)}`;
  }
  const period = data.effectiveFilter.period;
  if (period) return `${formatReportDay(period.from)} – ${formatReportDay(period.to)}`;
  return data.timeBasis || null;
}

/** Berichtszeitraum für den Kopf: ein gemeinsamer Zeitraum oder ausdrücklich „je Kachel verschieden“. */
export function reportPeriodText(resolved: Iterable<TileData>): string {
  const periods = new Set<string>();
  for (const data of resolved) {
    const p = reportTilePeriod(data);
    if (p) periods.add(p);
  }
  const list = [...periods];
  if (list.length === 0) return 'Wird ermittelt …';
  if (list.length === 1) return list[0]!;
  const shown = list.slice(0, 4).join('; ');
  return `Je Kachel verschieden: ${shown}${list.length > 4 ? ' …' : ''}`;
}
