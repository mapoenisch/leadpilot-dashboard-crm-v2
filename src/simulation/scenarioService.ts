import { ISnapshotRepository } from '../services/db/ISnapshotRepository';
import { ScenarioRepository } from './scenarioRepository';
import { SnapshotPruningManager } from './snapshotPruningManager';
import { GoalTarget } from '../types/kpi';
import { Measure, MeasureConflict, MeasureKpiDelta } from '../types/measure';
import {
  MultiVersionComparisonResult,
  RunManifest,
  RunOptions,
  Scenario,
  ScenarioError,
  ScenarioParameters,
  ScenarioVersion,
  SimulationRun,
  VersionComparisonResult,
} from '../types/scenario';
import { ScenarioAggregationResult } from '../types/aggregation';
import { RunCoordinator, type CoordinatorStatus, type WorkerRunResult } from './runCoordinator';
import { resumeRunFromSnapshotWith } from './scenarioRunResume';
import type { RunResumeSnapshot, RunResumeSnapshotBody } from '../types/runControl';
import type { ScenarioWorkspace } from '../services/runs/runPersistenceService';
import { MainThreadTickInput, RunExecutionResult, TickRunResult } from './scenarioTickRunner';
import { createScenarioVersionWith, createScenarioWith } from './scenarioLifecycle';
import { ScenarioRunContext, runScenarioVersionWith } from './scenarioRunExecutor';
import {
  getScenarioAggregationWith,
  loadScenarioWorkspaceWith,
  previewMeasuresWith,
  reRunWith,
  reproduceWith,
} from './scenarioWorkspace';
import { compareVersionsWith } from './scenarioCompare';
import { compareMultipleVersionsWith } from './scenarioMultiCompare';

// 067K / G57 — aufgeteilte Service-Fassade (Architekturentscheidung: reine
// Code-Bewegung in Module mit explizitem Kontext, keine Verhaltensänderung).
// Ausführungslogik: scenarioRunExecutor/scenarioWorkspace, Vergleiche:
// scenarioCompare/scenarioMultiCompare/scenarioTradeoffs, Tick-Loop:
// scenarioTickRunner, Lebenszyklus: scenarioLifecycle. Öffentliche API und
// Re-Exporte bleiben identisch — kein Konsument ändert sich.
export { executeTicksMainThread, shouldUseWorker } from './scenarioTickRunner';
export type { MainThreadTickInput, RunExecutionResult, TickRunResult } from './scenarioTickRunner';

export class ScenarioService {
  private static instance: ScenarioService;
  private repo: ScenarioRepository;
  private snapshotRepo?: ISnapshotRepository;
  private activeCoordinator: RunCoordinator | null = null;
  // 067Q / G63: Befehle, die vor dem Worker-Start eintreffen (z. B. während
  // der Baseline-Erfassung), werden vorgemerkt und beim Start angewendet.
  private runsInFlight = 0;
  private pendingCommand: 'pause' | 'cancel' | null = null;

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

  private runContext(): ScenarioRunContext {
    return {
      repo: this.repo,
      getSnapshotRepo: () => this.snapshotRepo,
      runTicksInWorker: (input, manifest, resumeSnapshot) =>
        this.executeTicksInWorker(input, manifest, resumeSnapshot),
    };
  }

  public async pruneCompletedRun(
    runId: string,
    snapshotRepo?: ISnapshotRepository,
    targetTicks = 365,
  ) {
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
    parentScenarioId?: string,
  ): { scenario: Scenario; version: ScenarioVersion } {
    return createScenarioWith(this.repo, name, description, parameters, parentScenarioId);
  }

  /**
   * Creates a new immutable ScenarioVersion (e.g. v2) for an existing scenario.
   * Past versions remain 100% immutable.
   */
  public createScenarioVersion(
    scenarioId: string,
    parameters: Partial<ScenarioParameters>,
    description?: string,
  ): ScenarioVersion {
    return createScenarioVersionWith(this.repo, scenarioId, parameters, description);
  }

  /**
   * Executes a SimulationRun for a given ScenarioVersion using strictly SimulationEngine.executeTick().
   * Runs Preflight Validation before execution and blocks if preflight fails.
   */
  public async runScenarioVersion(
    versionId: string,
    seedOverride?: number,
    targetTicks = 50,
    opts?: RunOptions,
  ): Promise<RunExecutionResult> {
    return this.track(() =>
      runScenarioVersionWith(this.runContext(), versionId, seedOverride, targetTicks, opts),
    );
  }

  /**
   * 067G / G50 — Worker-Pfad: Ticks rechnen im Web Worker, Ergebnis und
   * Fortschritt kommen aus echten Berechnungseinheiten. Bei Abbruch, Fehler
   * und Abschluss terminiert der Coordinator den Worker (kein Leak).
   */
  private async executeTicksInWorker(
    tickInput: MainThreadTickInput,
    manifest: RunManifest,
    resumeSnapshot?: RunResumeSnapshotBody,
  ): Promise<TickRunResult> {
    const coordinator = new RunCoordinator();
    this.activeCoordinator = coordinator;
    const { onProgress, onPaused } = tickInput;
    try {
      const unsubscribe = coordinator.onEvent((evt) => {
        if (evt.status === 'progress' || evt.status === 'running') {
          onProgress?.(evt.processedUnits, evt.totalUnits);
        }
        // 067Q / G63: Zwischenstand an der Tick-Grenze an den Aufrufer.
        if (evt.status === 'paused' && evt.snapshot) onPaused?.(evt.snapshot);
      });
      try {
        const done = coordinator.execute({
          manifest,
          initialState: tickInput.initialState,
          historicalMetrics: tickInput.historicalMetrics,
          measures: [...tickInput.measures],
          targetTicks: tickInput.targetTicks,
          correlationId: tickInput.correlationId,
          ...(resumeSnapshot ? { resumeSnapshot } : {}),
        });
        this.applyPendingCommand(coordinator);
        const result: WorkerRunResult = await done;
        for (const evt of result.events) {
          if (evt.correlationId === undefined) evt.correlationId = tickInput.correlationId;
        }
        return {
          state: result.finalState,
          rngState: result.rngState,
          leads: result.leads,
          opportunities: result.opportunities,
          deals: result.deals,
          activities: result.activities,
          // Worker stellt wie der Main-Thread neueste Events zuerst.
          events: [...result.events],
          // Tick 0 baut der Service (Parität beider Pfade).
          timeSeries: result.timeSeries.filter((p) => p.tick > 0),
        };
      } finally {
        unsubscribe();
      }
    } finally {
      if (this.activeCoordinator === coordinator) this.activeCoordinator = null;
    }
  }

  /** Abbruch des laufenden Worker-Runs (Benutzer/Navigation/Unmount/Fehler). */
  public cancelActiveRun(): void {
    if (!this.activeCoordinator && this.runsInFlight > 0) this.pendingCommand = 'cancel';
    this.activeCoordinator?.cancel();
    this.activeCoordinator = null;
  }

  /** 067Q / G63: Pause an der nächsten Tick-Grenze (false = kein Befehl gesendet). */
  public pauseActiveRun(): boolean {
    if (this.activeCoordinator) return this.activeCoordinator.pause();
    if (this.runsInFlight === 0 || this.pendingCommand) return false;
    this.pendingCommand = 'pause';
    return true;
  }

  /** 067Q / G63: Fortsetzen eines pausierten (oder zur Pause vorgemerkten) Runs. */
  public resumeActiveRun(): boolean {
    if (this.activeCoordinator) return this.activeCoordinator.resume();
    if (this.pendingCommand !== 'pause') return false;
    this.pendingCommand = null;
    return true;
  }

  private applyPendingCommand(coordinator: RunCoordinator): void {
    const pending = this.pendingCommand;
    this.pendingCommand = null;
    if (pending === 'cancel') coordinator.cancel();
    if (pending === 'pause') coordinator.pause();
  }

  private async track<T>(run: () => Promise<T>): Promise<T> {
    this.runsInFlight += 1;
    try {
      return await run();
    } finally {
      this.runsInFlight -= 1;
      if (this.runsInFlight === 0) this.pendingCommand = null;
    }
  }

  public getActiveRunStatus(): CoordinatorStatus | null {
    return this.activeCoordinator?.getStatus() ?? null;
  }

  public getActiveRunId(): string | null {
    return this.activeCoordinator?.getRunId() || null;
  }

  public getActiveRunManifest(): RunManifest | null {
    return this.activeCoordinator?.getManifest() ?? null;
  }

  /**
   * 067Q / G63: Setzt einen pausierten Run aus einem gespeicherten Snapshot
   * fort — nur nach Hash- und Bindungsprüfung (SIMULATION_RESUME_INVALID).
   */
  public async resumeFromSnapshot(
    snapshot: RunResumeSnapshot,
    opts?: RunOptions,
  ): Promise<RunExecutionResult> {
    return this.track(() => resumeRunFromSnapshotWith(this.runContext(), snapshot, opts));
  }

  /**
   * Re-Run protocol ("Erneut ausführen")
   */
  public async reRun(
    versionId: string,
    targetTicks = 50,
    opts?: RunOptions,
  ): Promise<RunExecutionResult> {
    return this.track(() => reRunWith(this.runContext(), versionId, targetTicks, opts));
  }

  /**
   * Reproduce protocol ("Reproduzieren"). Prüft vor dem Lauf Baseline-,
   * Organisations-, Schema- und Modellhash aus dem Manifest — jede
   * Abweichung bricht fail-closed ab statt still anders zu rechnen.
   */
  public async reproduce(
    existingRunId: string,
    targetTicks = 50,
    persistToServer = false,
    onProgress?: (processedUnits: number, totalUnits: number) => void,
  ): Promise<RunExecutionResult> {
    return this.track(() =>
      reproduceWith(this.runContext(), existingRunId, targetTicks, persistToServer, onProgress),
    );
  }

  /**
   * 067F / G49 — lädt Szenarien, Versionen und Runs genau eines Mandanten vom
   * Server und ERSETZT den In-Memory-Workspace atomar (Nacharbeit P1:
   * additiv würde beim Organisationswechsel fremde Daten leaken). Ablauf:
   * erst laden (Fehler → alter Stand bleibt), dann zurücksetzen und füllen.
   * Nur öffentliche Repository-APIs; kein Backend schreibt am Store vorbei.
   */
  public async loadScenarioWorkspace(organizationId: string): Promise<ScenarioWorkspace> {
    return loadScenarioWorkspaceWith(this.repo, organizationId);
  }

  /**
   * Side-effect-free measure impact preview ("Wirkungsvorschau", Decisions 1474–1573).
   * Runs two parallel simulations with the same seed (Base vs. With-Measures) without persisting runs.
   */
  public async previewMeasures(
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
    return previewMeasuresWith(this.runContext(), baseVersionId, measures, targetTicks, opts);
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
    return getScenarioAggregationWith(this.repo, scenarioVersionId);
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
    targets?: Record<string, GoalTarget>,
  ): VersionComparisonResult {
    return compareVersionsWith(
      this.repo,
      (versionId) => this.getScenarioAggregation(versionId),
      versionIdA,
      versionIdB,
      targets,
    );
  }

  /**
   * AUFTRAG 019: Deep Multi-Scenario Comparison across 3-4 ScenarioVersions (Decisions 849–873).
   * Computes Parameter Matrix, KPI Matrix, 5-Dimension Trade-Offs without artificial composite scores,
   * and identifies primary root-cause drivers.
   */
  public compareMultipleVersions(
    versionIds: string[],
    _targets?: Record<string, GoalTarget>,
    referenceVersionId?: string,
  ): MultiVersionComparisonResult {
    return compareMultipleVersionsWith(
      this.repo,
      (versionId) => this.getScenarioAggregation(versionId),
      versionIds,
      _targets,
      referenceVersionId,
    );
  }

  /**
   * AUFTRAG 019: Adopts the parameter configuration of a compared scenario into a target scenario (Decision 872).
   */
  public adoptConfiguration(
    sourceVersionId: string,
    targetScenarioId: string,
    description?: string,
  ): ScenarioVersion {
    const sourceVer = this.repo.getVersion(sourceVersionId);
    if (!sourceVer) {
      throw new ScenarioError(
        'NOT_FOUND',
        `Quellversion "${sourceVersionId}" wurde nicht gefunden.`,
      );
    }

    const targetScenario = this.repo.getScenario(targetScenarioId);
    if (!targetScenario) {
      throw new ScenarioError(
        'NOT_FOUND',
        `Zielszenario "${targetScenarioId}" wurde nicht gefunden.`,
      );
    }

    const adoptDesc =
      description ||
      `Konfiguration übernommen aus Version ${sourceVer.versionNumber} (${sourceVer.id})`;
    return this.createScenarioVersion(targetScenarioId, sourceVer.parameters, adoptDesc);
  }
}

export const scenarioService: ScenarioService = ScenarioService.getInstance();
