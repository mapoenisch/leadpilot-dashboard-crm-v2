import { describe, expect, it } from 'vitest';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import {
  buildDashboardExportV2,
  buildExportFileNameV2,
  parseDashboardImportV2,
  slugifyDashboardTitle,
} from '../model/dashboardExchangeV2';
import { DASHBOARD_EXCHANGE_LIMITS } from '../model/dashboardVersionMessages';

describe('dashboardExchangeV2', () => {
  const sampleConfig: DashboardConfigV2 = {
    version: 2,
    id: 'dash_export_1',
    title: 'Vertrieb & Marketing Überflieger 2026',
    scope: 'personal',
    ownerUserId: 'usr_secret_123',
    organizationId: 'org_secret_456',
    globalTimeframe: 'letzte_30_tage',
    tiles: [
      {
        id: 'tile_arr',
        catalogId: 'baseline.arr',
        title: 'ARR Übersicht',
        presentation: 'zahl',
        layouts: { desktop: { x: 0, y: 0, w: 3, h: 3 } },
      },
      {
        id: 'tile_umsatz',
        catalogId: 'baseline.umsatz',
        title: 'Umsatz Verlauf',
        presentation: 'verlauf',
        layouts: { desktop: { x: 3, y: 0, w: 6, h: 4 } },
      },
    ],
    sections: [{ id: 'sec_1', title: 'Hauptbereich', collapsed: false, tileIds: ['tile_arr'] }],
    metadata: {
      migration_flag: 'true',
    },
  };

  const defaultSession = {
    ownerUserId: 'usr_importer_789',
    organizationId: 'org_importer_999',
    scope: 'team' as const,
    teamId: 'team_sales_1',
  };

  describe('Export', () => {
    it('Rot-Nachweis b: Export entfernt ownerUserId, organizationId, id, scope, teamId und metadata', () => {
      const exported = buildDashboardExportV2(sampleConfig, { sourceRevision: 3 });
      const jsonStr = JSON.stringify(exported);

      expect(jsonStr).not.toContain('usr_secret_123');
      expect(jsonStr).not.toContain('org_secret_456');
      expect(jsonStr).not.toContain('dash_export_1');
      expect(jsonStr).not.toContain('migration_flag');

      expect(exported.format).toBe('leadpilot-dashboard');
      expect(exported.formatVersion).toBe(1);
      expect(exported.sourceRevision).toBe(3);
      expect(exported.dashboard).not.toHaveProperty('ownerUserId');
      expect(exported.dashboard).not.toHaveProperty('organizationId');
      expect(exported.dashboard).not.toHaveProperty('id');
      expect(exported.dashboard).not.toHaveProperty('scope');
      expect(exported.dashboard).not.toHaveProperty('metadata');
    });

    it('slugifyDashboardTitle und buildExportFileNameV2 erzeugen saubere Dateinamen', () => {
      const slug = slugifyDashboardTitle('Vertrieb & Marketing Überflieger 2026');
      expect(slug).toBe('vertrieb-marketing-uberflieger-2026');

      const fileName = buildExportFileNameV2('Vertrieb & Marketing Überflieger 2026', 7);
      expect(fileName).toBe('leadpilot-dashboard-vertrieb-marketing-uberflieger-2026-r7.json');

      // Leer / Sonderzeichen fallback
      expect(buildExportFileNameV2('???', 1)).toBe('leadpilot-dashboard-dashboard-r1.json');
    });
  });

  describe('Import', () => {
    it('Rot-Nachweis c: Import lehnt __proto__, constructor und prototype ab', () => {
      const payloads = [
        '{"format":"leadpilot-dashboard","formatVersion":1,"exportedAt":"2026-01-01T00:00:00Z","sourceRevision":1,"dashboard":{"title":"Böses Proto","__proto__":{"polluted":true},"tiles":[]}}',
        '{"format":"leadpilot-dashboard","formatVersion":1,"exportedAt":"2026-01-01T00:00:00Z","sourceRevision":1,"dashboard":{"title":"Böser Constructor","constructor":{"polluted":true},"tiles":[]}}',
        '{"format":"leadpilot-dashboard","formatVersion":1,"exportedAt":"2026-01-01T00:00:00Z","sourceRevision":1,"dashboard":{"title":"Böser Prototype","prototype":{"polluted":true},"tiles":[]}}',
      ];

      for (const payload of payloads) {
        const result = parseDashboardImportV2(payload, defaultSession);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.grund).toContain('unzulässige Objekteigenschaften');
        }
      }
    });

    it('weist Dateien über 128 KiB ab', () => {
      const largePayload = ' '.repeat(DASHBOARD_EXCHANGE_LIMITS.maxFileSizeBytes + 10);
      const result = parseDashboardImportV2(largePayload, defaultSession);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.grund).toContain('zu groß');
      }
    });

    it('weist ungültiges JSON ab', () => {
      const result = parseDashboardImportV2('{ unclosed json', defaultSession);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.grund).toContain('kein gültiges JSON');
      }
    });

    it('weist unbekanntes Format oder abweichende Formatversion ab', () => {
      const validEnvelope = buildDashboardExportV2(sampleConfig, { sourceRevision: 1 });

      const wrongFormat = JSON.stringify({ ...validEnvelope, format: 'other-app' });
      const res1 = parseDashboardImportV2(wrongFormat, defaultSession);
      expect(res1.ok).toBe(false);
      if (!res1.ok) expect(res1.grund).toContain('Ungültiges Dateiformat');

      const wrongVersion = JSON.stringify({ ...validEnvelope, formatVersion: 2 });
      const res2 = parseDashboardImportV2(wrongVersion, defaultSession);
      expect(res2.ok).toBe(false);
      if (!res2.ok) expect(res2.grund).toContain('Nicht unterstützte Formatversion');
    });

    it('weist Kacheln mit unbekannter oder inaktiver Katalog-ID ab', () => {
      const envelope = buildDashboardExportV2(sampleConfig, { sourceRevision: 1 });
      delete (envelope.dashboard as Record<string, unknown>).sections;
      envelope.dashboard.tiles = [
        {
          id: 'tile_fake',
          catalogId: 'nicht.im.katalog',
          title: 'Fantasie KPI',
          presentation: 'zahl',
          layouts: { desktop: { x: 0, y: 0, w: 3, h: 3 } },
        },
      ];

      const result = parseDashboardImportV2(JSON.stringify(envelope), defaultSession);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.grund).toContain('Fantasie KPI');
        expect(result.grund).toContain('Kacheln, die es in dieser App nicht gibt');
      }
    });

    it('setzt Bezugsfelder und Rechte strikt aus der Sitzung', () => {
      const envelope = buildDashboardExportV2(sampleConfig, { sourceRevision: 1 });
      const result = parseDashboardImportV2(JSON.stringify(envelope), defaultSession);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.config.ownerUserId).toBe('usr_importer_789');
      expect(result.config.organizationId).toBe('org_importer_999');
      expect(result.config.scope).toBe('team');
      expect(result.config.teamId).toBe('team_sales_1');
      expect(result.config.id).not.toBe('dash_export_1');
      expect(result.config.metadata).toEqual({});
    });

    it('lehnt Import ab wenn tiles kein Array ist (Codex P2)', () => {
      const invalidEnvelope = {
        format: 'leadpilot-dashboard',
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        dashboard: {
          title: 'Ungültig',
          tiles: { invalid: true },
        },
      };
      const result = parseDashboardImportV2(JSON.stringify(invalidEnvelope), defaultSession);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.grund).toContain('tiles muss ein Array sein');
    });

    it('lehnt Import ab wenn sections kein Array oder variables kein Objekt ist', () => {
      const envelopeBadSec = {
        format: 'leadpilot-dashboard',
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        dashboard: {
          title: 'Ungültig',
          tiles: [],
          sections: 'kein-array',
        },
      };
      const resultSec = parseDashboardImportV2(JSON.stringify(envelopeBadSec), defaultSession);
      expect(resultSec.ok).toBe(false);
      if (resultSec.ok) return;
      expect(resultSec.grund).toContain('sections muss ein Array sein');

      const envelopeBadVars = {
        format: 'leadpilot-dashboard',
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        dashboard: {
          title: 'Ungültig',
          tiles: [],
          variables: ['kein-objekt'],
        },
      };
      const resultVars = parseDashboardImportV2(JSON.stringify(envelopeBadVars), defaultSession);
      expect(resultVars.ok).toBe(false);
      if (resultVars.ok) return;
      expect(resultVars.grund).toContain('variables muss ein Objekt sein');
    });
  });

  describe('Rundlauf (Export -> Import)', () => {
    it('Export und Import sind zueinander verlustfrei für Titel, Kacheln und Sektionen', () => {
      const exported = buildDashboardExportV2(sampleConfig, { sourceRevision: 2 });
      const serialized = JSON.stringify(exported);

      const imported = parseDashboardImportV2(serialized, defaultSession);
      expect(imported.ok).toBe(true);
      if (!imported.ok) return;

      expect(imported.config.title).toBe(sampleConfig.title);
      expect(imported.config.globalTimeframe).toBe(sampleConfig.globalTimeframe);
      expect(imported.config.tiles).toEqual(sampleConfig.tiles);
      expect(imported.config.sections).toEqual(sampleConfig.sections);
    });

    it('exportiert und importiert globale Pipeline und Variablen', () => {
      const configWithMore: DashboardConfigV2 = {
        ...sampleConfig,
        globalPipeline: 'pipeline_enterprise',
        variables: { currency: 'EUR' },
      };
      const exported = buildDashboardExportV2(configWithMore, { sourceRevision: 5 });
      expect(exported.dashboard.globalPipeline).toBe('pipeline_enterprise');
      expect(exported.dashboard.variables).toEqual({ currency: 'EUR' });

      const imported = parseDashboardImportV2(JSON.stringify(exported), defaultSession);
      expect(imported.ok).toBe(true);
      if (imported.ok) {
        expect(imported.config.globalPipeline).toBe('pipeline_enterprise');
        expect(imported.config.variables).toEqual({ currency: 'EUR' });
      }
    });

    it('weist fehlerhafte Hüllen und Array-Wurzeln ab', () => {
      // JSON Array als Wurzel
      const resArr = parseDashboardImportV2('[1, 2, 3]', defaultSession);
      expect(resArr.ok).toBe(false);

      // Falsches Format
      const resFormat = parseDashboardImportV2(
        JSON.stringify({ format: 'other', formatVersion: 1, dashboard: {} }),
        defaultSession,
      );
      expect(resFormat.ok).toBe(false);

      // Falsche Format-Version
      const resVer = parseDashboardImportV2(
        JSON.stringify({ format: 'leadpilot-dashboard', formatVersion: 2, dashboard: {} }),
        defaultSession,
      );
      expect(resVer.ok).toBe(false);

      // Dashboard ist Array
      const resDashArr = parseDashboardImportV2(
        JSON.stringify({ format: 'leadpilot-dashboard', formatVersion: 1, dashboard: [] }),
        defaultSession,
      );
      expect(resDashArr.ok).toBe(false);

      // Prototype Pollution in verschachteltem Array
      const resPollutionArr = parseDashboardImportV2(
        JSON.stringify({
          format: 'leadpilot-dashboard',
          formatVersion: 1,
          items: [{ constructor: 'bad' }],
          dashboard: {},
        }),
        defaultSession,
      );
      expect(resPollutionArr.ok).toBe(false);
    });
  });
});
