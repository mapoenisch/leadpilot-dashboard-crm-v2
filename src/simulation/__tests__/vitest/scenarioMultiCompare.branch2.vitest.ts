// Branch2-Tests: scenarioMultiCompare Restkanten jenseits von
// scenarioSplit.branch.vitest.ts (Guard 0/1/5, NOT_FOUND, identische Versionen,
// Referenz-Fallback/explizit, ungleiche Run-Anzahl/Dauer). Hier nur dort
// fehlende Zweige: null-VersionIds (?? 0-Arm), Objekt-Parameter (channelMix),
// String-Parameter (targetPackageFocus) sowie Referenz ohne Runs
// (refMedian-undefined-Arm mit undefinierten Matrixeinträgen). Rein, ohne Runs.
import { describe, it, expect } from 'vitest';
import { compareMultipleVersionsWith } from '../../scenarioMultiCompare';
import { ScenarioRepository, DEFAULT_BASE_2026_PARAMETERS } from '../../scenarioRepository';
import { ScenarioError, type ScenarioVersion } from '../../../types/scenario';
import type { ScenarioAggregationResult } from '../../../types/aggregation';

function versionFixture(
  id: string,
  scenarioId: string,
  versionNumber: number,
  params = {},
): ScenarioVersion {
  return {
    id,
    scenarioId,
    versionNumber,
    parameters: { ...DEFAULT_BASE_2026_PARAMETERS, ...params },
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function stubRepo(versions: ScenarioVersion[]) {
  return {
    getVersion: (vid: string) => versions.find((v) => v.id === vid) ?? null,
  } as unknown as ScenarioRepository;
}

function stats(median: number) {
  return { median, p10: median, p90: median, mean: median, stdDev: 0, min: median, max: median };
}

function fakeAgg(
  versionId: string,
  validRunCount: number,
  arrMedian: number,
): ScenarioAggregationResult {
  return {
    scenarioId: 's-1',
    scenarioVersionId: versionId,
    runCount: validRunCount,
    validRunCount,
    aggregatedAt: '2026-01-01T00:00:00.000Z',
    metrics: {
      arr: stats(arrMedian),
      mrr: stats(100),
      customers: stats(10),
      wonDeals: stats(1),
      timeSeries: [],
    },
  };
}

describe('scenarioMultiCompare.branch2', () => {
  const a = versionFixture('v-1', 's-1', 1);
  const b = versionFixture('v-2', 's-1', 2, { salesRepCount: 4 });

  it('null-VersionIds werfen INVALID_VERSION mit Zähler 0', () => {
    const repo = stubRepo([a, b]);
    try {
      compareMultipleVersionsWith(repo, (vid) => fakeAgg(vid, 0, 0), null as unknown as string[]);
      throw new Error('kein Wurf');
    } catch (e) {
      expect((e as ScenarioError).code).toBe('INVALID_VERSION');
      expect((e as Error).message).toContain('(erhalten: 0)');
    }
  });

  it('channelMix wird als Objekt-Mix mit Prozent formatiert', () => {
    const c = versionFixture('v-3', 's-1', 3, {
      channelMix: { linkedIn: 50, seo: 20, partner: 10, webinar: 10, outbound: 10 },
    });
    const repo = stubRepo([a, c]);
    const res = compareMultipleVersionsWith(repo, (vid) => fakeAgg(vid, 0, 0), ['v-1', 'v-3']);
    const mix = res.parameterMatrix.find((p) => p.key === 'channelMix')!;
    expect(mix.formattedValuesByVersionId['v-3']).toContain('%');
    expect(mix.hasChangedAgainstRef['v-3']).toBe(true);
    expect(mix.hasChangedAgainstRef['v-1']).toBe(false);
  });

  it('String-Parameter werden als String formatiert und erkannt', () => {
    const d = versionFixture('v-4', 's-1', 4, { targetPackageFocus: 'Pro' });
    const repo = stubRepo([a, d]);
    const res = compareMultipleVersionsWith(repo, (vid) => fakeAgg(vid, 0, 0), ['v-1', 'v-4']);
    const row = res.parameterMatrix.find((p) => p.key === 'targetPackageFocus')!;
    expect(row.formattedValuesByVersionId['v-4']).toBe('Pro');
    expect(row.hasChangedAgainstRef['v-4']).toBe(
      DEFAULT_BASE_2026_PARAMETERS.targetPackageFocus !== 'Pro',
    );
  });

  it('Referenz ohne Runs liefert undefinierte Matrixeinträge ohne Deltas', () => {
    const repo = stubRepo([a, b]);
    const res = compareMultipleVersionsWith(
      repo,
      (vid) => (vid === 'v-1' ? fakeAgg(vid, 0, 0) : fakeAgg(vid, 2, 200)),
      ['v-1', 'v-2'],
    );
    expect(res.referenceVersionId).toBe('v-1');
    const arr = res.kpiMatrix.find((r) => r.kpiId === 'liveARR')!;
    expect(arr.valuesByVersionId['v-1']).toBeUndefined();
    expect(arr.deltasAgainstRef['v-1']).toBeUndefined();
    expect(arr.deltasAgainstRef['v-2']).toBeUndefined();
    expect(arr.valuesByVersionId['v-2']?.median).toBe(200);
    expect(res.comparisonWarnings).toEqual([]);
  });

  it('explizite Referenz auf die zweite Version dreht die Deltas um', () => {
    const repo = stubRepo([a, b]);
    const res = compareMultipleVersionsWith(
      repo,
      (vid) => fakeAgg(vid, 2, vid === 'v-1' ? 100 : 300),
      ['v-1', 'v-2'],
      undefined,
      'v-2',
    );
    expect(res.referenceVersionId).toBe('v-2');
    const arr = res.kpiMatrix.find((r) => r.kpiId === 'liveARR')!;
    expect(arr.valuesByVersionId['v-1']?.median).toBe(100);
    expect(arr.valuesByVersionId['v-2']?.median).toBe(300);
    expect(arr.deltasAgainstRef['v-1']).toBeDefined();
  });
});
