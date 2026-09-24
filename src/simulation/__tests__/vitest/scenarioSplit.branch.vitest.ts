// Branch-Tests: reine Edge-Cases der Scenario-Split-Module (Teil 1:
// TickRunner, Lifecycle, Workspace).
// Abgrenzung zu scenarioServiceSplit.vitest.ts (nur Delegations-Parität +
// Null-Metriken) und den Integrity-Suiten (Run-/Vergleichs-Happy-Paths mit
// echten Runs): hier ausschließlich run-freie Kanten — Guards, Fehlerwürfe,
// Fallbacks, Mapping-Tabellen, leere/Null-Eingaben.
import { describe, it, expect } from 'vitest';
import { executeTicksMainThread, shouldUseWorker } from '../../scenarioTickRunner';
import { createScenarioWith, createScenarioVersionWith } from '../../scenarioLifecycle';
import { diffFinalMetrics, getScenarioAggregationWith } from '../../scenarioWorkspace';
import { ScenarioRepository } from '../../scenarioRepository';
import { ScenarioError, type SimulationRun } from '../../../types/scenario';
import { tickInput, versionFixture, stubRepo } from './scenarioSplitFixtures';

describe('scenarioTickRunner.branch', () => {
  it('shouldUseWorker ist in node false', () => {
    expect(shouldUseWorker()).toBe(false);
  });

  it('targetTicks 0: keine Events/TimeSeries, isRunning false, kein Progress', () => {
    const progress: Array<[number, number]> = [];
    const res = executeTicksMainThread(tickInput(0, (a, b) => progress.push([a, b])));
    expect(res.events).toEqual([]);
    expect(res.timeSeries).toEqual([]);
    expect(res.state.isRunning).toBe(false);
    expect(res.state.tickCount).toBe(0);
    expect(progress).toEqual([]);
    expect(typeof res.rngState).toBe('number');
  });

  it('ein Tick stempelt correlationId und meldet Progress (1,1)', () => {
    const progress: Array<[number, number]> = [];
    const res = executeTicksMainThread(tickInput(1, (a, b) => progress.push([a, b])));
    expect(res.timeSeries).toHaveLength(1);
    expect(res.state.tickCount).toBe(1);
    expect(progress).toEqual([[1, 1]]);
    for (const evt of res.events) {
      expect(evt.correlationId).toBe('corr-edge-1');
    }
  });
});

describe('scenarioLifecycle.branch', () => {
  it('createScenarioWith wirft VALIDATION_ERROR bei ungültigen Parametern', () => {
    const repo = ScenarioRepository.getInstance();
    expect(() =>
      createScenarioWith(repo, 'invalid-params', undefined, { salesRepCount: 999 }),
    ).toThrowError(ScenarioError);
    try {
      createScenarioWith(repo, 'invalid-params', undefined, { salesRepCount: 999 });
    } catch (e) {
      expect((e as ScenarioError).code).toBe('VALIDATION_ERROR');
    }
  });

  it('createScenarioWith speichert parentScenarioId', () => {
    const repo = ScenarioRepository.getInstance();
    const { scenario, version } = createScenarioWith(
      repo,
      'child-edge',
      'desc',
      undefined,
      'parent-1',
    );
    expect(scenario.parentScenarioId).toBe('parent-1');
    expect(version.versionNumber).toBe(1);
    expect(scenario.currentVersionId).toBe(version.id);
  });

  it('createScenarioVersionWith wirft NOT_FOUND bei unbekanntem Szenario', () => {
    const repo = ScenarioRepository.getInstance();
    expect(() => createScenarioVersionWith(repo, 'gibts-nicht', { salesRepCount: 3 })).toThrowError(
      /wurde nicht gefunden/,
    );
    try {
      createScenarioVersionWith(repo, 'gibts-nicht', { salesRepCount: 3 });
    } catch (e) {
      expect((e as ScenarioError).code).toBe('NOT_FOUND');
    }
  });

  it('createScenarioVersionWith wirft VALIDATION_ERROR bei ungültigem Delta', () => {
    const repo = ScenarioRepository.getInstance();
    const { scenario } = createScenarioWith(repo, 'version-guard-edge');
    expect(() =>
      createScenarioVersionWith(repo, scenario.id, { churnRateMonthly: 999 }),
    ).toThrowError(ScenarioError);
  });

  it('createScenarioVersionWith erzeugt v2 und zieht currentVersionId nach', () => {
    const repo = ScenarioRepository.getInstance();
    const { scenario } = createScenarioWith(repo, 'v2-edge');
    const v2 = createScenarioVersionWith(repo, scenario.id, { salesRepCount: 3 }, 'zweite Version');
    expect(v2.versionNumber).toBe(2);
    expect(v2.description).toBe('zweite Version');
    expect(repo.getScenario(scenario.id)?.currentVersionId).toBe(v2.id);
  });
});

describe('scenarioWorkspace.branch (diff + aggregation)', () => {
  it('diffFinalMetrics: nur 5 KPIs, Null-Basis ohne Division durch 0', () => {
    const deltas = diffFinalMetrics(undefined, undefined);
    expect(deltas.map((d) => d.kpiId)).toEqual([
      'liveARR',
      'liveMRR',
      'liveCustomers',
      'liveCash',
      'liveEBITDA',
    ]);
    for (const d of deltas) {
      expect(d).toMatchObject({ delta: 0, deltaPercent: 0, baseValue: 0, withMeasuresValue: 0 });
    }
  });

  it('diffFinalMetrics: negative Deltas mit Prozent', () => {
    const deltas = diffFinalMetrics(
      { liveARR: 200000, liveMRR: 10000, liveCustomers: 50 } as never,
      { liveARR: 100000, liveMRR: 10000, liveCustomers: 60 } as never,
    );
    const arr = deltas.find((d) => d.kpiId === 'liveARR')!;
    expect(arr.delta).toBe(-100000);
    expect(arr.deltaPercent).toBe(-50);
    const cust = deltas.find((d) => d.kpiId === 'liveCustomers')!;
    expect(cust.deltaPercent).toBe(20);
  });

  it('getScenarioAggregationWith: unbekannte Version liefert Baseline-Anker', () => {
    const repo = stubRepo([]);
    const agg = getScenarioAggregationWith(repo, 'fehlt');
    expect(agg.validRunCount).toBe(0);
    expect(agg.runCount).toBe(0);
    expect(agg.metrics.arr.median).toBe(411840);
    expect(agg.metrics.customers.median).toBe(66);
    expect(agg.metrics.wonDeals.median).toBe(0);
  });

  it('getScenarioAggregationWith: nicht-abgeschlossene Runs zählen nicht', () => {
    const v = versionFixture('v-9', 's-9', 1);
    const runs = [
      { status: 'RUNNING', finalMetrics: { liveARR: 1 } },
      { status: 'COMPLETED' },
      { status: 'CANCELLED', finalMetrics: { liveARR: 2 } },
    ] as unknown as SimulationRun[];
    const agg = getScenarioAggregationWith(stubRepo([v], { 'v-9': runs }), 'v-9');
    expect(agg.validRunCount).toBe(0);
    expect(agg.runCount).toBe(3);
  });
});
