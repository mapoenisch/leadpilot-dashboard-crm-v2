// 067Q / G63 — Resume aus Snapshot über den Service-Pfad (Main-Thread in
// Node): Ein im Worker pausierter Lauf, im Main-Thread aus dem versiegelten
// Snapshot fortgesetzt, ergibt denselben Endstand wie der ununterbrochene
// Worker-Lauf. Unbekannte Version und fremde Organisation brechen ab.
import { beforeAll, describe, expect, it } from 'vitest';
import { RunCoordinator, type WorkerRunResult } from '../../runCoordinator';
import { HeadlessTestWorkerAdapter } from '../../worker/workerAdapter';
import { sealRunSnapshot } from '../../runControlService';
import { resumeRunFromSnapshotWith } from '../../scenarioRunResume';
import { ScenarioRepository, DEFAULT_BASE_2026_VERSION_ID } from '../../scenarioRepository';
import type { ScenarioRunContext } from '../../scenarioRunExecutor';
import { BASELINE_PERIOD_START } from '../../constants';
import { BaselineSnapshotService } from '../../../services/data/baselineSnapshotService';
import { dataSourceRegistry } from '../../../services/data';
import type { RunManifest } from '../../../types/scenario';
import type { RunResumeSnapshot, RunResumeSnapshotBody } from '../../../types/runControl';

const TARGET = 24;
const BASELINE_VERSION = 'baseline-resume-svc-test';
let baseline: { sourceId: string; hash: string };

beforeAll(async () => {
  // Echte, eingefrorene Baseline des Mandanten — der Resume prüft ihren Hash.
  const sourceId = dataSourceRegistry.getActive().info.id;
  const ds = await BaselineSnapshotService.capture(
    sourceId,
    BASELINE_VERSION,
    BASELINE_PERIOD_START,
    '2026-01-01T00:00:00.000Z',
    { organizationId: 'org-a' },
  );
  baseline = { sourceId, hash: ds.baselineHash };
});

function manifest(): RunManifest {
  const version = ScenarioRepository.getInstance().getVersion(DEFAULT_BASE_2026_VERSION_ID);
  if (!version) throw new Error('Basisversion fehlt');
  return {
    runId: 'run-resume-svc',
    scenarioId: version.scenarioId,
    scenarioVersionId: version.id,
    seed: 90210,
    initialRngState: 90210,
    modelVersion: '1.0.0-v1',
    schemaVersion: '1.0.0',
    baselineVersion: BASELINE_VERSION,
    baselineId: BASELINE_VERSION,
    baselineHash: baseline.hash,
    dataSourceId: baseline.sourceId,
    organizationId: 'org-a',
    createdAt: '2026-01-01T00:00:00.000Z',
    simulationStartDate: '2026-01-01',
    targetTicks: TARGET,
    parameters: JSON.parse(JSON.stringify(version.parameters)),
    correlationId: 'corr-resume-svc',
    measures: [],
  };
}

function workerRun(pause: boolean): {
  done: Promise<WorkerRunResult>;
  paused: Promise<RunResumeSnapshotBody>;
  coordinator: RunCoordinator;
} {
  const coordinator = new RunCoordinator(new HeadlessTestWorkerAdapter());
  let requested = false;
  const paused = new Promise<RunResumeSnapshotBody>((resolve) => {
    coordinator.onEvent((evt) => {
      if (pause && !requested && evt.status === 'progress' && evt.processedUnits > 0) {
        requested = coordinator.pause();
      }
      if (evt.status === 'paused' && evt.snapshot) resolve(evt.snapshot);
    });
  });
  const done = coordinator.execute({
    manifest: manifest(),
    targetTicks: TARGET,
    correlationId: 'corr-resume-svc',
  });
  return { done, paused, coordinator };
}

async function snapshot(): Promise<RunResumeSnapshot> {
  const { paused, coordinator, done } = workerRun(true);
  const body = await paused;
  coordinator.cancel();
  await done.catch(() => undefined);
  return sealRunSnapshot(body);
}

const ctx: ScenarioRunContext = {
  repo: ScenarioRepository.getInstance(),
  getSnapshotRepo: () => undefined,
  runTicksInWorker: () => Promise.reject(new Error('Node-Test nutzt den Main-Thread-Pfad')),
};

describe('scenarioRunResume (G63)', () => {
  it('Main-Thread-Resume = ununterbrochener Worker-Lauf', async () => {
    const reference = await workerRun(false).done;
    const sealed = await snapshot();
    expect(sealed.tick).toBeGreaterThan(0);

    let accepted = 0;
    const resumed = await resumeRunFromSnapshotWith(ctx, sealed, {
      organizationId: 'org-a',
      persist: false,
      onAccepted: () => {
        accepted += 1;
      },
    });
    expect(accepted).toBe(1);

    expect(resumed.run.runId).toBe('run-resume-svc');
    expect(resumed.run.status).toBe('COMPLETED');
    expect(resumed.run.rngState).toBe(reference.rngState);
    expect(JSON.stringify(resumed.state)).toBe(JSON.stringify(reference.finalState));
    expect(JSON.stringify((resumed.run.timeSeries ?? []).filter((p) => p.tick > 0))).toBe(
      JSON.stringify(reference.timeSeries.filter((p) => p.tick > 0)),
    );
    const withCorr = reference.events.map((e) => ({
      ...e,
      correlationId: e.correlationId ?? 'corr-resume-svc',
    }));
    expect(JSON.stringify(resumed.events)).toBe(JSON.stringify(withCorr));
    // Der Snapshot selbst bleibt unverändert (Hash weiter gültig).
    expect((await sealRunSnapshot(sealed)).snapshotHash).toBe(sealed.snapshotHash);
  });

  it('geänderte oder nicht auflösbare aktive Baseline → SIMULATION_RESUME_INVALID', async () => {
    const sealed = await snapshot();
    const invalid = expect.objectContaining({ code: 'SIMULATION_RESUME_INVALID' });
    let accepted = 0;
    const onAccepted = () => {
      accepted += 1;
    };
    // Snapshot trägt den Hash einer älteren Baseline (Daten seit der Pause geändert).
    const stale = await sealRunSnapshot({
      ...sealed,
      baselineHash: 'f'.repeat(64),
      manifest: { ...sealed.manifest, baselineHash: 'f'.repeat(64) },
    });
    await expect(
      resumeRunFromSnapshotWith(ctx, stale, { persist: false, onAccepted }),
    ).rejects.toEqual(invalid);
    // Baseline weder eingefroren noch aus einer Quelle neu erfassbar.
    const unknownSource = await sealRunSnapshot({
      ...sealed,
      manifest: {
        ...sealed.manifest,
        baselineVersion: 'baseline-unbekannt',
        dataSourceId: 'quelle-unbekannt',
      },
    });
    await expect(
      resumeRunFromSnapshotWith(ctx, unknownSource, { persist: false, onAccepted }),
    ).rejects.toEqual(invalid);
    // Abgelehnte Resumes werden nie als angenommen gemeldet (kein Audit).
    expect(accepted).toBe(0);
  });

  it('fremde Organisation und unbekannte Version → SIMULATION_RESUME_INVALID', async () => {
    const sealed = await snapshot();
    const invalid = expect.objectContaining({ code: 'SIMULATION_RESUME_INVALID' });
    await expect(
      resumeRunFromSnapshotWith(ctx, sealed, { organizationId: 'org-b', persist: false }),
    ).rejects.toEqual(invalid);

    const foreign = await sealRunSnapshot({
      ...sealed,
      scenarioVersionId: 'ver-unbekannt',
      manifest: { ...sealed.manifest, scenarioVersionId: 'ver-unbekannt' },
    });
    await expect(resumeRunFromSnapshotWith(ctx, foreign, { persist: false })).rejects.toEqual(
      invalid,
    );
  });
});
