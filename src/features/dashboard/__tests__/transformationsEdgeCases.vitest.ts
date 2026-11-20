import { describe, it, expect } from 'vitest';
import {
  applyTransformations,
  getEffectiveTitle,
  formatTransformationSummary,
} from '../model/transformations/applyTransformations';
import type { TileData } from '../data/dashboardData';
import type { TileTransformation } from '../model/transformations/types';

describe('Transformations Edge Cases (Branch Coverage)', () => {
  const baseData: TileData = {
    catalogId: 'baseline.arr',
    state: 'bereit',
    value: 100,
    unit: 'EUR',
    series: null,
    overview: null,
    timeBasis: 'Stand 2025',
    asOf: null,
    origin: { layer: 'baseline', module: '', exportName: '' },
    scope: 'stammdaten',
    effectiveFilter: { mode: 'dashboard', period: null, pipeline: null },
  };

  it('gibt ergebnis unveraendert zurueck wenn nicht_verfuegbar oder kette leer', () => {
    const unavail: TileData = {
      ...baseData,
      state: 'nicht_verfuegbar',
      reason: 'katalog_inaktiv',
      message: 'Nicht verfügbar',
    };
    const res1 = applyTransformations(unavail, [
      { art: 'einheit_umrechnen', von: 'EUR', zu: 'Tsd. EUR' },
    ]);
    expect(res1.state).toBe('nicht_verfuegbar');

    const res2 = applyTransformations(baseData, []);
    expect(res2).toBe(baseData);
  });

  it('behandelt getEffectiveTitle und formatTransformationSummary mit Randfaellen', () => {
    expect(getEffectiveTitle('Titel', null)).toBe('Titel');
    expect(getEffectiveTitle('Titel', [])).toBe('Titel');
    expect(
      getEffectiveTitle('Titel', [
        { art: 'umbenennen', name: 'Erster Name' },
        { art: 'umbenennen', name: 'Finaler Name' },
      ]),
    ).toBe('Finaler Name');

    expect(formatTransformationSummary(null)).toBe('');
    expect(formatTransformationSummary([])).toBe('');
    expect(
      formatTransformationSummary([
        { art: 'umbenennen', name: 'Neu' },
        { art: 'einheit_umrechnen', von: 'EUR', zu: 'Tsd. EUR' },
        { art: 'gleitender_durchschnitt', fenster: 3 },
        { art: 'unbekannt' } as unknown as TileTransformation,
      ]),
    ).toBe('Umbenannt in „Neu“ · EUR → Tsd. EUR · Gleitender Durchschnitt (3 Punkte)');
  });

  it('deckt Fallbacks bei unbekannten Einheitenumrechnungen und null-Werten ab', () => {
    const nullValData: TileData = {
      ...baseData,
      value: null,
      series: null,
    };
    const transformed = applyTransformations(nullValData, [
      { art: 'einheit_umrechnen', von: 'UNBEKANNT', zu: 'XYZ' },
    ]);
    expect(transformed.value).toBeNull();
    expect(transformed.unit).toBe('XYZ');
    expect(transformed.series).toBeNull();
  });

  it('gleitender_durchschnitt auf reiner series (ohne timeSeries)', () => {
    const seriesOnlyData: TileData = {
      ...baseData,
      value: 30,
      series: [
        { label: 'Jan', value: 10 },
        { label: 'Feb', value: 20 },
        { label: 'Mrz', value: 30 },
      ],
    };

    const res = applyTransformations(seriesOnlyData, [
      { art: 'gleitender_durchschnitt', fenster: 2 },
    ]);
    expect(res.series).toHaveLength(3);
    expect(res.series?.[0]?.value).toBe(0); // i < fenster - 1
    expect(res.series?.[1]?.value).toBe(15); // (10 + 20) / 2
    expect(res.series?.[2]?.value).toBe(25); // (20 + 30) / 2
    expect(res.value).toBe(25);
  });

  it('gleitender_durchschnitt ohne timeSeries und ohne series bleibt unveraendert', () => {
    const noSeriesData: TileData = {
      ...baseData,
      series: null,
    };
    const res = applyTransformations(noSeriesData, [
      { art: 'gleitender_durchschnitt', fenster: 3 },
    ]);
    expect(res.series).toBeNull();
    expect(res.value).toBe(100);
  });
});
