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

  it('Abbruch → interruptedRun; zwei Retries → genau ein Lauf mit gleichem Seed', async () => {
    const run = vi
      .spyOn(scenarioService, 'runScenarioVersion')
      .mockRejectedValueOnce(new RunControlError('SIMULATION_CANCELLED', 'Run abgebrochen.'))
      .mockResolvedValue({} as never);

    await expect(useSimulationStore.getState().runVersion('ver-1', 'org-a')).rejects.toMatchObject({
      code: 'SIMULATION_CANCELLED',
    });
    const interrupted = useSimulationStore.getState().interruptedRun;
    expect(interrupted).toMatchObject({ versionId: 'ver-1', status: 'cancelled' });
    const seed = run.mock.calls[0]?.[1];
    expect(interrupted?.seed).toBe(seed);

    const { retryRun } = useSimulationStore.getState();
    await Promise.all([retryRun('admin'), retryRun('admin')]);
    expect(run).toHaveBeenCalledTimes(2);
    expect(run.mock.calls[1]?.[1]).toBe(seed);
    expect(useSimulationStore.getState().interruptedRun).toBeNull();
    expect(() => useSimulationStore.getState().retryRun('viewer')).toThrow();
  });

  it('Pause meldet Status, persistiert den versiegelten Snapshot; Abbruch verwirft ihn', async () => {
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
    await flush();

    expect(useSimulationStore.getState().runProgress).toEqual({
      status: 'paused',
      processedUnits: 10,
      totalUnits: 50,
    });
    expect(persistence.persistRunPause).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-s1',
        snapshotHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );

    useSimulationStore.getState().cancelRun('manager');
    await expect(pending).rejects.toMatchObject({ code: 'SIMULATION_CANCELLED' });
    expect(persistence.discardRunPause).toHaveBeenCalledWith('org-a', 'run-s1');
    expect(useSimulationStore.getState().interruptedRun?.status).toBe('cancelled');
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
    expect(persistence.persistRunPause).not.toHaveBeenCalled();
  });

  it('Resume aus gespeicherter Pause: Service mit Mandant, Audit, danach Neuladen', async () => {
    const snapshot = pausedBody();
    useSimulationStore.setState({ pausedRuns: [snapshot] });
    const resume = vi.spyOn(scenarioService, 'resumeFromSnapshot').mockResolvedValue({} as never);

    await useSimulationStore.getState().resumePausedRun('run-s1', 'manager');

    expect(resume).toHaveBeenCalledWith(
      snapshot,
      expect.objectContaining({ organizationId: 'org-a', persistToServer: true }),
    );
    expect(persistence.recordRunControl).toHaveBeenCalledWith(
      'org-a',
      'run-s1',
      'resumed',
      expect.any(String),
    );
    expect(persistence.loadRunPauses).toHaveBeenCalledWith('org-a');
    await expect(
      useSimulationStore.getState().resumePausedRun('run-s1', 'viewer'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
