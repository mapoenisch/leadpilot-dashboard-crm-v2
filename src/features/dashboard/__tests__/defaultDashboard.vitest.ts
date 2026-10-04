// Auftrag 072 (Dashboard Teilauftrag 3): Standardansicht und Auslegung gespeicherter Konfigurationen.
import { describe, expect, it } from 'vitest';
import { MAX_TILES } from '../model/dashboardConfig';
import { validateDashboardConfig } from '../model/dashboardValidation';
import { DEFAULT_DASHBOARD_CONFIG, interpretStoredConfig } from '../model/defaultDashboard';

const row = (config: unknown, overrides: Record<string, unknown> = {}) => ({
  config,
  schemaVersion: 1,
  revision: 3,
  updatedAt: '2026-10-04T08:00:00.000Z',
  ...overrides,
});

describe('DEFAULT_DASHBOARD_CONFIG', () => {
  it('besteht die Konfigurationsprüfung ohne Befund und ohne nicht verfügbare Kacheln', () => {
    const result = validateDashboardConfig(DEFAULT_DASHBOARD_CONFIG);
    expect(result).toEqual({ ok: true, config: DEFAULT_DASHBOARD_CONFIG, unavailable: [] });
  });

  it('bleibt innerhalb der Kachelgrenze und nutzt eindeutige Kachel-IDs', () => {
    const ids = DEFAULT_DASHBOARD_CONFIG.tiles.map((tile) => tile.tileId);
    expect(ids.length).toBeLessThanOrEqual(MAX_TILES);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('enthält die bisherigen Executive-Inhalte', () => {
    const ids = DEFAULT_DASHBOARD_CONFIG.tiles.map((tile) => tile.catalogId);
    expect(ids).toEqual(
      expect.arrayContaining([
        'baseline.arr',
        'baseline.arr_verlauf',
        'baseline.mrr_paketmix',
        'crm.pipeline_volumen',
        'uebersicht.team_hr',
        'uebersicht.roadmap',
      ]),
    );
  });
});

describe('interpretStoredConfig', () => {
  it('liefert ohne gespeicherte Zeile den Standard mit Revision 0', () => {
    expect(interpretStoredConfig(null)).toEqual({
      kind: 'standard',
      config: DEFAULT_DASHBOARD_CONFIG,
      revision: 0,
      canSave: true,
    });
  });

  it('übernimmt eine gültige gespeicherte Konfiguration mit ihrer Revision', () => {
    const config = {
      version: 1,
      tiles: [
        {
          tileId: 't1',
          catalogId: 'baseline.arr',
          view: 'zahl',
          size: 'klein',
          filterMode: 'fester_stand',
        },
      ],
    };
    expect(interpretStoredConfig(row(config))).toEqual({
      kind: 'gespeichert',
      config,
      revision: 3,
      unavailable: [],
      canSave: true,
    });
  });

  it('behält Kacheln mit unbekannter oder inaktiver KPI und meldet sie', () => {
    const unknown = {
      tileId: 'a',
      catalogId: 'baseline.gibt_es_nicht',
      view: 'zahl',
      size: 'klein',
      filterMode: 'fester_stand',
    };
    const inactive = { ...unknown, tileId: 'b', catalogId: 'baseline.mrr_plan' };
    const config = { version: 1, tiles: [unknown, inactive] };
    const state = interpretStoredConfig(row(config));
    expect(state.kind).toBe('gespeichert');
    if (state.kind !== 'gespeichert') return;
    expect(state.config).toEqual(config);
    expect(state.unavailable.map((issue) => issue.code)).toEqual([
      'katalog_unbekannt',
      'katalog_inaktiv',
    ]);
  });

  it('überschreibt eine zukünftige Formatversion nicht und sperrt das Speichern', () => {
    const state = interpretStoredConfig(row({ version: 2, tiles: [] }, { schemaVersion: 2 }));
    expect(state).toEqual({
      kind: 'zukuenftige_version',
      schemaVersion: 2,
      config: DEFAULT_DASHBOARD_CONFIG,
      revision: 3,
      canSave: false,
    });
  });

  it('zeigt bei ungültiger gespeicherter Form den Standard und meldet die Befunde', () => {
    const state = interpretStoredConfig(row({ version: 1, tiles: 'kaputt' }));
    expect(state.kind).toBe('ungueltig');
    if (state.kind !== 'ungueltig') return;
    expect(state.config).toBe(DEFAULT_DASHBOARD_CONFIG);
    expect(state.revision).toBe(3);
    expect(state.issues.length).toBeGreaterThan(0);
  });
});
