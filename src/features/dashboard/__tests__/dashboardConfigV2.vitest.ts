import { describe, expect, it } from 'vitest';
import {
  createEmptyDashboardConfigV2,
  validateDashboardConfigV2,
  type DashboardConfigV2,
  type DashboardTileConfigV2,
} from '../model/dashboardConfigV2';

describe('dashboardConfigV2', () => {
  const validTile: DashboardTileConfigV2 = {
    id: 'tile_arr',
    catalogId: 'baseline.arr',
    title: 'Aktueller ARR',
    presentation: 'zahl',
    layouts: {
      desktop: { x: 0, y: 0, w: 3, h: 3 },
      tablet: { x: 0, y: 0, w: 3, h: 3 },
      mobile: { x: 0, y: 0, w: 1, h: 2 },
    },
  };

  it('erzeugt eine valide leere DashboardConfigV2', () => {
    const config = createEmptyDashboardConfigV2({
      ownerUserId: 'user-1',
      organizationId: 'org-1',
    });
    expect(config.version).toBe(2);
    expect(config.title).toBe('Neues Dashboard');
    expect(config.scope).toBe('personal');
    expect(config.tiles).toEqual([]);
    const validated = validateDashboardConfigV2(config);
    expect(validated.ok).toBe(true);
  });

  it('validiert eine vollständige Konfiguration mit Kacheln positiv', () => {
    const config: DashboardConfigV2 = {
      version: 2,
      id: 'dash-1',
      title: 'Vertriebsübersicht',
      scope: 'personal',
      ownerUserId: 'user-1',
      organizationId: 'org-1',
      globalTimeframe: 'letzte_30_tage',
      tiles: [validTile],
    };
    const res = validateDashboardConfigV2(config);
    expect(res.ok).toBe(true);
  });

  it('weist Konfigurationen mit ungültiger Version ab', () => {
    const invalid = { version: 1, tiles: [] };
    const res = validateDashboardConfigV2(invalid);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain('Schema-Version');
    }
  });

  it('weist unbekannte Top-Level-Felder ab', () => {
    const config = {
      version: 2,
      id: 'd1',
      title: 'T',
      scope: 'personal',
      ownerUserId: 'u1',
      organizationId: 'o1',
      globalTimeframe: 'monat',
      tiles: [],
      illegalProperty: true,
    };
    const res = validateDashboardConfigV2(config);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain('unbekanntes Top-Level-Feld');
    }
  });

  it('fordert teamId bei scope = team', () => {
    const config = {
      version: 2,
      id: 'd1',
      title: 'T',
      scope: 'team',
      ownerUserId: 'u1',
      organizationId: 'o1',
      globalTimeframe: 'monat',
      tiles: [],
    };
    const res = validateDashboardConfigV2(config);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain('teamId');
    }
  });

  it('begrenzt die Kachelanzahl auf maximal 24', () => {
    const tiles: DashboardTileConfigV2[] = [];
    for (let i = 0; i < 25; i++) {
      tiles.push({
        ...validTile,
        id: `tile_${i}`,
      });
    }
    const config: DashboardConfigV2 = {
      version: 2,
      id: 'dash-overflow',
      title: 'Zu viele Kacheln',
      scope: 'personal',
      ownerUserId: 'u1',
      organizationId: 'o1',
      globalTimeframe: 'monat',
      tiles,
    };
    const res = validateDashboardConfigV2(config);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain('maximal 24 Kacheln');
    }
  });

  it('verhindert doppelte Kachel-IDs', () => {
    const config: DashboardConfigV2 = {
      version: 2,
      id: 'dash-dup',
      title: 'Duplikate',
      scope: 'personal',
      ownerUserId: 'u1',
      organizationId: 'o1',
      globalTimeframe: 'monat',
      tiles: [validTile, { ...validTile }],
    };
    const res = validateDashboardConfigV2(config);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain('mehrfach vorhanden');
    }
  });

  it('prüft Rastergrenzen auf Desktop (12 Spalten), Tablet (6) und Mobile (1)', () => {
    // Desktop überschreitet 12 Spalten (x=10, w=3)
    const invalidDesktop = {
      version: 2,
      id: 'd1',
      title: 'T',
      scope: 'personal',
      ownerUserId: 'u1',
      organizationId: 'o1',
      globalTimeframe: 'monat',
      tiles: [
        {
          ...validTile,
          layouts: { desktop: { x: 10, y: 0, w: 3, h: 2 } },
        },
      ],
    };
    expect(validateDashboardConfigV2(invalidDesktop).ok).toBe(false);

    // Tablet überschreitet 6 Spalten (x=4, w=3)
    const invalidTablet = {
      version: 2,
      id: 'd1',
      title: 'T',
      scope: 'personal',
      ownerUserId: 'u1',
      organizationId: 'o1',
      globalTimeframe: 'monat',
      tiles: [
        {
          ...validTile,
          layouts: {
            desktop: { x: 0, y: 0, w: 3, h: 2 },
            tablet: { x: 4, y: 0, w: 3, h: 2 },
          },
        },
      ],
    };
    expect(validateDashboardConfigV2(invalidTablet).ok).toBe(false);

    // Mobile hat nicht 1 Spalte (w=2)
    const invalidMobile = {
      version: 2,
      id: 'd1',
      title: 'T',
      scope: 'personal',
      ownerUserId: 'u1',
      organizationId: 'o1',
      globalTimeframe: 'monat',
      tiles: [
        {
          ...validTile,
          layouts: {
            desktop: { x: 0, y: 0, w: 3, h: 2 },
            mobile: { x: 0, y: 0, w: 2, h: 2 },
          },
        },
      ],
    };
    expect(validateDashboardConfigV2(invalidMobile).ok).toBe(false);
  });
});
