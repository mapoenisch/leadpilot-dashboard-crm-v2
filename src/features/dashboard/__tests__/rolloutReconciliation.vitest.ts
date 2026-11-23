// Auftrag 173 (P16a §2.1/§2.3): Klassen, inhaltlicher Vergleich, Übernahme als neue Revision,
// Revisionsbindung der Entscheidung und Fehlerzuordnung.
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/services/db/supabaseClient', () => ({ isSupabaseConfigured: false, supabase: null }));

import {
  classifyRollout,
  compareV1WithV2,
  needsDecision,
  translateV1ForRow,
} from '../model/dashboardRolloutReconciliation';
import {
  classifyRolloutError,
  createInMemoryRolloutService,
  mapReconciliationRow,
  supabaseRolloutService,
} from '../services/dashboardRolloutService';
import { buildRolloutPreviewRows } from '../preview/RolloutPrepPreview';
import { DEFAULT_DASHBOARD_CONFIG } from '../model/defaultDashboard';
import { migrateV1ToV2 } from '../model/dashboardMigrationV1V2';

const rows = () => buildRolloutPreviewRows();
const byId = (id: string) => rows().find((r) => r.userId === id)!;

describe('classifyRollout (Spiegel der Server-Klassen)', () => {
  it.each([
    [{ v1Revision: 3, v2Revision: 4, lastMigratedRevision: 3 }, 'gleich'],
    [{ v1Revision: 5, v2Revision: 1, lastMigratedRevision: 2 }, 'v1_geaendert'],
    [{ v1Revision: 4, v2Revision: 3, lastMigratedRevision: 1 }, 'beide_geaendert'],
    [{ v1Revision: 2, v2Revision: null, lastMigratedRevision: null }, 'keine_kopie'],
    [{ v1Revision: null, v2Revision: 1, lastMigratedRevision: 1 }, 'nur_v2'],
    // Kopie vom Standardstand (Quellrevision 0) gilt nie als gleich
    [{ v1Revision: 1, v2Revision: 1, lastMigratedRevision: 0 }, 'v1_geaendert'],
    // Alte Kopie ohne Quellrevision gilt ebenfalls nie als gleich
    [{ v1Revision: 1, v2Revision: 1, lastMigratedRevision: null }, 'v1_geaendert'],
    // Nach Übernahme zählt die Bearbeitung erst ab der Übernahmerevision
    [{ v1Revision: 6, v2Revision: 2, lastMigratedRevision: 5, v2BaseRevision: 2 }, 'v1_geaendert'],
    [
      { v1Revision: 6, v2Revision: 3, lastMigratedRevision: 5, v2BaseRevision: 2 },
      'beide_geaendert',
    ],
  ] as const)('%o -> %s', (input, expected) => {
    expect(classifyRollout(input)).toBe(expected);
  });

  it('weder V1 noch V2 ergibt keine Klasse', () => {
    expect(
      classifyRollout({ v1Revision: null, v2Revision: null, lastMigratedRevision: null }),
    ).toBeNull();
  });
});

describe('compareV1WithV2 (Diff aus 165)', () => {
  it('listet neue Kachel im alten Editor und geänderte Reihenfolge', () => {
    const result = compareV1WithV2(byId('u-v1'));
    expect(result.status).toBe('verglichen');
    expect(result.items.some((i) => i.endsWith('neu im alten Editor'))).toBe(true);
    expect(result.items).toContain('Reihenfolge der Kacheln geändert');
  });

  it('fasst reine Positions-/Größenänderungen zu einer Zeile zusammen', () => {
    const result = compareV1WithV2(byId('u-v1'));
    expect(result.items.filter((i) => i.includes('Position/Größe'))).toEqual([]);
    expect(result.items.filter((i) => i.startsWith('Anordnung geändert'))).toHaveLength(1);
    expect(result.items.length).toBeLessThan(6);
  });

  it('meldet keine Unterschiede bei gleichem Inhalt', () => {
    const row = { ...byId('u-v1'), v1Config: DEFAULT_DASHBOARD_CONFIG };
    const result = compareV1WithV2(row);
    expect(result.status).toBe('verglichen');
    expect(result.items).toEqual([]);
  });

  it('nicht lesbarer alter Stand: kein Vergleich, keine Übernahme', () => {
    const row = { ...byId('u-v1'), v1Config: { version: 99 } };
    expect(compareV1WithV2(row)).toMatchObject({ status: 'nicht_moeglich' });
    expect(translateV1ForRow(row).ok).toBe(false);
  });

  it('nicht lesbare Pilotkopie: kein Vergleich', () => {
    const row = { ...byId('u-v1'), v2Config: { version: 1 } };
    expect(compareV1WithV2(row)).toMatchObject({
      status: 'nicht_moeglich',
      reason: 'Die Pilotkopie ist nicht lesbar.',
    });
  });

  it('Übersetzung trägt die aktuelle V1-Revision als Quellrevision', () => {
    const t = translateV1ForRow(byId('u-v1'));
    expect(t.ok && t.config.metadata?.last_migrated_revision).toBe(5);
    expect(t.ok && t.config.ownerUserId).toBe('u-v1');
  });
});

describe('needsDecision', () => {
  it('offen ohne Entscheidung, bei „später“ und bei verfallener Entscheidung', () => {
    expect(needsDecision(byId('u-v1'))).toBe(true);
    expect(needsDecision(byId('u-beide'))).toBe(true); // verfallen
    expect(
      needsDecision({ ...byId('u-v1'), entscheidung: 'spaeter', entscheidungGueltig: true }),
    ).toBe(true);
    expect(
      needsDecision({ ...byId('u-v1'), entscheidung: 'v2_behalten', entscheidungGueltig: true }),
    ).toBe(false);
    expect(needsDecision(byId('u-gleich'))).toBe(false);
    expect(needsDecision(byId('u-ohne'))).toBe(false);
  });
});

describe('In-Memory-Dienst (gleiche Regeln wie der Server)', () => {
  it('Übernahme erzeugt neue Revision, danach Klasse gleich mit gültiger Entscheidung', async () => {
    const service = createInMemoryRolloutService(rows());
    const row = byId('u-v1');
    const t = translateV1ForRow(row);
    if (!t.ok) throw new Error('Übersetzung erwartet');
    const res = await service.adoptV1(row, t.config);
    expect(res).toEqual({ ok: true, value: { revision: 2 } });
    const after = service.rows().find((r) => r.userId === 'u-v1')!;
    expect(after).toMatchObject({
      klasse: 'gleich',
      entscheidung: 'v1_uebernehmen',
      entscheidungGueltig: true,
      v2Revision: 2,
      lastMigratedRevision: 5,
    });
  });

  it('veralteter Stand wird abgewiesen und nichts geändert', async () => {
    const service = createInMemoryRolloutService(rows());
    const row = byId('u-v1');
    service.bumpV1('u-v1');
    expect(await service.decide(row, 'v2_behalten')).toEqual({ ok: false, error: 'veraltet' });
    expect(service.rows().find((r) => r.userId === 'u-v1')!.entscheidung).toBeNull();
  });

  it('Entscheidung verfällt bei erneuter V1-Bearbeitung', async () => {
    const service = createInMemoryRolloutService(rows());
    await service.decide(byId('u-v1'), 'v2_behalten');
    expect(service.rows().find((r) => r.userId === 'u-v1')!.entscheidungGueltig).toBe(true);
    service.bumpV1('u-v1');
    expect(service.rows().find((r) => r.userId === 'u-v1')!.entscheidungGueltig).toBe(false);
  });

  it('ohne Kopie keine Übernahme', async () => {
    const service = createInMemoryRolloutService(rows());
    const config = migrateV1ToV2(DEFAULT_DASHBOARD_CONFIG, {
      id: 'x',
      title: 'x',
      ownerUserId: 'u-ohne',
      organizationId: 'o',
    });
    expect(await service.adoptV1(byId('u-ohne'), config)).toEqual({
      ok: false,
      error: 'keine_kopie',
    });
  });
});

describe('Supabase-Dienst und Fehlerzuordnung', () => {
  it('ohne Server-Verbindung: nicht verfügbar', async () => {
    expect(await supabaseRolloutService.list()).toEqual({ ok: false, error: 'nicht_verfuegbar' });
  });

  it.each([
    ['LP_ROLLOUT_STALE', 'veraltet'],
    ['LP_ROLLOUT_NO_COPY', 'keine_kopie'],
    ['LP_ROLLOUT_NOT_FOUND: keine V1-Konfiguration', 'nicht_gefunden'],
    ['LP_DASHBOARD_INVALID: tiles', 'ungueltig'],
    ['LP_FORBIDDEN', 'nicht_berechtigt'],
    ['irgendwas', 'technisch'],
  ])('%s -> %s', (message, expected) => {
    expect(classifyRolloutError({ message })).toBe(expected);
  });

  it('fehlende Server-Funktion wird erkannt', () => {
    expect(classifyRolloutError({ code: 'PGRST202', message: 'Could not find the function' })).toBe(
      'server_funktion_fehlt',
    );
  });

  it('bildet Datenbankzeilen vollständig ab', () => {
    const mapped = mapReconciliationRow({
      user_id: 'u',
      email: 'a@b',
      org_role: 'viewer',
      org_status: 'active',
      v1_revision: 2,
      v1_updated_at: 't1',
      v1_config: {},
      v2_dashboard_id: 'd',
      v2_revision: 1,
      v2_updated_at: 't2',
      v2_config: {},
      last_migrated_revision: 1,
      v2_base_revision: null,
      ergebnis_klasse: 'v1_geaendert',
      entscheidung: null,
      entscheidung_v1_revision: null,
      entscheidung_v2_revision: null,
      entschieden_at: null,
      entschieden_von_email: null,
      entscheidung_gueltig: null,
    });
    expect(mapped).toMatchObject({ userId: 'u', v2BaseRevision: 1, klasse: 'v1_geaendert' });
  });
});
