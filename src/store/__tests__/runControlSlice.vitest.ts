// 067Q / G63 — Run-Steuerung im Store: Rollenprüfung, Abbruch → Retry mit
// gleichem Seed (idempotent), Pause → versiegelter Snapshot wird persistiert,
// Abbruch nach Pause verwirft die Server-Pause, Resume aus gespeicherter Pause.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSimulationStore } from '../simulationStore';
import { scenarioService } from '@/simulation/scenarioService';
import { RunControlError, type RunResumeSnapshot } from '@/types/runControl';
import type { RunOptions } from '@/types/scenario';
import * as persistence from '@/services/runs/runPersistenceService';

vi.mock('@/services/runs/runPersistenceService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/runs/runPersistenceService')>();
  return {
    ...actual,
    persistRunPause: vi.fn().mockResolvedValue(undefined),
    discardRunPause: vi.fn().mockResolvedValue(true),
    recordRunControl: vi.fn().mockResolvedValue(undefined),
    loadRunPauses: vi.fn().mockResolvedValue([]),
  };
});

const initial = useSimulationStore.getState();
const flush = () => new Promise((r) => setTimeout(r, 0));

function pausedBody(): RunResumeSnapshot {
  return {
    schema: 'run-resume-snapshot/1',
    runId: 'run-s1',
    organizationId: 'org-a',
    scenarioVersionId: 'ver-1',
    baselineHash: 'b',
    modelVersion: '1.0.0-v1',
    schemaVersion: '1.0.0',
    seed: 7,
    tick: 10,
    targetTicks: 50,
    rngState: 1,
    correlationId: 'c',
    manifest: { runId: 'run-s1' } as RunResumeSnapshot['manifest'],
    historicalMetrics: {} as RunResumeSnapshot['historicalMetrics'],
    state: {} as RunResumeSnapshot['state'],
    leads: [],
    opportunities: [],
    deals: [],
    activities: [],
    queueEntries: [],
    csQueueEntries: [],
    events: [],
    timeSeries: [],
    snapshotHash: 'h',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useSimulationStore.setState({ activeOrganizationId: 'org-a', refreshData: vi.fn() });
});

afterEach(() => {
  vi.restoreAllMocks();
  useSimulationStore.setState(initial, true);
});

describe('runSlice — Run-Steuerung (G63)', () => {
  it('Viewer und falscher Zustand werden abgewiesen', () => {
    const s = useSimulationStore.getState();
    expect(() => s.pauseRun('viewer')).toThrow(expect.objectContaining({ code: 'FORBIDDEN' }));
    expect(() => s.pauseRun('admin')).toThrow(
      expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }),
    );
    expect(() => s.resumeRun('manager')).toThrow(
      expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }),
    );
  });

  it('Retry: gleicher Seed und ursprüngliche Bindung, idempotent, Audit erst nach Annahme', async () => {
    const m1 = [{ id: 'm1' }] as never;
    useSimulationStore.setState({ draftMeasures: m1 });
    vi.spyOn(scenarioService, 'getActiveRunId').mockReturnValue('run-x');
    const run = vi
      .spyOn(scenarioService, 'runScenarioVersion')
      .mockImplementationOnce(async (_v, _s, _t, opts) => {
        opts?.onProgress?.(1, 50);
        throw new RunControlError('SIMULATION_CANCELLED', 'Run abgebrochen.');
      })
      .mockImplementation(async (_v, _s, _t, opts) => {
        // Vor der Annahme (erstes Worker-Ereignis) noch kein Retry-Audit.
        expect(persistence.recordRunControl).not.toHaveBeenCalledWith(
          'org-a',
          'run-x',
          'retried',
          expect.any(String),
        );
        opts?.onProgress?.(0, 50);
        return {} as never;
      });

    await expect(useSimulationStore.getState().runVersion('ver-1', 'org-a')).rejects.toMatchObject({
      code: 'SIMULATION_CANCELLED',
    });
    const interrupted = useSimulationStore.getState().interruptedRun;
    expect(interrupted).toMatchObject({ versionId: 'ver-1', status: 'cancelled', runId: 'run-x' });
    const seed = run.mock.calls[0]?.[1];
    const firstOpts = run.mock.calls[0]?.[3];
    expect(interrupted?.seed).toBe(seed);

    // Spätere Änderung der Entwurfsmaßnahmen darf den Retry nicht beeinflussen.
    useSimulationStore.setState({ draftMeasures: [{ id: 'm2' }] as never });
    const { retryRun } = useSimulationStore.getState();
    await Promise.all([retryRun('admin'), retryRun('admin')]);
    expect(run).toHaveBeenCalledTimes(2);
    const retryOpts = run.mock.calls[1]?.[3];
    expect(run.mock.calls[1]?.[1]).toBe(seed);
    expect(retryOpts?.measures).toEqual(m1);
    expect(retryOpts?.dataSourceId).toBe(firstOpts?.dataSourceId);
    await flush();
    expect(persistence.recordRunControl).toHaveBeenCalledWith(
      'org-a',
      'run-x',
      'retried',
      expect.any(String),
    );
    expect(useSimulationStore.getState().interruptedRun).toBeNull();
    expect(() => useSimulationStore.getState().retryRun('viewer')).toThrow();
  });

  it('Abbruch im Zustand queued wird protokolliert, sobald die Run-ID bekannt ist (G64)', async () => {
    const activeId = vi.spyOn(scenarioService, 'getActiveRunId').mockReturnValue(null);
    vi.spyOn(scenarioService, 'cancelActiveRun').mockImplementation(() => undefined);
    let release: () => void = () => undefined;
    const cancelled = new Promise<void>((r) => (release = r));
    vi.spyOn(scenarioService, 'runScenarioVersion').mockImplementation(async (_v, _s, _t, opts) => {
      await cancelled;
      // Der Worker hat den Lauf angenommen und meldet die ID, bevor der Abbruch greift.
      activeId.mockReturnValue('run-q');
      opts?.onProgress?.(0, 50);
      throw new RunControlError('SIMULATION_CANCELLED', 'Run abgebrochen.');
    });
    const running = useSimulationStore.getState().runVersion('ver-1', 'org-a');
    useSimulationStore.getState().cancelRun('admin');
    expect(persistence.recordRunControl).not.toHaveBeenCalled();
    release();
    await expect(running).rejects.toMatchObject({ code: 'SIMULATION_CANCELLED' });
    await flush();
    expect(persistence.recordRunControl).toHaveBeenCalledTimes(1);
    expect(persistence.recordRunControl).toHaveBeenCalledWith(
      'org-a',
      'run-q',
      'cancelled',
      expect.any(String),
    );
  });

  it('Pause gilt erst nach gespeichertem Snapshot; Abbruch verwirft danach', async () => {
    let captured: RunOptions | undefined;
    vi.spyOn(scenarioService, 'runScenarioVersion').mockImplementation(
      (_v, _s, _t, opts) =>
        new Promise((_, reject) => {
          captured = opts;
          vi.spyOn(scenarioService, 'cancelActiveRun').mockImplementation(() =>
            reject(new RunControlError('SIMULATION_CANCELLED', 'Run abgebrochen.')),
          );
        }),
    );
    const pending = useSimulationStore.getState().runVersion('ver-1', 'org-a');
    await flush();
    const { snapshotHash: _h, ...body } = pausedBody();
    captured?.onPaused?.(body);

    // Sofort: Worker pausiert, Snapshot wird gespeichert — nur Abbruch möglich.
    expect(useSimulationStore.getState().runProgress?.status).toBe('pausing');
    expect(() => useSimulationStore.getState().resumeRun('admin')).toThrow(
      expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }),
    );
    await vi.waitFor(() =>
      expect(useSimulationStore.getState().runProgress).toEqual({
        status: 'paused',
        processedUnits: 10,
        totalUnits: 50,
      }),
    );
    expect(persistence.persistRunPause).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-s1',
        snapshotHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );

    useSimulationStore.getState().cancelRun('manager');
    await expect(pending).rejects.toMatchObject({ code: 'SIMULATION_CANCELLED' });
    await vi.waitFor(() =>
      expect(persistence.discardRunPause).toHaveBeenCalledWith('org-a', 'run-s1'),
    );
    const persistOrder = vi.mocked(persistence.persistRunPause).mock.invocationCallOrder[0] ?? 0;
    const discardOrder = vi.mocked(persistence.discardRunPause).mock.invocationCallOrder[0] ?? 0;
    expect(discardOrder).toBeGreaterThan(persistOrder);
    expect(useSimulationStore.getState().interruptedRun?.status).toBe('cancelled');
  });

  it('Abbruch während des Speicherns: Verwerfen läuft erst nach dem Speichern', async () => {
    let finishPersist: () => void = () => undefined;
    vi.mocked(persistence.persistRunPause).mockImplementationOnce(
      () => new Promise<void>((resolve) => (finishPersist = resolve)),
    );
    let captured: RunOptions | undefined;
    vi.spyOn(scenarioService, 'runScenarioVersion').mockImplementation(
      (_v, _s, _t, opts) =>
        new Promise((_, reject) => {
          captured = opts;
          vi.spyOn(scenarioService, 'cancelActiveRun').mockImplementation(() =>
            reject(new RunControlError('SIMULATION_CANCELLED', 'Run abgebrochen.')),
          );
        }),
    );
    const pending = useSimulationStore.getState().runVersion('ver-1', 'org-a');
    await flush();
    const { snapshotHash: _h, ...body } = pausedBody();
    captured?.onPaused?.(body);
    await vi.waitFor(() => expect(persistence.persistRunPause).toHaveBeenCalled());

    useSimulationStore.getState().cancelRun('admin');
    await expect(pending).rejects.toMatchObject({ code: 'SIMULATION_CANCELLED' });
    await flush();
    expect(persistence.discardRunPause).not.toHaveBeenCalled();
    finishPersist();
    await vi.waitFor(() =>
      expect(persistence.discardRunPause).toHaveBeenCalledWith('org-a', 'run-s1'),
    );
  });

  it('Snapshot einer fremden Organisation wird nicht persistiert', async () => {
    let captured: RunOptions | undefined;
    vi.spyOn(scenarioService, 'runScenarioVersion').mockImplementation((_v, _s, _t, opts) => {
      captured = opts;
      return new Promise(() => undefined);
    });
    void useSimulationStore.getState().runVersion('ver-1', 'org-a');
    await flush();
    const { snapshotHash: _h, ...body } = pausedBody();
    captured?.onPaused?.({ ...body, organizationId: 'org-b' });
    await flush();
    expect(persistence.persistRunPause).not.toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-b' }),
    );
    expect(useSimulationStore.getState().runProgress?.status).toBe('paused');
  });

  it('Resume aus gespeicherter Pause: Audit erst nach Annahme, danach Neuladen', async () => {
    const snapshot = pausedBody();
    useSimulationStore.setState({ pausedRuns: [snapshot], pausedRunsOrganizationId: 'org-a' });
    const resume = vi
      .spyOn(scenarioService, 'resumeFromSnapshot')
      .mockImplementation(async (_s, opts) => {
        expect(persistence.recordRunControl).not.toHaveBeenCalled();
        opts?.onAccepted?.();
        return {} as never;
      });

    await useSimulationStore.getState().resumePausedRun('run-s1', 'manager');

    expect(resume).toHaveBeenCalledWith(
      snapshot,
      expect.objectContaining({ organizationId: 'org-a', persistToServer: true }),
    );
    await vi.waitFor(() =>
      expect(persistence.recordRunControl).toHaveBeenCalledWith(
        'org-a',
        'run-s1',
        'resumed',
        expect.any(String),
      ),
    );
    expect(persistence.loadRunPauses).toHaveBeenCalledWith('org-a');
    await expect(
      useSimulationStore.getState().resumePausedRun('run-s1', 'viewer'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('abgelehnter Resume: kein Audit, kein unterbrochener Run, Pausenliste neu geladen', async () => {
    const snapshot = pausedBody();
    useSimulationStore.setState({ pausedRuns: [snapshot], pausedRunsOrganizationId: 'org-a' });
    vi.spyOn(scenarioService, 'resumeFromSnapshot').mockRejectedValue(
      new RunControlError('SIMULATION_RESUME_INVALID', 'Snapshot ungültig: Hash stimmt nicht.'),
    );
    await expect(
      useSimulationStore.getState().resumePausedRun('run-s1', 'admin'),
    ).rejects.toMatchObject({ code: 'SIMULATION_RESUME_INVALID' });
    await flush();
    expect(persistence.recordRunControl).not.toHaveBeenCalled();
    expect(useSimulationStore.getState().interruptedRun).toBeNull();
    expect(useSimulationStore.getState().runControlError).toMatch(/Hash stimmt nicht/);
    expect(persistence.loadRunPauses).toHaveBeenCalledWith('org-a');
  });

  it('angenommener, dann abgebrochener Resume wird zum unterbrochenen Run', async () => {
    const snapshot = pausedBody();
    useSimulationStore.setState({ pausedRuns: [snapshot], pausedRunsOrganizationId: 'org-a' });
    vi.spyOn(scenarioService, 'resumeFromSnapshot').mockImplementation(async (_s, opts) => {
      opts?.onAccepted?.();
      throw new RunControlError('SIMULATION_CANCELLED', 'Run abgebrochen.');
    });
    await expect(
      useSimulationStore.getState().resumePausedRun('run-s1', 'admin'),
    ).rejects.toMatchObject({ code: 'SIMULATION_CANCELLED' });
    expect(useSimulationStore.getState().interruptedRun).toMatchObject({
      versionId: 'ver-1',
      seed: 7,
      status: 'cancelled',
      runId: 'run-s1',
    });
    expect(persistence.loadRunPauses).toHaveBeenCalledWith('org-a');
  });

  it('Pausenliste: Sitzungsorganisation ist maßgeblich, Wechsel leert sofort', async () => {
    const snapshot = pausedBody();
    useSimulationStore.setState({
      activeOrganizationId: 'org-a',
      pausedRuns: [snapshot],
      pausedRunsOrganizationId: 'org-a',
    });
    let resolveLoad: (value: RunResumeSnapshot[]) => void = () => undefined;
    vi.mocked(persistence.loadRunPauses).mockImplementationOnce(
      () => new Promise((resolve) => (resolveLoad = resolve)),
    );
    const loading = useSimulationStore.getState().loadPausedRuns('org-b');
    // Veralteter Workspace (org-a) wird ignoriert; alte Liste sofort weg.
    expect(persistence.loadRunPauses).toHaveBeenCalledWith('org-b');
    expect(useSimulationStore.getState().pausedRuns).toEqual([]);
    resolveLoad([]);
    await loading;
    expect(useSimulationStore.getState().pausedRunsOrganizationId).toBe('org-b');

    vi.mocked(persistence.loadRunPauses).mockRejectedValueOnce(new Error('boom'));
    useSimulationStore.setState({ pausedRuns: [snapshot] });
    await useSimulationStore.getState().loadPausedRuns('org-b');
    expect(useSimulationStore.getState().pausedRuns).toEqual([]);
  });
});
