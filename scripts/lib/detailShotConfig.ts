// Auftrag 077: Dashboard-Konfiguration für den Screenshot-Nachweis (Höchstbelegung, 24 Kacheln).
// Standardansicht plus drei Kombinationen, aufgefüllt mit weiteren aktiven Kennzahlen als Zahl.
// Ausgabe als JSON auf stdout; validiert mit derselben Prüfung wie die App.
import {
  DASHBOARD_CATALOG,
  isActiveEntry,
} from '../../src/features/dashboard/model/dashboardCatalog';
import {
  MAX_TILES,
  type DashboardTileConfig,
} from '../../src/features/dashboard/model/dashboardConfig';
import { DEFAULT_DASHBOARD_CONFIG } from '../../src/features/dashboard/model/defaultDashboard';
import { validateDashboardConfig } from '../../src/features/dashboard/model/dashboardValidation';

const filterModeOf = (entry: ActiveCatalogEntry): DashboardTileConfig['filterMode'] =>
  entry.timeMode === 'fest' ? 'fester_stand' : 'dashboard';

const combos = [
  'kombination.ebitda_marge',
  'kombination.cac_aufschlag',
  'kombination.mrr_anteil_starter',
  'kombination.mrr_anteil_growth',
  'kombination.mrr_anteil_pro',
];
const tiles: DashboardTileConfig[] = [...DEFAULT_DASHBOARD_CONFIG.tiles];
const used = new Set(tiles.map((tile) => tile.catalogId));
const add = (
  catalogId: string,
  view: DashboardTileConfig['view'],
  size: DashboardTileConfig['size'] = 'klein',
  filterMode: DashboardTileConfig['filterMode'] = 'fester_stand',
) => {
  if (tiles.length >= MAX_TILES || used.has(catalogId)) return;
  used.add(catalogId);
  tiles.push({
    tileId: `shot_${catalogId.replace(/\./g, '_')}`,
    catalogId,
    view,
    size,
    filterMode,
  });
};
for (const id of combos) add(id, 'zahl');
for (const entry of DASHBOARD_CATALOG) {
  // Weitere Einträge aus Stammdaten und CRM in ihrer Standarddarstellung.
  if (isActiveEntry(entry) && entry.source.layer !== 'live') {
    add(entry.id, entry.defaultView, entry.minSize, filterModeOf(entry));
  }
}
// Rest mit Live-Kennzahlen (aktuelle Quelle) auffüllen.
for (const entry of DASHBOARD_CATALOG) {
  if (isActiveEntry(entry) && entry.source.layer === 'live') {
    add(entry.id, entry.defaultView, entry.minSize, filterModeOf(entry));
  }
}
const config = { ...DEFAULT_DASHBOARD_CONFIG, tiles };
const check = validateDashboardConfig(config);
if (!check.ok || tiles.length !== MAX_TILES) {
  console.error(JSON.stringify({ tiles: tiles.length, check }, null, 2));
  process.exit(1);
}
process.stdout.write(JSON.stringify(config));
