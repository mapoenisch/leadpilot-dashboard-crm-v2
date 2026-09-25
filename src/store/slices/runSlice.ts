import type { StateCreator } from 'zustand';
import { scenarioService } from '../../simulation/scenarioService';
import { systemContext } from '../../simulation/systemContext';
import { DEFAULT_BASE_2026_VERSION_ID } from '../../simulation/scenarioRepository';
import {
  IdempotentCommandGate,
  assertRunCommandAllowed,
  canControlRuns,
  sealRunSnapshot,
} from '../../simulation/runControlService';
import {
  discardRunPause,
  loadRunPauses,
  persistRunPause,
  recordRunControl,
  type RunControlAuditAction,
} from '../../services/runs/runPersistenceService';
import { dataSourceRegistry } from '../../services/data';
import type { ScenarioAggregationResult } from '../../types/aggregation';
import type { OrganizationRole } from '../../types/organization';
import type { SimulationRun } from '../../types/scenario';
import {
  RunControlError,
  type RunControlStatus,
  type RunResumeSnapshot,
  type RunResumeSnapshotBody,
} from '../../types/runControl';
import type { SimulationStoreState } from '../simulationStore';
import {
  bindingOptions,
  bindingWithManifest,
  createSerialQueue,
  errorCode,
  errorMessage as message,
  type RunBinding,
} from './runControlSupport';

// Gate G37 (Auftrag 052): Run-Slice — Runs, Aggregation, Fortschritt und die
// Run-Aktionen. Jede Aktion ruft danach refreshData (Scenario-Slice), genau
// wie der bisherige Context.
// 067Q / G63: Run-Steuerung (Pause, Fortsetzen, Abbruch, Retry, Resume aus
// gespeichertem Snapshot). Rolle und Zustand prüft runControlService; die
// Datenbank prüft Rolle und Mandant ein zweites Mal (RPC).
export interface RunProgress {
  status: 'queued' | 'running' | 'progress' | 'pausing' | 'paused';
  processedUnits: number;
  totalUnits: number;
}

/** Abgebrochener oder fehlgeschlagener Lauf — Grundlage für Retry (gleicher Seed). */
export interface InterruptedRun {
  versionId: string;
  seed: number;
  status: 'cancelled' | 'failed';
  runId?: string;
  message: string;
  /** Ursprüngliche Bindung (Maßnahmen, Datenquelle, Baseline) für den Retry. */
  binding: RunBinding;
}

export interface RunSlice {
  runs: SimulationRun[];
  aggregation: ScenarioAggregationResult;
  workerProgress: { completedRuns: number; totalRuns: number };
  // 067G / G50: Live-Fortschritt aus echten Berechnungseinheiten (null wenn
  // kein Run aktiv). Quelle: Coordinator-Ereignisse via Service-Callback.
  runProgress: RunProgress | null;
  interruptedRun: InterruptedRun | null;
  pausedRuns: RunResumeSnapshot[];
  /** Mandant, zu dem `pausedRuns` gehört (Wechsel leert die Liste sofort). */
  pausedRunsOrganizationId: string | null;
  runControlError: string | null;
  // 067F / G49: Mit organizationId läuft der Run mandantengebunden und wird
  // danach atomar auf dem Server persistiert (fail-closed); ohne bleibt das
  // bisherige reine In-Memory-Verhalten.
  runVersion: (versionId: string, organizationId?: string) => Promise<void>;
  reRun: (versionId: string) => Promise<void>;
  reproduce: (runId: string) => Promise<void>;
  // 067G / G50 + 067Q / G63: Abbruch (Benutzer, Navigation, Unmount).
  cancelRun: (role?: OrganizationRole | null) => void;
  pauseRun: (role: OrganizationRole | null) => void;
  resumeRun: (role: OrganizationRole | null) => void;
  retryRun: (role: OrganizationRole | null) => Promise<void>;
  /** Die Sitzungsorganisation ist maßgeblich (Workspace kann noch veraltet sein). */
  loadPausedRuns: (sessionOrganizationId?: string) => Promise<void>;
  resumePausedRun: (runId: string, role: OrganizationRole | null) => Promise<void>;
  discardPausedRun: (runId: string, role: OrganizationRole | null) => Promise<void>;
}

/** Zustand für die Steuerleiste: aktiver Lauf vor unterbrochenem Lauf. */
export function currentRunControlStatus(
  progress: RunProgress | null,
  interrupted: InterruptedRun | null,
): RunControlStatus | null {
  if (progress) return progress.status;
  return interrupted?.status ?? null;
}

const retryGate = new IdempotentCommandGate();
const RETRY_KEY = 'retry';

export const createRunSlice: StateCreator<SimulationStoreState, [], [], RunSlice> = (set, get) => {
  const initialRuns = scenarioService.getRunsForVersion(DEFAULT_BASE_2026_VERSION_ID);
  // Snapshot des laufenden Runs (für Abbruch nach Pause: Server-Pause verwerfen).
  let activePause: RunResumeSnapshotBody | null = null;
  // Run-ID und Bindung des laufenden Runs (für Audit und Retry nach Abbruch).
  let activeRunId: string | null = null;
  let activeBinding: RunBinding = { measures: [] };
  // Einmaliger Hook, sobald der Lauf angenommen ist (erstes Worker-Ereignis).
  let onFirstProgress: (() => void) | null = null;
  const serverQueue = createSerialQueue();

  const reportProgress = (processedUnits: number, totalUnits: number) => {
    activeRunId = scenarioService.getActiveRunId() ?? activeRunId;
    activeBinding = bindingWithManifest(activeBinding, scenarioService.getActiveRunManifest());
    const accepted = onFirstProgress;
    onFirstProgress = null;
    accepted?.();
    const current = get().runProgress?.status;
    // Während Pause/Speichern keine Fortschrittsmeldung den Status überschreiben.
    if (current === 'pausing' || current === 'paused') return;
    set({
      runProgress:
        processedUnits >= totalUnits
          ? null
          : {
              status: processedUnits <= 0 ? 'queued' : 'progress',
              processedUnits,
              totalUnits,
            },
    });
  };

  const organizationId = () => get().activeOrganizationId ?? undefined;

  /** Audit seriell nach offenen Server-Befehlen; ein Fehler wird sichtbar, blockiert aber nicht. */
  const audit = (runId: string, action: RunControlAuditAction) => {
    const org = organizationId();
    if (!org) return;
    serverQueue(() =>
      recordRunControl(org, runId, action, systemContext.nextCorrelationId()),
    ).catch((err) => set({ runControlError: message(err, 'Audit-Eintrag fehlgeschlagen.') }));
  };

  const setPauseStatus = (status: 'pausing' | 'paused', body: RunResumeSnapshotBody) =>
    set({ runProgress: { status, processedUnits: body.tick, totalUnits: body.targetTicks } });

  /**
   * Der Worker hat an einer Tick-Grenze pausiert. Bei Server-Runs gilt die
   * Pause erst nach erfolgreich gespeichertem Snapshot als bestätigt; bis dahin
   * ist nur Abbruch möglich (`pausing`).
   */
  const onPaused = (body: RunResumeSnapshotBody) => {
    activePause = body;
    const persist = !!body.organizationId && body.organizationId === organizationId();
    setPauseStatus(persist ? 'pausing' : 'paused', body);
    if (!persist) return;
    serverQueue(async () => persistRunPause(await sealRunSnapshot(body)))
      .catch((err) =>
        set({
          runControlError: message(
            err,
            'Pause nicht gespeichert — im Browser fortsetzbar, nach einem Reload nicht.',
          ),
        }),
      )
      .finally(() => {
        if (activePause === body && get().runProgress?.status === 'pausing') {
          setPauseStatus('paused', body);
        }
      });
  };

  const interrupted = (
    err: unknown,
    versionId: string,
    seed: number,
    binding: RunBinding,
  ): InterruptedRun => {
    const cancelled = errorCode(err) === 'SIMULATION_CANCELLED';
    return {
      versionId,
      seed,
      status: cancelled ? 'cancelled' : 'failed',
      ...(activeRunId ? { runId: activeRunId } : {}),
      message: message(err, cancelled ? 'Run abgebrochen.' : 'Run fehlgeschlagen.'),
      binding,
    };
  };

  /** Führt einen Lauf aus und merkt sich Abbruch/Fehler samt Bindung für Retry. */
  const executeRun = async (
    versionId: string,
    seed: number,
    org: string | undefined,
    binding: RunBinding,
    onAccepted?: () => void,
  ) => {
    activePause = null;
    activeRunId = null;
    activeBinding = binding;
    onFirstProgress = onAccepted ?? null;
    set({
      runProgress: { status: 'queued', processedUnits: 0, totalUnits: 1 },
      interruptedRun: null,
      runControlError: null,
    });
    try {
      await scenarioService.runScenarioVersion(versionId, seed, undefined, {
        correlationId: systemContext.nextCorrelationId(),
        ...bindingOptions(binding),
        ...(org ? { organizationId: org, persistToServer: true as const } : {}),
        onProgress: reportProgress,
        onPaused,
      });
    } catch (err) {
      set({ interruptedRun: interrupted(err, versionId, seed, activeBinding) });
      throw err;
    } finally {
      activePause = null;
      onFirstProgress = null;
      set({ runProgress: null });
    }
    get().refreshData();
  };

  /** Neuer Lauf: Bindung an die Maßnahmen und die Datenquelle beim Start. */
  const startVersion = (versionId: string, seed: number, org: string | undefined) =>
    executeRun(versionId, seed, org, {
      measures: structuredClone(get().draftMeasures),
      dataSourceId: dataSourceRegistry.getActive().info.id,
    });

  return {
    runs: initialRuns,
    aggregation: scenarioService.getScenarioAggregation(DEFAULT_BASE_2026_VERSION_ID),
    workerProgress: {
      completedRuns: initialRuns.filter((r) => r.status === 'COMPLETED').length,
      totalRuns: initialRuns.length || 1,
    },
    runProgress: null,
    interruptedRun: null,
    pausedRuns: [],
    pausedRunsOrganizationId: null,
    runControlError: null,

    runVersion: (versionId: string, org?: string) =>
      startVersion(versionId, systemContext.newRunSeed(), org),

    // Re-Run = neuer Seed für dieselbe Version (wie scenarioService.reRun),
    // der Seed bleibt hier bekannt, damit ein Abbruch wiederholbar ist.
    // 067F / G49 (Nacharbeit P1): mit hydriertem Workspace mandantengebunden.
    reRun: (versionId: string) =>
      startVersion(versionId, systemContext.newRunSeed(), organizationId()),

    reproduce: async (runId: string) => {
      // 067F / G49 (Nacharbeit P1): Reproduktion persistiert genau dann, wenn
      // ein Workspace hydriert ist (aktiver Mandant).
      const persistToServer = get().activeOrganizationId !== null;
      set({
        runProgress: { status: 'queued', processedUnits: 0, totalUnits: 1 },
      });
      try {
        await scenarioService.reproduce(runId, 50, persistToServer, reportProgress);
      } finally {
        set({ runProgress: null });
      }
      get().refreshData();
    },

    cancelRun: (role?: OrganizationRole | null) => {
      // Ohne Rolle: technischer Abbruch (Navigation/Unmount) — immer erlaubt.
      if (role !== undefined) {
        assertRunCommandAllowed('cancel', get().runProgress?.status ?? null, role);
      }
      const pause = activePause;
      const runId = scenarioService.getActiveRunId() ?? activeRunId;
      scenarioService.cancelActiveRun();
      set({ runProgress: null });
      if (role === undefined) return;
      const org = organizationId();
      // Gespeicherte Pause verwerfen (protokolliert den Abbruch in der DB) —
      // seriell nach dem Speichern; sonst den Abbruch direkt protokollieren.
      if (org && pause?.organizationId === org) {
        serverQueue(() => discardRunPause(org, pause.runId)).catch((err) =>
          set({ runControlError: message(err, 'Pause nicht verworfen.') }),
        );
      } else if (runId) {
        audit(runId, 'cancelled');
      }
    },

    pauseRun: (role) => {
      assertRunCommandAllowed('pause', get().runProgress?.status ?? null, role);
      scenarioService.pauseActiveRun();
    },

    resumeRun: (role) => {
      assertRunCommandAllowed('resume', get().runProgress?.status ?? null, role);
      const pause = activePause;
      if (!scenarioService.resumeActiveRun()) return;
      activePause = null;
      const progress = get().runProgress;
      if (progress) set({ runProgress: { ...progress, status: 'progress' } });
      if (pause) audit(pause.runId, 'resumed');
    },

    retryRun: (role) => {
      // Idempotent: Solange ein Retry läuft, liefert jeder weitere Aufruf
      // denselben Promise (der Unterbrechungszustand ist dann schon geleert).
      if (retryGate.isRunning(RETRY_KEY)) {
        if (!canControlRuns(role)) {
          throw new RunControlError(
            'FORBIDDEN',
            'Diese Rolle darf Simulationsläufe nicht steuern.',
          );
        }
        return retryGate.run(RETRY_KEY, () => Promise.resolve());
      }
      const last = get().interruptedRun;
      assertRunCommandAllowed('retry', last?.status ?? null, role);
      if (!last) return Promise.resolve();
      // Gleicher Seed und gleiche Bindung; protokolliert erst, wenn der Lauf
      // angenommen ist (erstes Worker-Ereignis nach dem Preflight).
      return retryGate.run(RETRY_KEY, () =>
        executeRun(last.versionId, last.seed, organizationId(), last.binding, () => {
          if (last.runId) audit(last.runId, 'retried');
        }),
      );
    },

    loadPausedRuns: async (sessionOrganizationId) => {
      const org = sessionOrganizationId ?? organizationId() ?? null;
      if (org !== get().pausedRunsOrganizationId) {
        // Mandantenwechsel: alte Liste sofort verwerfen, nie mischen.
        set({ pausedRuns: [], pausedRunsOrganizationId: org });
      }
      if (!org) return;
      try {
        const pauses = await loadRunPauses(org);
        if (get().pausedRunsOrganizationId === org) set({ pausedRuns: pauses });
      } catch (err) {
        if (get().pausedRunsOrganizationId === org) set({ pausedRuns: [] });
        set({ runControlError: message(err, 'Pausierte Runs nicht geladen.') });
      }
    },

    resumePausedRun: async (runId, role) => {
      assertRunCommandAllowed('resumeFromSnapshot', null, role);
      const snapshot = get().pausedRuns.find((p) => p.runId === runId);
      if (!snapshot) return;
      const org = organizationId();
      const binding = bindingWithManifest({ measures: [] }, snapshot.manifest);
      let accepted = false;
      let failure: unknown = null;
      activePause = snapshot;
      activeRunId = snapshot.runId;
      activeBinding = binding;
      set({
        runProgress: {
          status: 'progress',
          processedUnits: snapshot.tick,
          totalUnits: snapshot.targetTicks,
        },
        interruptedRun: null,
        runControlError: null,
      });
      try {
        await scenarioService.resumeFromSnapshot(snapshot, {
          ...(org ? { organizationId: org, persistToServer: true as const } : {}),
          onProgress: reportProgress,
          onPaused,
          // Protokolliert erst nach Snapshot-, Baseline- und Versionsprüfung.
          onAccepted: () => {
            accepted = true;
            audit(runId, 'resumed');
          },
        });
      } catch (err) {
        failure = err;
        set({ runControlError: message(err, 'Fortsetzen fehlgeschlagen.') });
        // Ein angenommener, dann abgebrochener/fehlgeschlagener Lauf ist ein
        // unterbrochener Run (Retry mit gleichem Seed von vorn).
        if (accepted) {
          set({
            interruptedRun: interrupted(err, snapshot.scenarioVersionId, snapshot.seed, binding),
          });
        }
      } finally {
        activePause = null;
        set({ runProgress: null });
      }
      // Pausenliste in jedem Fall mit dem Server abgleichen.
      await get().loadPausedRuns();
      if (failure) throw failure;
      get().refreshData();
    },

    discardPausedRun: async (runId, role) => {
      assertRunCommandAllowed('resumeFromSnapshot', null, role);
      const org = organizationId();
      if (!org) return;
      await serverQueue(() => discardRunPause(org, runId));
      await get().loadPausedRuns();
    },
  };
};
