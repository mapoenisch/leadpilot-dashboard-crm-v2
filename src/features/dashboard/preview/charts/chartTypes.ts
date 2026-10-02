// Gemeinsame Typen und Farben der Tiefen-Diagramme (Designprobe, Teilauftrag 0).
import { MANAGEMENT_CHART_THEME } from '@/components/ui/charts/managementChartTheme';
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
}

/** Konsistente Serienfarben: je Eintrag dieselbe Farbe in Säulen, Ring und Legende. */
export const SERIES_COLORS = [
  MANAGEMENT_CHART_THEME.colors.primary,
  MANAGEMENT_CHART_THEME.colors.secondary,
  '#2FA7B8',
  '#5B8DEF',
  MANAGEMENT_CHART_THEME.colors.neutral,
] as const;

export const seriesColor = (index: number) => SERIES_COLORS[index % SERIES_COLORS.length];

export const CHART_VIEWBOX = { width: 560, height: 280 } as const;
