// Auftrag 151 (P06b): Überlappende Layouts und unbekannte Katalog-IDs dürfen nicht als
// Revision gespeichert werden.

import { describe, expect, it } from 'vitest';
import type { DashboardConfigV2, DashboardTileConfigV2 } from '../model/dashboardConfigV2';
import {
  findLayoutIntegrityError,
  normalizeDashboardLayouts,
  prepareConfigForStorage,
} from '../services/dashboardLayoutIntegrity';
import { createDashboardV2, saveDashboardV2 } from '../services/dashboardStorageV2';
import { findOverlap, getBreakpointLayout } from '../components/editor/grid/gridEngine';

function tile(
  id: string,
  layouts: DashboardTileConfigV2['layouts'],
  catalogId = 'baseline.arr',
): DashboardTileConfigV2 {
  return { id, catalogId, title: id, presentation: 'zahl', layouts };
}

function config(tiles: DashboardTileConfigV2[]): DashboardConfigV2 {
  return {
    version: 2,
    id: 'dash_integrity',
    title: 'Integrität',
    scope: 'personal',
    ownerUserId: 'user_1',
    organizationId: 'org_1',
    globalTimeframe: '30d',
    tiles,
  };
}

const overlapping = config([
  tile('a', { desktop: { x: 1, y: 9, w: 2, h: 3 } }),
  tile('b', { desktop: { x: 0, y: 9, w: 6, h: 4 }, tablet: { x: 0, y: 0, w: 6, h: 4 } }),
  tile('c', { desktop: { x: 6, y: 0, w: 6, h: 4 }, tablet: { x: 2, y: 2, w: 4, h: 4 } }),
]);

describe('dashboardLayoutIntegrity (Auftrag 151 / P06b)', () => {
  it('normalisiert überlappende Layouts deterministisch und idempotent', () => {
    expect(findLayoutIntegrityError(overlapping)).toMatch(/überlappen/);

    const once = normalizeDashboardLayouts(overlapping);
    const twice = normalizeDashboardLayouts(once);
    expect(twice).toBe(once);
    expect(findLayoutIntegrityError(once)).toBeNull();
    for (const bp of ['desktop', 'tablet', 'mobile'] as const) {
      expect(findOverlap(getBreakpointLayout(once.tiles, bp))).toBeNull();
    }
    // Saubere Kachel bleibt unverändert
    expect(once.tiles[2]!.layouts.desktop).toEqual({ x: 6, y: 0, w: 6, h: 4 });
  });

  it('lässt ein sauberes Layout unverändert (gleiches Objekt)', () => {
    const clean = config([tile('a', { desktop: { x: 0, y: 0, w: 6, h: 4 } })]);
    expect(normalizeDashboardLayouts(clean)).toBe(clean);
  });

  it('lehnt unbekannte Katalog-IDs ab', () => {
    const unknown = config([tile('a', { desktop: { x: 0, y: 0, w: 6, h: 4 } }, 'kein.katalog')]);
    const result = prepareConfigForStorage(unknown);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/kein\.katalog/);
  });

  it('speichert keine Revision mit unbekannter Katalog-ID und normalisiert vor dem Speichern', async () => {
    const created = await createDashboardV2({ title: 'Integrität', config: overlapping });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const rejected = await saveDashboardV2({
      dashboardId: created.value.dashboardId,
      expectedRevision: created.value.revision,
      title: 'Integrität',
      config: config([tile('x', { desktop: { x: 0, y: 0, w: 6, h: 4 } }, '<script>')]),
    });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error.kind).toBe('ungueltig');

    const saved = await saveDashboardV2({
      dashboardId: created.value.dashboardId,
      expectedRevision: created.value.revision,
      title: 'Integrität',
      config: overlapping,
    });
    expect(saved.ok).toBe(true);
    if (saved.ok) expect(saved.value.revision).toBe(created.value.revision + 1);
  });
});
