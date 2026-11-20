import { describe, it, expect } from 'vitest';
import { applyTransformations } from '../model/transformations';
import type { ResolvedTileData } from '../data/dashboardData';

function createMockResolvedData(overrides: Partial<ResolvedTileData> = {}): ResolvedTileData {
  return {
    catalogId: 'mock.kpi',
    state: 'bereit',
    value: 40,
    series: null,
    overview: null,
    unit: 'EUR',
    timeBasis: '04.11.2026',
    asOf: '2026-11-19T20:00:00Z',
    origin: { layer: 'crm', module: 'test', exportName: 'test' },
    scope: 'organisation',
    effectiveFilter: { mode: 'dashboard', period: null, pipeline: null },
    ...overrides,
  };
}

const heatmapPoints = [10, 20, 30, 40].map((v, i) => ({
  at: `2026-11-0${i + 1}`,
  value: v,
  status: 'belegt' as const,
  measuredAt: `2026-11-0${i + 1}`,
}));

const heatmapExtras = {
  mode: 'phase_woche' as const,
  aggregation: 'fluss' as const,
  points: heatmapPoints,
  phaseSeries: [
    { phase: 'Verhandlung', points: heatmapPoints },
    {
      phase: 'Angebot',
      points: heatmapPoints.map((p) => ({ ...p, value: (p.value ?? 0) * 2 })),
    },
  ],
  notices: [],
};

function dataWithHeatmap(): ResolvedTileData {
  return createMockResolvedData({
    timeSeries: {
      source: 'deal_stage_events',
      resolution: 'tag',
      points: heatmapPoints,
      from: '2026-11-01',
      to: '2026-11-04',
      historyStartAt: '2026-11-01',
    },
    timeSeriesExtras: { heatmap: heatmapExtras, notices: [] },
  });
}

describe('Auftrag 170 – Transformationen auf Heatmap-Extras (Nacharbeit PR #211)', () => {
  it('wendet den gleitenden Durchschnitt auf Heatmap-Punkte und Phasenreihen an', () => {
    const res = applyTransformations(dataWithHeatmap(), [
      { art: 'gleitender_durchschnitt', fenster: 3 },
    ]);
    const heat = res.timeSeriesExtras?.heatmap;

    expect(heat?.points.map((p) => p.value)).toEqual([null, null, 20, 30]);
    expect(heat?.phaseSeries?.[0]?.points.map((p) => p.value)).toEqual([null, null, 20, 30]);
    expect(heat?.phaseSeries?.[1]?.points.map((p) => p.value)).toEqual([null, null, 40, 60]);
  });

  it('rechnet Heatmap-Punkte und Phasenreihen in die neue Einheit um', () => {
    const res = applyTransformations(dataWithHeatmap(), [
      { art: 'einheit_umrechnen', von: 'EUR', zu: 'Tsd. EUR' },
    ]);
    const heat = res.timeSeriesExtras?.heatmap;

    expect(heat?.points.map((p) => p.value)).toEqual([0.01, 0.02, 0.03, 0.04]);
    expect(heat?.phaseSeries?.[1]?.points.map((p) => p.value)).toEqual([0.02, 0.04, 0.06, 0.08]);
  });
});
