import { systemContext } from './systemContext';
import { BASELINE_PERIOD_START } from './constants';
import { BaselineSnapshotService } from '../services/data/baselineSnapshotService';
import {
  loadScenarioWorkspace as loadWorkspaceFromServer,
  type ScenarioWorkspace,
} from '../services/runs/runPersistenceService';
import { EffectiveParameterResolver } from './effectiveParameterResolver';
import { MonteCarloAggregator } from './monteCarloAggregator';
import { DEFAULT_BASE_2026_SCENARIO_ID, ScenarioRepository } from './scenarioRepository';
import { Measure, MeasureConflict, MeasureKpiDelta } from '../types/measure';
import { SimulationMetrics } from '../types/simulation';
import type { SimulationSnapshot } from '../types/snapshot';
import { ScenarioAggregationResult } from '../types/aggregation';
import { RunExecutionResult } from './scenarioTickRunner';
import { RunOptions, ScenarioError } from '../types/scenario';
import { ScenarioRunContext, runScenarioVersionWith } from './scenarioRunExecutor';

// 067K / G57 — aus scenarioService.ts herausgelöste Workspace-Protokolle
// (reine Code-Bewegung, keine Verhaltensänderung): Re-Run, Reproduktion,
// Workspace-Hydrierung, Maßnahmen-Vorschau und Aggregation. Der
// Ausführungskontext kommt aus scenarioRunExecutor.

/**
 * Re-Run protocol ("Erneut ausführen")
 */
export async function reRunWith(
  ctx: ScenarioRunContext,
  versionId: string,
  targetTicks = 50,
  opts?: RunOptions,
): Promise<RunExecutionResult> {
  const newSeed = systemContext.newRunSeed();
  return runScenarioVersionWith(ctx, versionId, newSeed, targetTicks, opts);
}

/**
 * Reproduce protocol ("Reproduzieren"). Prüft vor dem Lauf Baseline-,
 * Organisations-, Schema- und Modellhash aus dem Manifest — jede
 * Abweichung bricht fail-closed ab statt still anders zu rechnen.
 */
export async function reproduceWith(
  ctx: ScenarioRunContext,
  existingRunId: string,
  targetTicks = 50,
  persistToServer = false,
  onProgress?: (processedUnits: number, totalUnits: number) => void,
): Promise<RunExecutionResult> {
  const existingRun = ctx.repo.getRun(existingRunId);
  if (!existingRun) {
    throw new ScenarioError('NOT_FOUND', `Ergebnislauf "${existingRunId}" wurde nicht gefunden.`);
  }

  const { seed, scenarioVersionId } = existingRun.manifest;
  if (existingRun.manifest.modelVersion !== '1.0.0-v1') {
    throw new ScenarioError(
      'VALIDATION_ERROR',
      `Modellversion "${existingRun.manifest.modelVersion}" wird für Reproduktion nicht unterstützt.`,
    );
  }
  if (existingRun.manifest.schemaVersion !== '1.0.0') {
    throw new ScenarioError(
      'VALIDATION_ERROR',
      `Schemaversion "${existingRun.manifest.schemaVersion}" wird für Reproduktion nicht unterstützt.`,
    );
  }
  // 067F / G49 (Nacharbeit): Nach Reload / in zweiter Sitzung ist die
  // generierte Baseline nicht mehr im Speicher. Rekonstruktion aus der im
  // Manifest verzeichneten Quelle unter demselben Versionsnamen — die
  // Identität beweist der erwartete Baseline-Hash im folgenden Lauf
  // (Manipulation bricht mit BASELINE_HASH_MISMATCH ab).
  if (
    !BaselineSnapshotService.has(existingRun.manifest.baselineVersion) &&
    existingRun.manifest.dataSourceId
  ) {
    await BaselineSnapshotService.capture(
      existingRun.manifest.dataSourceId,
      existingRun.manifest.baselineVersion,
      BASELINE_PERIOD_START,
      systemContext.now(),
      { organizationId: existingRun.manifest.organizationId },
    );
  }
  return runScenarioVersionWith(ctx, scenarioVersionId, seed, targetTicks, {
    simulationStartDate: existingRun.manifest.simulationStartDate,
    baselineVersion: existingRun.manifest.baselineVersion,
    correlationId: existingRun.manifest.correlationId,
    dataSourceId: existingRun.manifest.dataSourceId,
    organizationId: existingRun.manifest.organizationId,
    expectedBaselineHash: existingRun.manifest.baselineHash,
    persistToServer,
    onProgress,
    measures: existingRun.manifest.measures ? [...existingRun.manifest.measures] : undefined,
  });
}

/**
 * 067F / G49 — lädt Szenarien, Versionen und Runs genau eines Mandanten vom
 * Server und ERSETZT den In-Memory-Workspace atomar (Nacharbeit P1:
 * additiv würde beim Organisationswechsel fremde Daten leaken). Ablauf:
 * erst laden (Fehler → alter Stand bleibt), dann zurücksetzen und füllen.
 * Nur öffentliche Repository-APIs; kein Backend schreibt am Store vorbei.
 */
export async function loadScenarioWorkspaceWith(
  repo: ScenarioRepository,
  organizationId: string,
): Promise<ScenarioWorkspace> {
  const workspace = await loadWorkspaceFromServer(organizationId);
  repo.resetToDefaults();
  for (const scenario of workspace.scenarios) {
    repo.saveScenario(scenario);
  }
  for (const version of workspace.versions) {
    repo.saveVersion(version);
  }
  for (const run of workspace.runs) {
    repo.saveRun(run);
  }
  // 067F / G49 (Nacharbeit P1): Run-Detailhistorie je Run hydrieren.
  for (const [runId, events] of Object.entries(workspace.eventsByRun)) {
    repo.saveEvents(runId, events);
  }
  const snapshotsByRun = new Map<string, SimulationSnapshot[]>();
  for (const snapshot of workspace.snapshots) {
    const list = snapshotsByRun.get(snapshot.runId) ?? [];
    list.push(snapshot);
    snapshotsByRun.set(snapshot.runId, list);
  }
  for (const [runId, snapshots] of snapshotsByRun) {
    repo.saveSnapshots(runId, snapshots);
  }
  return workspace;
}

/**
 * Side-effect-free measure impact preview ("Wirkungsvorschau", Decisions 1474–1573).
 * Runs two parallel simulations with the same seed (Base vs. With-Measures) without persisting runs.
 */
export async function previewMeasuresWith(
  ctx: ScenarioRunContext,
  baseVersionId: string,
  measures: Measure[],
  targetTicks = 50,
  opts?: RunOptions,
): Promise<{
  base: RunExecutionResult;
  withMeasures: RunExecutionResult;
  kpiDeltas: MeasureKpiDelta[];
  conflicts: MeasureConflict[];
}> {
  const version = ctx.repo.getVersion(baseVersionId);
  if (!version) {
    throw new ScenarioError(
      'NOT_FOUND',
      `Szenarioversion "${baseVersionId}" wurde nicht gefunden.`,
    );
  }

  const seed = opts?.seed ?? systemContext.newRunSeed();
  const base = await runScenarioVersionWith(ctx, baseVersionId, seed, targetTicks, {
    ...opts,
    measures: [],
    persist: false,
  });
  const withMeasures = await runScenarioVersionWith(ctx, baseVersionId, seed, targetTicks, {
    ...opts,
    measures,
    persist: false,
  });

  const kpiDeltas = diffFinalMetrics(base.run.finalMetrics, withMeasures.run.finalMetrics);
  const conflicts = new EffectiveParameterResolver(version.parameters, measures).detectConflicts();

  return { base, withMeasures, kpiDeltas, conflicts };
}

export function diffFinalMetrics(
  baseMetrics?: Readonly<SimulationMetrics>,
  withMetrics?: Readonly<SimulationMetrics>,
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
    withVal: number,
  ): MeasureKpiDelta => {
    const delta = withVal - baseVal;
    const deltaPercent =
      baseVal !== 0 ? parseFloat(((delta / Math.abs(baseVal)) * 100).toFixed(1)) : 0;
    return {
      kpiId,
      label,
      unit,
      baseValue: baseVal,
      withMeasuresValue: withVal,
      delta,
      deltaPercent,
    };
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
 * Aggregates completed runs for a specific scenario version using MonteCarloAggregator.
 * Returns a deterministic baseline initial state if 0 completed runs exist.
 */
export function getScenarioAggregationWith(
  repo: ScenarioRepository,
  scenarioVersionId: string,
): ScenarioAggregationResult {
  const runs = repo.getRunsByVersion(scenarioVersionId);
  const completedRuns = runs.filter((r) => r.status === 'COMPLETED' && r.finalMetrics);

  if (completedRuns.length === 0) {
    const version = repo.getVersion(scenarioVersionId);
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
