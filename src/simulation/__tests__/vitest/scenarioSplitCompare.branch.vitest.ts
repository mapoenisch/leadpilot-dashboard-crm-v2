// Branch-Tests: reine Edge-Cases der Scenario-Split-Module (Teil 2:
// Compare, MultiCompare, Trade-offs, Service-Getter).
// Abgrenzung wie in scenarioSplit.branch.vitest.ts (Teil 1): hier
// ausschließlich run-freie Kanten. Fixtures aus scenarioSplitFixtures.
import { describe, it, expect } from 'vitest';
import { compareVersionsWith } from '../../scenarioCompare';
import { compareMultipleVersionsWith } from '../../scenarioMultiCompare';
import { evaluateTradeOffs, identifyKeyDifferences } from '../../scenarioTradeoffs';
import { ScenarioService, scenarioService } from '../../scenarioService';
import { ScenarioError } from '../../../types/scenario';
import { fakeAgg, paramRow, tradeMatrix, versionFixture, stubRepo } from './scenarioSplitFixtures';

describe('scenarioCompare.branch', () => {
  it('wirft NOT_FOUND bei fehlender Version', () => {
    const v = versionFixture('v-1', 's-1', 1);
    const repo = stubRepo([v]);
    expect(() =>
      compareVersionsWith(repo, () => fakeAgg('v-1', 0, 0, 0), 'v-1', 'fehlt'),
    ).toThrowError(ScenarioError);
  });

  it('gleiche Version: keine Diffs, Null-Summary erwähnt beide Runlosigkeiten', () => {
    const v = versionFixture('v-1', 's-1', 3);
    const repo = stubRepo([v]);
    const res = compareVersionsWith(repo, (vid) => fakeAgg(vid, 0, 0, 0), 'v-1', 'v-1');
    expect(res.hasRunsA).toBe(false);
    expect(res.hasRunsB).toBe(false);
    expect(res.parameterDiffs.every((p) => !p.hasChanged)).toBe(true);
    expect(res.summaryExplanation).toContain('0 Runs');
    expect(res.kpiComparisons).toHaveLength(4);
    expect(res.kpiComparisons.every((k) => k.comparisonAB === undefined)).toBe(true);
  });

  it('Zahlen-Diff rechnet Delta/Prozent, Objekt-Diff formatiert Mix', () => {
    const a = versionFixture('v-1', 's-1', 1);
    const b = versionFixture('v-2', 's-1', 2, { salesRepCount: 4 });
    const repo = stubRepo([a, b]);
    const res = compareVersionsWith(repo, (vid) => fakeAgg(vid, 0, 0, 0), 'v-1', 'v-2');
    const reps = res.parameterDiffs.find((p) => p.key === 'salesRepCount')!;
    expect(reps.hasChanged).toBe(true);
    expect(reps.delta).toBe(2);
    expect(reps.deltaPercent).toBe(100);
    const mix = res.parameterDiffs.find((p) => p.key === 'channelMix')!;
    expect(mix.hasChanged).toBe(false);
    expect(mix.formattedValueA).toContain('%');
  });

  it('custom Targets werden akzeptiert', () => {
    const v = versionFixture('v-1', 's-1', 1);
    const repo = stubRepo([v]);
    const res = compareVersionsWith(repo, (vid) => fakeAgg(vid, 0, 0, 0), 'v-1', 'v-1', {
      liveARR: { kpiId: 'liveARR', targetValue: 1 },
    });
    expect(res.kpiComparisons.find((k) => k.kpiId === 'liveARR')).toBeDefined();
  });
});

describe('scenarioMultiCompare.branch', () => {
  const a = versionFixture('v-1', 's-1', 1);
  const b = versionFixture('v-2', 's-1', 2, { salesRepCount: 4 });

  it('Guard: 0, 1 und 5 Versionen werfen INVALID_VERSION', () => {
    const repo = stubRepo([a, b]);
    for (const ids of [[], ['v-1'], ['v-1', 'v-2', 'v-3', 'v-4', 'v-5']]) {
      try {
        compareMultipleVersionsWith(repo, (vid) => fakeAgg(vid, 0, 0, 0), ids);
        throw new Error('kein Wurf');
      } catch (e) {
        expect((e as ScenarioError).code).toBe('INVALID_VERSION');
      }
    }
  });

  it('unbekannte Version wirft NOT_FOUND', () => {
    const repo = stubRepo([a]);
    expect(() =>
      compareMultipleVersionsWith(repo, (vid) => fakeAgg(vid, 0, 0, 0), ['v-1', 'fehlt']),
    ).toThrowError(ScenarioError);
  });

  it('identische Versionen: keine Treiber, leere Warnungen, Referenz = erste', () => {
    const repo = stubRepo([a, a]);
    const res = compareMultipleVersionsWith(repo, (vid) => fakeAgg(vid, 0, 0, 0), ['v-1', 'v-1']);
    expect(res.referenceVersionId).toBe('v-1');
    expect(res.keyDifferences).toEqual([]);
    expect(res.comparisonWarnings).toEqual([]);
    expect(res.summaryText).toContain('identische Parameterkonfigurationen');
    expect(res.tradeOffs).toHaveLength(5);
  });

  it('ungültige Referenz fällt auf erste Version zurück, gültige wird respektiert', () => {
    const repo = stubRepo([a, b]);
    const fallback = compareMultipleVersionsWith(
      repo,
      (vid) => fakeAgg(vid, 0, 0, 0),
      ['v-1', 'v-2'],
      undefined,
      'nope',
    );
    expect(fallback.referenceVersionId).toBe('v-1');
    const explicit = compareMultipleVersionsWith(
      repo,
      (vid) => fakeAgg(vid, 0, 0, 0),
      ['v-1', 'v-2'],
      undefined,
      'v-2',
    );
    expect(explicit.referenceVersionId).toBe('v-2');
    expect(explicit.keyDifferences.length).toBeGreaterThan(0);
  });

  it('ungleiche Run-Anzahl und Dauer erzeugen Vergleichswarnungen', () => {
    const repo = stubRepo([a, b]);
    const res = compareMultipleVersionsWith(
      repo,
      (vid) => (vid === 'v-1' ? fakeAgg(vid, 2, 100, 5) : fakeAgg(vid, 3, 200, 7)),
      ['v-1', 'v-2'],
    );
    expect(res.comparisonWarnings.length).toBeGreaterThanOrEqual(2);
    expect(res.kpiMatrix.find((r) => r.kpiId === 'liveARR')?.deltasAgainstRef['v-2']).toBeDefined();
  });
});

describe('scenarioTradeoffs.branch', () => {
  const versions = [versionFixture('v-1', 's-1', 1), versionFixture('v-2', 's-1', 2)];

  it('HIGHER gewinnt größter, LOWER gewinnt kleinster Median', () => {
    const res = evaluateTradeOffs(versions, tradeMatrix(100, 300));
    expect(res.find((t) => t.dimension === 'GROWTH')?.bestVersionId).toBe('v-2');
    expect(res.find((t) => t.dimension === 'ACQUISITION')?.bestVersionId).toBe('v-1');
    const growth = res.find((t) => t.dimension === 'GROWTH')!;
    expect(growth.evaluations['v-2']?.isLeader).toBe(true);
    expect(growth.evaluations['v-1']?.isLeader).toBe(false);
    expect(growth.evaluations['v-2']?.pros.length).toBeGreaterThan(0);
    expect(growth.evaluations['v-1']?.cons.length).toBeGreaterThan(0);
    expect(growth.tradeOffSummary).toContain('v2');
  });

  it('fehlende Werte verlieren gegen vorhandene (Infinity-Fallback)', () => {
    const matrix = tradeMatrix(50, 60).map((row) =>
      row.kpiId === 'liveARR'
        ? { ...row, valuesByVersionId: { ...row.valuesByVersionId, 'v-2': undefined } }
        : row,
    );
    const res = evaluateTradeOffs(versions, matrix);
    expect(res.find((t) => t.dimension === 'GROWTH')?.bestVersionId).toBe('v-1');
  });

  it('leere Versionsliste wirft INVALID_VERSION', () => {
    expect(() => evaluateTradeOffs([], tradeMatrix(1, 2))).toThrowError(ScenarioError);
  });

  it('identifyKeyDifferences mappt jeden Parametertyp auf Dimension/KPI', () => {
    const rows = [
      paramRow('salesRepCount', { 'v-2': true }),
      paramRow('marketingBudgetYearly', { 'v-2': true }),
      paramRow('trialToPaidConversion', { 'v-2': true }),
      paramRow('churnRateMonthly', { 'v-2': true }),
      paramRow('csRepCount', { 'v-2': true }),
      paramRow('discountPercent', { 'v-2': true }),
      paramRow('salesCycleDays', { 'v-2': true }),
      paramRow('winProbabilityMultiplier', {}),
    ];
    const diffs = identifyKeyDifferences(versions, rows);
    expect(diffs).toHaveLength(7);
    const byKey = Object.fromEntries(diffs.map((d) => [d.parameterKey, d]));
    expect(byKey.salesRepCount).toMatchObject({ dimension: 'GROWTH', affectedKpiId: 'liveARR' });
    expect(byKey.marketingBudgetYearly).toMatchObject({
      dimension: 'ACQUISITION',
      affectedKpiId: 'cac',
    });
    expect(byKey.trialToPaidConversion).toMatchObject({ affectedKpiId: 'liveWonDeals' });
    expect(byKey.churnRateMonthly).toMatchObject({ dimension: 'RETENTION' });
    expect(byKey.csRepCount).toMatchObject({ dimension: 'RETENTION' });
    expect(byKey.discountPercent).toMatchObject({
      dimension: 'PROFITABILITY',
      affectedKpiId: 'ebitda',
    });
    expect(byKey.salesCycleDays).toMatchObject({ dimension: 'GROWTH' });
    for (const d of diffs) {
      expect(d.divergenceLevel).toBe('MEDIUM');
      expect(d.causeClarity).toBe('CLEAR');
      expect(d.id).toBe(`diff-${String(d.parameterKey)}`);
    }
  });

  it('zwei abweichende Versionen eskalieren auf HIGH', () => {
    const versions3 = [...versions, versionFixture('v-3', 's-1', 3)];
    const diffs = identifyKeyDifferences(versions3, [
      paramRow('salesRepCount', { 'v-2': true, 'v-3': true }),
    ]);
    expect(diffs[0]?.divergenceLevel).toBe('HIGH');
  });
});

describe('scenarioService.branch (reine Getter/Fehlerkanten)', () => {
  it('unbekannte IDs liefern undefined statt zu werfen', () => {
    expect(scenarioService.getScenario('gibts-nicht')).toBeUndefined();
    expect(scenarioService.getVersion('gibts-nicht')).toBeUndefined();
    expect(scenarioService.getRun('gibts-nicht')).toBeUndefined();
    expect(Array.isArray(scenarioService.getScenarios())).toBe(true);
    expect(Array.isArray(scenarioService.getAllRuns())).toBe(true);
  });

  it('adoptConfiguration wirft NOT_FOUND bei fehlender Quelle und fehlendem Ziel', () => {
    expect(() => scenarioService.adoptConfiguration('fehlt', 'auch-fehlt')).toThrowError(
      ScenarioError,
    );
    const { scenario } = scenarioService.createScenario('adopt-ziel-edge');
    expect(() => scenarioService.adoptConfiguration('fehlt', scenario.id)).toThrowError(
      /Quellversion/,
    );
    const { version } = scenarioService.createScenario('adopt-quelle-edge');
    expect(() => scenarioService.adoptConfiguration(version.id, 'fehlt')).toThrowError(
      /Zielszenario/,
    );
  });

  it('adoptConfiguration übernimmt Parameter in eine neue Zielversion', () => {
    const { version: src } = scenarioService.createScenario('adopt-src-edge', undefined, {
      salesRepCount: 5,
    });
    const { scenario: target } = scenarioService.createScenario('adopt-tgt-edge');
    const adopted = scenarioService.adoptConfiguration(src.id, target.id);
    expect(adopted.scenarioId).toBe(target.id);
    expect(adopted.parameters.salesRepCount).toBe(5);
    expect(adopted.description).toContain(src.id);
  });

  it('cancelActiveRun ohne laufenden Run wirft nicht', () => {
    expect(() => scenarioService.cancelActiveRun()).not.toThrow();
  });

  it('pruneCompletedRun ohne Repository liefert null', async () => {
    const svc = ScenarioService.getInstance();
    const prev = (svc as unknown as { snapshotRepo?: unknown }).snapshotRepo;
    (svc as unknown as { snapshotRepo?: unknown }).snapshotRepo = undefined;
    try {
      await expect(svc.pruneCompletedRun('run-x')).resolves.toBeNull();
    } finally {
      (svc as unknown as { snapshotRepo?: unknown }).snapshotRepo = prev as never;
    }
  });

  it('setSnapshotRepository + pruneCompletedRun delegiert an den Manager', async () => {
    const svc = ScenarioService.getInstance();
    const prev = (svc as unknown as { snapshotRepo?: unknown }).snapshotRepo;
    const fakeRepo = { __fake: true };
    svc.setSnapshotRepository(fakeRepo as never);
    // pruneCompletedRun mit explizitem Repo ruft pruneSnapshotsForRun auf.
    const seen: Array<{ runId: string; keep: number[] }> = [];
    const stub = {
      getByRun: async () => [],
      pruneSnapshotsForRun: async (runId: string, keepTickIds: number[]) => {
        seen.push({ runId, keep: keepTickIds });
        return { prunedCount: 0, remainingCount: keepTickIds.length };
      },
    } as never;
    const res = await svc.pruneCompletedRun('run-edge', stub, 5);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.runId).toBe('run-edge');
    expect(res).toBeDefined();
    svc.setSnapshotRepository(prev as never);
  });

  it('getVersionsForScenario/getRunsForVersion filtern korrekt', () => {
    const { scenario, version } = scenarioService.createScenario('filter-edge');
    expect(scenarioService.getVersionsForScenario(scenario.id).map((v) => v.id)).toContain(
      version.id,
    );
    expect(scenarioService.getRunsForVersion(version.id)).toEqual([]);
  });

  it('deleteScenario entfernt, getScenarios enthält Rest', () => {
    const { scenario } = scenarioService.createScenario('delete-edge');
    scenarioService.deleteScenario(scenario.id);
    expect(scenarioService.getScenario(scenario.id)).toBeUndefined();
  });
});
