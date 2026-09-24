// 067Q / G63 — Run-Steuerung: zentrale Regeln für Pause, Fortsetzen, Abbruch,
// Retry und Resume aus Snapshot. Rolle und Zustand entscheiden, welcher Befehl
// zulässig ist; ein Snapshot wird nur nach Hash- und Bindungsprüfung genutzt
// (fail-closed mit SIMULATION_RESUME_INVALID).
import { can } from '../auth/permissions';
import { canonicalSha256 } from '../services/data/canonicalHash';
import type { OrganizationRole } from '../types/organization';
import {
  RUN_RESUME_SNAPSHOT_SCHEMA,
  RunControlError,
  type RunControlCommand,
  type RunControlStatus,
  type RunResumeSnapshot,
  type RunResumeSnapshotBody,
} from '../types/runControl';

const ALLOWED_BY_STATUS: Record<RunControlStatus, readonly RunControlCommand[]> = {
  queued: ['pause', 'cancel'],
  running: ['pause', 'cancel'],
  progress: ['pause', 'cancel'],
  paused: ['resume', 'cancel'],
  cancelled: ['retry'],
  failed: ['retry'],
  completed: [],
};

/** Steuern dürfen nur Rollen mit `simulation:run` (Admin, Manager). */
export function canControlRuns(role: OrganizationRole | null | undefined): boolean {
  return role != null && can('simulation:run', role);
}

/** Befehle, die in diesem Zustand für diese Rolle angeboten werden. */
export function allowedRunCommands(
  status: RunControlStatus | null,
  role: OrganizationRole | null | undefined,
): readonly RunControlCommand[] {
  if (!status || !canControlRuns(role)) return [];
  return ALLOWED_BY_STATUS[status];
}

export function assertRunCommandAllowed(
  command: RunControlCommand,
  status: RunControlStatus | null,
  role: OrganizationRole | null | undefined,
): void {
  if (!canControlRuns(role)) {
    throw new RunControlError('FORBIDDEN', 'Diese Rolle darf Simulationsläufe nicht steuern.');
  }
  if (command === 'resumeFromSnapshot') return;
  if (!status || !ALLOWED_BY_STATUS[status].includes(command)) {
    throw new RunControlError(
      'INVALID_STATE_TRANSITION',
      `Befehl "${command}" ist im Zustand "${status ?? 'kein Run'}" nicht zulässig.`,
    );
  }
}

function snapshotBody(snapshot: RunResumeSnapshotBody): RunResumeSnapshotBody {
  const { snapshotHash: _ignored, ...body } = snapshot as RunResumeSnapshot;
  return body;
}

/**
 * Versiegelt einen Zwischenstand mit dem SHA-256 seiner kanonischen Form.
 * Vorher JSON-Normalisierung: genau diese Form speichert JSONB, und die
 * kanonische Serialisierung akzeptiert keine `undefined`-Werte.
 */
export async function sealRunSnapshot(body: RunResumeSnapshotBody): Promise<RunResumeSnapshot> {
  const clean = JSON.parse(JSON.stringify(snapshotBody(body))) as RunResumeSnapshotBody;
  return { ...clean, snapshotHash: await canonicalSha256(clean) };
}

export interface ResumeExpectation {
  organizationId?: string;
  baselineHash?: string;
  modelVersion?: string;
  schemaVersion?: string;
}

function invalid(reason: string): never {
  throw new RunControlError('SIMULATION_RESUME_INVALID', `Snapshot ungültig: ${reason}.`);
}

/**
 * Prüft Hash, Schema, Tick-Grenzen und die Bindung an Manifest und Sitzung.
 * Jede Abweichung bricht ab — ein manipulierter Snapshot rechnet nie weiter.
 */
export async function validateRunSnapshot(
  snapshot: RunResumeSnapshot,
  expected: ResumeExpectation = {},
): Promise<void> {
  if (!snapshot || snapshot.schema !== RUN_RESUME_SNAPSHOT_SCHEMA) invalid('unbekanntes Schema');
  const actualHash = await canonicalSha256(snapshotBody(snapshot));
  if (actualHash !== snapshot.snapshotHash) invalid('Hash stimmt nicht');
  const m = snapshot.manifest;
  if (!m || m.runId !== snapshot.runId) invalid('Manifest gehört nicht zum Run');
  if (m.seed !== snapshot.seed || m.targetTicks !== snapshot.targetTicks) {
    invalid('Seed oder Tick-Ziel weicht vom Manifest ab');
  }
  if (m.scenarioVersionId !== snapshot.scenarioVersionId) invalid('Version weicht ab');
  if (m.organizationId !== snapshot.organizationId) invalid('Organisation weicht ab');
  if (m.baselineHash !== snapshot.baselineHash) invalid('Baseline-Hash weicht ab');
  if (m.modelVersion !== snapshot.modelVersion || m.schemaVersion !== snapshot.schemaVersion) {
    invalid('Modell- oder Schemaversion weicht ab');
  }
  if (
    !Number.isInteger(snapshot.tick) ||
    snapshot.tick <= 0 ||
    snapshot.tick >= snapshot.targetTicks
  ) {
    invalid('Tick liegt außerhalb des Laufs');
  }
  if (!Number.isFinite(snapshot.rngState)) invalid('PRNG-Zustand fehlt');
  if (
    expected.organizationId !== undefined &&
    snapshot.organizationId !== expected.organizationId
  ) {
    invalid('fremde Organisation');
  }
  if (expected.baselineHash !== undefined && snapshot.baselineHash !== expected.baselineHash) {
    invalid('aktive Baseline weicht ab');
  }
  if (expected.modelVersion !== undefined && snapshot.modelVersion !== expected.modelVersion) {
    invalid('Modellversion der Anwendung weicht ab');
  }
  if (expected.schemaVersion !== undefined && snapshot.schemaVersion !== expected.schemaVersion) {
    invalid('Schemaversion der Anwendung weicht ab');
  }
}

/**
 * Idempotenz für Befehle mit Seiteneffekt (Retry): Solange ein Aufruf mit
 * demselben Schlüssel läuft, liefert jeder weitere denselben Promise.
 */
export class IdempotentCommandGate {
  private readonly inFlight = new Map<string, Promise<unknown>>();

  public run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) return existing as Promise<T>;
    const promise = fn().finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, promise);
    return promise;
  }

  public isRunning(key: string): boolean {
    return this.inFlight.has(key);
  }
}
