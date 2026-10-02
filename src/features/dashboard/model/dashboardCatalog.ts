// Executive Dashboard, Teilauftrag 1 (Auftrag 070): Katalog der Dashboard-Kandidaten.
// Nur Metadaten: Quelle, Zeitbasis, Einheit, Darstellungen und Größen. Kennzahlenwerte stehen
// ausschließlich in den Quellmodulen; das Inventar mit Rohwerten liegt in docs/dashboard/KPI_CATALOG.md.
import { ACTIVE_CATALOG_ENTRIES } from './catalog/activeEntries';
import { PREPARE_CATALOG_ENTRIES } from './catalog/inventoryEntries';
import { UNSUITABLE_CATALOG_ENTRIES } from './catalog/unsuitableEntries';

export const DASHBOARD_CATEGORIES = {
  finanzen: 'Finanzen',
  vertrieb_crm: 'Vertrieb/CRM',
  kunden: 'Kunden',
  marketing: 'Marketing',
  organisation: 'Organisation',
  produkt: 'Produkt',
  markt: 'Markt',
  strategie: 'Strategie',
  unternehmen: 'Unternehmen',
  recht: 'Recht',
  live: 'Live',
} as const;
export type DashboardCategory = keyof typeof DASHBOARD_CATEGORIES;

export type CatalogStatus = 'aktiv' | 'aufbereiten' | 'nicht_geeignet';

/** Herkunftsebene: historische Stammdaten (Ebene A), CRM-Datenbank oder Live-Feed (Ebene C). */
export type SourceLayer = 'baseline' | 'crm' | 'live';

/** Datenform laut Plan §4; bestimmt die zulässigen Darstellungen. */
export type DataShape =
  'einzelwert' | 'verhaeltnis' | 'kategorien' | 'anteile' | 'zeitreihe' | 'uebersicht';

/** Bestandswerte (z. B. ARR) werden nie über die Zeit aufsummiert, Flusswerte gelten je Zeitraum. */
export type Aggregation = 'bestand' | 'fluss' | 'verhaeltnis' | 'keine';

export type DashboardView =
  'zahl' | 'tabelle' | 'saeulen' | 'balken' | 'kreis' | 'ring' | 'linie' | 'flaeche' | 'uebersicht';

export type TileSize = 'klein' | 'mittel' | 'gross' | 'voll';
export const TILE_SIZES: readonly TileSize[] = ['klein', 'mittel', 'gross', 'voll'];

/** Filter, die eine Quelle tatsächlich unterstützt (Plan §4, „Filter“). */
export type CatalogFilter = 'pipeline';

/**
 * Wie sich die Kachel zeitlich verhält: fester historischer Stand, aktueller CRM-Stand oder Live.
 * Ein Dashboard-Zeitraum wirkt erst, wenn eine Quelle ein belegtes Datumsfeld hat (Teilauftrag 2).
 */
export type TimeMode = 'fest' | 'aktuell' | 'live';

export interface CatalogSource {
  layer: SourceLayer;
  /** Quellmodul relativ zum Repo, z. B. `src/domain/execData.ts`. */
  module: string;
  /** Export im Quellmodul, z. B. `EXEC_KPIS_1` oder `getPipelineOverview`. */
  exportName: string;
  /** Pfad innerhalb des Exports (Baseline) bzw. des Funktionsergebnisses (CRM). */
  path?: readonly (string | number)[];
  /** Nur Live: ID aus `LIVE_KPI_DEFINITIONS`. */
  liveKpiId?: string;
}

interface CatalogEntryBase {
  /** Stabile ID mit Ebenenpräfix, z. B. `baseline.arr` und `live.arr`. */
  id: string;
  name: string;
  category: DashboardCategory;
  kind: 'kpi' | 'uebersicht';
  source: CatalogSource;
}

export interface ActiveCatalogEntry extends CatalogEntryBase {
  status: 'aktiv';
  definition: string;
  /** Anzeigeeinheit, z. B. `EUR`, `Kunden`, `FTE`, `x`. */
  unit: string;
  shape: DataShape;
  aggregation: Aggregation;
  timeMode: TimeMode;
  /** Tatsächliche Zeitbasis in Worten, z. B. „Stand 31.12.2025“. */
  timeBasis: string;
  views: readonly DashboardView[];
  defaultView: DashboardView;
  minSize: TileSize;
  groupings: readonly string[];
  filters: readonly CatalogFilter[];
  /** Route-ID aus `APP_ROUTES` für „Zur Fachübersicht“. */
  detailRouteId: string;
  /** Wer die Quelle lesen darf (nachgewiesen im Inventar). */
  access: string;
  /** Funnel-Stufen sind keine Teile einer Gesamtheit: nie Kreis oder Ring. */
  funnelStages?: true;
  /** Werte können negativ sein: nie Kreis oder Ring. */
  mayBeNegative?: true;
}

export interface InventoryCatalogEntry extends CatalogEntryBase {
  status: 'aufbereiten' | 'nicht_geeignet';
  /** Konkreter Grund, warum der Eintrag (noch) nicht aktiv ist. */
  reason: string;
  /** Vorgesehene Aufnahme, z. B. „Teilauftrag 8“. */
  target?: string;
}

export type CatalogEntry = ActiveCatalogEntry | InventoryCatalogEntry;

/** Zulässige Darstellungen je Datenform (Plan §4, Tabelle „Datenform“). */
export const VIEWS_BY_SHAPE: Record<DataShape, readonly DashboardView[]> = {
  einzelwert: ['zahl', 'tabelle'],
  verhaeltnis: ['zahl', 'tabelle'],
  kategorien: ['tabelle', 'saeulen', 'balken'],
  anteile: ['tabelle', 'saeulen', 'balken', 'kreis', 'ring'],
  zeitreihe: ['tabelle', 'linie', 'flaeche', 'saeulen'],
  uebersicht: ['uebersicht'],
};

/** Mindestgröße je Darstellung; ein Eintrag darf sie anheben, nie senken. */
export const MIN_SIZE_BY_VIEW: Record<DashboardView, TileSize> = {
  zahl: 'klein',
  tabelle: 'mittel',
  saeulen: 'mittel',
  balken: 'mittel',
  kreis: 'mittel',
  ring: 'mittel',
  linie: 'mittel',
  flaeche: 'mittel',
  uebersicht: 'mittel',
};

export const PIE_VIEWS: readonly DashboardView[] = ['kreis', 'ring'];

export function sizeRank(size: TileSize): number {
  return TILE_SIZES.indexOf(size);
}

/** Kleinste zulässige Größe für eine Darstellung dieses Eintrags. */
export function minSizeFor(entry: ActiveCatalogEntry, view: DashboardView): TileSize {
  const viewMin = MIN_SIZE_BY_VIEW[view];
  return sizeRank(entry.minSize) > sizeRank(viewMin) ? entry.minSize : viewMin;
}

export const DASHBOARD_CATALOG: readonly CatalogEntry[] = [
  ...ACTIVE_CATALOG_ENTRIES,
  ...PREPARE_CATALOG_ENTRIES,
  ...UNSUITABLE_CATALOG_ENTRIES,
];

export function isActiveEntry(entry: CatalogEntry): entry is ActiveCatalogEntry {
  return entry.status === 'aktiv';
}

export function getCatalogEntry(
  id: string,
  catalog: readonly CatalogEntry[] = DASHBOARD_CATALOG,
): CatalogEntry | undefined {
  return catalog.find((entry) => entry.id === id);
}

export function getActiveEntries(
  catalog: readonly CatalogEntry[] = DASHBOARD_CATALOG,
): ActiveCatalogEntry[] {
  return catalog.filter(isActiveEntry);
}
