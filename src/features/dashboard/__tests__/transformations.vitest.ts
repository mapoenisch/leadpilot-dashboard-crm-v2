import { describe, it, expect } from 'vitest';
import {
  applyTransformations,
  formatTransformationSummary,
  getEffectiveTitle,
  getEffectiveUnit,
  getTransformationAlarmCapability,
  isTransformationChainAlarmPermitted,
  TRANSFORMATION_ALARM_MATRIX,
  type TileTransformation,
  validateSingleTransformation,
  validateTransformations,
} from '../model/transformations';
import { evaluateThresholdV2, type ThresholdRuleV2 } from '../model/thresholdRuleV2';
import type { ResolvedTileData } from '../data/dashboardData';
import referenceCases from '../model/transformations/transformationReferenceCases.json';

function createMockResolvedData(overrides: Partial<ResolvedTileData> = {}): ResolvedTileData {
  return {
    catalogId: 'mock.kpi',
    state: 'bereit',
    value: 1234567,
    series: null,
    overview: null,
    unit: 'EUR',
    timeBasis: '31.12.2025',
    asOf: '2026-11-19T20:00:00Z',
    origin: { layer: 'crm', module: 'test', exportName: 'test' },
    scope: 'organisation',
    effectiveFilter: { mode: 'dashboard', period: null, pipeline: null },
    ...overrides,
  };
}

describe('Auftrag 169 – Transformations-Modell & Vitest Suite', () => {
  describe('T1 Rot-Nachweise §3 Nr. 6', () => {
    it('(a) Referenzfall EUR → Tsd. EUR: 1.234.567 -> 1.234,567', () => {
      const data = createMockResolvedData({ value: 1234567, unit: 'EUR' });
      const transformations: TileTransformation[] = [
        { art: 'einheit_umrechnen', von: 'EUR', zu: 'Tsd. EUR' },
      ];
      const result = applyTransformations(data, transformations);
      expect(result.value).toBeCloseTo(1234.567, 5);
      expect(result.unit).toBe('Tsd. EUR');
    });

    it('(b) Durchschnitt mit Lücke im Fenster -> Lücke', () => {
      const data = createMockResolvedData({
        timeSeries: {
          source: 'deal_stage_events',
          resolution: 'tag',
          from: '2026-11-01',
          to: '2026-11-05',
          historyStartAt: '2026-11-01',
          points: [
            { at: '2026-11-01', value: 10, status: 'belegt', measuredAt: '2026-11-01' },
            { at: '2026-11-02', value: 20, status: 'belegt', measuredAt: '2026-11-02' },
            { at: '2026-11-03', value: null, status: 'luecke', measuredAt: null },
            { at: '2026-11-04', value: 40, status: 'belegt', measuredAt: '2026-11-04' },
            { at: '2026-11-05', value: 50, status: 'belegt', measuredAt: '2026-11-05' },
          ],
        },
      });

      const transformations: TileTransformation[] = [
        { art: 'gleitender_durchschnitt', fenster: 3 },
      ];

      const result = applyTransformations(data, transformations);
      const pts = result.timeSeries?.points;
      expect(pts).toBeDefined();
      expect(pts?.[0]?.value).toBeNull();
      expect(pts?.[1]?.value).toBeNull();
      expect(pts?.[2]?.value).toBeNull();
      expect(pts?.[2]?.status).toBe('luecke');
      expect(pts?.[3]?.value).toBeNull();
      expect(pts?.[3]?.status).toBe('luecke');
      expect(pts?.[4]?.value).toBeNull();
      expect(pts?.[4]?.status).toBe('luecke');
    });

    it('(c) Schwellenwert nach Einheitenwechsel wird regel_ungueltig', () => {
      const rule: ThresholdRuleV2 = {
        formatVersion: 2,
        enabled: true,
        art: 'hoch_ist_schlecht',
        einheit: 'EUR',
        warnung: 1000000,
        kritisch: 2000000,
      };

      const transformations: TileTransformation[] = [
        { art: 'einheit_umrechnen', von: 'EUR', zu: 'Tsd. EUR' },
      ];
      const effectiveUnit = getEffectiveUnit('EUR', transformations);
      expect(effectiveUnit).toBe('Tsd. EUR');

      const evalResult = evaluateThresholdV2(rule, 1234.567, 'bereit', effectiveUnit);
      expect(evalResult.stufe).toBe('regel_ungueltig');
    });
  });

  describe('32 Referenzfälle aus transformationReferenceCases.json', () => {
    expect(referenceCases.length).toBeGreaterThanOrEqual(30);

    referenceCases.forEach((tc) => {
      it(`Case ${tc.id}: ${tc.beschreibung}`, () => {
        const trans = tc.transformationen as TileTransformation[];
        const alarmPermitted = isTransformationChainAlarmPermitted(trans);
        expect(alarmPermitted.alarmfaehig).toBe(tc.erwartet.alarmfaehig);

        if (
          tc.kategorie === 'umrechnung' ||
          tc.kategorie === 'umbenennen' ||
          (tc.kategorie === 'kette' && 'wert' in tc.eingabe)
        ) {
          const inputData = createMockResolvedData({
            value: tc.eingabe.wert as number,
            unit: tc.eingabe.einheit,
          });
          const res = applyTransformations(inputData, trans);
          if ('wert' in tc.erwartet) {
            expect(res.value).toBeCloseTo(tc.erwartet.wert as number, 4);
          }
          if ('einheit' in tc.erwartet) {
            expect(res.unit).toBe(tc.erwartet.einheit);
          }
        }

        if (
          tc.kategorie === 'durchschnitt' ||
          (tc.kategorie === 'kette' && 'reihe' in tc.eingabe)
        ) {
          const points = (tc.eingabe.reihe as Array<number | null>).map((val, idx) => ({
            at: `2026-11-${String(idx + 1).padStart(2, '0')}`,
            value: val,
            status: (val === null ? 'luecke' : 'belegt') as 'luecke' | 'belegt',
            measuredAt: val === null ? null : `2026-11-${String(idx + 1).padStart(2, '0')}`,
          }));

          const inputData = createMockResolvedData({
            unit: tc.eingabe.einheit,
            timeSeries: {
              source: 'deal_stage_events',
              resolution: 'tag',
              from: '2026-11-01',
              to: '2026-11-30',
              historyStartAt: '2026-11-01',
              points,
            },
          });

          const res = applyTransformations(inputData, trans);
          const resPoints = res.timeSeries?.points;
          expect(resPoints).toBeDefined();

          if ('reihe' in tc.erwartet) {
            const expectedRow = tc.erwartet.reihe as Array<number | null>;
            expect(resPoints?.length).toBe(expectedRow.length);
            expectedRow.forEach((expVal, idx) => {
              const pt = resPoints?.[idx];
              if (expVal === null) {
                expect(pt?.value).toBeNull();
              } else {
                expect(pt?.value).toBeCloseTo(expVal, 4);
              }
            });
          }

          if ('letzterWert' in tc.erwartet) {
            const lastPt = resPoints?.[resPoints.length - 1];
            expect(lastPt?.value).toBeCloseTo(tc.erwartet.letzterWert as number, 4);
          }
        }

        if (tc.kategorie === 'schwellenwert') {
          const effectiveUnit = getEffectiveUnit(tc.eingabe.einheit, trans);
          const evalRes = evaluateThresholdV2(
            tc.eingabe.schwellenwert,
            tc.erwartet.wert as number,
            'bereit',
            effectiveUnit,
          );
          expect(evalRes.stufe).toBe(tc.erwartet.schwellenwertStufe);
        }
      });
    });
  });

  describe('Validierung und Kettenregeln', () => {
    it('lehnt mehr als 3 Schritte ab', () => {
      const chain: TileTransformation[] = [
        { art: 'umbenennen', name: 'Schritt 1' },
        { art: 'umbenennen', name: 'Schritt 2' },
        { art: 'umbenennen', name: 'Schritt 3' },
        { art: 'umbenennen', name: 'Schritt 4' },
      ];
      const res = validateTransformations(chain, 'EUR');
      expect(res.ok).toBe(false);
      expect(res.grund).toContain('Maximal 3 Transformationsschritte');
    });

    it('validiert umbenennen: max 60 Zeichen, nicht leer', () => {
      expect(validateSingleTransformation({ art: 'umbenennen', name: '' }).ok).toBe(false);
      expect(validateSingleTransformation({ art: 'umbenennen', name: '   ' }).ok).toBe(false);
      expect(validateSingleTransformation({ art: 'umbenennen', name: 'a'.repeat(61) }).ok).toBe(
        false,
      );
      expect(validateSingleTransformation({ art: 'umbenennen', name: 'Gültig' }).ok).toBe(true);
    });

    it('validiert einheit_umrechnen: nur Positivliste und konsistente Eingangseinheit', () => {
      expect(
        validateSingleTransformation({ art: 'einheit_umrechnen', von: 'USD', zu: 'EUR' }).ok,
      ).toBe(false);
      expect(
        validateSingleTransformation(
          { art: 'einheit_umrechnen', von: 'EUR', zu: 'Tsd. EUR' },
          'Anzahl',
        ).ok,
      ).toBe(false);
      expect(
        validateSingleTransformation(
          { art: 'einheit_umrechnen', von: 'EUR', zu: 'Tsd. EUR' },
          'EUR',
        ).ok,
      ).toBe(true);
    });

    it('validiert gleitender_durchschnitt: 2 bis 30 Punkte', () => {
      expect(validateSingleTransformation({ art: 'gleitender_durchschnitt', fenster: 1 }).ok).toBe(
        false,
      );
      expect(validateSingleTransformation({ art: 'gleitender_durchschnitt', fenster: 31 }).ok).toBe(
        false,
      );
      expect(
        validateSingleTransformation({ art: 'gleitender_durchschnitt', fenster: 3.5 }).ok,
      ).toBe(false);
      expect(validateSingleTransformation({ art: 'gleitender_durchschnitt', fenster: 5 }).ok).toBe(
        true,
      );
    });

    it('verfolgt Einheitenwechsel über die gesamte Kette', () => {
      const chain: TileTransformation[] = [
        { art: 'umbenennen', name: 'Kompakt' },
        { art: 'einheit_umrechnen', von: 'EUR', zu: 'Tsd. EUR' },
      ];
      const res = validateTransformations(chain, 'EUR');
      expect(res.ok).toBe(true);
      expect(res.finalUnit).toBe('Tsd. EUR');
    });
  });

  describe('Alarmmatrix-Vollständigkeit', () => {
    it('jede Transformationsart hat einen Eintrag in der Matrix', () => {
      const arts = ['umbenennen', 'einheit_umrechnen', 'gleitender_durchschnitt'] as const;
      arts.forEach((art) => {
        expect(TRANSFORMATION_ALARM_MATRIX[art]).toBeDefined();
      });
    });

    it('unbekannte Transformation ist standardmäßig nicht alarmfähig', () => {
      const cap = getTransformationAlarmCapability({
        art: 'unbekannt',
      } as unknown as TileTransformation);
      expect(cap.alarmfaehig).toBe(false);
    });

    it('Kette mit Durchschnitt meldet Alarmunfähigkeit mit Sperrgrund', () => {
      const chain: TileTransformation[] = [
        { art: 'einheit_umrechnen', von: 'EUR', zu: 'Tsd. EUR' },
        { art: 'gleitender_durchschnitt', fenster: 5 },
      ];
      const res = isTransformationChainAlarmPermitted(chain);
      expect(res.alarmfaehig).toBe(false);
      expect(res.grund).toContain('Geglättete Verläufe haben keinen einzelnen Wert');
      expect(res.blockingIndex).toBe(1);
    });
  });

  describe('Zusammenfassungs- und Titel-Formatierung', () => {
    it('erzeugt korrekte Zusammenfassung für Tooltip und Fußnote', () => {
      const chain: TileTransformation[] = [
        { art: 'umbenennen', name: 'Netto Pipeline' },
        { art: 'einheit_umrechnen', von: 'EUR', zu: 'Tsd. EUR' },
        { art: 'gleitender_durchschnitt', fenster: 7 },
      ];
      const summary = formatTransformationSummary(chain);
      expect(summary).toBe(
        'Umbenannt in „Netto Pipeline“ · EUR → Tsd. EUR · Gleitender Durchschnitt (7 Punkte)',
      );
    });

    it('ermittelt effektiven Titel', () => {
      const chain: TileTransformation[] = [{ art: 'umbenennen', name: 'Neuer Titel' }];
      expect(getEffectiveTitle('Alter Titel', chain)).toBe('Neuer Titel');
      expect(getEffectiveTitle('Alter Titel', [])).toBe('Alter Titel');
    });
  });

  describe('Leistungs- & Benchmark-Test', () => {
    it('gleitender Durchschnitt über 2.000 Punkte läuft in < 5 ms', () => {
      const points = Array.from({ length: 2000 }, (_, i) => ({
        at: `2026-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`,
        value: Math.sin(i) * 1000 + 5000,
        status: 'belegt' as const,
        measuredAt: '2026-01-01T00:00:00Z',
      }));

      const data = createMockResolvedData({
        timeSeries: {
          source: 'deal_stage_events',
          resolution: 'stunde',
          from: '2026-01-01',
          to: '2026-03-25',
          historyStartAt: '2026-01-01',
          points,
        },
      });

      const chain: TileTransformation[] = [{ art: 'gleitender_durchschnitt', fenster: 10 }];

      const start = performance.now();
      const res = applyTransformations(data, chain);
      const duration = performance.now() - start;

      expect(res.timeSeries?.points.length).toBe(2000);
      expect(duration).toBeLessThan(15); // Budget < 5 ms typisch, 15 ms Toleranz im CI
    });
  });
});
