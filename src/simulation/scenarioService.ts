import { DeterministicRNG } from './prng';
import { SimulationEngine, TickOutput } from './engine';
import { SimulationClock, SimulationEventRules } from './eventRules';
import { parameterRegistry, V1_PARAMETER_DEFINITIONS } from './parameterRegistry';
import { PreflightValidator } from './preflightValidator';
import { KPIRegistry } from './kpiRegistry';
import { GoalTargetEvaluator } from './goalTargetEvaluator';
import { GoalTarget } from '../types/kpi';
import { systemContext } from './systemContext';
import { BASELINE_PERIOD_START } from './constants';
import {
  DEFAULT_BASE_2026_PARAMETERS,
  DEFAULT_BASE_2026_SCENARIO_ID,
  ScenarioRepository,
} from './scenarioRepository';
import { MonteCarloAggregator } from './monteCarloAggregator';
import { SnapshotPruningManager } from './snapshotPruningManager';
import { BaselineSnapshotService } from '../services/data/baselineSnapshotService';
import { dataSourceRegistry } from '../services/data';
import { DataSourceError } from '../types/dataSource';
import { ISnapshotRepository } from '../services/db/ISnapshotRepository';
import { ScenarioAggregationResult, TimeSeriesPoint } from '../types/aggregation';
import { EffectiveParameterResolver } from './effectiveParameterResolver';
import { Measure, MeasureConflict, MeasureKpiDelta } from '../types/measure';
import {
  ParameterDiffItem,
  KPIComparisonItem,
  RunManifest,
  RunOptions,
  Scenario,
  ScenarioError,
  ScenarioParameters,
  ScenarioVersion,
  SimulationRun,
  VersionComparisonResult,
  MultiVersionComparisonResult,
  ParameterMatrixRow,
  KpiMatrixRow,
  KpiMatrixValue,
  TradeOffEvaluation,
  TradeOffDimension,
  KeyDifferenceItem,
} from '../types/scenario';
import {
  SimulationActivity,
  SimulationDeal,
  SimulationEvent,
  SimulationLead,
  SimulationMetrics,
  SimulationOpportunity,
  SimulationState,
} from '../types/simulation';

export interface RunExecutionResult {
  run: SimulationRun;
  state: SimulationState;
  leads: SimulationLead[];
  opportunities: SimulationOpportunity[];
  deals: SimulationDeal[];
  activities: SimulationActivity[];
  events: SimulationEvent[];
}

export class ScenarioService {
  private static instance: ScenarioService;
  private repo: ScenarioRepository;
  private snapshotRepo?: ISnapshotRepository;

  private constructor(repo = ScenarioRepository.getInstance(), snapshotRepo?: ISnapshotRepository) {
    this.repo = repo;
    this.snapshotRepo = snapshotRepo;
  }

  public static getInstance(): ScenarioService {
    if (!ScenarioService.instance) {
      ScenarioService.instance = new ScenarioService();
    }
    return ScenarioService.instance;
  }

  public setSnapshotRepository(snapshotRepo: ISnapshotRepository): void {
    this.snapshotRepo = snapshotRepo;
  }

  public async pruneCompletedRun(runId: string, snapshotRepo?: ISnapshotRepository, targetTicks = 365) {
    const repo = snapshotRepo || this.snapshotRepo;
    if (!repo) return null;
    return SnapshotPruningManager.pruneRunSnapshots(runId, repo, targetTicks);
  }

  /**
   * Creates a new Scenario along with its initial ScenarioVersion (v1).
   * Validates parameters against ParameterRegistry before creation.
   */
  public createScenario(
    name: string,
    description?: string,
    parameters?: Partial<ScenarioParameters>,
    parentScenarioId?: string
  ): { scenario: Scenario; version: ScenarioVersion } {
    const scenarioId = systemContext.nextScenarioId();
    const versionId = `ver-${scenarioId}-v1`;
    const nowIso = systemContext.now();

    const mergedParams: ScenarioParameters = {
      ...DEFAULT_BASE_2026_PARAMETERS,
      ...parameters,
    };

    const validation = parameterRegistry.validateAllParameters(mergedParams);
    if (!validation.valid) {
      throw new ScenarioError('VALIDATION_ERROR', `Parameter-Validierung fehlgeschlagen: ${validation.errors.join('; ')}`);
    }

    const version: ScenarioVersion = {
      id: versionId,
      scenarioId,
      versionNumber: 1,
      parameters: Object.freeze(JSON.parse(JSON.stringify(validation.normalizedParams))),
      createdAt: nowIso,
      description: description || 'Initialversion v1',
    };

    const scenario: Scenario = {
      id: scenarioId,
      name,
      description,
      status: 'ACTIVE',
      createdAt: nowIso,
      updatedAt: nowIso,
      currentVersionId: versionId,
      isProtected: false,
      parentScenarioId,
    };

    this.repo.saveVersion(version);
    this.repo.saveScenario(scenario);

    return { scenario, version };
  }

  /**
   * Creates a new immutable ScenarioVersion (e.g. v2) for an existing scenario.
   * Past versions remain 100% immutable.
   */
  public createScenarioVersion(
    scenarioId: string,
    parameters: Partial<ScenarioParameters>,
    description?: string
  ): ScenarioVersion {
    const scenario = this.repo.getScenario(scenarioId);
    if (!scenario) {
      throw new ScenarioError('NOT_FOUND', `Szenario "${scenarioId}" wurde nicht gefunden.`);
    }

    const existingVersions = this.repo.getVersionsByScenario(scenarioId);
    const nextVersionNum = existingVersions.length + 1;
    const versionId = `ver-${scenarioId}-v${nextVersionNum}`;
    const nowIso = systemContext.now();

    const latestVersion = existingVersions[existingVersions.length - 1];
    const baseParams = latestVersion ? latestVersion.parameters : DEFAULT_BASE_2026_PARAMETERS;
    const mergedParams: ScenarioParameters = {
      ...baseParams,
      ...parameters,
    };

    const validation = parameterRegistry.validateAllParameters(mergedParams);
    if (!validation.valid) {
      throw new ScenarioError('VALIDATION_ERROR', `Parameter-Validierung fehlgeschlagen: ${validation.errors.join('; ')}`);
    }

    const newVersion: ScenarioVersion = {
      id: versionId,
      scenarioId,
      versionNumber: nextVersionNum,
      parameters: Object.freeze(JSON.parse(JSON.stringify(validation.normalizedParams))),
      createdAt: nowIso,
      description: description || `Version v${nextVersionNum}`,
    };

    this.repo.saveVersion(newVersion);

    scenario.currentVersionId = versionId;
    scenario.updatedAt = nowIso;
    this.repo.saveScenario(scenario);

    return newVersion;
  }

  /**
   * Executes a SimulationRun for a given ScenarioVersion using strictly SimulationEngine.executeTick().
   * Runs Preflight Validation before execution and blocks if preflight fails.
   */
  public async runScenarioVersion(
    versionId: string,
    seedOverride?: number,
    targetTicks = 50,
    opts?: RunOptions
  ): Promise<RunExecutionResult> {
    const version = this.repo.getVersion(versionId);
    if (!version) {
      throw new ScenarioError('NOT_FOUND', `Szenarioversion "${versionId}" wurde nicht gefunden.`);
    }

    const seed = seedOverride ?? systemContext.newRunSeed();

    // Run side-effect-free Preflight Validation
    const preflight = PreflightValidator.validateRun(versionId, seed, this.repo, parameterRegistry);
    if (!preflight.valid) {
      const errorMsg = preflight.errors.map((e) => e.message).join('; ');
      // Check if max runs limit was exceeded to preserve ScenarioError code
      const isMaxRuns = preflight.errors.some((e) => e.code === 'MAX_RUNS_EXCEEDED');
      throw new ScenarioError(isMaxRuns ? 'MAX_RUNS_EXCEEDED' : 'VALIDATION_ERROR', `Preflight-Validierung fehlgeschlagen: ${errorMsg}`);
    }

    const nowIso = systemContext.now();
    let baselineVersion: string;
    let resolvedSourceId: string;

    if (opts?.baselineVersion) {
      baselineVersion = opts.baselineVersion;
      if (BaselineSnapshotService.has(baselineVersion)) {
        resolvedSourceId = BaselineSnapshotService.get(baselineVersion).sourceId;
      } else {
        // Attempt reconstruction from matching versioned file source
        let matchingSourceId: string | null = null;
        if (dataSourceRegistry.list().some((s) => s.id === baselineVersion)) {
          matchingSourceId = baselineVersion;
        } else if (dataSourceRegistry.list().some((s) => s.id === `baseline-file:${baselineVersion}`)) {
          matchingSourceId = `baseline-file:${baselineVersion}`;
        }

        if (matchingSourceId) {
          const captured = await BaselineSnapshotService.capture(
            matchingSourceId,
            baselineVersion,
            BASELINE_PERIOD_START,
            nowIso
          );
          resolvedSourceId = captured.sourceId;
        } else {
          throw new DataSourceError(
            'UNKNOWN_SOURCE',
            `Baseline-Version "${baselineVersion}" ist weder im Speicher noch als Dateiquelle verfügbar.`
          );
        }
      }
    } else {
      const sourceId = opts?.dataSourceId ?? dataSourceRegistry.getActive().info.id;
      resolvedSourceId = sourceId;
      const generatedVersion = `baseline-${sourceId}-${nowIso.slice(0, 10)}`;
      if (BaselineSnapshotService.has(generatedVersion)) {
        baselineVersion = generatedVersion;
      } else {
        const captured = await BaselineSnapshotService.capture(
          sourceId,
          generatedVersion,
          BASELINE_PERIOD_START,
          nowIso
        );
        baselineVersion = captured.version;
      }
    }

    const rng = new DeterministicRNG(seed);
    const initialRngState = rng.getState();
    const runId = systemContext.nextRunId(seed, version.versionNumber);
    const correlationId = opts?.correlationId ?? systemContext.nextCorrelationId();

    // 1. Freeze measures & Create immutable RunManifest
    const measures = Object.freeze(
      (opts?.measures ?? []).map((m) =>
        Object.freeze({
          ...m,
          changes: m.changes.map((c) => Object.freeze({ ...c })),
        })
      )
    );

    const manifest: RunManifest = Object.freeze({
      runId,
      scenarioId: version.scenarioId,
      scenarioVersionId: version.id,
      seed,
      initialRngState,
      modelVersion: '1.0.0-v1',
      schemaVersion: '1.0.0',
      baselineVersion,
      dataSourceId: resolvedSourceId,
      createdAt: nowIso,
      simulationStartDate: opts?.simulationStartDate ?? BASELINE_PERIOD_START,
      targetTicks,
      parameters: Object.freeze(JSON.parse(JSON.stringify(version.parameters))),
      correlationId,
      measures,
    });

    // 2. Prepare initial state & domain collections
    const initialMetrics = SimulationEventRules.recalculateMetrics([], [], []);
    const simulatedDate = SimulationClock.formatSimulatedDate(0);
    
    let currentState: SimulationState = {
      isRunning: true,
      tickCount: 0,
      dayIndex: 0,
      simulatedDate,
      seed,
      speed: 1,
      intervalMs: 12000,
      lastTickTimestamp: `${simulatedDate} (Tick #0)`,
      simulatedAt: simulatedDate,
      metrics: initialMetrics,
      totalLeadsGenerated: 0,
      totalDealsWon: 0,
      currentARR: initialMetrics.liveARR,
    };

    let leads: SimulationLead[] = [];
    let opportunities: SimulationOpportunity[] = [];
    let deals: SimulationDeal[] = [];
    let activities: SimulationActivity[] = [];
    const events: SimulationEvent[] = [];

    const timeSeries: TimeSeriesPoint[] = [
      {
        tick: 0,
        dayIndex: 0,
        simulatedDate,
        metrics: {
          arr: initialMetrics.liveARR,
          mrr: initialMetrics.liveMRR,
          customers: initialMetrics.liveCustomers,
          wonDeals: initialMetrics.liveWonDeals,
        },
      },
    ];

    // 3. Execute ticks using strictly SimulationEngine.executeTick() with EffectiveParameterResolver
    const resolver = new EffectiveParameterResolver(manifest.parameters, measures);
    let queueEntries: any[] = [];
    let csQueueEntries: any[] = [];

    for (let i = 0; i < targetTicks; i++) {
      const eff = resolver.at(i);
      const output: TickOutput = SimulationEngine.executeTick({
        state: currentState,
        rng,
        leads,
        opportunities,
        deals,
        activities,
        salesRepCount: eff.salesRepCount,
        csRepCount: eff.csRepCount,
        churnRateMonthly: eff.churnRateMonthly,
        marketingBudgetYearly: eff.marketingBudgetYearly,
        channelMix: eff.channelMix,
        trialToPaidConversion: eff.trialToPaidConversion,
        salesCycleDays: eff.salesCycleDays,
        discountPercent: eff.discountPercent,
        queueEntries,
        csQueueEntries,
      });

      currentState = output.state;
      leads = output.leads;
      opportunities = output.opportunities;
      deals = output.deals;
      activities = output.activities;
      if (output.queueEntries) queueEntries = output.queueEntries;
      if (output.csQueueEntries) csQueueEntries = output.csQueueEntries;
      
      for (const evt of output.newEvents) {
        if (evt.correlationId === undefined) evt.correlationId = correlationId;
        events.unshift(evt);
      }

      timeSeries.push({
        tick: currentState.tickCount,
        dayIndex: currentState.dayIndex,
        simulatedDate: currentState.simulatedDate,
        metrics: {
          arr: currentState.metrics?.liveARR ?? 0,
          mrr: currentState.metrics?.liveMRR ?? 0,
          customers: currentState.metrics?.liveCustomers ?? 0,
          wonDeals: currentState.metrics?.liveWonDeals ?? 0,
          ebitda: currentState.metrics?.financialMetrics?.ebitda ?? 0,
          netRevenue: currentState.metrics?.financialMetrics?.netRevenue ?? 0,
          netCashFlow: currentState.metrics?.financialMetrics?.netCashFlow ?? 0,
          cumulativeCashFlow: currentState.metrics?.financialMetrics?.cumulativeCashFlow ?? 0,
        },
      });
    }

    currentState.isRunning = false;
    const completedAtIso = systemContext.now();

    // 4. Construct SimulationRun object
    const run: SimulationRun = {
      runId,
      scenarioId: version.scenarioId,
      scenarioVersionId: version.id,
      seed,
      rngState: rng.getState(),
      modelVersion: manifest.modelVersion,
      schemaVersion: manifest.schemaVersion,
      baselineVersion: manifest.baselineVersion,
      status: 'COMPLETED',
      startedAt: nowIso,
      completedAt: completedAtIso,
      manifest,
      finalState: Object.freeze(JSON.parse(JSON.stringify(currentState))),
      finalMetrics: currentState.metrics ? Object.freeze(JSON.parse(JSON.stringify(currentState.metrics))) : undefined,
      timeSeries,
      correlationId,
      measures,
    };

    // Save run to repository if persistence enabled
    const shouldPersist = opts?.persist !== false;
    if (shouldPersist) {
      this.repo.saveRun(run);

      // If snapshot repository is registered, trigger deterministic post-run pruning
      if (this.snapshotRepo) {
        SnapshotPruningManager.pruneRunSnapshots(runId, this.snapshotRepo, targetTicks).catch(() => {});
      }
    }

    return {
      run,
      state: currentState,
      leads,
      opportunities,
      deals,
      activities,
      events,
    };
  }

  /**
   * Re-Run protocol ("Erneut ausführen")
   */
  public async reRun(versionId: string, targetTicks = 50, opts?: RunOptions): Promise<RunExecutionResult> {
    const newSeed = systemContext.newRunSeed();
    return this.runScenarioVersion(versionId, newSeed, targetTicks, opts);
  }

  /**
   * Reproduce protocol ("Reproduzieren")
   */
  public async reproduce(existingRunId: string, targetTicks = 50): Promise<RunExecutionResult> {
    const existingRun = this.repo.getRun(existingRunId);
    if (!existingRun) {
      throw new ScenarioError('NOT_FOUND', `Ergebnislauf "${existingRunId}" wurde nicht gefunden.`);
    }

    const { seed, scenarioVersionId } = existingRun.manifest;
    return this.runScenarioVersion(scenarioVersionId, seed, targetTicks, {
      simulationStartDate: existingRun.manifest.simulationStartDate,
      baselineVersion: existingRun.manifest.baselineVersion,
      correlationId: existingRun.manifest.correlationId,
      dataSourceId: existingRun.manifest.dataSourceId,
      measures: existingRun.manifest.measures ? [...existingRun.manifest.measures] : undefined,
    });
  }

  /**
   * Side-effect-free measure impact preview ("Wirkungsvorschau", Decisions 1474–1573).
   * Runs two parallel simulations with the same seed (Base vs. With-Measures) without persisting runs.
   */
  public async previewMeasures(
    baseVersionId: string,
    measures: Measure[],
    targetTicks = 50,
    opts?: RunOptions
  ): Promise<{
    base: RunExecutionResult;
    withMeasures: RunExecutionResult;
    kpiDeltas: MeasureKpiDelta[];
    conflicts: MeasureConflict[];
  }> {
    const version = this.repo.getVersion(baseVersionId);
    if (!version) {
      throw new ScenarioError('NOT_FOUND', `Szenarioversion "${baseVersionId}" wurde nicht gefunden.`);
    }

    const seed = opts?.seed ?? systemContext.newRunSeed();
    const base = await this.runScenarioVersion(baseVersionId, seed, targetTicks, { ...opts, measures: [], persist: false });
    const withMeasures = await this.runScenarioVersion(baseVersionId, seed, targetTicks, { ...opts, measures, persist: false });

    const kpiDeltas = this.diffFinalMetrics(base.run.finalMetrics, withMeasures.run.finalMetrics);
    const conflicts = new EffectiveParameterResolver(version.parameters, measures).detectConflicts();

    return { base, withMeasures, kpiDeltas, conflicts };
  }

  private diffFinalMetrics(
    baseMetrics?: Readonly<SimulationMetrics>,
    withMetrics?: Readonly<SimulationMetrics>
  ): MeasureKpiDelta[] {
    const baseArr = baseMetrics?.liveARR ?? 0;
    const withArr = withMetrics?.liveARR ?? 0;
    const baseMrr = baseMetrics?.liveMRR ?? 0;
    const withMrr = withMetrics?.liveMRR ?? 0;
    const baseCust = baseMetrics?.liveCustomers ?? 0;
    const withCust = withMetrics?.liveCustomers ?? 0;
    const baseCash = baseMetrics?.financialMetrics?.cumulativeCashFlow ?? 0;
    const withCash = withMetrics?.financialMetrics?.cumulativeCashFlow ?? 0;
    const baseEbitda = baseMetrics?.financialMetrics?.ebitda ?? 0;
    const withEbitda = withMetrics?.financialMetrics?.ebitda ?? 0;

    const createDelta = (
      kpiId: 'liveARR' | 'liveMRR' | 'liveCustomers' | 'liveCash' | 'liveEBITDA',
      label: string,
      unit: string,
      baseVal: number,
      withVal: number
    ): MeasureKpiDelta => {
      const delta = withVal - baseVal;
      const deltaPercent = baseVal !== 0 ? parseFloat(((delta / Math.abs(baseVal)) * 100).toFixed(1)) : 0;
      return { kpiId, label, unit, baseValue: baseVal, withMeasuresValue: withVal, delta, deltaPercent };
    };

    return [
      createDelta('liveARR', 'ARR (jährlich)', '€', baseArr, withArr),
      createDelta('liveMRR', 'MRR (monatlich)', '€', baseMrr, withMrr),
      createDelta('liveCustomers', 'Aktive Kunden', 'Kunden', baseCust, withCust),
      createDelta('liveCash', 'Kumulierter Cash Flow', '€', baseCash, withCash),
      createDelta('liveEBITDA', 'EBITDA (operatives Ergebnis)', '€', baseEbitda, withEbitda),
    ];
  }

  /**
   * Deletes a scenario if it is not protected.
   */
  public deleteScenario(scenarioId: string): void {
    this.repo.deleteScenario(scenarioId);
  }

  /**
   * Aggregates completed runs for a specific scenario version using MonteCarloAggregator.
   * Returns a deterministic baseline initial state if 0 completed runs exist.
   */
  public getScenarioAggregation(scenarioVersionId: string): ScenarioAggregationResult {
    const runs = this.repo.getRunsByVersion(scenarioVersionId);
    const completedRuns = runs.filter((r) => r.status === 'COMPLETED' && r.finalMetrics);

    if (completedRuns.length === 0) {
      const version = this.repo.getVersion(scenarioVersionId);
      const scenarioId = version ? version.scenarioId : DEFAULT_BASE_2026_SCENARIO_ID;
      const aggregatedAt = version ? version.createdAt : '2026-01-01T00:00:00.000Z';

      const createBaselineStats = (val: number) => ({
        median: val,
        p10: val,
        p90: val,
        mean: val,
        stdDev: 0,
        min: val,
        max: val,
      });

      return {
        scenarioId,
        scenarioVersionId,
        runCount: runs.length,
        validRunCount: 0,
        aggregatedAt,
        metrics: {
          arr: createBaselineStats(411840),
          mrr: createBaselineStats(34320),
          customers: createBaselineStats(66),
          wonDeals: createBaselineStats(0),
        },
      };
    }

    return MonteCarloAggregator.aggregateRuns(completedRuns);
  }

  /**
   * Queries all scenarios from repository.
   */
  public getScenarios(): Scenario[] {
    return this.repo.getAllScenarios();
  }

  /**
   * Queries a specific scenario by ID.
   */
  public getScenario(scenarioId: string): Scenario | undefined {
    return this.repo.getScenario(scenarioId) || undefined;
  }

  /**
   * Queries all versions for a scenario.
   */
  public getVersionsForScenario(scenarioId: string): ScenarioVersion[] {
    return this.repo.getVersionsByScenario(scenarioId);
  }

  /**
   * Queries a specific ScenarioVersion by ID.
   */
  public getVersion(versionId: string): ScenarioVersion | undefined {
    return this.repo.getVersion(versionId) || undefined;
  }

  /**
   * Queries all runs for a scenario version.
   */
  public getRunsForVersion(versionId: string): SimulationRun[] {
    return this.repo.getRunsByVersion(versionId);
  }

  /**
   * Queries all simulation runs.
   */
  public getAllRuns(): SimulationRun[] {
    return this.repo.getAllRuns();
  }

  /**
   * Queries a single simulation run by ID.
   */
  public getRun(runId: string): SimulationRun | undefined {
    return this.repo.getRun(runId) || undefined;
  }

  /**
   * Compares two ScenarioVersions side-by-side (Entscheidungen 1637-1648).
   * Computes Parameter-Diff, KPI-Diff, Directionality & GoalTarget Evaluations deterministically.
   */
  public compareVersions(
    versionIdA: string,
    versionIdB: string,
    targets?: Record<string, GoalTarget>
  ): VersionComparisonResult {
    const versionA = this.repo.getVersion(versionIdA);
    const versionB = this.repo.getVersion(versionIdB);

    if (!versionA || !versionB) {
      throw new ScenarioError(
        'NOT_FOUND',
        `Eine oder beide ScenarioVersions (${versionIdA}, ${versionIdB}) wurden nicht gefunden.`
      );
    }

    // 1. Parameter Diff using V1_PARAMETER_DEFINITIONS
    const parameterDiffs: ParameterDiffItem[] = [];
    const paramKeys = Object.keys(V1_PARAMETER_DEFINITIONS) as (keyof ScenarioParameters)[];

    for (const key of paramKeys) {
      const def = V1_PARAMETER_DEFINITIONS[key];
      const valA = versionA.parameters[key];
      const valB = versionB.parameters[key];

      let hasChanged = false;
      let delta: number | undefined = undefined;
      let deltaPercent: number | undefined = undefined;
      let formattedValueA = '';
      let formattedValueB = '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        hasChanged = valA !== valB;
        delta = parseFloat((valB - valA).toFixed(2));
        deltaPercent = valA !== 0 ? parseFloat(((delta / Math.abs(valA)) * 100).toFixed(1)) : 0;
        formattedValueA = `${valA.toLocaleString('de-DE')} ${def.unit}`;
        formattedValueB = `${valB.toLocaleString('de-DE')} ${def.unit}`;
      } else if (typeof valA === 'object' && typeof valB === 'object') {
        const strA = JSON.stringify(valA);
        const strB = JSON.stringify(valB);
        hasChanged = strA !== strB;
        formattedValueA = Object.entries(valA || {})
          .map(([k, v]) => `${k}: ${v}%`)
          .join(', ');
        formattedValueB = Object.entries(valB || {})
          .map(([k, v]) => `${k}: ${v}%`)
          .join(', ');
      } else {
        hasChanged = valA !== valB;
        formattedValueA = String(valA ?? '');
        formattedValueB = String(valB ?? '');
      }

      parameterDiffs.push({
        key,
        label: def.label,
        unit: def.unit,
        valueA: valA,
        valueB: valB,
        hasChanged,
        delta,
        deltaPercent,
        formattedValueA,
        formattedValueB,
      });
    }

    // 2. KPI Diff using GoalTargetEvaluator & KPIRegistry
    const aggA = this.getScenarioAggregation(versionIdA);
    const aggB = this.getScenarioAggregation(versionIdB);
    const hasRunsA = aggA.validRunCount > 0;
    const hasRunsB = aggB.validRunCount > 0;

    const kpisToCompare = [
      { id: 'liveARR', baseline: 411840, valA: aggA.metrics.arr.median, valB: aggB.metrics.arr.median },
      { id: 'liveMRR', baseline: 34320, valA: aggA.metrics.mrr.median, valB: aggB.metrics.mrr.median },
      { id: 'liveCustomers', baseline: 66, valA: aggA.metrics.customers.median, valB: aggB.metrics.customers.median },
      { id: 'liveWonDeals', baseline: 0, valA: aggA.metrics.wonDeals.median, valB: aggB.metrics.wonDeals.median },
    ];

    const kpiComparisons: KPIComparisonItem[] = kpisToCompare.map((item) => {
      const kpiDef = KPIRegistry.getKPI(item.id);
      const defaultTargetValue =
        item.id === 'liveARR'
          ? 500000
          : item.id === 'liveMRR'
          ? 41666
          : item.id === 'liveCustomers'
          ? 80
          : 15;
      const target = targets?.[item.id] || { kpiId: item.id, targetValue: defaultTargetValue };

      const comparisonAB =
        hasRunsA && hasRunsB
          ? GoalTargetEvaluator.computeBaselineComparison(item.id, item.valB, item.valA)
          : undefined;
      const comparisonBaselineA = hasRunsA
        ? GoalTargetEvaluator.computeBaselineComparison(item.id, item.valA, item.baseline)
        : undefined;
      const comparisonBaselineB = hasRunsB
        ? GoalTargetEvaluator.computeBaselineComparison(item.id, item.valB, item.baseline)
        : undefined;

      const goalEvaluationA = hasRunsA
        ? GoalTargetEvaluator.evaluateGoalTarget(item.id, item.valA, target)
        : undefined;
      const goalEvaluationB = hasRunsB
        ? GoalTargetEvaluator.evaluateGoalTarget(item.id, item.valB, target)
        : undefined;

      return {
        kpiId: item.id,
        label: kpiDef.label,
        unit: kpiDef.unit,
        direction: kpiDef.direction,
        baselineValue: item.baseline,
        valueA: item.valA,
        valueB: item.valB,
        hasResultA: hasRunsA,
        hasResultB: hasRunsB,
        comparisonAB,
        comparisonBaselineA,
        comparisonBaselineB,
        goalEvaluationA,
        goalEvaluationB,
      };
    });

    // 3. Structured Summary Explanation
    const changedParams = parameterDiffs.filter((p) => p.hasChanged);
    const arrComp = kpiComparisons.find((k) => k.kpiId === 'liveARR')?.comparisonAB;

    let summaryExplanation = '';
    if (!hasRunsA && !hasRunsB) {
      summaryExplanation = `Vergleich v${versionA.versionNumber} ➔ v${versionB.versionNumber}: ${
        changedParams.length === 0 ? 'Keine Parameterunterschiede' : `${changedParams.length} Parameter geändert (${changedParams.map((p) => p.label).join(', ')})`
      }. Beide Versionen wurden noch nicht simuliert (0 Runs).`;
    } else if (hasRunsA && !hasRunsB) {
      summaryExplanation = `Vergleich v${versionA.versionNumber} ➔ v${versionB.versionNumber}: ${
        changedParams.length === 0 ? 'Keine Parameterunterschiede' : `${changedParams.length} Parameter geändert (${changedParams.map((p) => p.label).join(', ')})`
      }. Version ${versionB.versionNumber} wurde noch nicht simuliert (Simulation ausstehend).`;
    } else if (!hasRunsA && hasRunsB) {
      summaryExplanation = `Vergleich v${versionA.versionNumber} ➔ v${versionB.versionNumber}: ${
        changedParams.length === 0 ? 'Keine Parameterunterschiede' : `${changedParams.length} Parameter geändert (${changedParams.map((p) => p.label).join(', ')})`
      }. Version ${versionA.versionNumber} besitzt noch keine Simulationsläufe.`;
    } else {
      summaryExplanation =
        changedParams.length === 0
          ? `Keine Parameterunterschiede zwischen Version ${versionA.versionNumber} und Version ${versionB.versionNumber}.`
          : `Vergleich v${versionA.versionNumber} ➔ v${versionB.versionNumber}: ${
              changedParams.length
            } Parameter geändert (${changedParams.map((p) => p.label).join(', ')}). ARR-Differenz: ${
              arrComp?.absoluteDelta && arrComp.absoluteDelta > 0 ? '+' : ''
            }${arrComp?.absoluteDelta.toLocaleString('de-DE')} € (${arrComp?.percentChange}%).`;
    }

    return {
      versionA,
      versionB,
      hasRunsA,
      hasRunsB,
      validRunCountA: aggA.validRunCount,
      validRunCountB: aggB.validRunCount,
      parameterDiffs,
      kpiComparisons,
      summaryExplanation,
    };
  }

  /**
   * AUFTRAG 019: Deep Multi-Scenario Comparison across 3-4 ScenarioVersions (Decisions 849–873).
   * Computes Parameter Matrix, KPI Matrix, 5-Dimension Trade-Offs without artificial composite scores,
   * and identifies primary root-cause drivers.
   */
  public compareMultipleVersions(
    versionIds: string[],
    targets?: Record<string, GoalTarget>,
    referenceVersionId?: string
  ): MultiVersionComparisonResult {
    if (!versionIds || versionIds.length < 2 || versionIds.length > 4) {
      throw new ScenarioError(
        'INVALID_VERSION',
        `Multi-Szenario-Vergleich erfordert zwischen 2 und 4 Versionen (erhalten: ${versionIds?.length ?? 0}).`
      );
    }

    // 1. Fetch and validate all versions
    const versions: ScenarioVersion[] = [];
    for (const vid of versionIds) {
      const v = this.repo.getVersion(vid);
      if (!v) {
        throw new ScenarioError('NOT_FOUND', `ScenarioVersion "${vid}" wurde nicht gefunden.`);
      }
      versions.push(v);
    }

    const refId = referenceVersionId && versionIds.includes(referenceVersionId) ? referenceVersionId : versionIds[0];
    const refVersion = versions.find((v) => v.id === refId)!;

    // 2. Build Parameter Matrix
    const paramKeys = Object.keys(V1_PARAMETER_DEFINITIONS) as (keyof ScenarioParameters)[];
    const parameterMatrix: ParameterMatrixRow[] = [];

    for (const key of paramKeys) {
      const def = V1_PARAMETER_DEFINITIONS[key];
      const valuesByVersionId: Record<string, any> = {};
      const formattedValuesByVersionId: Record<string, string> = {};
      const hasChangedAgainstRef: Record<string, boolean> = {};

      const refVal = refVersion.parameters[key];

      for (const v of versions) {
        const val = v.parameters[key];
        valuesByVersionId[v.id] = val;

        if (typeof val === 'number') {
          formattedValuesByVersionId[v.id] = `${val.toLocaleString('de-DE')} ${def.unit}`;
          hasChangedAgainstRef[v.id] = val !== refVal;
        } else if (typeof val === 'object') {
          formattedValuesByVersionId[v.id] = Object.entries(val || {})
            .map(([k, count]) => `${k}: ${count}%`)
            .join(', ');
          hasChangedAgainstRef[v.id] = JSON.stringify(val) !== JSON.stringify(refVal);
        } else {
          formattedValuesByVersionId[v.id] = String(val ?? '');
          hasChangedAgainstRef[v.id] = val !== refVal;
        }
      }

      parameterMatrix.push({
        key,
        label: def.label,
        unit: def.unit,
        valuesByVersionId,
        formattedValuesByVersionId,
        hasChangedAgainstRef,
      });
    }

    // 3. Build KPI Matrix with Aggregations
    const aggregations: Record<string, ScenarioAggregationResult> = {};
    for (const v of versions) {
      aggregations[v.id] = this.getScenarioAggregation(v.id);
    }

    const kpiDefinitions = [
      { id: 'liveARR', baseline: 411840, extract: (a: ScenarioAggregationResult) => a.metrics.arr },
      { id: 'liveMRR', baseline: 34320, extract: (a: ScenarioAggregationResult) => a.metrics.mrr },
      { id: 'liveCustomers', baseline: 66, extract: (a: ScenarioAggregationResult) => a.metrics.customers },
      { id: 'liveWonDeals', baseline: 0, extract: (a: ScenarioAggregationResult) => a.metrics.wonDeals },
      {
        id: 'ebitda',
        baseline: 0,
        extract: (a: ScenarioAggregationResult) =>
          a.metrics.financialMetrics?.ebitda ?? { median: 0, p10: 0, p90: 0, mean: 0, stdDev: 0, min: 0, max: 0 },
      },
      {
        id: 'netRevenue',
        baseline: 411840,
        extract: (a: ScenarioAggregationResult) =>
          a.metrics.financialMetrics?.netRevenue ?? { median: 411840, p10: 411840, p90: 411840, mean: 411840, stdDev: 0, min: 411840, max: 411840 },
      },
      {
        id: 'netCashFlow',
        baseline: 0,
        extract: (a: ScenarioAggregationResult) =>
          a.metrics.financialMetrics?.netCashFlow ?? { median: 0, p10: 0, p90: 0, mean: 0, stdDev: 0, min: 0, max: 0 },
      },
      {
        id: 'cac',
        baseline: 600,
        extract: (a: ScenarioAggregationResult) =>
          a.metrics.financialMetrics?.cac ?? { median: 600, p10: 600, p90: 600, mean: 600, stdDev: 0, min: 600, max: 600 },
      },
    ];

    const kpiMatrix: KpiMatrixRow[] = [];

    for (const kDef of kpiDefinitions) {
      const kpiInfo = KPIRegistry.getKPI(kDef.id);
      const valuesByVersionId: Record<string, KpiMatrixValue | undefined> = {};
      const deltasAgainstRef: Record<string, number | undefined> = {};
      const percentAgainstRef: Record<string, number | undefined> = {};
      const isFavorableAgainstRef: Record<string, boolean | undefined> = {};

      const refAgg = aggregations[refId];
      const refKpiStats = refAgg.validRunCount > 0 ? kDef.extract(refAgg) : undefined;
      const refMedian = refKpiStats?.median;

      for (const v of versions) {
        const agg = aggregations[v.id];
        if (agg.validRunCount > 0) {
          const stats = kDef.extract(agg);
          valuesByVersionId[v.id] = {
            median: stats.median,
            p10: stats.p10,
            p90: stats.p90,
            mean: stats.mean,
          };

          if (refMedian !== undefined) {
            const comp = GoalTargetEvaluator.computeBaselineComparison(kDef.id, stats.median, refMedian);
            deltasAgainstRef[v.id] = comp.absoluteDelta;
            percentAgainstRef[v.id] = comp.percentChange;
            isFavorableAgainstRef[v.id] = comp.isPositiveChange;
          }
        } else {
          valuesByVersionId[v.id] = undefined;
          deltasAgainstRef[v.id] = undefined;
          percentAgainstRef[v.id] = undefined;
          isFavorableAgainstRef[v.id] = undefined;
        }
      }

      kpiMatrix.push({
        kpiId: kDef.id,
        label: kpiInfo.label,
        unit: kpiInfo.unit,
        direction: kpiInfo.direction,
        baselineValue: kDef.baseline,
        valuesByVersionId,
        deltasAgainstRef,
        percentAgainstRef,
        isFavorableAgainstRef,
      });
    }

    // 4. Trade-Off Evaluations in 5 Dimensions (Decisions 864–868)
    const tradeOffDimensions: { dim: TradeOffDimension; label: string; desc: string; kpiId: string }[] = [
      {
        dim: 'GROWTH',
        label: 'Wachstum (Growth)',
        desc: 'Umsatzskalierung gemessen an ARR und MRR-Zuwachs.',
        kpiId: 'liveARR',
      },
      {
        dim: 'PROFITABILITY',
        label: 'Profitabilität (Profitability)',
        desc: 'Ertragskraft nach Abzug aller Vertriebs-, Personal- und Betriebskosten (EBITDA).',
        kpiId: 'ebitda',
      },
      {
        dim: 'LIQUIDITY',
        label: 'Liquidität (Liquidity)',
        desc: 'Operativer Netto-Cashflow und Kapitalerhalt im Simulationsverlauf.',
        kpiId: 'netCashFlow',
      },
      {
        dim: 'ACQUISITION',
        label: 'Neukundengewinnung (Acquisition)',
        desc: 'Effizienz der Lead-Generierung und Kundenakquisitionskosten (CAC).',
        kpiId: 'cac',
      },
      {
        dim: 'RETENTION',
        label: 'Kundenbindung & Churn (Retention)',
        desc: 'Bestandskundensicherung und Minimierung von Kündigungsverlusten.',
        kpiId: 'liveCustomers',
      },
    ];

    const tradeOffs: TradeOffEvaluation[] = tradeOffDimensions.map((dimObj) => {
      const kRow = kpiMatrix.find((r) => r.kpiId === dimObj.kpiId)!;
      const kInfo = KPIRegistry.getKPI(dimObj.kpiId);

      // Determine best version for this dimension
      let bestVerId = versions[0].id;
      let bestVal = valuesByVersionIdBest(kRow, versions[0].id, kInfo.direction);

      for (const v of versions) {
        const val = valuesByVersionIdBest(kRow, v.id, kInfo.direction);
        if (kInfo.direction === 'HIGHER_IS_BETTER') {
          if (val > bestVal) {
            bestVal = val;
            bestVerId = v.id;
          }
        } else {
          if (val < bestVal) {
            bestVal = val;
            bestVerId = v.id;
          }
        }
      }

      const evaluations: Record<string, any> = {};
      for (const v of versions) {
        const valObj = kRow.valuesByVersionId[v.id];
        const isLeader = v.id === bestVerId;
        const pros: string[] = [];
        const cons: string[] = [];

        if (isLeader) {
          pros.push(`Führend in ${dimObj.label} mit ${valObj?.median.toLocaleString('de-DE') ?? '–'} ${kRow.unit}.`);
        } else {
          cons.push(`Liegt hinter Spitzenreiter zurück (${valObj?.median.toLocaleString('de-DE') ?? '–'} ${kRow.unit}).`);
        }

        evaluations[v.id] = {
          versionId: v.id,
          versionName: `v${v.versionNumber}`,
          isLeader,
          metricHighlight: valObj ? `${valObj.median.toLocaleString('de-DE')} ${kRow.unit}` : 'Keine Runs',
          pros,
          cons,
        };
      }

      return {
        dimension: dimObj.dim,
        label: dimObj.label,
        description: dimObj.desc,
        primaryKpiId: dimObj.kpiId,
        bestVersionId: bestVerId,
        evaluations,
        tradeOffSummary: `Spitzenreiter in ${dimObj.label}: v${versions.find((v) => v.id === bestVerId)?.versionNumber ?? ''} (${evaluations[bestVerId]?.metricHighlight}).`,
      };
    });

    function valuesByVersionIdBest(row: KpiMatrixRow, vId: string, dir: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER'): number {
      const obj = row.valuesByVersionId[vId];
      if (!obj) return dir === 'HIGHER_IS_BETTER' ? -Infinity : Infinity;
      return obj.median;
    }

    // 5. Root-Cause Key Differences Identification (Decisions 869–871)
    const keyDifferences: KeyDifferenceItem[] = [];

    for (const pRow of parameterMatrix) {
      const changedVersions = versions.filter((v) => pRow.hasChangedAgainstRef[v.id]);
      if (changedVersions.length > 0) {
        let affectedKpi = 'liveARR';
        let affectedLabel = 'ARR';
        let dim: TradeOffDimension = 'GROWTH';
        let explanation = '';

        if (pRow.key === 'salesRepCount') {
          affectedKpi = 'liveARR';
          affectedLabel = 'ARR & Personalaufwand';
          dim = 'GROWTH';
          explanation = 'Veränderung der Sales-FTE-Kapazität skaliert den Deal-Durchsatz, erhöht jedoch die fixen Headcount-Kosten (8.000 €/Monat je FTE).';
        } else if (pRow.key === 'marketingBudgetYearly') {
          affectedKpi = 'cac';
          affectedLabel = 'CAC & Lead-Inflow';
          dim = 'ACQUISITION';
          explanation = 'Veränderung des Marketingbudgets verschiebt die Lead-Akquisitionsrate entlang der Sättigungskurve und beeinflusst die Marketing-OPEX.';
        } else if (pRow.key === 'trialToPaidConversion') {
          affectedKpi = 'liveWonDeals';
          affectedLabel = 'Abschlüsse & Konvertierung';
          dim = 'GROWTH';
          explanation = 'Höhere Conversion-Rate steigert die Win-Wahrscheinlichkeit von Hot Deals direkt ohne zusätzliche Fixkosten.';
        } else if (pRow.key === 'churnRateMonthly' || pRow.key === 'csRepCount') {
          affectedKpi = 'liveCustomers';
          affectedLabel = 'Kundenbestand & Churn Loss';
          dim = 'RETENTION';
          explanation = 'Beeinflusst die Kündigungsdynamik und den Erhalt des bestehenden Kundenstamms.';
        } else if (pRow.key === 'discountPercent') {
          affectedKpi = 'ebitda';
          affectedLabel = 'Deckungsbeitrag & ARR';
          dim = 'PROFITABILITY';
          explanation = 'Rabattierung mindert den durchschnittlichen Vertragswert und schmälert die operative Marge.';
        } else {
          affectedKpi = 'liveARR';
          affectedLabel = 'ARR';
          dim = 'GROWTH';
          explanation = `Parameter-Divergenz in ${pRow.label}.`;
        }

        keyDifferences.push({
          id: `diff-${pRow.key}`,
          parameterKey: pRow.key,
          parameterLabel: pRow.label,
          affectedKpiId: affectedKpi,
          affectedKpiLabel: affectedLabel,
          dimension: dim,
          explanation,
          divergenceLevel: changedVersions.length >= 2 ? 'HIGH' : 'MEDIUM',
          causeClarity: 'CLEAR',
        });
      }
    }

    // 6. Validation of Equal Run Count & Duration (Decisions 854, 855)
    const comparisonWarnings: string[] = [];
    const completedVersions = versions.filter((v) => aggregations[v.id].validRunCount > 0);

    if (completedVersions.length > 1) {
      const firstCount = aggregations[completedVersions[0].id]?.validRunCount ?? 0;
      const hasDifferentCounts = completedVersions.some((v) => (aggregations[v.id]?.validRunCount ?? 0) !== firstCount);
      if (hasDifferentCounts) {
        comparisonWarnings.push(
          `Unterschiedliche Run-Anzahl festgestellt (${completedVersions.map((v) => `v${v.versionNumber}: ${aggregations[v.id]?.validRunCount ?? 0} Runs`).join(', ')}). Für maximale statistische Vergleichbarkeit wird die gleiche Run-Anzahl empfohlen (Entscheidung 855).`
        );
      }

      const firstDuration = aggregations[completedVersions[0].id]?.metrics?.timeSeries?.length ?? 0;
      const hasDifferentDurations = completedVersions.some((v) => (aggregations[v.id]?.metrics?.timeSeries?.length ?? 0) !== firstDuration);
      if (hasDifferentDurations) {
        comparisonWarnings.push(
          `Unterschiedliche Simulationsdauer festgestellt. Gleicher Zeithorizont wird für fairen Vergleich empfohlen (Entscheidung 854).`
        );
      }
    }

    const summaryText = `Multi-Szenario-Vergleich (${versions.length} Versionen): ${
      keyDifferences.length === 0
        ? 'Alle verglichenen Versionen weisen identische Parameterkonfigurationen auf.'
        : `${keyDifferences.length} primäre Treiber-Unterschiede identifiziert. Trade-offs zwischen ${tradeOffs.map((t) => t.label).join(', ')} sind transparent ausgewiesen.`
    }`;

    return {
      referenceVersionId: refId,
      versions,
      parameterMatrix,
      kpiMatrix,
      tradeOffs,
      keyDifferences,
      comparisonWarnings,
      summaryText,
    };
  }

  /**
   * AUFTRAG 019: Adopts the parameter configuration of a compared scenario into a target scenario (Decision 872).
   */
  public adoptConfiguration(
    sourceVersionId: string,
    targetScenarioId: string,
    description?: string
  ): ScenarioVersion {
    const sourceVer = this.repo.getVersion(sourceVersionId);
    if (!sourceVer) {
      throw new ScenarioError('NOT_FOUND', `Quellversion "${sourceVersionId}" wurde nicht gefunden.`);
    }

    const targetScenario = this.repo.getScenario(targetScenarioId);
    if (!targetScenario) {
      throw new ScenarioError('NOT_FOUND', `Zielszenario "${targetScenarioId}" wurde nicht gefunden.`);
    }

    const adoptDesc = description || `Konfiguration übernommen aus Version ${sourceVer.versionNumber} (${sourceVer.id})`;
    return this.createScenarioVersion(targetScenarioId, sourceVer.parameters, adoptDesc);
  }
}

export const scenarioService: ScenarioService = ScenarioService.getInstance();
