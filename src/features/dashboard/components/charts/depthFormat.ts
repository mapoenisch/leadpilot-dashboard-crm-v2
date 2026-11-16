import type { DatumInput, TimeDatumInput } from './depthGeometry';

const numberFormat = new Intl.NumberFormat('de-DE');

export function formatDe(value: number): string {
  return numberFormat.format(value);
}

/**
 * Achsenbeschriftung kompakt („10 Mrd.“, „2,5 Mio.“), damit sehr große Beträge in den festen
 * Rand passen. Exakte Werte stehen in Ablesezeile, Kurzfassung und Tabelle.
 */
export function formatAxis(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${numberFormat.format(value / 1e9)} Mrd.`;
  if (abs >= 1e6) return `${numberFormat.format(value / 1e6)} Mio.`;
  return numberFormat.format(value);
}

export type SummaryKind = 'ranking' | 'share' | 'trend';

/**
 * Kernaussage einer Datenreihe als Satz für Screenreader: Anzahl, Spannweite, Verlauf bzw. Anteile.
 * Leere Reihen und Summe 0 werden ehrlich benannt statt Anteile vorzutäuschen.
 */
export function summarizeSeries(
  data: readonly (DatumInput | TimeDatumInput)[],
  unit: string,
  period: string,
  kind: SummaryKind,
  formatValue?: (value: number) => string,
): string {
  const valid = data.filter((d): d is DatumInput => d.value !== null && Number.isFinite(d.value));
  const first = valid[0];
  const last = valid[valid.length - 1];
  if (!first || !last) return `Keine Werte für ${period}.`;

  const withUnit = (value: number) => formatValue?.(value) ?? `${formatDe(value)} ${unit}`.trim();
  const high = valid.reduce((best, entry) => (entry.value > best.value ? entry : best), first);
  const low = valid.reduce((best, entry) => (entry.value < best.value ? entry : best), first);
  const head = `${data.length} Werte, ${period}.`;
  if (kind === 'share') {
    const total = valid.reduce((sum, entry) => sum + entry.value, 0);
    if (total <= 0) return `${head} Summe 0, keine Anteile.`;
    const share = Math.round((high.value / total) * 1000) / 10;
    return `${head} Summe ${withUnit(total)}. Größter Anteil: ${high.label} mit ${withUnit(high.value)} (${formatDe(share)} Prozent).`;
  }
  if (kind === 'trend') {
    const delta = last.value - first.value;
    const direction = delta > 0 ? 'gestiegen' : delta < 0 ? 'gesunken' : 'unverändert';
    const change = delta === 0 ? '' : ` um ${withUnit(Math.abs(delta))}`;
    return `${head} Von ${first.label} (${withUnit(first.value)}) bis ${last.label} (${withUnit(last.value)}) ${direction}${change}. Höchster Wert: ${high.label}, ${withUnit(high.value)}. Niedrigster Wert: ${low.label}, ${withUnit(low.value)}.`;
  }
  return `${head} Höchster Wert: ${high.label}, ${withUnit(high.value)}. Niedrigster Wert: ${low.label}, ${withUnit(low.value)}.`;
}

/** Kürzt ein sichtbares SVG-Label auf `max` Zeichen; der Volltext gehört in ein `<title>`. */
export function shortenLabel(label: string, max: number): string {
  return label.length > max ? `${label.slice(0, max - 1).trimEnd()}…` : label;
}

/**
 * Kürzt Datums- und Wochenbeschriftungen für Diagrammachsen, damit Ticks nicht überlappen.
 * Ausführliche Texte („Woche 16.11.2026“) bleiben für Ablesezeile und Tabelle erhalten.
 */
export function formatAxisTickLabel(label: string): string {
  const weekMatch = label.match(/^Woche\s+(\d{2}\.\d{2})\.\d{4}$/);
  if (weekMatch) return `${weekMatch[1]}.`;
  const dateMatch = label.match(/^(\d{2}\.\d{2})\.\d{4}$/);
  if (dateMatch) return `${dateMatch[1]}.`;
  return label;
}

/** Zusammenfassung für Tachometer / Skala für Screenreader. */
export function summarizeGauge(
  label: string,
  value: number,
  unit: string,
  period: string,
  min: number,
  max: number,
  formatValue?: (value: number) => string,
): string {
  const withUnit = (v: number) => formatValue?.(v) ?? `${formatDe(v)} ${unit}`.trim();
  return `Tachometer für ${label}: ${withUnit(value)}. Skala von ${withUnit(min)} bis ${withUnit(max)}, ${period}.`;
}

/** Zusammenfassung für Trichterdiagramm für Screenreader. */
export function summarizeFunnel(
  data: readonly DatumInput[],
  unit: string,
  period: string,
  formatValue?: (value: number) => string,
): string {
  if (data.length === 0) return `Keine Trichterstufen für ${period}.`;
  const withUnit = (v: number) => formatValue?.(v) ?? `${formatDe(v)} ${unit}`.trim();
  const first = data[0];
  const last = data[data.length - 1];
  return `Trichter mit ${data.length} Stufen von ${first?.label ?? ''} (${withUnit(first?.value ?? 0)}) bis ${last?.label ?? ''} (${withUnit(last?.value ?? 0)}), ${period}.`;
}
