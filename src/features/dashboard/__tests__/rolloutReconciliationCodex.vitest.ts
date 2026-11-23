// Auftrag 173, Codex-Review PR #219 (Runde 1): Dashboard-ID-Bindung der Entscheidung und
// verfallene Entscheidung bei Klasse „gleich“.
import { describe, it, expect, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('@/services/db/supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

import {
  isDecidable,
  needsDecision,
  translateV1ForRow,
} from '../model/dashboardRolloutReconciliation';
import {
  createInMemoryRolloutService,
  supabaseRolloutService,
} from '../services/dashboardRolloutService';
import { buildRolloutPreviewRows } from '../preview/RolloutPrepPreview';

const row = (id: string) => buildRolloutPreviewRows().find((r) => r.userId === id)!;

describe('Entscheidung an die Pilotkopie gebunden', () => {
  it('sendet die erwartete Dashboard-ID bei Entscheidung und Übernahme', async () => {
    rpc.mockResolvedValue({ data: [{ revision: 2 }], error: null, status: 200 });
    const r = row('u-v1');
    await supabaseRolloutService.decide(r, 'v2_behalten');
    expect(rpc).toHaveBeenLastCalledWith(
      'dashboard_rollout_decide',
      expect.objectContaining({ p_expected_dashboard_id: 'dash-u-v1' }),
    );
    const t = translateV1ForRow(r);
    if (!t.ok) throw new Error('Übersetzung erwartet');
    await supabaseRolloutService.adoptV1(r, t.config);
    expect(rpc).toHaveBeenLastCalledWith(
      'dashboard_rollout_adopt_v1',
      expect.objectContaining({ p_expected_dashboard_id: 'dash-u-v1' }),
    );
  });

  it('ausgetauschte Pilotkopie bei gleicher Revision: Entscheidung verfällt, alte Ansicht ist veraltet', async () => {
    const service = createInMemoryRolloutService(buildRolloutPreviewRows());
    const loaded = row('u-v1');
    await service.decide(loaded, 'v2_behalten');
    service.bumpV2('u-v1', 'dash-duplikat');
    const after = service.rows().find((r) => r.userId === 'u-v1')!;
    expect(after.v2Revision).toBe(loaded.v2Revision);
    expect(after.entscheidungGueltig).toBe(false);
    expect(await service.decide(loaded, 'spaeter')).toEqual({ ok: false, error: 'veraltet' });
  });
});

describe('Verfallene oder zurückgestellte Entscheidung bei Klasse „gleich“', () => {
  it('ist offen und entscheidbar, nachdem nach einer Übernahme im Pilot weitergearbeitet wurde', async () => {
    const service = createInMemoryRolloutService(buildRolloutPreviewRows());
    const r = row('u-v1');
    const t = translateV1ForRow(r);
    if (!t.ok) throw new Error('Übersetzung erwartet');
    await service.adoptV1(r, t.config);
    let current = service.rows().find((x) => x.userId === 'u-v1')!;
    expect(current.klasse).toBe('gleich');
    expect(needsDecision(current)).toBe(false);
    service.bumpV2('u-v1');
    current = service.rows().find((x) => x.userId === 'u-v1')!;
    expect(current.klasse).toBe('gleich');
    expect(current.entscheidungGueltig).toBe(false);
    expect(needsDecision(current)).toBe(true);
    expect(isDecidable(current)).toBe(true);
    expect(await service.decide(current, 'v2_behalten')).toEqual({ ok: true, value: undefined });
    expect(needsDecision(service.rows().find((x) => x.userId === 'u-v1')!)).toBe(false);
  });

  it('bleibt offen und entscheidbar, wenn bei Klasse „gleich“ „spaeter“ gewählt wird (Codex Runde 2)', async () => {
    const service = createInMemoryRolloutService(buildRolloutPreviewRows());
    const r = row('u-v1');
    const t = translateV1ForRow(r);
    if (!t.ok) throw new Error('Übersetzung erwartet');
    await service.adoptV1(r, t.config);
    service.bumpV2('u-v1');
    let current = service.rows().find((x) => x.userId === 'u-v1')!;
    expect(current.klasse).toBe('gleich');
    expect(current.entscheidungGueltig).toBe(false);
    expect(await service.decide(current, 'spaeter')).toEqual({ ok: true, value: undefined });
    current = service.rows().find((x) => x.userId === 'u-v1')!;
    expect(current.klasse).toBe('gleich');
    expect(current.entscheidung).toBe('spaeter');
    expect(current.entscheidungGueltig).toBe(true);
    expect(needsDecision(current)).toBe(true);
    expect(isDecidable(current)).toBe(true);
    expect(await service.decide(current, 'v2_behalten')).toEqual({ ok: true, value: undefined });
    const finalized = service.rows().find((x) => x.userId === 'u-v1')!;
    expect(needsDecision(finalized)).toBe(false);
    expect(isDecidable(finalized)).toBe(false);
  });

  it('„gleich“ ohne Entscheidung bleibt ohne Aktionen', () => {
    expect(isDecidable(row('u-gleich'))).toBe(false);
    expect(needsDecision(row('u-gleich'))).toBe(false);
  });
});
