import { describe, it, expect } from 'vitest';
import {
  validateDashboardConfigV2,
  createEmptyDashboardConfigV2,
  type DashboardConfigV2,
} from '../model/dashboardConfigV2';

function makeBaseConfig(): DashboardConfigV2 {
  const cfg = createEmptyDashboardConfigV2({
    ownerUserId: 'user-1',
    organizationId: 'org-1',
  });
  cfg.tiles.push({
    id: 't-1',
    catalogId: 'baseline.arr',
    title: 'ARR',
    presentation: 'zahl',
    layouts: {
      desktop: { x: 0, y: 0, w: 4, h: 4 },
      mobile: { x: 0, y: 0, w: 1, h: 2 },
    },
  });
  return cfg;
}

describe('dashboardConfigV2 Threshold Validation & Backward Compatibility (Auftrag 166)', () => {
  it('laesst fachlich widerspruechliche V2-Regeln beim Laden durch (wird erst bei Anzeige ungueltig)', () => {
    const cfg = makeBaseConfig();
    cfg.tiles[0]!.threshold = {
      formatVersion: 2,
      enabled: true,
      art: 'hoch_ist_schlecht',
      einheit: 'EUR',
      warnung: 500,
      kritisch: 200, // fachlicher Widerspruch: kritisch < warnung
    };

    const res = validateDashboardConfigV2(cfg);
    expect(res.ok).toBe(true);
  });

  it('lehnt formell ungueltige V2-Regeln ab (z. B. String statt endlicher Zahl)', () => {
    const cfg = makeBaseConfig();
    (cfg.tiles[0] as unknown as { threshold: unknown }).threshold = {
      formatVersion: 2,
      enabled: true,
      art: 'hoch_ist_schlecht',
      einheit: 'EUR',
      warnung: 'einhundert', // Formfehler
    };

    const res = validateDashboardConfigV2(cfg);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain('threshold.warnung muss eine endliche Zahl sein');
    }
  });

  describe('Drei realistische Altkonfigurationen laden unveraendert (§3 Nr. 6)', () => {
    it('Altkonfiguration 1: Regel mit between laedt gueltig', () => {
      const cfg = makeBaseConfig();
      cfg.tiles[0]!.threshold = {
        enabled: true,
        operator: 'between',
        warningValue: 100,
        criticalValue: 200,
      };

      const res = validateDashboardConfigV2(cfg);
      expect(res.ok).toBe(true);
    });

    it('Altkonfiguration 2: Regel mit eq laedt gueltig', () => {
      const cfg = makeBaseConfig();
      cfg.tiles[0]!.threshold = {
        enabled: true,
        operator: 'eq',
        warningValue: 50,
      };

      const res = validateDashboardConfigV2(cfg);
      expect(res.ok).toBe(true);
    });

    it('Altkonfiguration 3: Regel mit gt laedt gueltig', () => {
      const cfg = makeBaseConfig();
      cfg.tiles[0]!.threshold = {
        enabled: true,
        operator: 'gt',
        warningValue: 1000,
        criticalValue: 2000,
      };

      const res = validateDashboardConfigV2(cfg);
      expect(res.ok).toBe(true);
    });
  });
});
