import { describe, expect, it } from 'vitest';
import { DEFAULT_DASHBOARD_CONFIG } from '../model/defaultDashboard';
import { validateDashboardConfigV2 } from '../model/dashboardConfigV2';
import { migrateV1ToV2 } from '../model/dashboardMigrationV1V2';
import type { DashboardConfig } from '../model/dashboardConfig';

describe('dashboardMigrationV1V2', () => {
  const context = {
    id: 'dash-migrated-001',
    title: 'Mein migriertes Dashboard',
    ownerUserId: 'usr-123',
    organizationId: 'org-456',
  };

  it('migriert die Standard-V1-Konfiguration deterministisch und valide nach V2', () => {
    const v2 = migrateV1ToV2(DEFAULT_DASHBOARD_CONFIG, context);

    expect(v2.version).toBe(2);
    expect(v2.id).toBe('dash-migrated-001');
    expect(v2.title).toBe('Mein migriertes Dashboard');
    expect(v2.scope).toBe('personal');
    expect(v2.ownerUserId).toBe('usr-123');
    expect(v2.organizationId).toBe('org-456');
    expect(v2.metadata?.migrated_from_v1).toBe(true);
    expect(v2.tiles.length).toBe(DEFAULT_DASHBOARD_CONFIG.tiles.length);

    // Schema-Prüfung muss 100 % grün sein
    const validation = validateDashboardConfigV2(v2);
    expect(validation.ok).toBe(true);
  });

  it('berechnet kollisionsfreie Positionen für Desktop (12 Sp.), Tablet (6 Sp.) und Mobile (1 Sp.)', () => {
    const customV1: DashboardConfig = {
      version: 1,
      tiles: [
        {
          tileId: 't1',
          catalogId: 'baseline.arr',
          size: 'klein', // 3 Spalten
          view: 'zahl',
          filterMode: 'dashboard',
        },
        {
          tileId: 't2',
          catalogId: 'baseline.mrr',
          size: 'mittel', // 6 Spalten
          view: 'saeulen',
          filterMode: 'dashboard',
        },
        {
          tileId: 't3',
          catalogId: 'win_rate',
          size: 'gross', // 9 Spalten -> Umbruch auf Zeile 1
          view: 'zahl',
          filterMode: 'dashboard',
        },
      ],
    };

    const v2 = migrateV1ToV2(customV1, context);

    // Desktop
    expect(v2.tiles[0]?.layouts.desktop).toEqual({ x: 0, y: 0, w: 3, h: 3 });
    expect(v2.tiles[1]?.layouts.desktop).toEqual({ x: 3, y: 0, w: 6, h: 4 });
    // t3 (w=9) passt nicht mehr in Zeile 0 (3+6+9 = 18 > 12) -> Umbruch nach y=4
    expect(v2.tiles[2]?.layouts.desktop).toEqual({ x: 0, y: 4, w: 9, h: 5 });

    // Mobile: Immer x=0, w=1
    expect(v2.tiles[0]?.layouts.mobile).toEqual({ x: 0, y: 0, w: 1, h: 3 });
    expect(v2.tiles[1]?.layouts.mobile).toEqual({ x: 0, y: 3, w: 1, h: 4 });
    expect(v2.tiles[2]?.layouts.mobile).toEqual({ x: 0, y: 7, w: 1, h: 5 });

    const validation = validateDashboardConfigV2(v2);
    expect(validation.ok).toBe(true);
  });

  it('übernimmt kachelspezifische Filterausnahmen (Pipeline & Zeitraum)', () => {
    const customV1: DashboardConfig = {
      version: 1,
      filters: {
        pipeline: 'enterprise_q4',
        period: { from: '2026-01-01', to: '2026-06-30' },
      },
      tiles: [
        {
          tileId: 't1',
          catalogId: 'win_rate',
          size: 'mittel',
          view: 'zahl',
          filterMode: 'eigener_zeitraum',
          period: { from: '2026-03-01', to: '2026-03-31' },
          pipeline: 'smb_deals',
        },
      ],
    };

    const v2 = migrateV1ToV2(customV1, context);
    expect(v2.globalPipeline).toBe('enterprise_q4');
    expect(v2.globalTimeframe).toBe('2026-01-01/2026-06-30');

    const tile = v2.tiles[0]!;
    expect(tile.pipelineOverride).toBe('smb_deals');
    expect(tile.timeframeOverride).toBe('2026-03-01/2026-03-31');
    expect(tile.query?.pipelineId).toBe('smb_deals');
    expect(tile.query?.timeframe).toBe('2026-03-01/2026-03-31');
  });
});
