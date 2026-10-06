// Auftrag 079 (Gesamtabnahme): Dashboard-Konfigurationen für die Bildmatrix. Zwei Durchgänge decken
// den vollständigen aktiven Katalog in seiner Standarddarstellung ab, weitere Durchgänge jede
// Darstellung in jeder zulässigen Größe. Jeder Durchgang hat höchstens 24 Kacheln und wird mit
// derselben Prüfung wie in der App validiert. Ausgabe als JSON auf stdout.
import {
  DASHBOARD_CATALOG,
  TILE_SIZES,
  isActiveEntry,
  minSizeFor,
  type ActiveCatalogEntry,
  type DashboardView,
} from '../../src/features/dashboard/model/dashboardCatalog';
import {
  DASHBOARD_CONFIG_VERSION,
  MAX_TILES,
  type DashboardTileConfig,
} from '../../src/features/dashboard/model/dashboardConfig';
import { validateDashboardConfig } from '../../src/features/dashboard/model/dashboardValidation';

const ACTIVE = DASHBOARD_CATALOG.filter(isActiveEntry);
const VIEWS: readonly DashboardView[] = [
  'zahl',
  'tabelle',
  'saeulen',
  'balken',
  'kreis',
  'ring',
  'linie',
  'flaeche',
  'uebersicht',
];

const filterModeOf = (entry: ActiveCatalogEntry): DashboardTileConfig['filterMode'] =>
  entry.timeMode === 'fest' ? 'fester_stand' : 'dashboard';
const sizesFrom = (entry: ActiveCatalogEntry, view: DashboardView) =>
  TILE_SIZES.slice(TILE_SIZES.indexOf(minSizeFor(entry, view)));
const tileOf = (
  entry: ActiveCatalogEntry,
  view: DashboardView,
  size: DashboardTileConfig['size'],
  prefix: string,
): DashboardTileConfig => ({
  tileId: `${prefix}_${entry.id.replace(/\./g, '_')}_${view}_${size}`,
  catalogId: entry.id,
  view,
  size,
  filterMode: filterModeOf(entry),
});

/** Stammdaten bevorzugt: fester Datenstand, damit die Bilder reproduzierbar bleiben. */
function entryFor(view: DashboardView): ActiveCatalogEntry {
  const supporting = ACTIVE.filter((entry) => entry.views.includes(view));
  const entry = supporting.find((e) => e.source.layer === 'baseline') ?? supporting[0];
  if (!entry) throw new Error(`Keine aktive Kennzahl für die Darstellung ${view}.`);
  return entry;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const catalogTiles = ACTIVE.map((entry) =>
  tileOf(entry, entry.defaultView, minSizeFor(entry, entry.defaultView), 'kat'),
);
const viewTiles = VIEWS.map((view) => {
  const entry = entryFor(view);
  return sizesFrom(entry, view).map((size) => tileOf(entry, view, size, 'dar'));
});

// Darstellungen nicht über zwei Durchgänge zerreißen: ganze Gruppen packen, solange sie passen.
const viewBatches: DashboardTileConfig[][] = [[]];
for (const group of viewTiles) {
  const current = viewBatches[viewBatches.length - 1];
  if (current.length + group.length > MAX_TILES) viewBatches.push([...group]);
  else current.push(...group);
}

const batches = [
  ...chunk(catalogTiles, MAX_TILES).map((tiles, i) => ({ name: `Katalog ${i + 1}`, tiles })),
  ...viewBatches.map((tiles, i) => ({ name: `Darstellungen ${i + 1}`, tiles })),
].map(({ name, tiles }) => ({
  name,
  config: { version: DASHBOARD_CONFIG_VERSION, tiles },
}));

const problems = batches.flatMap(({ name, config }) => {
  const check = validateDashboardConfig(config);
  if (!check.ok) return [{ name, issues: check.issues }];
  if (check.unavailable.length) return [{ name, issues: check.unavailable }];
  return [];
});
const covered = new Set(catalogTiles.map((tile) => tile.catalogId));
if (problems.length || covered.size !== ACTIVE.length) {
  console.error(
    JSON.stringify({ problems, covered: covered.size, active: ACTIVE.length }, null, 2),
  );
  process.exit(1);
}
process.stdout.write(JSON.stringify({ activeEntries: ACTIVE.length, batches }));
