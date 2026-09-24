// 067Q / G63 — Resume aus einem validierten Snapshot. Der Lauf setzt exakt an
// der gespeicherten Tick-Grenze fort (PRNG, Zustand, Sammlungen, Queues) und
// endet über denselben Abschlusspfad wie ein normaler Run. Ergebnis:
// byte-identisch zum ununterbrochenen Lauf gleicher Baseline und gleichen Seeds.
import { DeterministicRNG } from './prng';
import { validateRunSnapshot } from './runControlService';
import {
  RUN_MODEL_VERSION,
  RUN_SCHEMA_VERSION,
  finalizeRunWith,
  type ScenarioRunContext,
} from './scenarioRunExecutor';
import {
  executeTicksMainThread,
  shouldUseWorker,
  type MainThreadTickInput,
  type RunExecutionResult,
} from './scenarioTickRunner';
import { RunControlError, type RunResumeSnapshot } from '../types/runControl';
import type { RunOptions } from '../types/scenario';
import type { SimulationEvent } from '../types/simulation';
import type { TimeSeriesPoint } from '../types/aggregation';

export async function resumeRunFromSnapshotWith(
  ctx: ScenarioRunContext,
  snapshot: RunResumeSnapshot,
  opts: RunOptions = {},
): Promise<RunExecutionResult> {
  await validateRunSnapshot(snapshot, {
    ...(opts.organizationId !== undefined ? { organizationId: opts.organizationId } : {}),
    modelVersion: RUN_MODEL_VERSION,
    schemaVersion: RUN_SCHEMA_VERSION,
  });
  const version = ctx.repo.getVersion(snapshot.scenarioVersionId);
  if (!version) {
    throw new RunControlError(
      'SIMULATION_RESUME_INVALID',
      `Snapshot ungültig: Szenarioversion "${snapshot.scenarioVersionId}" ist nicht geladen.`,
    );
  }

  // Tiefe Kopie: der validierte Snapshot bleibt unverändert (Hash bleibt gültig).
  const s = structuredClone(snapshot);
  const manifest = s.manifest;
  const tickInput: MainThreadTickInput = {
    rng: DeterministicRNG.fromState(s.seed, s.rngState),
    initialState: { ...s.state, isRunning: true },
    leads: s.leads,
    opportunities: s.opportunities,
    deals: s.deals,
    activities: s.activities,
    historicalMetrics: s.historicalMetrics,
    baseParameters: manifest.parameters,
    measures: [...(manifest.measures ?? [])],
    targetTicks: s.targetTicks,
    correlationId: s.correlationId,
    onProgress: opts.onProgress,
    onPaused: opts.onPaused,
    startTick: s.tick,
    queueEntries: s.queueEntries,
    csQueueEntries: s.csQueueEntries,
  };

  const tickZero = s.timeSeries.filter((p) => p.tick === 0);
  let result;
  let events: SimulationEvent[];
  let timeSeries: TimeSeriesPoint[];
  if (shouldUseWorker()) {
    // Der Worker startet mit dem Snapshot und liefert kumulierte Events und
    // Zeitreihe (Tick 0 filtert die Service-Fassade heraus).
    result = await ctx.runTicksInWorker(tickInput, manifest, s);
    events = result.events;
    timeSeries = [...tickZero, ...result.timeSeries];
  } else {
    result = executeTicksMainThread(tickInput);
    events = [...result.events, ...s.events];
    timeSeries = [...s.timeSeries, ...result.timeSeries];
  }
  for (const evt of events) {
    if (evt.correlationId === undefined) evt.correlationId = s.correlationId;
  }

  return finalizeRunWith(ctx, {
    version,
    manifest,
    runId: s.runId,
    seed: s.seed,
    measures: manifest.measures,
    targetTicks: s.targetTicks,
    correlationId: s.correlationId,
    startedAt: manifest.createdAt,
    rngState: result.rngState,
    state: result.state,
    leads: result.leads,
    opportunities: result.opportunities,
    deals: result.deals,
    activities: result.activities,
    events,
    timeSeries,
    opts,
  });
}
