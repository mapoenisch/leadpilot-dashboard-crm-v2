// Executive Dashboard, Teilauftrag 1 (Auftrag 070): versionierte Konfiguration des persönlichen
// Dashboards. Gespeichert werden nur IDs und Einstellungen, niemals Kennzahlenwerte (Plan §4).
import type { DashboardView, TileSize } from './dashboardCatalog';

/** Formatversion; ältere Versionen erhalten später eine ausdrückliche Migration (Plan §6). */
export const DASHBOARD_CONFIG_VERSION = 1 as const;

/** Planungsgrenze des ersten Umfangs (Plan §3, „Vorgeschlagenes Raster“). */
export const MAX_TILES = 24;

/** Eigener Kacheltitel: verständlich, aber begrenzt. */
export const MAX_TITLE_LENGTH = 80;

/**
 * Zeitbezug einer Kachel (Plan §4, „Filter“): Dashboard-Filter übernehmen, eigener Zeitraum
 * oder fester historischer Stand. Ein eigener Zeitraum ist nur bei Quellen mit belegtem
 * Datumsfeld zulässig; das prüft Teilauftrag 2.
 */
export type TileFilterMode = 'dashboard' | 'eigener_zeitraum' | 'fester_stand';

/** Zeitraum als Kalendertage `JJJJ-MM-TT`, beide Grenzen eingeschlossen. */
export interface DashboardPeriod {
  from: string;
  to: string;
}

/** Filterwerte (Plan §4, §6): ein Wert ist nur gesetzt, wenn bewusst gewählt. */
export interface DashboardFilters {
  period?: DashboardPeriod;
  /** Pipeline-Filter; nur CRM-Quellen unterstützen ihn. */
  pipeline?: string;
}

export interface DashboardTileConfig {
  /** Eigene Kachel-ID; dieselbe KPI darf mehrfach vorkommen (z. B. Zahl und Verlauf). */
  tileId: string;
  /** ID aus dem Katalog, z. B. `baseline.arr`. */
  catalogId: string;
  view: DashboardView;
  size: TileSize;
  title?: string;
  filterMode: TileFilterMode;
  /** Kachelausnahme: eigener Zeitraum, nur zusammen mit `filterMode: 'eigener_zeitraum'`. */
  period?: DashboardPeriod;
  /** Kachelausnahme: eigene Pipeline statt des zentralen Filters. */
  pipeline?: string;
}

export interface DashboardConfig {
  version: typeof DASHBOARD_CONFIG_VERSION;
  /** Dauerhaft gespeicherte Startfilter; Sitzungsfilter werden nicht hier gespeichert (Plan §6). */
  filters?: DashboardFilters;
  /** Reihenfolge der Liste ist die Reihenfolge im Raster (keine frei schwebenden Koordinaten). */
  tiles: readonly DashboardTileConfig[];
}
