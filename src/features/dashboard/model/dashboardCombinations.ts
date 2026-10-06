// Executive Dashboard, Teilauftrag 6 (Auftrag 076): geführte KPI-Kombinationen.
// Die Regeln (`catalog/combinationRules.ts`) sind die Positivliste; die Strukturprüfung hier ist die
// zweite Sicherung. Gleiche Einheit allein macht Kennzahlen nie kombinierbar. Ergebnisse sind nie
// `Infinity`, `NaN` oder ein künstlicher Prozentwert, sondern ein erklärter Zustand.
import { combinationFormula } from './catalog/combinationEntries';
import { COMBINATION_RULES, type CombinationRule } from './catalog/combinationRules';
import {
  DASHBOARD_CATALOG,
  getCatalogEntry,
  isActiveEntry,
  type ActiveCatalogEntry,
  type CatalogEntry,
} from './dashboardCatalog';

export type { CombinationOperand, CombinationRule } from './catalog/combinationRules';
export { combinationFormula };

/** Live-Bestände einzelner Funnel-Stufen: keine gemeinsame Kohorte, keine belegte Conversion. */
const LIVE_FUNNEL_STOCKS = new Set([
  'live.pipeline_leads',
  'live.pipeline_mql',
  'live.pipeline_sql',
  'live.pipeline_offers',
]);

export function getCombinationRules(): readonly CombinationRule[] {
  return COMBINATION_RULES;
}

export function getCombinationRule(id: string): CombinationRule | undefined {
  return COMBINATION_RULES.find((rule) => rule.id === id);
}

export function isCombinationId(id: string): boolean {
  return id.startsWith('kombination.');
}

function activeEntry(id: string, catalog: readonly CatalogEntry[]): ActiveCatalogEntry | undefined {
  const entry = getCatalogEntry(id, catalog);
  return entry && isActiveEntry(entry) ? entry : undefined;
}

/** Strukturprüfung einer Regel gegen den Katalog; leere Liste = Regel ist zulässig. */
export function checkRuleStructure(
  rule: CombinationRule,
  catalog: readonly CatalogEntry[] = DASHBOARD_CATALOG,
): string[] {
  const issues: string[] = [];
  const a = activeEntry(rule.numerator.catalogId, catalog);
  const b = activeEntry(rule.denominator.catalogId, catalog);
  if (!a || !b) return ['Operand fehlt oder ist nicht aktiv.'];
  if (a.source.layer !== 'baseline' || b.source.layer !== 'baseline')
    issues.push('Nur historische Stammdaten werden kombiniert.');
  if (a.timeBasis !== b.timeBasis) issues.push('Zeitbasis der Operanden unterscheidet sich.');
  if (a.unit !== b.unit || a.unit.trim() === '')
    issues.push('Einheit fehlt oder unterscheidet sich.');
  if (a.funnelStages || b.funnelStages) issues.push('Funnel-Stufen sind ausgeschlossen.');
  if (rule.operation === 'anteil') {
    if (a.id !== b.id || a.shape !== 'anteile')
      issues.push('Ein Anteil braucht Teil und Gesamtheit derselben Anteilsreihe.');
    if (!rule.numerator.element || !rule.denominator.sum)
      issues.push('Ein Anteil braucht ein Reihenelement und die Gesamtsumme.');
    if (rule.display !== 'prozent') issues.push('Anteile werden in Prozent angezeigt.');
  } else {
    if (a.id === b.id) issues.push('Eine Kennzahl wird nicht mit sich selbst kombiniert.');
    if (rule.numerator.element || rule.denominator.element || rule.denominator.sum)
      issues.push('Ein Verhältnis verbindet zwei Einzelwerte.');
  }
  return issues;
}

export interface CombinationPartner {
  rule: CombinationRule;
  /** Lesbarer Name der zweiten Kennzahl. */
  partnerLabel: string;
  formula: string;
}

/** Freigegebene zweite Kennzahlen zu einer ersten Kennzahl (nur aus der Positivliste). */
export function partnersFor(catalogId: string): CombinationPartner[] {
  return COMBINATION_RULES.filter(
    (rule) => rule.numerator.catalogId === catalogId || rule.denominator.catalogId === catalogId,
  ).map((rule) => ({
    rule,
    partnerLabel:
      rule.numerator.catalogId === catalogId && rule.denominator.catalogId !== catalogId
        ? rule.denominator.label
        : rule.denominator.catalogId === catalogId && rule.numerator.catalogId !== catalogId
          ? rule.numerator.label
          : `${rule.numerator.label} zu ${rule.denominator.label}`,
    formula: combinationFormula(rule),
  }));
}

/**
 * Warum zwei Kennzahlen keine freigegebene Kombination bilden, als verständlicher Satz.
 * `null`, wenn eine Regel sie verbindet.
 */
export function explainIncompatible(
  aId: string,
  bId: string,
  catalog: readonly CatalogEntry[] = DASHBOARD_CATALOG,
): string | null {
  const ruled = COMBINATION_RULES.some(
    (rule) =>
      rule.numerator.catalogId !== rule.denominator.catalogId &&
      [rule.numerator.catalogId, rule.denominator.catalogId].sort().join() ===
        [aId, bId].sort().join(),
  );
  if (ruled) return null;
  if (aId === bId) return 'Eine Kennzahl lässt sich nicht mit sich selbst kombinieren.';
  const a = activeEntry(aId, catalog);
  const b = activeEntry(bId, catalog);
  if (!a || !b) return 'Mindestens eine der Kennzahlen ist nicht verfügbar.';
  const layers = [a.source.layer, b.source.layer];
  if (layers.includes('live') && layers.some((layer) => layer !== 'live'))
    return 'Historische Werte und Live-Werte werden nicht miteinander verrechnet.';
  if (
    LIVE_FUNNEL_STOCKS.has(a.id) ||
    LIVE_FUNNEL_STOCKS.has(b.id) ||
    a.funnelStages ||
    b.funnelStages
  )
    return 'Funnel-Bestände sind keine gemeinsame Kohorte im gleichen Zeitraum; eine Conversion daraus ist nicht belegt.';
  if (layers[0] === 'live' && layers[1] === 'live')
    return 'Für zwei Live-Werte ist kein gemeinsamer Messzeitpunkt belegt.';
  if (a.source.layer !== b.source.layer)
    return 'Stammdaten und CRM-Werte haben unterschiedliche Stände und werden nicht verrechnet.';
  if (a.timeBasis !== b.timeBasis)
    return `Unterschiedliche Zeitbasis (${a.timeBasis} und ${b.timeBasis}).`;
  return 'Diese Kombination ist nicht freigegeben; neue Kombinationen werden gezielt geprüft und ergänzt.';
}

/**
 * Naheliegende, aber gesperrte Partner: aktive Kennzahlen derselben Ebene mit gleicher Einheit
 * ohne Regel. Sie erscheinen im Konfigurator deaktiviert mit Grund, statt still zu fehlen.
 * Andere Ebenen (Live, CRM) bietet der Konfigurator gar nicht erst an. Kombinationen rechnen
 * mit zwei Einzelwerten; Reihen (Zeitreihe, Anteile, Kategorien) sind deshalb nie naheliegend
 * (Auftrag 078).
 */
const isScalar = (entry: ActiveCatalogEntry) =>
  entry.kind === 'kpi' && (entry.shape === 'einzelwert' || entry.shape === 'verhaeltnis');

export function blockedPartnersFor(
  catalogId: string,
  catalog: readonly CatalogEntry[] = DASHBOARD_CATALOG,
): { entry: ActiveCatalogEntry; reason: string }[] {
  const first = activeEntry(catalogId, catalog);
  if (!first || !isScalar(first)) return [];
  return catalog.filter(isActiveEntry).flatMap((entry) => {
    if (entry.id === first.id || entry.unit !== first.unit || !isScalar(entry)) return [];
    if (entry.source.layer !== first.source.layer) return [];
    const reason = explainIncompatible(first.id, entry.id, catalog);
    return reason ? [{ entry, reason }] : [];
  });
}

/** Wert eines Operanden mit der Zeitbasis seiner Quelle; `value: null` = fehlt. */
export interface OperandValue {
  value: number | null;
  unit: string;
  timeBasis: string;
}

export interface CombinationOperandResult extends OperandValue {
  label: string;
}

export type CombinationResult =
  | {
      state: 'bereit';
      /** Anzeigewert: Faktor oder Prozent. */
      value: number;
      formula: string;
      operands: readonly CombinationOperandResult[];
    }
  | {
      state: 'nicht_berechenbar';
      reason: string;
      formula: string;
      operands: readonly CombinationOperandResult[];
    };

const finite = (value: number | null): value is number => value !== null && Number.isFinite(value);

/** Rechnet eine Regel; jeder unzulässige Fall ergibt einen erklärten Zustand. */
export function computeCombination(
  rule: CombinationRule,
  numerator: OperandValue | null,
  denominator: OperandValue | null,
): CombinationResult {
  const formula = combinationFormula(rule);
  const operands: CombinationOperandResult[] = [];
  if (numerator) operands.push({ ...numerator, label: rule.numerator.label });
  if (denominator) operands.push({ ...denominator, label: rule.denominator.label });
  const fail = (reason: string): CombinationResult => ({
    state: 'nicht_berechenbar',
    reason,
    formula,
    operands,
  });
  if (!numerator || !finite(numerator.value))
    return fail(`Für „${rule.numerator.label}“ liegt kein gültiger Wert vor.`);
  if (!denominator || !finite(denominator.value))
    return fail(`Für „${rule.denominator.label}“ liegt kein gültiger Wert vor.`);
  if (numerator.timeBasis !== denominator.timeBasis)
    return fail(
      `Die Zeitbasen passen nicht zusammen (${numerator.timeBasis} und ${denominator.timeBasis}).`,
    );
  const a = numerator.value;
  const b = denominator.value;
  if (rule.operation === 'anteil') {
    if (b <= 0)
      return fail(
        `Die Gesamtheit „${rule.denominator.label}“ ist nicht positiv; ein Anteil ist nicht bestimmbar.`,
      );
    if (a < 0 || a > b)
      return fail(
        `„${rule.numerator.label}“ liegt außerhalb der Gesamtheit; der Anteil wäre widersprüchlich.`,
      );
  } else if (b === 0) {
    return fail(`„${rule.denominator.label}“ ist 0; durch 0 lässt sich nicht teilen.`);
  }
  const ratio = a / b;
  const value = rule.display === 'prozent' ? ratio * 100 : ratio;
  if (!Number.isFinite(value)) return fail('Das Ergebnis ist keine endliche Zahl.');
  return { state: 'bereit', value, formula, operands };
}
