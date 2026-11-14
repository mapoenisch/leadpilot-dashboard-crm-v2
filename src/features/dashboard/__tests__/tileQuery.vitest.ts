import { describe, expect, it } from 'vitest';
import { convertV2TileToV1 } from '../components/editor/canvas/CanvasTileCard';
import { getCatalogEntry, type ActiveCatalogEntry } from '../model/dashboardCatalog';
import type { DashboardTileConfigV2 } from '../model/dashboardConfigV2';
import { normalizeTileQuery, validateTileQuery } from '../model/tileQuery';

function makeTile(overrides: Partial<DashboardTileConfigV2> = {}): DashboardTileConfigV2 {
  return {
    id: 'test_tile_1',
    catalogId: 'crm.pipeline_deals',
    title: 'Deals in Pipeline',
    presentation: 'zahl',
    layouts: {
      desktop: { x: 0, y: 0, w: 3, h: 2 },
      tablet: { x: 0, y: 0, w: 3, h: 2 },
      mobile: { x: 0, y: 0, w: 3, h: 2 },
    },
    ...overrides,
  };
}

describe('tileQuery (Auftrag 154 Task T1b & T3)', () => {
  const crmDealsEntry = getCatalogEntry('crm.pipeline_deals') as ActiveCatalogEntry;
  const crmStagesEntry = getCatalogEntry('crm.pipeline_stufen_volumen') as ActiveCatalogEntry;
  const baselineArrEntry = getCatalogEntry('baseline.arr') as ActiveCatalogEntry;

  describe('T1 (b) Nachweis CanvasTileCard / convertV2TileToV1', () => {
    it('convertV2TileToV1 liest prioritär tile.query.pipelineId', () => {
      const tileWithQueryOnly = makeTile({
        query: {
          metricId: 'crm.pipeline_deals',
          pipelineId: 'Pipeline-B',
        },
        pipelineOverride: undefined,
      });

      // Nach der Umstellung in T4 liest convertV2TileToV1 die normalisierte query:
      const v1Config = convertV2TileToV1(tileWithQueryOnly, 'all', 'Pipeline-Global');
      expect(v1Config.pipeline).toBe('Pipeline-B');
    });
  });

  describe('Normalisierung (normalizeTileQuery)', () => {
    it('query vorhanden -> gilt unverändert', () => {
      const tile = makeTile({
        query: {
          metricId: 'crm.pipeline_deals',
          pipelineId: 'Enterprise-Sales',
          aggregation: 'letzter_stand',
          timeframe: 'aktuell',
        },
      });

      const normalized = normalizeTileQuery(tile);
      expect(normalized).toEqual({
        metricId: 'crm.pipeline_deals',
        pipelineId: 'Enterprise-Sales',
        aggregation: 'letzter_stand',
        timeframe: 'aktuell',
      });
    });

    it('Idempotenz: normalize(normalize(x)) = normalize(x)', () => {
      const tile = makeTile({
        pipelineOverride: 'Direct-Sales',
        timeframeOverride: '2025-01-01/2025-12-31', // Legacy-Range
        aggregationOverride: 'letzter_stand',
      });

      const pass1 = normalizeTileQuery(tile);
      const pass2 = normalizeTileQuery({ ...tile, query: pass1 });
      expect(pass2).toEqual(pass1);
    });

    it('Overrides werden in query übernommen, Legacy-Timeframe-Ranges verworfen', () => {
      const tile = makeTile({
        pipelineOverride: 'Inbound-Pipeline',
        timeframeOverride: '2025-01-01/2025-12-31',
        aggregationOverride: 'letzter_stand',
      });

      const normalized = normalizeTileQuery(tile);
      expect(normalized.metricId).toBe('crm.pipeline_deals');
      expect(normalized.pipelineId).toBe('Inbound-Pipeline');
      expect(normalized.aggregation).toBe('letzter_stand');
      // Legacy-Range wird verworfen (nicht kanonisch fest/aktuell/live)
      expect(normalized.timeframe).toBeUndefined();
    });

    it('P07-Migrationsartefakt: query.pipelineId aus globalPipeline wird zu "erben" (undefined) normalisiert', () => {
      const tile = makeTile({
        query: {
          metricId: 'crm.pipeline_deals',
          pipelineId: 'Pipeline-Global',
        },
        pipelineOverride: undefined,
      });

      const normalized = normalizeTileQuery(tile, {
        metadata: { migrated_from_v1: true },
        globalPipeline: 'Pipeline-Global',
      });

      // Wurde in P07 rein von globalPipeline befüllt, ohne Override -> erbt wieder
      expect(normalized.pipelineId).toBeUndefined();
    });

    it('ausdrücklich pipelineId: null bleibt null (alle Pipelines)', () => {
      const tile = makeTile({
        query: {
          metricId: 'crm.pipeline_deals',
          pipelineId: null,
        },
      });

      const normalized = normalizeTileQuery(tile);
      expect(normalized.pipelineId).toBeNull();
    });
  });

  describe('Validierung (validateTileQuery)', () => {
    it('gültige CRM-Abfrage besteht die Prüfung', () => {
      const validQuery = {
        metricId: 'crm.pipeline_deals',
        pipelineId: 'Standard-Pipeline',
        aggregation: 'letzter_stand',
        timeframe: 'aktuell',
        filters: {},
      };

      const res = validateTileQuery(validQuery, crmDealsEntry);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('Fehlercode metrik_abweichend: metricId passt nicht zum Eintrag', () => {
      const res = validateTileQuery({ metricId: 'crm.pipeline_volumen' }, crmDealsEntry);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.code === 'metrik_abweichend')).toBe(true);
    });

    it('Fehlercode typ_ungueltig: nicht-Objekt oder ungültige Feldtypen', () => {
      const notAnObject = validateTileQuery('string', crmDealsEntry);
      expect(notAnObject.valid).toBe(false);
      expect(notAnObject.errors.some((e) => e.code === 'typ_ungueltig')).toBe(true);

      const invalidTypes = validateTileQuery(
        {
          metricId: 'crm.pipeline_deals',
          pipelineId: 12345, // Typfehler
          groupBy: 'stage', // Typfehler (muss Array sein)
        },
        crmDealsEntry,
      );
      expect(invalidTypes.valid).toBe(false);
      expect(
        invalidTypes.errors.filter((e) => e.code === 'typ_ungueltig').length,
      ).toBeGreaterThanOrEqual(2);
    });

    it('Fehlercode unbekanntes_feld: unzulässige Schlüssel in query', () => {
      const res = validateTileQuery(
        {
          metricId: 'crm.pipeline_deals',
          extraField: 'not_allowed',
        },
        crmDealsEntry,
      );
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.code === 'unbekanntes_feld')).toBe(true);
    });

    it('Fehlercode aggregation_unzulaessig: summe auf Bestandsgröße', () => {
      const res = validateTileQuery(
        {
          metricId: 'crm.pipeline_deals',
          aggregation: 'summe', // Deals in Pipeline ist Bestand -> nur 'letzter_stand'
        },
        crmDealsEntry,
      );
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.code === 'aggregation_unzulaessig')).toBe(true);
    });

    it('Fehlercode filter_unzulaessig: Pipeline-Filter auf Baseline-Kennzahl', () => {
      const res = validateTileQuery(
        {
          metricId: 'baseline.arr',
          pipelineId: 'Pipeline-1',
        },
        baselineArrEntry,
      );
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.code === 'filter_unzulaessig')).toBe(true);
    });

    it('Fehlercode gruppierung_unzulaessig: stage-Gruppierung auf Kennzahl ohne Stufen', () => {
      const res = validateTileQuery(
        {
          metricId: 'crm.pipeline_deals',
          groupBy: ['stage'],
        },
        crmDealsEntry,
      );
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.code === 'gruppierung_unzulaessig')).toBe(true);

      // Aber auf crm.pipeline_stufen_volumen ist groupBy: ['stage'] erlaubt:
      const ok = validateTileQuery(
        {
          metricId: 'crm.pipeline_stufen_volumen',
          groupBy: ['stage'],
        },
        crmStagesEntry,
      );
      expect(ok.valid).toBe(true);
    });

    it('Fehlercode zeitraum_unzulaessig: abweichender timeframe', () => {
      const res = validateTileQuery(
        {
          metricId: 'baseline.arr',
          timeframe: 'live', // baseline.arr hat timeMode 'fest'
        },
        baselineArrEntry,
      );
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.code === 'zeitraum_unzulaessig')).toBe(true);
    });
  });
});
