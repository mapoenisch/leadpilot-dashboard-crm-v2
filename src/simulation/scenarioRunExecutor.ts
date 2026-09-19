import { DeterministicRNG } from './prng';
import { SimulationClock } from './eventRules';
import { PreflightValidator } from './preflightValidator';
import { parameterRegistry } from './parameterRegistry';
import { systemContext } from './systemContext';
import { BASELINE_PERIOD_START } from './constants';
import {
  BaselineSnapshotService,
  UNKNOWN_ORGANIZATION_ID,
} from '../services/data/baselineSnapshotService';
import { mapBaselineToSimulationInput } from '../services/data/baselineMapper';
import { persistCompletedRun } from '../services/runs/runPersistenceService';
import { SnapshotPruningManager } from './snapshotPruningManager';
import { dataSourceRegistry } from '../services/data';
import { DataSourceError } from '../types/dataSource';
import { ISnapshotRepository } from '../services/db/ISnapshotRepository';
import { TimeSeriesPoint } from '../types/aggregation';
import { RunManifest, RunOptions, ScenarioError, SimulationRun } from '../types/scenario';
import type { SimulationSnapshot } from '../types/snapshot';
import {
  SimulationActivity,
  SimulationDeal,
  SimulationEvent,
  SimulationLead,
  SimulationOpportunity,
  SimulationState,
} from '../types/simulation';
import {
  MainThreadTickInput,
  RunExecutionResult,
  TickRunResult,
  executeTicksMainThread,
  shouldUseWorker,
} from './scenarioTickRunner';
import { ScenarioRepository } from './scenarioRepository';

// 067K / G57 — aus scenarioService.ts herausgelöster Run-Pfad (reine
// Code-Bewegung, keine Verhaltensänderung). Instanzzustand (Repository,
// Snapshot-Repo, Worker-Ausführung) fließt über einen expliziten Kontext.
export interface ScenarioRunContext {
  repo: ScenarioRepository;
  getSnapshotRepo: () => ISnapshotRepository | undefined;
  runTicksInWorker: (input: MainThreadTickInput, manifest: RunManifest) => Promise<TickRunResult>;
}

/**
 * Executes a SimulationRun for a given ScenarioVersion using strictly SimulationEngine.executeTick().
 * Runs Preflight Validation before execution and blocks if preflight fails.
 */
export async function runScenarioVersionWith(
  ctx: ScenarioRunContext,
  versionId: string,
  seedOverride?: number,
  targetTicks = 50,
  opts?: RunOptions,
): Promise<RunExecutionResult> {
  const version = ctx.repo.getVersion(versionId);
  if (!version) {
    throw new ScenarioError('NOT_FOUND', `Szenarioversion "${versionId}" wurde nicht gefunden.`);
  }

  const seed = seedOverride ?? systemContext.newRunSeed();

  // Run side-effect-free Preflight Validation
  const preflight = PreflightValidator.validateRun(versionId, seed, ctx.repo, parameterRegistry);
  if (!preflight.valid) {
    const errorMsg = preflight.errors.map((e) => e.message).join('; ');
    // Check if max runs limit was exceeded to preserve ScenarioError code
    const isMaxRuns = preflight.errors.some((e) => e.code === 'MAX_RUNS_EXCEEDED');
    throw new ScenarioError(
      isMaxRuns ? 'MAX_RUNS_EXCEEDED' : 'VALIDATION_ERROR',
      `Preflight-Validierung fehlgeschlagen: ${errorMsg}`,
    );
  }

  const nowIso = systemContext.now();
  // 067E / G48: Der Lauf gehört zu genau einem Mandanten und genau einer
  // Baseline. Beide werden vor dem ersten Tick verifiziert (fail-closed).
  const organizationId = opts?.organizationId ?? UNKNOWN_ORGANIZATION_ID;
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
      } else if (
        dataSourceRegistry.list().some((s) => s.id === `baseline-file:${baselineVersion}`)
      ) {
        matchingSourceId = `baseline-file:${baselineVersion}`;
      }

      if (matchingSourceId) {
        const captured = await BaselineSnapshotService.capture(
          matchingSourceId,
          baselineVersion,
          BASELINE_PERIOD_START,
          nowIso,
          { organizationId },
        );
        resolvedSourceId = captured.sourceId;
      } else {
        throw new DataSourceError(
          'UNKNOWN_SOURCE',
          `Baseline-Version "${baselineVersion}" ist weder im Speicher noch als Dateiquelle verfügbar.`,
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
        nowIso,
        { organizationId },
      );
      baselineVersion = captured.version;
    }
  }

  const dataset = BaselineSnapshotService.get(baselineVersion);
  // Run und Baseline müssen demselben Mandanten angehören. Fail-closed:
  // Erlaubt ist nur unknown-gegen-unknown (Legacy-Kontext, z. B. Golden
  // Run); jeder Mischfall lehnt mit ORG_MISMATCH ab — eine
  // Legacy-/unknown-Baseline bedient niemals einen realen Mandanten.
  if (dataset.organizationId !== organizationId) {
    throw new ScenarioError(
      'ORG_MISMATCH',
      `Lauf-Mandant "${organizationId}" passt nicht zur Baseline "${baselineVersion}" (Mandant "${dataset.organizationId}").`,
    );
  }
  // Manipulierte oder vertauschte Baseline bricht vor dem ersten Tick ab.
  if (opts?.expectedBaselineHash && dataset.baselineHash !== opts.expectedBaselineHash) {
    throw new ScenarioError(
      'BASELINE_HASH_MISMATCH',
      `Baseline-Hash von "${baselineVersion}" weicht vom erwarteten Hash ab.`,
    );
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
      }),
    ),
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
    baselineId: dataset.version,
    baselineHash: dataset.baselineHash,
    organizationId,
    dataSourceId: resolvedSourceId,
    createdAt: nowIso,
    simulationStartDate: opts?.simulationStartDate ?? BASELINE_PERIOD_START,
    targetTicks,
    parameters: Object.freeze(JSON.parse(JSON.stringify(version.parameters))),
    correlationId,
    measures,
  });

  // 2. Prepare initial state & domain collections from the hashed baseline
  // input — die Engine startet ausschließlich aus diesem Eingang.
  const simulatedDate = SimulationClock.formatSimulatedDate(0);
  const baselineInput = mapBaselineToSimulationInput(dataset, { seed, simulatedDate });
  const initialMetrics = baselineInput.initialState.metrics!;

  let currentState: SimulationState = {
    ...baselineInput.initialState,
    metrics: initialMetrics,
  };

  let leads: SimulationLead[] = [...baselineInput.leads];
  let opportunities: SimulationOpportunity[] = [...baselineInput.opportunities];
  let deals: SimulationDeal[] = [...baselineInput.deals];
  let activities: SimulationActivity[] = [...baselineInput.activities];
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

  // 3. Execute ticks: Produktpfad im Web Worker, sonst Main-Thread
  // (Tests/Headless/Node). Beide Pfade rechnen denselben deterministischen
  // Tick-Loop; der Fortschritt stammt aus echten Berechnungseinheiten.
  const tickInput = {
    rng,
    initialState: currentState,
    leads,
    opportunities,
    deals,
    activities,
    historicalMetrics: baselineInput.historicalMetrics,
    baseParameters: manifest.parameters,
    measures: [...measures],
    targetTicks,
    correlationId,
    onProgress: opts?.onProgress,
  };
  let tickResult;
  if (shouldUseWorker()) {
    tickResult = await ctx.runTicksInWorker(tickInput, manifest);
  } else {
    tickResult = executeTicksMainThread(tickInput);
  }
  currentState = tickResult.state;
  leads = tickResult.leads;
  opportunities = tickResult.opportunities;
  deals = tickResult.deals;
  activities = tickResult.activities;
  events.push(...tickResult.events);
  timeSeries.push(...tickResult.timeSeries);

  currentState.isRunning = false;
  const completedAtIso = systemContext.now();

  // 4. Construct SimulationRun object
  const run: SimulationRun = {
    runId,
    scenarioId: version.scenarioId,
    scenarioVersionId: version.id,
    seed,
    // 067G / G50 (Nacharbeit P1): Endzustand aus dem ausführenden Pfad —
    // im Browser der Worker, sonst der Main-Thread-Rng.
    rngState: tickResult.rngState,
    modelVersion: manifest.modelVersion,
    schemaVersion: manifest.schemaVersion,
    baselineVersion: manifest.baselineVersion,
    status: 'COMPLETED',
    startedAt: nowIso,
    completedAt: completedAtIso,
    manifest,
    finalState: Object.freeze(JSON.parse(JSON.stringify(currentState))),
    finalMetrics: currentState.metrics
      ? Object.freeze(JSON.parse(JSON.stringify(currentState.metrics)))
      : undefined,
    timeSeries,
    correlationId,
    measures,
  };

  // Save run to repository if persistence enabled
  const snapshotRepo = ctx.getSnapshotRepo();
  const shouldPersist = opts?.persist !== false;
  if (shouldPersist) {
    ctx.repo.saveRun(run);

    // If snapshot repository is registered, trigger deterministic post-run pruning
    if (snapshotRepo) {
      SnapshotPruningManager.pruneRunSnapshots(runId, snapshotRepo, targetTicks).catch(() => {});
    }
  }

  // 067F / G49 (Nacharbeit P1): Produktiver Snapshot-Bindungspfad — jeder
  // Server-persistierte Run trägt mindestens seinen Final-Snapshot (plus
  // vorhandene Snapshots aus dem Snapshot-Repository, dedupliziert).
  // Fehler propagieren fail-closed — kein stiller In-Memory-Fallback.
  if (opts?.persistToServer) {
    const scenario = ctx.repo.getScenario(version.scenarioId);
    if (!scenario) {
      throw new ScenarioError(
        'NOT_FOUND',
        `Szenario "${version.scenarioId}" wurde nicht gefunden.`,
      );
    }
    const finalSnapshot: SimulationSnapshot = {
      snapshotId: `${runId}_tick_${targetTicks}`,
      runId,
      scenarioId: version.scenarioId,
      scenarioVersionId: version.id,
      tickId: targetTicks,
      simulationDay: currentState.dayIndex,
      simulatedDate: currentState.simulatedDate,
      modelVersion: manifest.modelVersion,
      schemaVersion: manifest.schemaVersion,
      baselineVersion: manifest.baselineVersion,
      organizationId: manifest.organizationId,
      state: currentState,
      projection: {
        snapshotId: `${runId}_tick_${targetTicks}`,
        runId,
        scenarioId: version.scenarioId,
        scenarioVersionId: version.id,
        tickId: targetTicks,
        simulationDay: currentState.dayIndex,
        simulatedDate: currentState.simulatedDate,
        arr: currentState.metrics?.liveARR ?? 0,
        mrr: currentState.metrics?.liveMRR ?? 0,
        customers: currentState.metrics?.liveCustomers ?? 0,
        wonDeals: currentState.metrics?.liveWonDeals ?? 0,
        leadsCount: leads.length,
        opportunitiesCount: opportunities.length,
        conversionRate: currentState.metrics?.conversionRate ?? 0,
      },
      createdAt: completedAtIso,
    };
    const stored = snapshotRepo ? await snapshotRepo.getByRun(runId) : [];
    const seen = new Set(stored.map((s) => s.snapshotId));
    const snapshots = [...stored];
    if (!seen.has(finalSnapshot.snapshotId)) {
      snapshots.push(finalSnapshot);
      // Eigene In-Memory-Heimat für spätere Hydrierung ohne Snapshot-Repo.
      ctx.repo.saveSnapshots(runId, snapshots);
    }
    // Run-Events erhalten ihre In-Memory-Heimat für die Hydrierung.
    ctx.repo.saveEvents(runId, events);
    await persistCompletedRun({
      organizationId: manifest.organizationId,
      scenario,
      version,
      run,
      events,
      timeSeries,
      snapshots,
    });
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
