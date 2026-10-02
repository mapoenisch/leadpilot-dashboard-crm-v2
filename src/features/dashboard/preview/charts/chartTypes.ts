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
}

/**
 * Anteilsfarben für Ring, Kreis und Legende: eine Türkis-Abstufung wie die Säulen (Entscheidung Marc,
 * 02.10.2026). Der größte Anteil ist am hellsten; auch der dunkelste Ton hält mindestens 3:1 zur Karte.
 */
export const SERIES_COLORS = ['#6BF3EE', '#1FDCD0', '#12B9AF', '#159C96', '#1E7F7C'] as const;

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

export const seriesColor = (index: number): string =>
  SERIES_COLORS[index % SERIES_COLORS.length] ?? SERIES_COLORS[0];

export const CHART_VIEWBOX = { width: 560, height: 280 } as const;
