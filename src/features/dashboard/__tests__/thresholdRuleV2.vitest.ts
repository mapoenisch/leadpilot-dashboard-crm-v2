import { describe, it, expect } from 'vitest';
import {
  evaluateThresholdV2,
  validateThresholdRuleV2,
  normalizeLegacyThresholdRule,
  describeThresholdV2,
  type ThresholdRuleV2,
} from '../model/thresholdRuleV2';
import cases from '../model/thresholdReferenceCases.json';

describe('thresholdRuleV2 (Auftrag 166)', () => {
  describe('Referenzfaelle aus thresholdReferenceCases.json', () => {
    it.each(cases)('Referenzfall $id: $beschreibung', (tc) => {
      let rawWert: unknown = tc.wert;
      if (rawWert === 'NaN') rawWert = Number.NaN;
      if (rawWert === 'Infinity') rawWert = Number.POSITIVE_INFINITY;
      if (rawWert === '-Infinity') rawWert = Number.NEGATIVE_INFINITY;

      const res = evaluateThresholdV2(
        tc.regel,
        rawWert as number | null | undefined,
        tc.zustand,
        tc.einheit,
      );
      expect(res.stufe).toBe(tc.erwartet.stufe);
      if ('grenze' in tc.erwartet) {
        expect(res.grenze).toBe(tc.erwartet.grenze);
      }
    });
  });

  describe('validateThresholdRuleV2', () => {
    it('lehnt undefinierte Regel ab', () => {
      const res = validateThresholdRuleV2(undefined);
      expect(res.ok).toBe(false);
    });

    it('validiert hoch_ist_schlecht korrekt', () => {
      expect(
        validateThresholdRuleV2({
          art: 'hoch_ist_schlecht',
          warnung: 100,
          kritisch: 200,
        }).ok,
      ).toBe(true);

      // Kritisch < Warnung muss fehlschlagen
      const resInvalid = validateThresholdRuleV2({
        art: 'hoch_ist_schlecht',
        warnung: 200,
        kritisch: 100,
      });
      expect(resInvalid.ok).toBe(false);
      if (!resInvalid.ok) {
        expect(resInvalid.feld).toBe('kritisch');
      }

      // Ohne Kritisch ist gueltig
      expect(
        validateThresholdRuleV2({
          art: 'hoch_ist_schlecht',
          warnung: 100,
        }).ok,
      ).toBe(true);
    });

    it('validiert niedrig_ist_schlecht korrekt', () => {
      expect(
        validateThresholdRuleV2({
          art: 'niedrig_ist_schlecht',
          warnung: 200,
          kritisch: 100,
        }).ok,
      ).toBe(true);

      // Kritisch > Warnung muss fehlschlagen
      const resInvalid = validateThresholdRuleV2({
        art: 'niedrig_ist_schlecht',
        warnung: 100,
        kritisch: 200,
      });
      expect(resInvalid.ok).toBe(false);
      if (!resInvalid.ok) {
        expect(resInvalid.feld).toBe('kritisch');
      }
    });

    it('validiert zielbereich korrekt', () => {
      expect(
        validateThresholdRuleV2({
          art: 'zielbereich',
          untenWarnung: 20,
          obenWarnung: 80,
          untenKritisch: 10,
          obenKritisch: 90,
        }).ok,
      ).toBe(true);

      // obenWarnung <= untenWarnung
      expect(
        validateThresholdRuleV2({
          art: 'zielbereich',
          untenWarnung: 80,
          obenWarnung: 20,
        }).ok,
      ).toBe(false);

      // untenKritisch >= untenWarnung
      expect(
        validateThresholdRuleV2({
          art: 'zielbereich',
          untenWarnung: 20,
          obenWarnung: 80,
          untenKritisch: 25,
        }).ok,
      ).toBe(false);

      // obenKritisch <= obenWarnung
      expect(
        validateThresholdRuleV2({
          art: 'zielbereich',
          untenWarnung: 20,
          obenWarnung: 80,
          obenKritisch: 75,
        }).ok,
      ).toBe(false);
    });

    it('prueft Katalogeinheit', () => {
      const res = validateThresholdRuleV2(
        {
          art: 'hoch_ist_schlecht',
          warnung: 100,
          einheit: 'EUR',
        },
        { unit: '%' },
      );
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.feld).toBe('einheit');
      }
    });
  });

  describe('normalizeLegacyThresholdRule', () => {
    it('uebersetzt gt/gte in hoch_ist_schlecht', () => {
      const res = normalizeLegacyThresholdRule(
        { enabled: true, operator: 'gt', warningValue: 100, criticalValue: 200 },
        { unit: 'EUR' },
      );
      expect('regel' in res).toBe(true);
      if ('regel' in res) {
        expect(res.regel.art).toBe('hoch_ist_schlecht');
        expect(res.regel.warnung).toBe(100);
        expect(res.regel.kritisch).toBe(200);
        expect(res.regel.einheit).toBe('EUR');
      }
    });

    it('uebersetzt lt/lte in niedrig_ist_schlecht', () => {
      const res = normalizeLegacyThresholdRule(
        { enabled: true, operator: 'lte', warningValue: 50, criticalValue: 10 },
        { unit: '%' },
      );
      expect('regel' in res).toBe(true);
      if ('regel' in res) {
        expect(res.regel.art).toBe('niedrig_ist_schlecht');
        expect(res.regel.warnung).toBe(50);
        expect(res.regel.kritisch).toBe(10);
        expect(res.regel.einheit).toBe('%');
      }
    });

    it('markiert eq und between als ungueltig', () => {
      const resEq = normalizeLegacyThresholdRule({
        enabled: true,
        operator: 'eq',
        warningValue: 100,
      });
      expect('ungueltig' in resEq).toBe(true);

      const resBetween = normalizeLegacyThresholdRule({
        enabled: true,
        operator: 'between',
        warningValue: 100,
        criticalValue: 200,
      });
      expect('ungueltig' in resBetween).toBe(true);
    });
  });

  describe('describeThresholdV2', () => {
    it('erzeugt lesbare deutsche Beschreibungen', () => {
      const r1: ThresholdRuleV2 = {
        formatVersion: 2,
        enabled: true,
        art: 'hoch_ist_schlecht',
        einheit: 'EUR',
        warnung: 200,
        kritisch: 500,
      };
      expect(describeThresholdV2(r1)).toBe('Warnung ab 200 EUR, Kritisch ab 500 EUR');

      const r2: ThresholdRuleV2 = {
        formatVersion: 2,
        enabled: true,
        art: 'zielbereich',
        einheit: '%',
        untenWarnung: 20,
        obenWarnung: 80,
        untenKritisch: 10,
      };
      expect(describeThresholdV2(r2)).toContain('Zielbereich: 20,0 % – 80,0 %');
      expect(describeThresholdV2(r2)).toContain('Kritisch unter 10,0 %');
    });
  });

  describe('Leistungsmessung (2.4 Nr. 25)', () => {
    it('bewertet 24 Kacheln in unter 1 ms im Mittel ueber 50 Laeufe', () => {
      const testRules: ThresholdRuleV2[] = [
        {
          formatVersion: 2,
          enabled: true,
          art: 'hoch_ist_schlecht',
          einheit: 'EUR',
          warnung: 200,
          kritisch: 500,
        },
        {
          formatVersion: 2,
          enabled: true,
          art: 'niedrig_ist_schlecht',
          einheit: '%',
          warnung: 40,
          kritisch: 20,
        },
        {
          formatVersion: 2,
          enabled: true,
          art: 'zielbereich',
          einheit: 'x',
          untenWarnung: 10,
          obenWarnung: 30,
          untenKritisch: 5,
          obenKritisch: 40,
        },
      ];

      const iterations = 50;
      const tileCount = 24;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        for (let t = 0; t < tileCount; t++) {
          const rule = testRules[t % testRules.length];
          if (rule) {
            const val = (t * 17) % 550;
            evaluateThresholdV2(rule, val, 'ok', rule.einheit);
          }
        }
      }

      const totalTimeMs = performance.now() - start;
      const avgTimePerBatchMs = totalTimeMs / iterations;

      expect(avgTimePerBatchMs).toBeLessThan(1.0);
    });
  });
});
