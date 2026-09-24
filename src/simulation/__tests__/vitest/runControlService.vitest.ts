// 067Q / G63 — Run-Steuerung: Rollen-/Zustandsmatrix, Snapshot-Versiegelung und
// -Validierung, Retry-Idempotenz sowie der Kernnachweis: Pause + Resume (im
// selben Worker und frisch aus dem Snapshot) ist byte-identisch zum
// ununterbrochenen Lauf.
import { describe, expect, it } from 'vitest';
import {
  IdempotentCommandGate,
  allowedRunCommands,
  assertRunCommandAllowed,
  canControlRuns,
  sealRunSnapshot,
  validateRunSnapshot,
} from '../../runControlService';
import { RunCoordinator, type WorkerRunResult } from '../../runCoordinator';
import { HeadlessTestWorkerAdapter } from '../../worker/workerAdapter';
import type { RunManifest } from '../../../types/scenario';
import type { RunResumeSnapshot, RunResumeSnapshotBody } from '../../../types/runControl';

const TARGET = 30;

function manifest(runId = 'run-ctl-1'): RunManifest {
  return {
    runId,
    scenarioId: 'scen-ctl',
    scenarioVersionId: 'ver-ctl',
    seed: 424242,
    initialRngState: 424242,
    modelVersion: '1.0.0-v1',
    schemaVersion: '1.0.0',
    baselineVersion: 'baseline-x',
    baselineId: 'baseline-x',
    baselineHash: 'b'.repeat(64),
    organizationId: 'org-a',
    createdAt: '2026-01-01T00:00:00.000Z',
    simulationStartDate: '2026-01-01',
    targetTicks: TARGET,
    parameters: {
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
    },
    correlationId: 'corr-ctl',
  };
}

function comparable(r: WorkerRunResult) {
  return JSON.stringify({ ...r, timeSeries: r.timeSeries.filter((p) => p.tick > 0) });
}

function run(input: { resumeSnapshot?: RunResumeSnapshotBody; runId?: string } = {}) {
  const coordinator = new RunCoordinator(new HeadlessTestWorkerAdapter());
  const done = coordinator.execute({
    manifest: manifest(input.runId),
    targetTicks: TARGET,
    correlationId: 'corr-ctl',
    resumeSnapshot: input.resumeSnapshot,
  });
  return { coordinator, done };
}

/** Pausiert nach dem ersten Batch und liefert den Snapshot an der Tick-Grenze. */
function pauseAfterFirstBatch(coordinator: RunCoordinator): Promise<RunResumeSnapshotBody> {
  let requested = false;
  return new Promise((resolve) => {
    coordinator.onEvent((evt) => {
      if (!requested && evt.status === 'progress' && evt.processedUnits > 0) {
        requested = coordinator.pause();
      }
      if (evt.status === 'paused' && evt.snapshot) resolve(evt.snapshot);
    });
  });
}

async function sealedSnapshot(): Promise<RunResumeSnapshot> {
  const { coordinator, done } = run();
  const body = await pauseAfterFirstBatch(coordinator);
  coordinator.cancel();
  await done.catch(() => undefined);
  return sealRunSnapshot(body);
}

describe('runControlService (G63)', () => {
  it('Rollenmatrix: nur Admin/Manager steuern, Viewer nie', () => {
    expect(canControlRuns('admin')).toBe(true);
    expect(canControlRuns('manager')).toBe(true);
    expect(canControlRuns('viewer')).toBe(false);
    expect(canControlRuns(null)).toBe(false);
    expect(allowedRunCommands('running', 'viewer')).toEqual([]);
    expect(() => assertRunCommandAllowed('pause', 'running', 'viewer')).toThrow(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    );
    expect(() => assertRunCommandAllowed('resumeFromSnapshot', null, 'viewer')).toThrow(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    );
  });

  it('Zustandsmatrix: Befehle nur im passenden Zustand', () => {
    expect(allowedRunCommands('running', 'manager')).toEqual(['pause', 'cancel']);
    expect(allowedRunCommands('paused', 'manager')).toEqual(['resume', 'cancel']);
    expect(allowedRunCommands('cancelled', 'admin')).toEqual(['retry']);
    expect(allowedRunCommands('failed', 'admin')).toEqual(['retry']);
    expect(allowedRunCommands('completed', 'admin')).toEqual([]);
    expect(allowedRunCommands(null, 'admin')).toEqual([]);
    expect(() => assertRunCommandAllowed('resume', 'running', 'admin')).toThrow(
      expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }),
    );
    expect(() => assertRunCommandAllowed('pause', 'paused', 'admin')).toThrow(
      expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }),
    );
    expect(() => assertRunCommandAllowed('retry', null, 'admin')).toThrow(
      expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }),
    );
    expect(() => assertRunCommandAllowed('pause', 'running', 'admin')).not.toThrow();
  });

  it('Pause + Resume im selben Worker ist byte-identisch zum ununterbrochenen Lauf', async () => {
    const reference = await run().done;

    const { coordinator, done } = run();
    const snapshot = await pauseAfterFirstBatch(coordinator);
    expect(coordinator.getStatus()).toBe('paused');
    // Pause greift an der nächsten Tick-Grenze: angefordert nach Tick 1.
    expect(snapshot.tick).toBe(1);
    // Doppelte Pause sendet keinen zweiten Befehl.
    expect(coordinator.pause()).toBe(false);
    expect(coordinator.resume()).toBe(true);
    expect(coordinator.resume()).toBe(false);

    expect(comparable(await done)).toBe(comparable(reference));
  });

  it('Pause im Zustand queued greift nach dem ersten Tick, nicht nach einem Batch', async () => {
    const { coordinator, done } = run();
    const paused = new Promise<RunResumeSnapshotBody>((resolve) =>
      coordinator.onEvent((evt) => {
        if (evt.status === 'paused' && evt.snapshot) resolve(evt.snapshot);
      }),
    );
    expect(coordinator.pause()).toBe(true);
    expect((await paused).tick).toBe(1);
    coordinator.cancel();
    await expect(done).rejects.toMatchObject({ code: 'SIMULATION_CANCELLED' });
  });

  it('Resume aus Snapshot in frischem Worker ist byte-identisch', async () => {
    const reference = await run().done;
    const sealed = await sealedSnapshot();
    await validateRunSnapshot(sealed, { organizationId: 'org-a' });

    const resumed = await run({ resumeSnapshot: sealed }).done;
    expect(comparable(resumed)).toBe(comparable(reference));
  });

  it('Hash ist stabil gegen Key-Reihenfolge', async () => {
    const sealed = await sealedSnapshot();
    const { snapshotHash: _hash, ...body } = sealed;
    const reordered = Object.fromEntries(
      Object.entries(body).reverse(),
    ) as unknown as RunResumeSnapshotBody;
    expect((await sealRunSnapshot(reordered)).snapshotHash).toBe(sealed.snapshotHash);
  });

  it('undefined-Felder: versiegelbar, Hash übersteht den JSON-/JSONB-Roundtrip', async () => {
    const sealed = await sealedSnapshot();
    const withUndefined = {
      ...sealed,
      state: { ...sealed.state, optionalField: undefined },
    } as unknown as RunResumeSnapshotBody;
    const resealed = await sealRunSnapshot(withUndefined);
    expect(resealed.snapshotHash).toBe(sealed.snapshotHash);
    const roundTripped = JSON.parse(JSON.stringify(resealed)) as RunResumeSnapshot;
    await expect(validateRunSnapshot(roundTripped)).resolves.toBeUndefined();
  });

  it('jede Manipulation → SIMULATION_RESUME_INVALID', async () => {
    const sealed = await sealedSnapshot();
    const invalid = expect.objectContaining({ code: 'SIMULATION_RESUME_INVALID' });

    const tampered: Array<(s: RunResumeSnapshot) => RunResumeSnapshot> = [
      (s) => ({ ...s, tick: s.tick + 1 }),
      (s) => ({ ...s, rngState: s.rngState + 1 }),
      (s) => ({ ...s, state: { ...s.state, currentARR: 1 } }),
      (s) => ({ ...s, snapshotHash: '0'.repeat(64) }),
      (s) => ({ ...s, schema: 'x' as RunResumeSnapshot['schema'] }),
    ];
    for (const mutate of tampered) {
      await expect(validateRunSnapshot(mutate(sealed))).rejects.toEqual(invalid);
    }

    // Korrekt versiegelte, aber inkonsistente Bindungen.
    const resealed = async (patch: Partial<RunResumeSnapshotBody>) =>
      sealRunSnapshot({ ...sealed, ...patch });
    await expect(validateRunSnapshot(await resealed({ organizationId: 'org-b' }))).rejects.toEqual(
      invalid,
    );
    await expect(validateRunSnapshot(await resealed({ baselineHash: 'c' }))).rejects.toEqual(
      invalid,
    );
    await expect(validateRunSnapshot(await resealed({ modelVersion: '2.0.0' }))).rejects.toEqual(
      invalid,
    );
    await expect(validateRunSnapshot(await resealed({ tick: TARGET }))).rejects.toEqual(invalid);
    await expect(validateRunSnapshot(await resealed({ tick: 0 }))).rejects.toEqual(invalid);

    // Versiegelt, aber semantisch inkonsistent (Befund Codex-Review PR #27).
    const inconsistent: Array<Partial<RunResumeSnapshotBody>> = [
      { state: { ...sealed.state, tickCount: sealed.tick + 2 } },
      { leads: undefined as unknown as RunResumeSnapshotBody['leads'] },
      { timeSeries: sealed.timeSeries.slice(0, -1) },
      { timeSeries: [...sealed.timeSeries].reverse() },
      { historicalMetrics: undefined as unknown as RunResumeSnapshotBody['historicalMetrics'] },
      { correlationId: '' },
      {
        targetTicks: TARGET + 0.5,
        manifest: { ...sealed.manifest, targetTicks: TARGET + 0.5 },
      },
    ];
    for (const patch of inconsistent) {
      await expect(validateRunSnapshot(await resealed(patch))).rejects.toEqual(invalid);
    }

    // Sitzung/Anwendung passen nicht zum Snapshot.
    await expect(validateRunSnapshot(sealed, { organizationId: 'org-b' })).rejects.toEqual(invalid);
    await expect(validateRunSnapshot(sealed, { baselineHash: 'd' })).rejects.toEqual(invalid);
    await expect(validateRunSnapshot(sealed, { schemaVersion: '9' })).rejects.toEqual(invalid);
  });

  it('Retry-Idempotenz: gleichzeitige Aufrufe → genau ein Lauf', async () => {
    const gate = new IdempotentCommandGate();
    let calls = 0;
    const once = () =>
      gate.run('retry:ver-1', async () => {
        calls += 1;
        await Promise.resolve();
        return 'run-x';
      });
    const [a, b] = await Promise.all([once(), once()]);
    expect([a, b]).toEqual(['run-x', 'run-x']);
    expect(calls).toBe(1);
    expect(gate.isRunning('retry:ver-1')).toBe(false);
    await once();
    expect(calls).toBe(2);
  });

  it('Cancel während Pause → SIMULATION_CANCELLED, Worker terminiert', async () => {
    const { coordinator, done } = run();
    await pauseAfterFirstBatch(coordinator);
    coordinator.cancel();
    await expect(done).rejects.toMatchObject({ code: 'SIMULATION_CANCELLED' });
    expect(coordinator.getStatus()).toBe('cancelled');
    expect(coordinator.pause()).toBe(false);
    expect(coordinator.resume()).toBe(false);
  });
});
