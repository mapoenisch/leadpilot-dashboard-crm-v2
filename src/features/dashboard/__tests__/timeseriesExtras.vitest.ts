// Auftrag 170 (P14b): Zusammenführung, Abfrageprüfung, Antwortparser und Speicher-Regression.
import { describe, expect, it } from 'vitest';
import type { ResolvedTileData, TileTimeSeriesData, TimeSeriesPoint } from '../data/dashboardData';
import { getCatalogEntry, isActiveEntry, type ActiveCatalogEntry } from '../model/dashboardCatalog';
import { buildTimeSeriesExtras } from '../model/timeseries/buildTimeSeriesExtras';
import { alignSeries } from '../model/timeseries/alignSeries';
import { bandsForDisplay, calculateExpectationBands } from '../model/timeseries/expectationBands';
import { partialCompareNotice } from '../model/timeseries/computeComparison';
import {
  compareBlockReason,
  joinCandidates,
  normalizeTimeSeriesQueryParts,
  validateTimeSeriesQueryParts,
} from '../model/timeseries/timeSeriesQuery';
import { validateTileQuery } from '../model/tileQuery';
import {
  parseTimeSeriesCompareResponse,
  parseTimeSeriesPhasesResponse,
} from '../data/resolveTimeSeriesCompare';
import { prepareConfigForStorage } from '../services/dashboardLayoutIntegrity';
import type { DashboardConfigV2 } from '../model/dashboardConfigV2';

function entry(id: string): ActiveCatalogEntry {
  const e = getCatalogEntry(id);
  if (!e || !isActiveEntry(e)) throw new Error(id);
  return e;
}

const pt = (at: string, value: number | null, status: TimeSeriesPoint['status'] = 'belegt') => ({
  at,
  value,
  status: value === null && status === 'belegt' ? ('luecke' as const) : status,
  measuredAt: null,
});

const WEEKS = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'].map(
  (d, i) => `${d}T00:00:00${i < 3 ? '+02:00' : '+01:00'}`,
);

function series(values: (number | null)[], ats = WEEKS): TileTimeSeriesData {
  return {
    source: 'deal_stage_events',
    resolution: 'woche',
    from: ats[0]!,
    to: '2026-11-02T00:00:00+01:00',
    historyStartAt: '2026-10-05T00:00:00+02:00',
    points: values.map((v, i) => pt(ats[i]!, v)),
  };
}

function resolved(s: TileTimeSeriesData): ResolvedTileData {
  return {
    catalogId: 'crm.phaseneintritte_verlauf',
    state: 'bereit',
    value: null,
    series: null,
    overview: null,
    unit: 'Eintritte',
    timeBasis: 'x',
    asOf: null,
    origin: { layer: 'crm', module: 'm', exportName: 'e' },
    scope: 'organisation',
    timeSeries: s,
  } as ResolvedTileData;
}

describe('Auftrag 170 – buildTimeSeriesExtras', () => {
  const crm = entry('crm.phaseneintritte_verlauf');
  const won = entry('crm.gewonnen_verlauf');

  it('ordnet Vergleichspunkte über den Zeitpunkt zu und meldet Teilhistorie', () => {
    const base = series([3, 4, 5, 6]);
    const out = buildTimeSeriesExtras({
      data: resolved(base),
      entry: crm,
      series: base,
      compare: {
        compare: 'vorperiode',
        resolution: 'woche',
        compareFrom: 'a',
        compareTo: 'b',
        datenstandAb: '2026-10-05T00:00:00+02:00',
        isPartial: true,
        partialNotice: partialCompareNotice('2026-10-05T00:00:00+02:00'),
        basePoints: base.points,
        comparePoints: [
          pt('x1', null, 'vor_historienbeginn'),
          pt('x2', 2),
          pt('x3', 3),
          pt('x4', 4),
        ],
      },
    });
    const extras = out.timeSeriesExtras!;
    expect(extras.compare!.points.map((p) => p.value)).toEqual([null, 2, 3, 4]);
    expect(extras.compare!.partialNotice).toBe('Vergleich unvollständig: Daten ab 05.10.2026');
  });

  it('Inner-Join filtert die Basis auf gemeinsame Zeitpunkte, Bänder bleiben positionsgenau', () => {
    const base = series([3, 4, 5, 6]);
    const other = series([1, null, 2], [WEEKS[0]!, WEEKS[2]!, WEEKS[3]!]);
    const prior = series(Array.from({ length: 8 }, (_, i) => 10 + i)).points;
    const out = buildTimeSeriesExtras({
      data: resolved(base),
      entry: crm,
      series: base,
      join: { entry: won, typ: 'inner', series: { ...other } },
      bandPrior: {
        ...base,
        points: Array.from({ length: 8 }, (_, i) => ({ ...prior[0]!, at: `p${i}`, value: 10 + i })),
      },
    });
    expect(out.timeSeries!.points.map((p) => p.at)).toEqual([WEEKS[0], WEEKS[2], WEEKS[3]]);
    expect(out.timeSeriesExtras!.second!.points.map((p) => p.value)).toEqual([1, null, 2]);
    expect(out.timeSeriesExtras!.second!.unit).toBe('Deals');
    expect(out.timeSeriesExtras!.bands!.bands!.map((b) => b.index)).toEqual([0, 1, 2]);
  });

  it('Links-Join lässt fehlende Werte als Lücke stehen', () => {
    const base = series([3, 4, 5, 6]);
    const out = buildTimeSeriesExtras({
      data: resolved(base),
      entry: crm,
      series: base,
      join: { entry: won, typ: 'links', series: series([7], [WEEKS[1]!]) },
    });
    expect(out.timeSeries!.points).toHaveLength(4);
    expect(out.timeSeriesExtras!.second!.points.map((p) => p.status)).toEqual([
      'luecke',
      'belegt',
      'luecke',
      'luecke',
    ]);
  });

  it('meldet ungleiche Auflösung als Hinweis statt die Reihen zu mischen', () => {
    const base = series([3, 4, 5, 6]);
    const out = buildTimeSeriesExtras({
      data: resolved(base),
      entry: crm,
      series: base,
      join: { entry: won, typ: 'links', series: { ...series([1]), resolution: 'tag' } },
    });
    expect(out.timeSeriesExtras!.second).toBeUndefined();
    expect(out.timeSeriesExtras!.notices[0]).toMatch(/Ungleiche Auflösung/);
  });

  it('übernimmt Heatmap-Daten je Modus', () => {
    const base = series([1, 2, 3, 4]);
    const phases = buildTimeSeriesExtras({
      data: resolved(base),
      entry: crm,
      series: base,
      heatmap: {
        phases: {
          resolution: 'woche',
          from: '',
          to: '',
          phases: [{ phase: 'Verhandlung', points: base.points }],
        },
      },
    });
    expect(phases.timeSeriesExtras!.heatmap!.mode).toBe('phase_woche');
    const daily = buildTimeSeriesExtras({
      data: resolved(base),
      entry: entry('live.arr.verlauf'),
      series: base,
      heatmap: { daily: base },
    });
    expect(daily.timeSeriesExtras!.heatmap).toMatchObject({
      mode: 'woche_wochentag',
      aggregation: 'keine',
    });
  });
});

describe('Auftrag 170 – Abfrage: Normalisierung, Prüfung, Speichern', () => {
  const live = entry('live.arr.verlauf');
  const crm = entry('crm.phaseneintritte_verlauf');

  it('normalisiert nur gültige Angaben', () => {
    expect(
      normalizeTimeSeriesQueryParts({
        compare: 'gestern' as never,
        join: { metricId: ' live.mrr.verlauf ', typ: 'inner' },
        bands: { type: 'percentile_10_90', periodCount: 3 },
      }),
    ).toEqual({
      join: { metricId: 'live.mrr.verlauf', typ: 'inner' },
      bands: { type: 'percentile_10_90', periodCount: 8 },
    });
  });

  it('Join nur zwischen Zeitreihen gleicher Auflösung (Rot-Nachweis)', () => {
    expect(
      joinCandidates(live).every((c) => c.history.defaultWindow?.resolution === 'stunde'),
    ).toBe(true);
    expect(joinCandidates(live).some((c) => c.id === 'crm.gewonnen_verlauf')).toBe(false);
    const issues = validateTimeSeriesQueryParts(
      { metricId: live.id, join: { metricId: 'crm.gewonnen_verlauf', typ: 'inner' } },
      live,
    );
    expect(issues[0]?.message).toMatch(/gleicher Auflösung/);
  });

  it('lehnt Vergleich bei Nicht-Zeitreihen und bei wertverändernden Transformationen ab', () => {
    const arr = entry('live.arr');
    expect(validateTimeSeriesQueryParts({ compare: 'vorperiode' }, arr)[0]?.message).toMatch(
      /nur für Zeitreihen/,
    );
    const res = validateTileQuery(
      {
        metricId: crm.id,
        compare: 'vorperiode',
        transformations: [{ art: 'gleitender_durchschnitt', fenster: 3 }],
      },
      crm,
    );
    expect(res.valid).toBe(false);
    expect(res.errors[0]?.code).toBe('zeitreihe_unzulaessig');
    expect(
      validateTileQuery(
        {
          metricId: crm.id,
          compare: 'vorjahr',
          transformations: [{ art: 'umbenennen', name: 'X' }],
        },
        crm,
      ).valid,
    ).toBe(true);
  });

  it('nennt Sperrgründe für Heatmap und Nicht-Zeitreihen', () => {
    expect(compareBlockReason(crm, {}, 'heatmap')).toMatch(/Heatmap/);
    expect(compareBlockReason(entry('live.arr'), {}, 'zahl')).toMatch(/Zeitreihen/);
    expect(compareBlockReason(crm, {}, 'linie')).toBeNull();
  });

  it('Speichern behält Transformationen, Vergleich, Join und Band (Regression P14a/P14b)', () => {
    const config: DashboardConfigV2 = {
      version: 2,
      id: 'd',
      title: 'T',
      scope: 'personal',
      ownerUserId: 'u',
      organizationId: 'o',
      globalTimeframe: 'aktuell',
      createdAt: '2026-11-20',
      updatedAt: '2026-11-20',
      tiles: [
        {
          id: 'a',
          catalogId: live.id,
          title: 'A',
          presentation: 'linie',
          layouts: { desktop: { x: 0, y: 0, w: 6, h: 4 } },
          query: {
            metricId: live.id,
            transformations: [{ art: 'umbenennen', name: 'ARR' }],
            compare: 'vorperiode',
            join: { metricId: 'live.mrr.verlauf', typ: 'links' },
            bands: { type: 'percentile_10_90', periodCount: 8 },
          },
        },
      ],
    };
    const prepared = prepareConfigForStorage(config);
    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.config.tiles[0]!.query).toMatchObject({
        transformations: [{ art: 'umbenennen', name: 'ARR' }],
        compare: 'vorperiode',
        join: { metricId: 'live.mrr.verlauf', typ: 'links' },
        bands: { type: 'percentile_10_90', periodCount: 8 },
      });
    }
  });
});

describe('Auftrag 170 – Antwortparser und Leistung', () => {
  const raw = {
    source: 'live_kpi',
    resolution: 'stunde',
    from: '2026-11-15T10:00:00+01:00',
    to: '2026-11-15T11:00:00+01:00',
    historyStartAt: '2026-11-01T00:00:00+01:00',
    points: [
      { bucketStart: '2026-11-15T10:00:00+01:00', value: 5, status: 'belegt', measuredAt: null },
    ],
    compare: 'vorjahr',
    compareFrom: '2025-11-15T10:00:00+01:00',
    compareTo: '2025-11-15T11:00:00+01:00',
    comparePoints: [
      {
        bucketStart: '2025-11-15T10:00:00+01:00',
        value: null,
        status: 'vor_historienbeginn',
        measuredAt: null,
      },
    ],
    datenstand_ab: '2026-11-01T00:00:00+01:00',
    is_partial: true,
  };

  it('liest Vergleichsantworten streng und bildet den Datenstand-Hinweis', () => {
    const parsed = parseTimeSeriesCompareResponse(raw);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.comparePoints[0]!.status).toBe('vor_historienbeginn');
      expect(parsed.data.partialNotice).toBe('Vergleich unvollständig: Daten ab 01.11.2026');
    }
    expect(parseTimeSeriesCompareResponse({ ...raw, compare: 'x' }).ok).toBe(false);
    expect(
      parseTimeSeriesCompareResponse({
        ...raw,
        comparePoints: [{ bucketStart: 'a', status: 'kaputt' }],
      }).ok,
    ).toBe(false);
  });

  it('liest Phasenantworten', () => {
    const phases = parseTimeSeriesPhasesResponse({
      ...raw,
      source: 'deal_stage_events',
      resolution: 'woche',
      phases: [{ phase: 'Verhandlung', points: raw.points }],
    });
    expect(phases.ok && phases.data.phases[0]!.phase).toBe('Verhandlung');
    expect(parseTimeSeriesPhasesResponse({ phases: 'x' }).ok).toBe(false);
  });

  it('Join über 500 Abschnitte dauert unter 5 ms', () => {
    const a = Array.from({ length: 500 }, (_, i) =>
      pt(new Date(Date.UTC(2026, 0, 1, i)).toISOString(), i),
    );
    alignSeries(a, a, { resolutionA: 'stunde', resolutionB: 'stunde', typ: 'links' });
    const t0 = performance.now();
    const res = alignSeries(a, a, { resolutionA: 'stunde', resolutionB: 'stunde', typ: 'links' });
    expect(performance.now() - t0).toBeLessThan(5);
    expect(res.rows).toHaveLength(500);
  });

  it('Band je Anzeigepunkt wiederholt die Periodenposition', () => {
    const prior = Array.from({ length: 16 }, (_, i) => pt(`p${i}`, i % 2 === 0 ? 10 : 20));
    const result = calculateExpectationBands({
      priorPoints: prior,
      periodLength: 2,
      resolution: 'tag',
    });
    const shown = bandsForDisplay(result, 5);
    expect(shown.bands!.map((b) => b.lower)).toEqual([10, 20, 10, 20, 10]);
    expect(bandsForDisplay({ hasBand: false, reason: 'x' }, 3)).toEqual({
      hasBand: false,
      reason: 'x',
    });
  });
});
