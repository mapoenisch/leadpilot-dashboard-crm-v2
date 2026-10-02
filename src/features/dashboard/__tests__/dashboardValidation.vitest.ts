// Auftrag 070 (Dashboard Teilauftrag 1): Prüfung der versionierten Dashboard-Konfiguration.
import { describe, expect, it } from 'vitest';
import { MAX_TILES } from '../model/dashboardConfig';
import { validateDashboardConfig } from '../model/dashboardValidation';

const tile = (overrides: Record<string, unknown> = {}) => ({
  tileId: 't1',
  catalogId: 'baseline.arr',
  view: 'zahl',
  size: 'klein',
  filterMode: 'fester_stand',
  ...overrides,
});

const codesOf = (input: unknown) => {
  const result = validateDashboardConfig(input);
  return result.ok ? [] : result.issues.map((issue) => issue.code);
};

describe('validateDashboardConfig', () => {
  it('akzeptiert eine gültige Konfiguration und gibt sie unverändert zurück', () => {
    const input = {
      version: 1,
      tiles: [
        tile(),
        tile({ tileId: 't2', catalogId: 'baseline.arr_verlauf', view: 'linie', size: 'mittel' }),
        tile({ tileId: 't3', catalogId: 'live.arr', filterMode: 'dashboard', title: 'ARR jetzt' }),
        tile({ tileId: 't4', catalogId: 'uebersicht.roadmap', view: 'uebersicht', size: 'gross' }),
      ],
    };
    const result = validateDashboardConfig(input);
    expect(result).toEqual({ ok: true, config: input });
  });

  it('erlaubt dieselbe KPI mehrfach mit eigener Kachel-ID', () => {
    const input = {
      version: 1,
      tiles: [tile(), tile({ tileId: 't2', view: 'tabelle', size: 'mittel' })],
    };
    expect(validateDashboardConfig(input).ok).toBe(true);
  });

  it('lehnt unbekannte Formatversionen ab, ohne die Kacheln anzufassen', () => {
    expect(codesOf({ version: 2, tiles: 'egal' })).toEqual(['version']);
  });

  it('lehnt unbekannte Felder ab (keine Formeln oder Fremddaten im JSON)', () => {
    expect(codesOf({ version: 1, tiles: [], extra: 1 })).toEqual(['feld_unbekannt']);
    expect(codesOf({ version: 1, tiles: [tile({ formula: 'A/B' })] })).toEqual(['feld_unbekannt']);
  });

  it('begrenzt auf 24 Kacheln', () => {
    const tiles = Array.from({ length: MAX_TILES + 1 }, (_, index) =>
      tile({ tileId: `t${index}` }),
    );
    expect(codesOf({ version: 1, tiles })).toEqual(['zu_viele']);
  });

  it('lehnt doppelte und ungültige Kachel-IDs ab', () => {
    expect(codesOf({ version: 1, tiles: [tile(), tile()] })).toEqual(['kachel_id_doppelt']);
    expect(codesOf({ version: 1, tiles: [tile({ tileId: 'mit leerzeichen' })] })).toEqual([
      'kachel_id',
    ]);
  });

  it('lehnt unbekannte und nicht freigegebene KPIs ab', () => {
    expect(codesOf({ version: 1, tiles: [tile({ catalogId: 'baseline.gibt_es_nicht' })] })).toEqual(
      ['katalog_unbekannt'],
    );
    expect(codesOf({ version: 1, tiles: [tile({ catalogId: 'baseline.mrr_plan' })] })).toEqual([
      'katalog_inaktiv',
    ]);
  });

  it('lässt nur freigegebene Darstellungen zu: ARR-Einzelwert nie als Linie, Funnel nie als Kreis', () => {
    expect(codesOf({ version: 1, tiles: [tile({ view: 'linie', size: 'mittel' })] })).toEqual([
      'view_unzulaessig',
    ]);
    const funnel = tile({
      catalogId: 'crm.pipeline_stufen',
      view: 'kreis',
      size: 'mittel',
      filterMode: 'dashboard',
    });
    expect(codesOf({ version: 1, tiles: [funnel] })).toEqual(['view_unzulaessig']);
  });

  it('prüft die Mindestgröße je Darstellung', () => {
    const small = tile({ catalogId: 'baseline.mrr_paketmix', view: 'ring', size: 'klein' });
    expect(codesOf({ version: 1, tiles: [small] })).toEqual(['groesse_zu_klein']);
    expect(codesOf({ version: 1, tiles: [tile({ size: 'riesig' })] })).toEqual(['groesse']);
  });

  it('hält historische Werte fest und lässt keinen unbelegten Zeitraum zu', () => {
    expect(codesOf({ version: 1, tiles: [tile({ filterMode: 'dashboard' })] })).toEqual([
      'historisch_fest',
    ]);
    expect(codesOf({ version: 1, tiles: [tile({ filterMode: 'eigener_zeitraum' })] })).toEqual([
      'zeitraum_unbelegt',
    ]);
    const live = tile({ catalogId: 'live.arr', filterMode: 'fester_stand' });
    expect(codesOf({ version: 1, tiles: [live] })).toEqual(['kein_stand']);
  });

  it('begrenzt eigene Titel', () => {
    expect(codesOf({ version: 1, tiles: [tile({ title: '  ' })] })).toEqual(['titel']);
    expect(codesOf({ version: 1, tiles: [tile({ title: 'x'.repeat(81) })] })).toEqual(['titel']);
  });

  it('meldet Formfehler statt abzustürzen', () => {
    expect(codesOf(null)).toEqual(['form']);
    expect(codesOf({ version: 1 })).toEqual(['form']);
    expect(codesOf({ version: 1, tiles: [42] })).toEqual(['kachel_form']);
  });
});
