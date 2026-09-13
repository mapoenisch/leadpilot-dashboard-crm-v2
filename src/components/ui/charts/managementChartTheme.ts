/**
 * LeadPilot V2 Management Chart Theme
 *
 * Präzises, technisches Enterprise-Cockpit-Theming basierend auf
 * den verbindlichen LeadPilot V2 Stilreferenzen.
 */

export const MANAGEMENT_CHART_THEME = {
  colors: {
    primary: '#00D9C6', // Leitfarbe Cyan (Lichtkante, Hauptlinie)
    secondary: '#7CEFE6', // Mint / Secondary
    warning: '#FF7A3D', // Orange (ausschließlich für Risiken, Abweichungen, negatives EBITDA)
    neutral: '#8FA3A1', // Gedämpftes Text-Graugrün
    darkSurface: '#0B1E1C', // Tiefes Cockpit-Blaugrün
    darkBg: '#051413', // Tooltip-Hintergrund
    grid: 'rgba(0, 217, 198, 0.08)', // Reduziertes horizontales Grid
    gridStrong: 'rgba(0, 217, 198, 0.16)',
    border: 'rgba(0, 217, 198, 0.2)',
    glow: 'rgba(0, 217, 198, 0.15)',
  },
  typography: {
    fontFamily:
      "var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
    fontSizeXs: 10,
    fontSizeSm: 11,
    fontSizeMd: 12,
  },
  gradients: {
    cyanArea: {
      id: 'mgmtCyanAreaGrad',
      from: 'rgba(0, 217, 198, 0.28)',
      to: 'rgba(0, 217, 198, 0.01)',
    },
    orangeArea: {
      id: 'mgmtOrangeAreaGrad',
      from: 'rgba(255, 122, 61, 0.28)',
      to: 'rgba(255, 122, 61, 0.01)',
    },
  },
} as const;

export function formatManagementMetric(val: number, unit?: string): string {
  if (val === undefined || val === null || isNaN(val)) return '—';

  if (Math.abs(val) >= 1000000) {
    return `${(val / 1000000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio. €`;
  }
  if (Math.abs(val) >= 1000) {
    return `${(val / 1000).toLocaleString('de-DE', { maximumFractionDigits: 0 })} k${unit ? ' ' + unit : '€'}`;
  }
  return `${val.toLocaleString('de-DE')}${unit ? ' ' + unit : ' €'}`;
}
