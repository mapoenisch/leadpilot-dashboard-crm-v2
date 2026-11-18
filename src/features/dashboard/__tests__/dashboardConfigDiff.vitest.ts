import { describe, expect, it } from 'vitest';
import { logger } from '../../../services/logger';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';
import { diffDashboardConfigsV2, summarizeDiffV2 } from '../model/dashboardConfigDiff';

describe('dashboardConfigDiff', () => {
  const baseConfig: DashboardConfigV2 = {
    version: 2,
    id: 'dash_diff_1',
    title: 'Mein Dashboard',
    scope: 'personal',
    ownerUserId: 'usr_1',
    organizationId: 'org_1',
    globalTimeframe: 'letzte_30_tage',
    tiles: [
      {
        id: 'tile_arr',
        catalogId: 'baseline.arr',
        title: 'ARR',
        presentation: 'zahl',
        layouts: { desktop: { x: 0, y: 0, w: 3, h: 3 } },
      },
      {
        id: 'tile_umsatz',
        catalogId: 'baseline.umsatz',
        title: 'Umsatz',
        presentation: 'zahl',
        layouts: { desktop: { x: 3, y: 0, w: 3, h: 3 } },
      },
    ],
  };

  it('ordnet verschobene Kachel über id zu statt als gelöscht und neu hinzugefügt (Rot-Nachweis a)', () => {
    const movedConfig: DashboardConfigV2 = {
      ...baseConfig,
      tiles: [
        {
          ...baseConfig.tiles[1]!,
          layouts: { desktop: { x: 0, y: 0, w: 3, h: 3 } },
        },
        {
          ...baseConfig.tiles[0]!,
          layouts: { desktop: { x: 3, y: 0, w: 3, h: 3 } },
        },
      ],
    };

    const diff = diffDashboardConfigsV2(baseConfig, movedConfig);
    const tileChanges = diff.filter((d) => d.bereich === 'kachel');

    // Beide Kacheln existieren weiter und wurden nur verschoben / geändert
    expect(tileChanges.length).toBe(2);
    expect(tileChanges.every((d) => d.art === 'geaendert')).toBe(true);
    expect(tileChanges.some((d) => d.art === 'hinzugefuegt')).toBe(false);
    expect(tileChanges.some((d) => d.art === 'entfernt')).toBe(false);

    const summary = summarizeDiffV2(diff);
    expect(summary).toBe('2 Kacheln geändert');
  });

  it('erkennt hinzugefügte und entfernte Kacheln sowie Sektionen', () => {
    const alteredConfig: DashboardConfigV2 = {
      ...baseConfig,
      title: 'Neuer Titel',
      sections: [{ id: 'sec_1', title: 'Erste Sektion', collapsed: false, tileIds: [] }],
      tiles: [
        baseConfig.tiles[0]!,
        {
          id: 'tile_new',
          catalogId: 'baseline.pipeline_wert',
          title: 'Pipeline',
          presentation: 'zahl',
          layouts: { desktop: { x: 6, y: 0, w: 3, h: 3 } },
        },
      ],
    };

    const diff = diffDashboardConfigsV2(baseConfig, alteredConfig);
    expect(diff.some((d) => d.bereich === 'dashboard' && d.art === 'geaendert')).toBe(true);
    expect(
      diff.some((d) => d.bereich === 'kachel' && d.id === 'tile_new' && d.art === 'hinzugefuegt'),
    ).toBe(true);
    expect(
      diff.some((d) => d.bereich === 'kachel' && d.id === 'tile_umsatz' && d.art === 'entfernt'),
    ).toBe(true);
    expect(
      diff.some((d) => d.bereich === 'sektion' && d.id === 'sec_1' && d.art === 'hinzugefuegt'),
    ).toBe(true);

    const summary = summarizeDiffV2(diff);
    expect(summary).toContain('1 Kachel hinzugefügt');
    expect(summary).toContain('1 Kachel entfernt');
    expect(summary).toContain('1 Sektion hinzugefügt');
    expect(summary).toContain('Titel geändert');
  });

  it('ignoriert Bezüge und Metadaten (id, ownerUserId, organizationId, scope, metadata)', () => {
    const clonedWithDifferentMetadata: DashboardConfigV2 = {
      ...baseConfig,
      id: 'other_id',
      ownerUserId: 'other_owner',
      organizationId: 'other_org',
      scope: 'team',
      teamId: 'team_1',
      metadata: { some_flag: true },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    };

    const diff = diffDashboardConfigsV2(baseConfig, clonedWithDifferentMetadata);
    expect(diff.length).toBe(0);
    expect(summarizeDiffV2(diff)).toBe('Keine inhaltlichen Unterschiede.');
  });

  it('erkennt Änderungen an displayOptions, threshold und overrides (Codex P2)', () => {
    const modifiedConfig: DashboardConfigV2 = {
      ...baseConfig,
      tiles: [
        {
          ...baseConfig.tiles[0]!,
          displayOptions: { showLegend: true },
          threshold: { enabled: true, operator: 'gt', warningValue: 100 },
          timeframeOverride: 'letzte_7_tage',
        },
        baseConfig.tiles[1]!,
      ],
    };

    const diff = diffDashboardConfigsV2(baseConfig, modifiedConfig);
    expect(diff.length).toBe(1);
    expect(diff[0]!.bereich).toBe('kachel');
    expect(diff[0]!.art).toBe('geaendert');
    const pfade = diff[0]!.pfade.map((p) => p.pfad);
    expect(pfade).toContain('displayOptions');
    expect(pfade).toContain('threshold');
    expect(pfade).toContain('timeframeOverride');
  });

  it('erkennt das Umordnen von Sektionen als Änderung mit pfad order', () => {
    const configWithSectionsA: DashboardConfigV2 = {
      ...baseConfig,
      sections: [
        { id: 'sec_1', title: 'Erste Sektion', collapsed: false, tileIds: ['t1'] },
        { id: 'sec_2', title: 'Zweite Sektion', collapsed: false, tileIds: ['t2'] },
      ],
    };

    const configWithSectionsB: DashboardConfigV2 = {
      ...baseConfig,
      sections: [
        { id: 'sec_2', title: 'Zweite Sektion', collapsed: false, tileIds: ['t2'] },
        { id: 'sec_1', title: 'Erste Sektion', collapsed: false, tileIds: ['t1'] },
      ],
    };

    const diff = diffDashboardConfigsV2(configWithSectionsA, configWithSectionsB);
    expect(diff.length).toBe(2);
    expect(diff.every((d) => d.bereich === 'sektion' && d.art === 'geaendert')).toBe(true);
    const sec1Diff = diff.find((d) => d.id === 'sec_1');
    expect(sec1Diff?.pfade).toEqual([{ pfad: 'order', alt: 0, neu: 1 }]);
    const sec2Diff = diff.find((d) => d.id === 'sec_2');
    expect(sec2Diff?.pfade).toEqual([{ pfad: 'order', alt: 1, neu: 0 }]);
  });

  it('Leistungsmessung: 24 Kacheln und 6 Sektionen im Schnitt unter 20 ms', () => {
    const tiles24A = Array.from({ length: 24 }, (_, i) => ({
      id: `tile_${i}`,
      catalogId: 'baseline.arr',
      title: `Kachel ${i}`,
      presentation: 'zahl' as const,
      layouts: { desktop: { x: (i % 4) * 3, y: Math.floor(i / 4) * 3, w: 3, h: 3 } },
      sectionId: `sec_${i % 6}`,
    }));

    const sections6A = Array.from({ length: 6 }, (_, i) => ({
      id: `sec_${i}`,
      title: `Sektion ${i}`,
      collapsed: false,
      tileIds: [`t_${i}`],
    }));

    const bigConfigA: DashboardConfigV2 = {
      ...baseConfig,
      tiles: tiles24A,
      sections: sections6A,
    };

    const tiles24B = tiles24A.map((t, i) => {
      if (i === 0) return { ...t, layouts: { desktop: { x: 3, y: 3, w: 3, h: 3 } } };
      if (i === 1) return { ...t, title: 'Geänderter Titel' };
      return t;
    });

    const bigConfigB: DashboardConfigV2 = {
      ...baseConfig,
      title: 'Grosser Test B',
      tiles: tiles24B,
      sections: sections6A,
    };

    // 20 Läufe messen
    const runs = 20;
    const times: number[] = [];
    for (let r = 0; r < runs; r++) {
      const t0 = performance.now();
      const diff = diffDashboardConfigsV2(bigConfigA, bigConfigB);
      summarizeDiffV2(diff);
      const t1 = performance.now();
      times.push(t1 - t0);
    }

    const avgMs = times.reduce((a, b) => a + b, 0) / runs;
    logger.info(
      `[Leistungsmessung diffDashboardConfigsV2] 24 Kacheln, 6 Sektionen: Mittel über ${runs} Läufe = ${avgMs.toFixed(3)} ms`,
    );
    expect(avgMs).toBeLessThan(20);
  });
});
