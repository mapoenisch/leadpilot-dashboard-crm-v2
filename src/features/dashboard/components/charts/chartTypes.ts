// Gemeinsame Typen und Farben der Tiefen-Diagramme (Designprobe, Teilauftrag 0).
import type { DatumInput } from './depthGeometry';

export interface DepthChartProps {
  /** Eindeutige ID je Kachel: SVG-Verläufe und Filter dürfen sich zwischen Kacheln nicht beeinflussen. */
  idPrefix: string;
  data: readonly DatumInput[];
  unit: string;
  /** Zeitraum für den Tooltip, z. B. „Q3 2026“. */
  period: string;
  /** Kurzer Titel für die zugängliche Zusammenfassung. */
  title: string;
  reducedMotion: boolean;
  /** Nur Säulen/Balken: Ausrichtung (Standard senkrecht). */
  orientation?: 'vertical' | 'horizontal';
  /** Nur Ring/Kreis: ohne Aussparung als Kreis. */
  solid?: boolean;
  /**
   * Wert mit Einheit für Ablesezeile und zugängliche Kurzfassung (Auftrag 073, z. B. „3,0x“).
   * Ohne Angabe: deutsche Zahl plus Einheit wie in der Testkachel.
   */
  formatValue?: (value: number) => string;
}

/**
 * Anteilsfarben für Ring, Kreis und Legende: eine Türkis-Abstufung wie die Säulen (Entscheidung Marc,
 * 02.10.2026). Der größte Anteil ist am hellsten; auch der dunkelste Ton hält mindestens 3:1 zur Karte.
 */
export const SERIES_COLORS = ['#6BF3EE', '#1FDCD0', '#12B9AF', '#159C96', '#1E7F7C'] as const;

/**
 * Farbe je Eintrag nach Anteilsgröße: der größte Wert bekommt den hellsten Ton, unabhängig von der
 * Reihenfolge der Daten. Gleich große Werte behalten ihre Reihenfolge.
 */
export function shareColors(values: readonly number[]): string[] {
  const order = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value || a.index - b.index);
  const colors = new Array<string>(values.length);
  order.forEach((entry, rank) => {
    colors[entry.index] = seriesColor(rank);
  });
  return colors;
}

/** Mischt eine Hex-Farbe mit Schwarz (t < 0) oder Weiß (t > 0); |t| zwischen 0 und 1. */
export function shadeHex(hex: string, t: number): string {
  const target = t < 0 ? 0 : 255;
  const amount = Math.min(1, Math.abs(t));
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return `#${channels
    .map((value) => Math.round(value + (target - value) * amount))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * Ton für einen Größenrang. Ränge jenseits der Palette bleiben beim dunkelsten Ton statt wieder
 * hell zu beginnen: ein kleiner Anteil darf nie wie der größte aussehen (Fugen trennen die Segmente).
 */
export const seriesColor = (rank: number): string =>
  SERIES_COLORS[Math.min(Math.max(rank, 0), SERIES_COLORS.length - 1)] ?? SERIES_COLORS[0];

export const CHART_VIEWBOX = { width: 560, height: 280 } as const;
