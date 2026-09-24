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
import type { ScenarioAggregationResult } from '../../types/aggregation';
import type { OrganizationRole } from '../../types/organization';
import type { RunOptions, SimulationRun } from '../../types/scenario';
import {
  RunControlError,
  type RunControlStatus,
  type RunResumeSnapshot,
  type RunResumeSnapshotBody,
} from '../../types/runControl';
import type { SimulationStoreState } from '../simulationStore';

// Gate G37 (Auftrag 052): Run-Slice — Runs, Aggregation, Fortschritt und die
// Run-Aktionen. Jede Aktion ruft danach refreshData (Scenario-Slice), genau
// wie der bisherige Context.
// 067Q / G63: Run-Steuerung (Pause, Fortsetzen, Abbruch, Retry, Resume aus
// gespeichertem Snapshot). Rolle und Zustand prüft runControlService; die
// Datenbank prüft Rolle und Mandant ein zweites Mal (RPC).
export interface RunProgress {
  status: 'queued' | 'running' | 'progress' | 'paused';
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
  /** Organisation aus der Sitzung, falls der Workspace noch nicht hydriert ist. */
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

function errorCode(err: unknown): string | undefined {
  return typeof err === 'object' && err !== null && 'code' in err
    ? String((err as { code: unknown }).code)
    : undefined;
}

function message(err: unknown, fallback: string): string {
  return (err instanceof Error ? err.message : '') || fallback;
}

export const createRunSlice: StateCreator<SimulationStoreState, [], [], RunSlice> = (set, get) => {
  const initialRuns = scenarioService.getRunsForVersion(DEFAULT_BASE_2026_VERSION_ID);
  // Snapshot des laufenden Runs (für Abbruch nach Pause: Server-Pause verwerfen).
  let activePause: RunResumeSnapshotBody | null = null;
  // Run-ID des laufenden Worker-Runs (für Audit und Retry nach Abbruch).
  let activeRunId: string | null = null;

  const reportProgress = (processedUnits: number, totalUnits: number) => {
    activeRunId = scenarioService.getActiveRunId() ?? activeRunId;
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

  /** Audit fire-and-forget: ein Protokollfehler wird sichtbar, blockiert aber nicht. */
  const audit = (runId: string, action: RunControlAuditAction) => {
    const org = organizationId();
    if (!org) return;
    recordRunControl(org, runId, action, systemContext.nextCorrelationId()).catch((err) =>
      set({ runControlError: message(err, 'Audit-Eintrag fehlgeschlagen.') }),
    );
  };

  const onPaused = (body: RunResumeSnapshotBody) => {
    activePause = body;
    set({
      runProgress: { status: 'paused', processedUnits: body.tick, totalUnits: body.targetTicks },
    });
    if (!body.organizationId || body.organizationId !== organizationId()) return;
    sealRunSnapshot(body)
      .then((sealed) => persistRunPause(sealed))
      .catch((err) => set({ runControlError: message(err, 'Pause nicht gespeichert.') }));
  };

  /** Führt einen Lauf aus und merkt sich Abbruch/Fehler für Retry. */
  const executeRun = async (
    versionId: string,
    seed: number,
    org: string | undefined,
    run: (opts: RunOptions) => Promise<unknown>,
  ) => {
    activePause = null;
    activeRunId = null;
    set({
      runProgress: { status: 'queued', processedUnits: 0, totalUnits: 1 },
      interruptedRun: null,
      runControlError: null,
    });
    try {
      await run({
        correlationId: systemContext.nextCorrelationId(),
        measures: get().draftMeasures,
        ...(org ? { organizationId: org, persistToServer: true as const } : {}),
        onProgress: reportProgress,
        onPaused,
      });
    } catch (err) {
      const cancelled = errorCode(err) === 'SIMULATION_CANCELLED';
      set({
        interruptedRun: {
          versionId,
          seed,
          status: cancelled ? 'cancelled' : 'failed',
          ...(activeRunId ? { runId: activeRunId } : {}),
          message: message(err, cancelled ? 'Run abgebrochen.' : 'Run fehlgeschlagen.'),
        },
      });
      throw err;
    } finally {
      activePause = null;
      set({ runProgress: null });
    }
    get().refreshData();
  };

  const startVersion = (versionId: string, seed: number, org: string | undefined) =>
    executeRun(versionId, seed, org, (opts) =>
      scenarioService.runScenarioVersion(versionId, seed, undefined, opts),
    );

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
      // Gespeicherte Pause verwerfen (protokolliert den Abbruch in der DB),
      // sonst den Abbruch des laufenden Runs direkt protokollieren.
      if (org && pause) {
        discardRunPause(org, pause.runId).catch((err) =>
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
      const interrupted = get().interruptedRun;
      assertRunCommandAllowed('retry', interrupted?.status ?? null, role);
      if (!interrupted) return Promise.resolve();
      return retryGate.run(RETRY_KEY, async () => {
        if (interrupted.runId) audit(interrupted.runId, 'retried');
        await startVersion(interrupted.versionId, interrupted.seed, organizationId());
      });
    },

    loadPausedRuns: async (sessionOrganizationId) => {
      const org = organizationId() ?? sessionOrganizationId;
      if (!org) {
        set({ pausedRuns: [] });
        return;
      }
      try {
        set({ pausedRuns: await loadRunPauses(org) });
      } catch (err) {
        set({ runControlError: message(err, 'Pausierte Runs nicht geladen.') });
      }
    },

    resumePausedRun: async (runId, role) => {
      assertRunCommandAllowed('resumeFromSnapshot', null, role);
      const snapshot = get().pausedRuns.find((p) => p.runId === runId);
      if (!snapshot) return;
      const org = organizationId();
      activePause = snapshot;
      set({
        runProgress: {
          status: 'progress',
          processedUnits: snapshot.tick,
          totalUnits: snapshot.targetTicks,
        },
        runControlError: null,
      });
      audit(runId, 'resumed');
      try {
        await scenarioService.resumeFromSnapshot(snapshot, {
          ...(org ? { organizationId: org, persistToServer: true as const } : {}),
          onProgress: reportProgress,
          onPaused,
        });
      } catch (err) {
        set({ runControlError: message(err, 'Fortsetzen fehlgeschlagen.') });
        throw err;
      } finally {
        activePause = null;
        set({ runProgress: null });
      }
      get().refreshData();
      await get().loadPausedRuns();
    },

    discardPausedRun: async (runId, role) => {
      assertRunCommandAllowed('resumeFromSnapshot', null, role);
      const org = organizationId();
      if (!org) return;
      await discardRunPause(org, runId);
      await get().loadPausedRuns();
    },
  };
};
