// Designprobe Dashboard-Testkachel (Teilauftrag 0): feste Beispieldaten.
// Alle Werte sind erfunden und dienen nur der Gestaltung. Sie stammen aus keiner Datenquelle,
// werden nirgends gespeichert und dürfen nicht als Kennzahlen des Unternehmens gelesen werden.
import type { DatumInput } from './charts/depthGeometry';

export const SAMPLE_NOTICE = 'Beispieldaten · Designprobe';
export const SAMPLE_PERIOD = 'Q3 2026';
export const SAMPLE_STAND = 'Stand 30.09.2026';

export const SAMPLE_UNIT = 'Stück';

/** Kategorienreihe (funnel-artig) für Säulen, Tabelle und Zahl. */
export const SAMPLE_STAGES: readonly DatumInput[] = [
  { label: 'Anfragen', value: 1280 },
  { label: 'Qualifiziert', value: 520 },
  { label: 'Gespräch', value: 240 },
  { label: 'Angebot', value: 105 },
  { label: 'Abschluss', value: 46 },
];

/** Anteile, die sich exakt auf 100 % summieren. */
export const SAMPLE_SHARES: readonly DatumInput[] = [
  { label: 'Direkt', value: 41 },
  { label: 'Partner', value: 27.5 },
  { label: 'Empfehlung', value: 16 },
  { label: 'Messe', value: 10.5 },
  { label: 'Sonstige', value: 5 },
];

export const SAMPLE_SHARE_UNIT = '%';

/** Zeitreihe über zwölf Monate. */
export const SAMPLE_SERIES: readonly DatumInput[] = [
  { label: 'Okt', value: 310 },
  { label: 'Nov', value: 335 },
  { label: 'Dez', value: 290 },
  { label: 'Jan', value: 360 },
  { label: 'Feb', value: 385 },
  { label: 'Mär', value: 420 },
  { label: 'Apr', value: 405 },
  { label: 'Mai', value: 450 },
  { label: 'Jun', value: 470 },
  { label: 'Jul', value: 455 },
  { label: 'Aug', value: 505 },
  { label: 'Sep', value: 540 },
];

export const SAMPLE_SERIES_PERIOD = 'Okt 2025 bis Sep 2026';
