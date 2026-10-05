// Executive Dashboard, Teilauftrag 6 (Auftrag 076): Katalogeinträge der freigegebenen Kombinationen.
// Je Regel ein aktiver Eintrag mit der Zeitbasis seiner Operanden. Fehlt ein Operand im aktiven
// Katalog, entsteht kein Eintrag (ein Test erzwingt, dass alle Regeln einen Eintrag ergeben).
import type { ActiveCatalogEntry } from '../dashboardCatalog';
import { ACTIVE_CATALOG_ENTRIES, BASELINE_ACCESS } from './activeEntries';
import { COMBINATION_RULES, type CombinationRule } from './combinationRules';

const RULES_MODULE = 'src/features/dashboard/model/catalog/combinationRules.ts';

/** Formel in Worten, z. B. „EBITDA ÷ Umsatzerlöse × 100“. */
export function combinationFormula(rule: CombinationRule): string {
  const base = `${rule.numerator.label} ÷ ${rule.denominator.label}`;
  return rule.display === 'prozent' ? `${base} × 100` : base;
}

function toEntry(rule: CombinationRule): ActiveCatalogEntry | null {
  const numerator = ACTIVE_CATALOG_ENTRIES.find((entry) => entry.id === rule.numerator.catalogId);
  if (!numerator) return null;
  const share = rule.operation === 'anteil';
  return {
    id: rule.id,
    name: rule.name,
    category: rule.category,
    kind: 'kpi',
    status: 'aktiv',
    definition: `${combinationFormula(rule)}. ${rule.explanation}`,
    unit: rule.display === 'prozent' ? '%' : 'x',
    source: { layer: 'kombination', module: RULES_MODULE, exportName: 'COMBINATION_RULES' },
    shape: share ? 'anteil' : 'verhaeltnis',
    aggregation: 'verhaeltnis',
    timeMode: 'fest',
    timeBasis: numerator.timeBasis,
    views: share ? ['zahl', 'tabelle', 'ring'] : ['zahl', 'tabelle'],
    defaultView: 'zahl',
    minSize: 'klein',
    groupings: [],
    filters: [],
    detailRouteId: rule.detailRouteId,
    access: BASELINE_ACCESS,
    ...(numerator.mayBeNegative ? { mayBeNegative: true as const } : {}),
  };
}

export const COMBINATION_ENTRIES: readonly ActiveCatalogEntry[] = COMBINATION_RULES.map(
  toEntry,
).filter((entry): entry is ActiveCatalogEntry => entry !== null);
