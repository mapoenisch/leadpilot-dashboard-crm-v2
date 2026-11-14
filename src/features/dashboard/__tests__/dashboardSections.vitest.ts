import { describe, it, expect } from 'vitest';
import {
  type DashboardConfigV2,
  type DashboardSectionV2,
  type DashboardTileConfigV2,
  validateDashboardConfigV2,
} from '../model/dashboardConfigV2';
import {
  getUniqueSectionTitle,
  getSectionForTile,
  getSectionIdForTile,
  groupTilesBySection,
  normalizeSections,
} from '../model/dashboardSections';
import {
  findLayoutIntegrityError,
  normalizeDashboardLayouts,
  prepareConfigForStorage,
} from '../services/dashboardLayoutIntegrity';
import parityFixtures from '../../../../supabase/tests/fixtures/dashboard_sections/sections_parity_cases.json';

const baseValidConfig: DashboardConfigV2 = {
  version: 2,
  id: '00000000-0000-0000-0000-000000000001',
  title: 'Test Dashboard',
  scope: 'personal',
  ownerUserId: '00000000-0000-0000-0000-000000000001',
  organizationId: '00000000-0000-0000-0000-000000000001',
  globalTimeframe: 'this_month',
  tiles: [],
};

describe('Auftrag 157 – Dashboard-Sektionen Modell & Validierung (P09a)', () => {
  describe('Paritätsprüfung mit gemeinsamen Fixtures (Browser & Server)', () => {
    it.each(parityFixtures.validCases)('akzeptiert gültigen Fall: $id', ({ config }) => {
      const result = validateDashboardConfigV2(config);
      expect(result.ok).toBe(true);
    });

    it.each(parityFixtures.invalidCases)(
      'lehnt ungültigen Fall ab mit exaktem Fehler: $id',
      ({ override, expectedReason }) => {
        const testConfig = {
          ...baseValidConfig,
          ...override,
        };
        const result = validateDashboardConfigV2(testConfig);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.error).toBe(expectedReason);
        }
      },
    );
  });

  describe('Hilfsfunktionen (dashboardSections.ts)', () => {
    it('getUniqueSectionTitle erzeugt fortlaufende Standardtitel', () => {
      expect(getUniqueSectionTitle(undefined)).toBe('Neue Sektion');
      expect(getUniqueSectionTitle([])).toBe('Neue Sektion');

      const sec1: DashboardSectionV2 = {
        id: 's1',
        title: 'Neue Sektion',
        collapsed: false,
        tileIds: [],
      };
      expect(getUniqueSectionTitle([sec1])).toBe('Neue Sektion 2');

      const sec2: DashboardSectionV2 = {
        id: 's2',
        title: 'Neue Sektion 2',
        collapsed: false,
        tileIds: [],
      };
      expect(getUniqueSectionTitle([sec1, sec2])).toBe('Neue Sektion 3');
    });

    it('getSectionForTile und getSectionIdForTile finden Sektion oder null', () => {
      const sections: DashboardSectionV2[] = [
        { id: 's1', title: 'Sec 1', collapsed: false, tileIds: ['t1', 't2'] },
        { id: 's2', title: 'Sec 2', collapsed: true, tileIds: ['t3'] },
      ];

      expect(getSectionForTile(sections, 't1')?.id).toBe('s1');
      expect(getSectionForTile(sections, 't3')?.id).toBe('s2');
      expect(getSectionForTile(sections, 't_unassigned')).toBeNull();

      expect(getSectionIdForTile(sections, 't2')).toBe('s1');
      expect(getSectionIdForTile(sections, 't_unassigned')).toBeNull();
      expect(getSectionIdForTile(undefined, 't1')).toBeNull();
    });

    it('groupTilesBySection teilt Kacheln in unsectioned und sectioned auf', () => {
      const tiles: DashboardTileConfigV2[] = [
        {
          id: 't1',
          catalogId: 'crm.pipeline_deals',
          title: 'T1',
          presentation: 'zahl',
          layouts: { desktop: { x: 0, y: 0, w: 4, h: 2 } },
        },
        {
          id: 't2',
          catalogId: 'crm.pipeline_volumen',
          title: 'T2',
          presentation: 'zahl',
          layouts: { desktop: { x: 4, y: 0, w: 4, h: 2 } },
        },
        {
          id: 't3',
          catalogId: 'crm.pipeline_deals',
          title: 'T3',
          presentation: 'zahl',
          layouts: { desktop: { x: 0, y: 2, w: 4, h: 2 } },
        },
      ];

      const sections: DashboardSectionV2[] = [
        { id: 's1', title: 'Sektion 1', collapsed: false, tileIds: ['t2'] },
      ];

      const grouped = groupTilesBySection(tiles, sections);
      expect(grouped.unsectionedTiles.map((t) => t.id)).toEqual(['t1', 't3']);
      expect(grouped.sectionedTiles).toHaveLength(1);
      expect(grouped.sectionedTiles[0]?.section.id).toBe('s1');
      expect(grouped.sectionedTiles[0]?.tiles.map((t) => t.id)).toEqual(['t2']);
    });

    it('normalizeSections trimmt Titel, sortiert tileIds deterministisch und ist idempotent', () => {
      const tiles: DashboardTileConfigV2[] = [
        {
          id: 't_bottom',
          catalogId: 'crm.pipeline_deals',
          title: 'Bottom',
          presentation: 'zahl',
          layouts: { desktop: { x: 0, y: 4, w: 4, h: 2 } },
        },
        {
          id: 't_top_right',
          catalogId: 'crm.pipeline_volumen',
          title: 'Top Right',
          presentation: 'zahl',
          layouts: { desktop: { x: 6, y: 0, w: 4, h: 2 } },
        },
        {
          id: 't_top_left',
          catalogId: 'crm.pipeline_deals',
          title: 'Top Left',
          presentation: 'zahl',
          layouts: { desktop: { x: 0, y: 0, w: 4, h: 2 } },
        },
      ];

      const unnormalizedSections: DashboardSectionV2[] = [
        {
          id: 's1',
          title: '  Pipeline Bereich   ',
          collapsed: false,
          tileIds: ['t_bottom', 't_top_right', 't_top_left', 'non_existing_tile'],
        },
      ];

      const normalized = normalizeSections(unnormalizedSections, tiles);
      expect(normalized).toBeDefined();
      expect(normalized![0]?.title).toBe('Pipeline Bereich');
      // Reihenfolge nach y, x: top_left (y=0, x=0), top_right (y=0, x=6), bottom (y=4, x=0)
      expect(normalized![0]?.tileIds).toEqual(['t_top_left', 't_top_right', 't_bottom']);

      // Idempotenz-Nachweis
      const normalizedTwice = normalizeSections(normalized, tiles);
      expect(normalizedTwice).toEqual(normalized);
    });

    it('ohne Sektionen liefert normalizeSections undefined', () => {
      expect(normalizeSections(undefined, [])).toBeUndefined();
    });
  });

  describe('Raster-Integrität und Normalisierung je Bereich (T4 & T1c)', () => {
    it('T1 (c) Grün-Nachweis: zwei Kacheln mit gleichen Koordinaten in verschiedenen Sektionen überlappen nicht', () => {
      const configWithSections: DashboardConfigV2 = {
        ...baseValidConfig,
        tiles: [
          {
            id: 'tile-a',
            catalogId: 'crm.pipeline_deals',
            title: 'Kachel A',
            presentation: 'zahl',
            layouts: {
              desktop: { x: 0, y: 0, w: 4, h: 2 },
            },
          },
          {
            id: 'tile-b',
            catalogId: 'crm.pipeline_volumen',
            title: 'Kachel B',
            presentation: 'zahl',
            layouts: {
              desktop: { x: 0, y: 0, w: 4, h: 2 },
            },
          },
        ],
        sections: [
          { id: 'sec-1', title: 'Sektion 1', collapsed: false, tileIds: ['tile-a'] },
          { id: 'sec-2', title: 'Sektion 2', collapsed: false, tileIds: ['tile-b'] },
        ],
      };

      // In verschiedenen Sektionen: keine Überlappung (null)
      expect(findLayoutIntegrityError(configWithSections)).toBeNull();
    });

    it('zwei Kacheln mit gleichen Koordinaten in derselben Sektion werden weiterhin als Überlappung erkannt', () => {
      const configSameSection: DashboardConfigV2 = {
        ...baseValidConfig,
        tiles: [
          {
            id: 'tile-a',
            catalogId: 'crm.pipeline_deals',
            title: 'Kachel A',
            presentation: 'zahl',
            layouts: {
              desktop: { x: 0, y: 0, w: 4, h: 2 },
            },
          },
          {
            id: 'tile-b',
            catalogId: 'crm.pipeline_volumen',
            title: 'Kachel B',
            presentation: 'zahl',
            layouts: {
              desktop: { x: 0, y: 0, w: 4, h: 2 },
            },
          },
        ],
        sections: [
          { id: 'sec-1', title: 'Sektion 1', collapsed: false, tileIds: ['tile-a', 'tile-b'] },
        ],
      };

      expect(findLayoutIntegrityError(configSameSection)).toBe(
        "Kacheln 'tile-a' und 'tile-b' überlappen im Breakpoint desktop",
      );
    });

    it('normalizeDashboardLayouts löst Überlappungen nur innerhalb des betroffenen Bereichs auf', () => {
      const configToNormalize: DashboardConfigV2 = {
        ...baseValidConfig,
        tiles: [
          {
            id: 'sec1-t1',
            catalogId: 'crm.pipeline_deals',
            title: 'Sec1 T1',
            presentation: 'zahl',
            layouts: { desktop: { x: 0, y: 0, w: 4, h: 2 } },
          },
          {
            id: 'sec1-t2',
            catalogId: 'crm.pipeline_deals',
            title: 'Sec1 T2',
            presentation: 'zahl',
            layouts: { desktop: { x: 0, y: 0, w: 4, h: 2 } },
          },
          {
            id: 'sec2-t1',
            catalogId: 'crm.pipeline_volumen',
            title: 'Sec2 T1',
            presentation: 'zahl',
            layouts: { desktop: { x: 0, y: 0, w: 6, h: 3 } },
          },
        ],
        sections: [
          { id: 'sec-1', title: 'Sektion 1', collapsed: false, tileIds: ['sec1-t1', 'sec1-t2'] },
          { id: 'sec-2', title: 'Sektion 2', collapsed: false, tileIds: ['sec2-t1'] },
        ],
      };

      const normalized = normalizeDashboardLayouts(configToNormalize);
      expect(findLayoutIntegrityError(normalized)).toBeNull();

      // Sektion 2 Kachel blieb auf y=0 unverändert
      const sec2Tile = normalized.tiles.find((t) => t.id === 'sec2-t1')!;
      expect(sec2Tile.layouts.desktop).toEqual({ x: 0, y: 0, w: 6, h: 3 });

      // Sektion 1 Kacheln wurden gegeneinander verschoben
      const s1t1 = normalized.tiles.find((t) => t.id === 'sec1-t1')!;
      const s1t2 = normalized.tiles.find((t) => t.id === 'sec1-t2')!;
      expect(s1t1.layouts.desktop.y).not.toBe(s1t2.layouts.desktop.y);
    });

    it('ohne Sektionen bleibt normalizeDashboardLayouts und prepareConfigForStorage bytegleich', () => {
      const cleanNoSections: DashboardConfigV2 = {
        ...baseValidConfig,
        tiles: [
          {
            id: 't1',
            catalogId: 'crm.pipeline_deals',
            title: 'Deals',
            presentation: 'zahl',
            layouts: { desktop: { x: 0, y: 0, w: 4, h: 2 } },
          },
        ],
      };

      const normalized = normalizeDashboardLayouts(cleanNoSections);
      expect(normalized).toBe(cleanNoSections);

      const prepared = prepareConfigForStorage(cleanNoSections);
      expect(prepared.ok).toBe(true);
      if (prepared.ok) {
        expect(prepared.config.sections).toBeUndefined();
        expect(prepared.config.tiles[0]?.id).toBe('t1');
      }
    });
  });
});
