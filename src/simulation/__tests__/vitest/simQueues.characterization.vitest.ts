// Charakterisierung: Queues, effektive Parameter, Preflight-Validierung (rein, stub-Repos).
import { describe, it, expect } from 'vitest';
import { SalesQueueManager } from '../../salesQueueManager';
import { CSQueueManager } from '../../csQueueManager';
import { EffectiveParameterResolver } from '../../effectiveParameterResolver';
import { PreflightValidator } from '../../preflightValidator';
import { parameterRegistry } from '../../parameterRegistry';
import type {
  ScenarioParameters,
  Scenario,
  ScenarioVersion,
  SimulationRun,
} from '../../../types/scenario';
import type { Measure } from '../../../types/measure';
import type { SimulationLead, SimulationDeal } from '../../../types/simulation';
import type { SalesQueueEntry } from '../../../types/salesQueue';
import type { CSQueueEntry } from '../../../types/csQueue';
import type { IScenarioRepository } from '../../scenarioRepository';

const baseParams: ScenarioParameters = {
  marketingBudgetYearly: 65000,
  channelMix: { linkedIn: 38, seo: 22, partner: 18, webinar: 12, outbound: 10 },
  trialToPaidConversion: 18,
  salesRepCount: 2,
  csRepCount: 2,
  churnRateMonthly: 2.8,
  salesCycleDays: 38,
  targetPackageFocus: 'Balanced',
  winProbabilityMultiplier: 1,
  discountPercent: 0,
};

function lead(id: string, status: SimulationLead['status'] = 'New'): SimulationLead {
  return {
    id,
    contactName: 'C',
    companyName: `Firma ${id}`,
    email: `${id}@test.dev`,
    industry: 'IT',
    city: 'Berlin',
    status,
    score: 7,
    source: 'Inbound',
    estimatedValue: 50000,
    owner: 'Sales',
    createdAtTick: 0,
    lastUpdatedTick: 0,
  };
}

describe('SalesQueueManager', () => {
  it('Kapazität floort, Priorität folgt der Formel', () => {
    expect(SalesQueueManager.calculateSalesCapacity(2.9)).toBe(2);
    expect(SalesQueueManager.calculateSalesCapacity(-1)).toBe(0);
    expect(SalesQueueManager.calculateWorkload('CLOSING')).toBe(1);
    // 7*10 + floor(50000/10000) + 3*2 = 70 + 5 + 6
    expect(SalesQueueManager.calculatePriority(7, 50000, 3)).toBe(81);
  });

  it('processTick synchronisiert Leads und arbeitet sie kapazitätsgebunden ab', () => {
    const first = SalesQueueManager.processTick([], 1, 0, [lead('l1')]);
    expect(first.updatedEntries).toHaveLength(1);
    expect(first.updatedEntries[0]).toMatchObject({ leadId: 'l1', stage: 'QUALIFICATION' });
    const second = SalesQueueManager.processTick(first.updatedEntries, 1, 1, [lead('l1')]);
    expect(second.updatedEntries[0]?.status).toBe('COMPLETED');
    // Keine Duplikate bei erneutem Sync
    expect(second.updatedEntries).toHaveLength(1);
  });

  it('Status-Mapping MQL/SQL/Hot und terminale Leads', () => {
    const res = SalesQueueManager.processTick([], 0, 0, [
      lead('a', 'MQL'),
      lead('b', 'SQL'),
      lead('c', 'Hot'),
      lead('d', 'Won'),
    ]);
    const byLead = Object.fromEntries(res.updatedEntries.map((e) => [e.leadId, e.stage]));
    expect(byLead).toMatchObject({ a: 'PITCH_DEMO', b: 'PROPOSAL', c: 'CLOSING' });
    expect(byLead.d).toBeUndefined();
    expect(res.projection.isSalesBottleneck).toBe(true);
  });

  it('IN_PROGRESS wird nicht verdrängt (Non-Preemption)', () => {
    const inProgress: SalesQueueEntry = {
      id: 'sqe-l1-t0',
      leadId: 'l1',
      companyName: 'Firma l1',
      stage: 'QUALIFICATION',
      workloadPoints: 5,
      priority: 10,
      enteredQueueTick: 0,
      dueAtTick: 1,
      status: 'IN_PROGRESS',
      processTicks: 1,
      queueTicks: 0,
      totalSalesCycleTicks: 1,
      lastUpdatedTick: 0,
    };
    const res = SalesQueueManager.processTick([inProgress], 1, 1, [lead('l1'), lead('l2')]);
    expect(res.updatedEntries.find((e) => e.leadId === 'l1')?.status).toBe('IN_PROGRESS');
  });

  it('Projection und Metrics auf leeren Einträgen sind 0 und ehrlich', () => {
    const proj = SalesQueueManager.buildProjection([], 2, 9);
    expect(proj).toMatchObject({ waitingCount: 0, availableCapacity: 2, freeCapacity: 2 });
    const metrics = SalesQueueManager.calculateMetrics(proj);
    expect(metrics).toMatchObject({ capacityUtilization: 0, totalCycleTicks: 0 });
  });
});

describe('CSQueueManager', () => {
  it('Health-Score mittelt und deckelt Penalty/Clamp', () => {
    const full = {
      onboardingScore: 80,
      supportScore: 80,
      engagementScore: 80,
      openIssuesScore: 80,
    };
    expect(CSQueueManager.calculateHealthScore(full)).toBe(80);
    expect(CSQueueManager.calculateHealthScore({ ...full, csQueueTimePenalty: 50 })).toBe(60);
    expect(
      CSQueueManager.calculateHealthScore({
        onboardingScore: 0,
        supportScore: 0,
        engagementScore: 0,
        openIssuesScore: 0,
        csQueueTimePenalty: 20,
      }),
    ).toBe(0);
  });

  it('Churn-Risiko bleibt in [0, 1] und steigt mit schlechter Health', () => {
    const low = CSQueueManager.calculateChurnRisk(10, 10, 5);
    const high = CSQueueManager.calculateChurnRisk(100, 0, 0.5);
    expect(low).toBeGreaterThan(high);
    expect(low).toBeLessThanOrEqual(1);
    expect(high).toBeGreaterThanOrEqual(0);
  });

  it('Priorität und Churn-Ursache folgen den Regeln', () => {
    expect(CSQueueManager.calculateCSPriority(50, 0.1, 20000, 2)).toBeGreaterThanOrEqual(0);
    expect(CSQueueManager.classifyChurnCause(20, 0)).toBe('HEALTH_PROBLEM');
    expect(CSQueueManager.classifyChurnCause(80, 5)).toBe('CS_CAPACITY');
    expect(CSQueueManager.classifyChurnCause(80, 1)).toBe('BASELINE_CHURN');
    expect(CSQueueManager.calculateCSCapacity(2.7)).toBe(2);
  });

  it('processTick befördert WAITING bei Kapazität, sonst Stau', () => {
    const entry: CSQueueEntry = {
      id: 'cse-1',
      customerId: 'deal-1',
      companyName: 'ACME',
      workloadPoints: 1,
      priority: 5,
      enteredQueueTick: 0,
      dueAtTick: 1,
      status: 'WAITING',
      processTicks: 0,
      queueTicks: 0,
      totalCSTimeTicks: 0,
      lastUpdatedTick: 0,
      healthScoreAtQueue: 70,
      churnRiskAtQueue: 0.05,
    };
    const deal = { id: 'deal-1', companyName: 'ACME', arr: 50000 } as SimulationDeal;
    const done = CSQueueManager.processTick([entry], 1, 1, [deal]);
    expect(done.updatedEntries[0]?.status).toBe('COMPLETED');
    const queued = CSQueueManager.processTick([entry], 0, 1, [deal]);
    expect(queued.updatedEntries[0]?.status).toBe('WAITING');
    expect(queued.projection.isCSBottleneck).toBe(true);
  });

  it('calculateMetrics aggregiert Health über Deals (inkl. leer)', () => {
    const empty = CSQueueManager.calculateMetrics([], [], 2);
    expect(empty.customerHealthMetrics.avgHealthScore).toBe(75);
    const deals = [
      { id: 'd1', healthScore: 30, isChurned: true, churnCause: 'HEALTH_PROBLEM' },
      { id: 'd2', healthScore: 90, isChurned: false },
    ] as SimulationDeal[];
    const res = CSQueueManager.calculateMetrics([], deals, 2);
    expect(res.customerHealthMetrics.atRiskCustomerCount).toBe(1);
    expect(res.customerHealthMetrics.churnedCustomerCount).toBe(1);
    expect(res.customerHealthMetrics.churnCausesBreakdown.HEALTH_PROBLEM).toBe(1);
  });
});

describe('EffectiveParameterResolver', () => {
  const measure = (over: Partial<Measure>): Measure => ({
    id: 'm1',
    name: 'M1',
    startTick: 0,
    changes: [{ parameter: 'salesRepCount', mode: 'set', value: 6 }],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  });

  it('ohne Maßnahmen gilt die Basis', () => {
    expect(new EffectiveParameterResolver(baseParams, []).at(10)).toEqual(baseParams);
  });

  it('set/delta/multiply wirken deterministisch', () => {
    expect(new EffectiveParameterResolver(baseParams, [measure({})]).at(0).salesRepCount).toBe(6);
    const delta = measure({
      id: 'm2',
      changes: [{ parameter: 'salesRepCount', mode: 'delta', value: 1 }],
    });
    expect(new EffectiveParameterResolver(baseParams, [delta]).at(0).salesRepCount).toBe(3);
    const mult = measure({
      id: 'm3',
      changes: [{ parameter: 'salesRepCount', mode: 'multiply', value: 2 }],
    });
    expect(new EffectiveParameterResolver(baseParams, [mult]).at(0).salesRepCount).toBe(4);
  });

  it('Ramp interpoliert linear, Dauer läuft ab, Clamp greift', () => {
    const ramped = measure({ startTick: 10, rampUpTicks: 4 });
    const r = new EffectiveParameterResolver(baseParams, [ramped]);
    expect(r.at(10).salesRepCount).toBe(2);
    expect(r.at(12).salesRepCount).toBe(4);
    expect(r.at(14).salesRepCount).toBe(6);
    const timed = measure({ id: 'm4', startTick: 10, durationTicks: 5 });
    const t = new EffectiveParameterResolver(baseParams, [timed]);
    expect(t.at(12).salesRepCount).toBe(6);
    expect(t.at(15).salesRepCount).toBe(2);
    const huge = measure({
      id: 'm5',
      changes: [{ parameter: 'salesRepCount', mode: 'set', value: 999 }],
    });
    expect(new EffectiveParameterResolver(baseParams, [huge]).at(0).salesRepCount).toBe(10);
  });

  it('ungültige Maßnahmen werfen im Konstruktor', () => {
    expect(
      () => new EffectiveParameterResolver(baseParams, [measure({ startTick: -1 })]),
    ).toThrow();
    expect(() => new EffectiveParameterResolver(baseParams, [measure({ changes: [] })])).toThrow();
    expect(
      () =>
        new EffectiveParameterResolver(baseParams, [
          measure({ changes: [{ parameter: 'churnRateMonthly' as never, mode: 'set', value: 1 }] }),
        ]),
    ).toThrow();
  });

  it('detectConflicts meldet Set-Kollisionen, sonst Leere', () => {
    const both = new EffectiveParameterResolver(baseParams, [
      measure({ id: 'a', name: 'A' }),
      measure({ id: 'b', name: 'B' }),
    ]);
    const conflicts = both.detectConflicts();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.kind).toBe('MULTIPLE_SET');
    const mixed = new EffectiveParameterResolver(baseParams, [
      measure({ id: 'a', name: 'A' }),
      measure({
        id: 'c',
        name: 'C',
        changes: [{ parameter: 'salesRepCount', mode: 'delta', value: 1 }],
      }),
    ]);
    expect(mixed.detectConflicts()[0]?.kind).toBe('SET_AND_RELATIVE');
    const disjoint = new EffectiveParameterResolver(baseParams, [
      measure({ id: 'a', name: 'A', durationTicks: 5 }),
      measure({ id: 'b', name: 'B', startTick: 10, durationTicks: 5 }),
    ]);
    expect(disjoint.detectConflicts()).toEqual([]);
  });
});

describe('PreflightValidator', () => {
  const version: ScenarioVersion = {
    id: 'ver-1',
    scenarioId: 'scen-1',
    versionNumber: 1,
    parameters: { ...baseParams },
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const activeScenario: Scenario = {
    id: 'scen-1',
    name: 'S',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    currentVersionId: 'ver-1',
    isProtected: false,
  };
  const stubRepo = (
    over: {
      version?: ScenarioVersion | null;
      scenario?: Scenario | null;
      runs?: SimulationRun[];
    } = {},
  ): IScenarioRepository =>
    ({
      getVersion: () => ('version' in over ? over.version : version),
      getScenario: () => ('scenario' in over ? over.scenario : activeScenario),
      getRunsByScenario: () => over.runs ?? [],
    }) as unknown as IScenarioRepository;

  it('Happy-Path ist valide mit Baseline-Warnung', () => {
    const res = PreflightValidator.validateRun('ver-1', 123, stubRepo(), parameterRegistry);
    expect(res.valid).toBe(true);
    expect(res.errors).toEqual([]);
    expect(res.warnings.map((w) => w.code)).toContain('BASELINE_CHECK_PASSED');
  });

  it('Fehlerpfade: Seed, Version, Szenario, Archiv, Parameter, Run-Limit', () => {
    expect(
      PreflightValidator.validateRun('ver-1', Number.NaN, stubRepo(), parameterRegistry).errors.map(
        (e) => e.code,
      ),
    ).toContain('INVALID_SEED');
    expect(
      PreflightValidator.validateRun('missing', 1, stubRepo({ version: null }), parameterRegistry)
        .valid,
    ).toBe(false);
    expect(
      PreflightValidator.validateRun(
        'ver-1',
        1,
        stubRepo({ scenario: null }),
        parameterRegistry,
      ).errors.map((e) => e.code),
    ).toContain('SCENARIO_NOT_FOUND');
    expect(
      PreflightValidator.validateRun(
        'ver-1',
        1,
        stubRepo({ scenario: { ...activeScenario, status: 'ARCHIVED' } }),
        parameterRegistry,
      ).errors.map((e) => e.code),
    ).toContain('SCENARIO_ARCHIVED');
    expect(
      PreflightValidator.validateRun(
        'ver-1',
        1,
        stubRepo({ version: { ...version, parameters: undefined as never } }),
        parameterRegistry,
      ).errors.map((e) => e.code),
    ).toContain('MISSING_PARAMETERS');
    const ten = Array.from({ length: 10 }, (_, i) => ({ runId: `r${i}` }) as SimulationRun);
    expect(
      PreflightValidator.validateRun(
        'ver-1',
        1,
        stubRepo({ runs: ten }),
        parameterRegistry,
      ).errors.map((e) => e.code),
    ).toContain('MAX_RUNS_EXCEEDED');
  });
});
