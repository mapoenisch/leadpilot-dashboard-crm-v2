/**
 * Central Data-Viz Theme & Design Tokens for LeadPilot
 * Strictly references CSS Custom Properties from ARCHITECTURE_DECISIONS.md & src/styles/global.css.
 * Maintains Dark Forest Green, Cyan primary action, Orange risk/warning semantics.
 */

export const CHART_THEME = {
  colors: {
    // Primary brand & active actions (Cyan)
    primary: 'var(--color-primary)',
    primaryHover: 'var(--color-primary-hover)',
    primarySoft: 'var(--color-primary-soft)',
    primaryRgba: (alpha: number) => `rgba(0, 217, 198, ${alpha})`,

    // Accents & Targets
    accent: 'var(--color-accent)',
    accentHover: 'var(--color-accent-hover)',
    accentSoft: 'var(--color-accent-soft)',

    // Success / Target Met (Mint Green)
    success: 'var(--color-success)',
    successSoft: 'var(--color-success-soft)',

    // Warning / Risk / Churn / Downward delta (Orange strictly for risk/warnings)
    warning: 'var(--color-warning)',
    warningSoft: 'var(--color-warning-soft)',

    // Neutral / Grid / Axis (Dark Forest Green space)
    border: 'var(--color-border)',
    borderSoft: 'var(--color-border-soft)',
    gridStroke: 'var(--color-border-soft)',
    gridStrokeDashed: '3 3',

    // Surfaces & Backgrounds
    surface: 'var(--color-surface)',
    surfaceRaised: 'var(--color-surface-raised)',
    bg: 'var(--color-bg)',
    bgDeep: 'var(--color-bg-deep)',
    tooltipBg: 'var(--color-bg-deep)',

    // Typography
    text: 'var(--color-text)',
    textMuted: 'var(--color-text-muted)',
    textInverse: 'var(--color-text-inverse)',
  },

  // Color palette for multi-series charts using exact design tokens
  seriesPalette: [
    'var(--color-primary)', // Cyan Primary
    'var(--color-primary-hover)', // Cyan Light
    'var(--color-success)', // Mint Green
    'var(--color-text-muted)', // Gray Muted
    'var(--color-warning)', // Orange (Warning / Risk / Secondary)
    'var(--color-surface-raised)', // Surface Accent
  ],

  typography: {
    fontDisplay: 'var(--font-display)',
    fontBody: 'var(--font-body)',
    fontMono: 'var(--font-mono)',
    titleSize: '15px',
    subtitleSize: '12px',
    axisLabelSize: '10.5px',
    valueSize: '13px',
    tooltipSize: '12px',
  },

  transitions: {
    default: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
    path: 'stroke-dashoffset 400ms ease, opacity 200ms ease',
    bar: 'height 300ms cubic-bezier(0.16, 1, 0.3, 1), transform 200ms ease',
  },
};

/**
 * Format numeric metric with German locale formatting and optional unit
 */
export function formatChartMetric(val: number, unit?: string): string {
  if (isNaN(val) || val === null || val === undefined) return '–';
  const numStr = Math.round(val).toLocaleString('de-DE');
  return unit ? `${numStr} ${unit}`.trim() : numStr;
}

/**
 * Format currency in EUR
 */
export function formatChartCurrency(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '– €';
  return `${Math.round(val).toLocaleString('de-DE')} €`;
}

/**
 * Format percentage
 */
export function formatChartPercent(val: number, decimals: number = 1): string {
  if (isNaN(val) || val === null || val === undefined) return '– %';
  return `${val.toFixed(decimals).replace('.', ',')} %`;
}
