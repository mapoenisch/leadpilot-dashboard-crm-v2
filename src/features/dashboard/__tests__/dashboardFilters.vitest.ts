import { describe, expect, it } from 'vitest';
import {
  resolveEffectiveFilter,
  SUPPORTED_DATE_FIELDS,
  type EffectiveTileFilter,
} from '../model/dashboardFilters';
import { getCatalogEntry } from '../model/dashboardCatalog';
import type { DashboardFilters, DashboardTileConfig } from '../model/dashboardConfig';

describe('dashboardFilters', () => {
  const crmEntry = getCatalogEntry('crm.pipeline_deals');
  const baselineEntry = getCatalogEntry('baseline.arr');
  const liveEntry = getCatalogEntry('live.arr');

  const baseTile: DashboardTileConfig = {
    tileId: 'tile-1',
    catalogId: 'crm.pipeline_deals',
    view: 'zahl',
    size: 'klein',
    filterMode: 'dashboard',
  };

  it('hinterlegt keine wirksamen Datumsfelder für die heutigen Quellen', () => {
    expect(SUPPORTED_DATE_FIELDS.baseline).toEqual([]);
    expect(SUPPORTED_DATE_FIELDS.crm).toEqual([]);
    expect(SUPPORTED_DATE_FIELDS.live).toEqual([]);
  });

  describe('Vorrang der Kachelausnahme', () => {
    it('bevorzugt die Pipeline-Ausnahme der Kachel gegenüber dem zentralen Filter', () => {
      const tile: DashboardTileConfig = {
        ...baseTile,
        pipeline: 'enterprise',
      };
      const filters: DashboardFilters = {
        pipeline: 'standard',
      };

      const result: EffectiveTileFilter = resolveEffectiveFilter(tile, crmEntry, filters);
      expect(result.pipeline).toBe('enterprise');
      expect(result.pipelineReason).toBeUndefined();
    });

    it('bevorzugt filterMode eigener_zeitraum der Kachel gegenüber dem Dashboard-Filter', () => {
      const tile: DashboardTileConfig = {
        ...baseTile,
        filterMode: 'eigener_zeitraum',
        period: { from: '2025-06-01', to: '2025-06-30' },
      };
      const filters: DashboardFilters = {
        period: { from: '2025-01-01', to: '2025-12-31' },
      };

      const result = resolveEffectiveFilter(tile, crmEntry, filters);
      expect(result.mode).toBe('eigener_zeitraum');
      // Zeitraum wirkt auf keine Quelle
      expect(result.period).toBeNull();
      expect(result.periodReason).toBeDefined();
    });
  });

  describe('Pipeline-Filter nur bei CRM', () => {
    it('wendet Pipeline-Filter bei CRM-Einträgen an', () => {
      const filters: DashboardFilters = { pipeline: 'partner' };
      const result = resolveEffectiveFilter(baseTile, crmEntry, filters);
      expect(result.pipeline).toBe('partner');
      expect(result.pipelineReason).toBeUndefined();
    });

    it('ignoriert Pipeline-Filter bei Baseline-Einträgen mit Begründung', () => {
      const tile: DashboardTileConfig = {
        ...baseTile,
        catalogId: 'baseline.arr',
      };
      const filters: DashboardFilters = { pipeline: 'partner' };
      const result = resolveEffectiveFilter(tile, baselineEntry, filters);
      expect(result.pipeline).toBeNull();
      expect(result.pipelineReason).toMatch(/CRM/);
    });

    it('ignoriert Pipeline-Filter bei Live-Einträgen mit Begründung', () => {
      const tile: DashboardTileConfig = {
        ...baseTile,
        catalogId: 'live.arr',
      };
      const filters: DashboardFilters = { pipeline: 'partner' };
      const result = resolveEffectiveFilter(tile, liveEntry, filters);
      expect(result.pipeline).toBeNull();
      expect(result.pipelineReason).toMatch(/CRM/);
    });

    it('setzt keinen pipelineReason, wenn kein Pipeline-Filter gefordert war', () => {
      const result = resolveEffectiveFilter(baseTile, baselineEntry, {});
      expect(result.pipeline).toBeNull();
      expect(result.pipelineReason).toBeUndefined();
    });
  });

  describe('Zeitraum wirkt nirgends mit Begründung', () => {
    const period = { from: '2025-01-01', to: '2025-03-31' };

    it('meldet Begründung bei Stammdaten/Baseline', () => {
      const tile: DashboardTileConfig = { ...baseTile, catalogId: 'baseline.arr' };
      const result = resolveEffectiveFilter(tile, baselineEntry, { period });
      expect(result.period).toBeNull();
      expect(result.periodReason).toBeDefined();
      expect(result.periodReason).toMatch(/fest|Datumsfeld/i);
    });

    it('meldet Begründung bei CRM', () => {
      const result = resolveEffectiveFilter(baseTile, crmEntry, { period });
      expect(result.period).toBeNull();
      expect(result.periodReason).toBeDefined();
      expect(result.periodReason).toMatch(/Datumsfeld/i);
    });

    it('meldet Begründung bei Live', () => {
      const tile: DashboardTileConfig = { ...baseTile, catalogId: 'live.arr' };
      const result = resolveEffectiveFilter(tile, liveEntry, { period });
      expect(result.period).toBeNull();
      expect(result.periodReason).toBeDefined();
      expect(result.periodReason).toMatch(/Live|Datumsfeld/i);
    });
  });

  describe('fester_stand bleibt fest', () => {
    it('behält Modus fester_stand und ignoriert zentralen Zeitraum', () => {
      const tile: DashboardTileConfig = {
        ...baseTile,
        filterMode: 'fester_stand',
      };
      const filters: DashboardFilters = {
        period: { from: '2025-01-01', to: '2025-12-31' },
      };

      const result = resolveEffectiveFilter(tile, baselineEntry, filters);
      expect(result.mode).toBe('fester_stand');
      expect(result.period).toBeNull();
      expect(result.periodReason).toBe('Historischer Stand ist fest');
    });
  });
});
