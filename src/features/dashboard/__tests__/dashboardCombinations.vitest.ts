// Auftrag 076 (Dashboard Teilauftrag 6): Kombinationsregeln, Strukturprüfung, Rechnung, Katalog.
import { describe, expect, it } from 'vitest';
import { COMBINATION_ENTRIES } from '../model/catalog/combinationEntries';
import { DASHBOARD_CATALOG, getCatalogEntry, isActiveEntry } from '../model/dashboardCatalog';
import {
  blockedPartnersFor,
  checkRuleStructure,
  computeCombination,
  explainIncompatible,
  getCombinationRule,
  getCombinationRules,
  partnersFor,
  type CombinationRule,
  type OperandValue,
} from '../model/dashboardCombinations';
import { validateCatalog, validateDashboardConfig } from '../model/dashboardValidation';

const FY = 'Geschäftsjahr 2025';
const op = (value: number | null, timeBasis = FY, unit = 'EUR'): OperandValue => ({
  value,
  unit,
  timeBasis,
});
const rule = (id: string): CombinationRule => {
  const found = getCombinationRule(id);
  if (!found) throw new Error(`Regel ${id} fehlt`);
  return found;
};
const MARGE = rule('kombination.ebitda_marge');
const CAC = rule('kombination.cac_aufschlag');
const STARTER = rule('kombination.mrr_anteil_starter');

describe('computeCombination', () => {
  it('rechnet Anteile: 25 von 100 ergibt 25 %', () => {
    const result = computeCombination(STARTER, op(25), op(100));
    expect(result).toMatchObject({ state: 'bereit', value: 25 });
  });

  it('erklärt Nenner 0, fehlende Operanden, NaN und Infinity statt zu rechnen', () => {
    const cases = [
      computeCombination(MARGE, op(1), op(0)),
      computeCombination(MARGE, null, op(1)),
      computeCombination(MARGE, op(1), null),
      computeCombination(MARGE, op(Number.NaN), op(1)),
      computeCombination(MARGE, op(1), op(Number.POSITIVE_INFINITY)),
      computeCombination(MARGE, op(Number.MAX_VALUE), op(Number.MIN_VALUE)),
    ];
    for (const result of cases) {
      expect(result.state).toBe('nicht_berechenbar');
      if (result.state === 'nicht_berechenbar') expect(result.reason.length).toBeGreaterThan(10);
      expect(result).not.toHaveProperty('value');
    }
  });

  it('lehnt negative oder widersprüchliche Gesamtheiten beim Anteil ab', () => {
    expect(computeCombination(STARTER, op(5), op(-10)).state).toBe('nicht_berechenbar');
    expect(computeCombination(STARTER, op(5), op(0)).state).toBe('nicht_berechenbar');
    expect(computeCombination(STARTER, op(-5), op(10)).state).toBe('nicht_berechenbar');
    expect(computeCombination(STARTER, op(15), op(10)).state).toBe('nicht_berechenbar');
  });

  it('verrechnet keine unterschiedlichen Zeitbasen', () => {
    const result = computeCombination(MARGE, op(1), op(2, 'Stand 31.12.2025'));
    expect(result.state).toBe('nicht_berechenbar');
    if (result.state === 'nicht_berechenbar') expect(result.reason).toMatch(/Zeitbasen/);
  });

  it('EBITDA ÷ Umsatzerlöse mit den Katalogwerten: negative Marge, Formel reproduzierbar', () => {
    const result = computeCombination(MARGE, op(-309_000), op(336_000));
    expect(result.state).toBe('bereit');
    if (result.state !== 'bereit') return;
    expect(result.value).toBeCloseTo(-91.964, 3);
    expect(result.formula).toBe('EBITDA ÷ Umsatzerlöse × 100');
    expect(result.operands.map((o) => [o.label, o.value])).toEqual([
      ['EBITDA', -309_000],
      ['Umsatzerlöse', 336_000],
    ]);
  });

  it('Fully-Loaded CAC ÷ Marketing-CAC ergibt einen Faktor', () => {
    const result = computeCombination(CAC, op(4447), op(862));
    expect(result).toMatchObject({ state: 'bereit', formula: 'Fully-Loaded CAC ÷ Marketing-CAC' });
    if (result.state === 'bereit') expect(result.value).toBeCloseTo(5.159, 3);
  });

  it('Paketanteile ergeben zusammen 100 %', () => {
    const parts = [10_045, 19_580, 4_695];
    const total = parts.reduce((sum, value) => sum + value, 0);
    const keys = ['starter', 'growth', 'pro'];
    const sum = keys.reduce((acc, key, index) => {
      const result = computeCombination(
        rule(`kombination.mrr_anteil_${key}`),
        op(parts[index] ?? null),
        op(total),
      );
      return acc + (result.state === 'bereit' ? result.value : Number.NaN);
    }, 0);
    expect(sum).toBeCloseTo(100, 10);
  });
});

describe('Beziehungsmatrix', () => {
  it('jede Regel besteht die Strukturprüfung', () => {
    for (const r of getCombinationRules())
      expect([r.id, checkRuleStructure(r)]).toEqual([r.id, []]);
  });

  it('keine Regel verbindet Live, CRM oder Funnel-Stufen', () => {
    for (const r of getCombinationRules()) {
      for (const id of [r.numerator.catalogId, r.denominator.catalogId]) {
        expect(id.startsWith('baseline.')).toBe(true);
        const entry = getCatalogEntry(id);
        expect(entry && isActiveEntry(entry) && !entry.funnelStages).toBe(true);
      }
    }
  });

  it('die Strukturprüfung fängt Regeln, die gegen die Grundsätze verstoßen', () => {
    const live: CombinationRule = {
      ...MARGE,
      numerator: { catalogId: 'live.arr', label: 'Live ARR' },
    };
    expect(checkRuleStructure(live)).toContain('Nur historische Stammdaten werden kombiniert.');
    const mixedTime: CombinationRule = {
      ...MARGE,
      denominator: { catalogId: 'baseline.arr', label: 'ARR' },
    };
    expect(checkRuleStructure(mixedTime)).toContain('Zeitbasis der Operanden unterscheidet sich.');
  });

  it('gesperrte Beispielpaarungen liefern einen erklärten Grund', () => {
    expect(explainIncompatible('baseline.umsatz', 'baseline.headcount')).toMatch(/Zeitbasis/);
    expect(explainIncompatible('baseline.arr', 'live.arr')).toMatch(/Live-Werte/);
    expect(explainIncompatible('live.pipeline_mql', 'live.pipeline_leads')).toMatch(/Kohorte/);
    expect(explainIncompatible('live.arr', 'live.mrr')).toMatch(/Messzeitpunkt/);
    expect(explainIncompatible('baseline.umsatz', 'baseline.umsatz')).toMatch(/sich selbst/);
    expect(explainIncompatible('baseline.umsatz', 'baseline.arr')).toMatch(/Zeitbasis/);
    expect(explainIncompatible('baseline.umsatz', 'crm.pipeline_volumen')).toMatch(/CRM/);
    expect(explainIncompatible('baseline.headcount', 'baseline.kunden_aktiv')).toMatch(
      /nicht freigegeben/,
    );
    expect(explainIncompatible('baseline.umsatz', 'baseline.ebitda')).toBeNull();
    expect(explainIncompatible('baseline.marketing_cac', 'baseline.fully_loaded_cac')).toBeNull();
  });

  it('partnersFor kennt nur Paarungen der Matrix', () => {
    expect(partnersFor('baseline.ebitda').map((p) => [p.rule.id, p.partnerLabel])).toEqual([
      ['kombination.ebitda_marge', 'Umsatzerlöse'],
    ]);
    expect(partnersFor('baseline.umsatz').map((p) => p.partnerLabel)).toEqual(['EBITDA']);
    expect(partnersFor('baseline.mrr_paketmix').map((p) => p.rule.id)).toEqual([
      'kombination.mrr_anteil_starter',
      'kombination.mrr_anteil_growth',
      'kombination.mrr_anteil_pro',
    ]);
    expect(partnersFor('baseline.headcount')).toEqual([]);
    expect(partnersFor('live.arr')).toEqual([]);
    for (const entry of DASHBOARD_CATALOG.filter(isActiveEntry)) {
      for (const partner of partnersFor(entry.id)) {
        expect(getCombinationRules()).toContain(partner.rule);
      }
    }
  });

  it('naheliegende Partner gleicher Einheit und Ebene erscheinen gesperrt mit Grund', () => {
    const blocked = blockedPartnersFor('baseline.umsatz');
    const ids = blocked.map((b) => b.entry.id);
    expect(ids).toContain('baseline.arr');
    expect(ids).not.toContain('live.arr');
    expect(blocked.find((b) => b.entry.id === 'baseline.arr')?.reason).toMatch(/Zeitbasis/);
    expect(blockedPartnersFor('live.arr').map((b) => b.reason)).toContain(
      'Für zwei Live-Werte ist kein gemeinsamer Messzeitpunkt belegt.',
    );
    expect(ids).not.toContain('baseline.ebitda');
    expect(ids.some((id) => id.startsWith('kombination.'))).toBe(false);
    for (const b of blocked) expect(b.reason.length).toBeGreaterThan(10);
    expect(blockedPartnersFor('baseline.marketing_cac')).toEqual([]);
  });
});

describe('Kombinationen im Katalog', () => {
  it('jede Regel ergibt einen aktiven Eintrag mit aktiven Operanden', () => {
    expect(COMBINATION_ENTRIES.map((e) => e.id)).toEqual(getCombinationRules().map((r) => r.id));
    for (const entry of COMBINATION_ENTRIES) {
      expect(getCatalogEntry(entry.id)).toBe(entry);
      expect(entry.source.layer).toBe('kombination');
      expect(entry.timeMode).toBe('fest');
    }
    expect(getCatalogEntry('kombination.ebitda_marge')).toMatchObject({
      unit: '%',
      timeBasis: FY,
      views: ['zahl', 'tabelle'],
      mayBeNegative: true,
    });
    expect(getCatalogEntry('kombination.cac_aufschlag')).toMatchObject({ unit: 'x' });
    expect(getCatalogEntry('kombination.mrr_anteil_pro')).toMatchObject({
      shape: 'anteil',
      timeBasis: 'Stand 31.12.2025',
      views: ['zahl', 'tabelle', 'ring'],
    });
  });

  it('der Gesamtkatalog besteht die Katalogprüfung', () => {
    expect(validateCatalog(DASHBOARD_CATALOG)).toEqual([]);
  });

  const tile = (overrides: Record<string, unknown>) => ({
    tileId: 't1',
    catalogId: 'kombination.ebitda_marge',
    view: 'zahl',
    size: 'klein',
    filterMode: 'fester_stand',
    ...overrides,
  });
  const codesOf = (input: unknown) => {
    const result = validateDashboardConfig(input);
    return result.ok ? [] : result.issues.map((issue) => issue.code);
  };

  it('validateDashboardConfig: Kombination mit zulässiger Darstellung, Ring nur beim Anteil', () => {
    expect(codesOf({ version: 1, tiles: [tile({})] })).toEqual([]);
    expect(codesOf({ version: 1, tiles: [tile({ view: 'ring', size: 'mittel' })] })).toEqual([
      'view_unzulaessig',
    ]);
    const share = tile({
      catalogId: 'kombination.mrr_anteil_growth',
      view: 'ring',
      size: 'mittel',
    });
    expect(codesOf({ version: 1, tiles: [share] })).toEqual([]);
  });

  it('eine gespeicherte Kombination mit entfernter Regel bleibt als unbekannte Kachel erhalten', () => {
    const removed = tile({ catalogId: 'kombination.entfernt' });
    const result = validateDashboardConfig({ version: 1, tiles: [removed] });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.tiles[0]).toEqual(removed);
    expect(result.unavailable.map((i) => i.code)).toEqual(['katalog_unbekannt']);
  });
});
