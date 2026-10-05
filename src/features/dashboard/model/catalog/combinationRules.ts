// Executive Dashboard, Teilauftrag 6 (Auftrag 076): freigegebene Kombinationsregeln (Positivliste).
// Fachliche Freigabe: Marc, 05.10.2026. Kein freier Formeleditor; neue Regeln werden gezielt
// ergänzt und müssen die Strukturprüfung in `dashboardCombinations.ts` bestehen.
import type { DashboardCategory } from '../dashboardCatalog';

export interface CombinationOperand {
  catalogId: string;
  /** Lesbarer Name des Operanden in Formel und Details. */
  label: string;
  /** Element einer Reihe (Beschriftung exakt wie in der Quelle), z. B. ein Paket. */
  element?: string;
  /** Summe aller Elemente der Reihe (Gesamtheit eines Anteils). */
  sum?: true;
}

export interface CombinationRule {
  id: string;
  name: string;
  category: DashboardCategory;
  /** Verhältnis `A ÷ B` oder Anteil `Teil ÷ Gesamt × 100`. */
  operation: 'verhaeltnis' | 'anteil';
  /** Anzeige: Faktor („x“) oder Prozent (Ergebnis × 100). Anteile sind immer Prozent. */
  display: 'faktor' | 'prozent';
  numerator: CombinationOperand;
  denominator: CombinationOperand;
  /** Nur Anteile: Beschriftung des Rests in Ring und Tabelle, z. B. „Übrige Pakete“. */
  restLabel?: string;
  /** Fachliche Einordnung in einem Satz. */
  explanation: string;
  detailRouteId: string;
}

const MRR = 'baseline.mrr_paketmix';
const MRR_TOTAL: CombinationOperand = { catalogId: MRR, label: 'Gesamt-MRR', sum: true };

const mrrShare = (key: string, element: string, label: string): CombinationRule => ({
  id: `kombination.mrr_anteil_${key}`,
  name: `MRR-Anteil ${label}`,
  category: 'finanzen',
  operation: 'anteil',
  display: 'prozent',
  numerator: { catalogId: MRR, label: `MRR ${label}`, element },
  denominator: MRR_TOTAL,
  restLabel: 'Übrige Pakete',
  explanation: `Anteil des Pakets ${label} am Gesamt-MRR; die Summe der Pakete ergibt den Gesamt-MRR.`,
  detailRouteId: 's-pricing',
});

export const COMBINATION_RULES: readonly CombinationRule[] = [
  {
    id: 'kombination.ebitda_marge',
    name: 'EBITDA-Marge',
    category: 'finanzen',
    operation: 'verhaeltnis',
    display: 'prozent',
    numerator: { catalogId: 'baseline.ebitda', label: 'EBITDA' },
    denominator: { catalogId: 'baseline.umsatz', label: 'Umsatzerlöse' },
    explanation:
      'EBITDA im Verhältnis zu den Umsatzerlösen desselben Geschäftsjahres; bei negativem EBITDA ist die Marge negativ.',
    detailRouteId: 's-guv',
  },
  {
    id: 'kombination.cac_aufschlag',
    name: 'CAC-Aufschlagfaktor',
    category: 'vertrieb_crm',
    operation: 'verhaeltnis',
    display: 'faktor',
    numerator: { catalogId: 'baseline.fully_loaded_cac', label: 'Fully-Loaded CAC' },
    denominator: { catalogId: 'baseline.marketing_cac', label: 'Marketing-CAC' },
    explanation:
      'Gesamtkosten für Vertrieb und Marketing je Neukunde im Verhältnis zum Media-Spend je Neukunde (gleiche Neukundenbasis, gleiches Geschäftsjahr).',
    detailRouteId: 's-unit',
  },
  mrrShare('starter', 'Starter (49€)', 'Starter'),
  mrrShare('growth', 'Growth (89€)', 'Growth'),
  mrrShare('pro', 'Pro (Individuell / Ref. 80€)', 'Pro'),
];
