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
    expect(result).toEqual({ ok: true, config: input, unavailable: [] });
  });

  it('speichert Startfilter und Kachelausnahmen als Werte und gibt sie unverändert zurück', () => {
    const input = {
      version: 1,
      filters: { period: { from: '2026-01-01', to: '2026-03-31' }, pipeline: 'Direkt' },
      tiles: [
        tile({
          catalogId: 'crm.pipeline_stufen',
          view: 'balken',
          size: 'mittel',
          filterMode: 'dashboard',
          pipeline: 'Partner',
        }),
      ],
    };
    expect(validateDashboardConfig(input)).toEqual({ ok: true, config: input, unavailable: [] });
  });

  it('prüft Filterwerte streng', () => {
    const tiles: unknown[] = [];
    const bad = (filters: unknown) => codesOf({ version: 1, filters, tiles });
    expect(bad({ period: { from: '2026-03-31', to: '2026-01-01' } })).toEqual(['zeitraum']);
    expect(bad({ period: { from: '2026-02-30', to: '2026-03-01' } })).toEqual(['zeitraum']);
    expect(bad({ period: { from: '2026-13-01', to: '2026-03-01' } })).toEqual(['zeitraum']);
    expect(bad({ period: { from: '2026-01-01', to: '2026-00-10' } })).toEqual(['zeitraum']);
    expect(bad({ period: { from: '2026-01-00', to: '2026-01-32' } })).toEqual(['zeitraum']);
    expect(bad({ pipeline: '  ' })).toEqual(['pipeline']);
    expect(bad({ extra: 1 })).toEqual(['feld_unbekannt']);
    expect(bad('x')).toEqual(['form']);
  });

  it('prüft Kachelausnahmen gegen Katalog und Zeitbezug', () => {
    const period = { from: '2026-01-01', to: '2026-01-31' };
    expect(codesOf({ version: 1, tiles: [tile({ period })] })).toEqual(['zeitraum_ohne_modus']);
    expect(codesOf({ version: 1, tiles: [tile({ pipeline: 'Direkt' })] })).toEqual(['filter']);
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

  it('erhält Kacheln mit unbekannter oder nicht freigegebener KPI unverändert und meldet sie', () => {
    const unknown = tile({ tileId: 'a', catalogId: 'baseline.gibt_es_nicht' });
    const inactive = tile({ tileId: 'b', catalogId: 'baseline.mrr_plan' });
    const input = { version: 1, tiles: [unknown, tile({ tileId: 'c' }), inactive] };
    const result = validateDashboardConfig(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config).toEqual(input);
    expect(result.unavailable.map((i) => [i.path, i.code])).toEqual([
      ['tiles[0].catalogId', 'katalog_unbekannt'],
      ['tiles[2].catalogId', 'katalog_inaktiv'],
    ]);
  });

  it('prüft bei nicht verfügbaren Kacheln weiterhin die Struktur', () => {
    const broken = tile({ catalogId: 'baseline.gibt_es_nicht', view: 'foo', size: 'riesig' });
    expect(codesOf({ version: 1, tiles: [broken] })).toEqual(['view_unbekannt', 'groesse']);
    expect(codesOf({ version: 1, tiles: [tile({ catalogId: '' })] })).toEqual(['katalog_id']);
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
