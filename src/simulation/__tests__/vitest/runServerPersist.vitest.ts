import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScenarioRepository } from '../../scenarioRepository';
import { ScenarioService } from '../../scenarioService';
import { systemContext } from '../../systemContext';
import { BaselineSnapshotService } from '../../../services/data/baselineSnapshotService';
import { dataSourceRegistry } from '../../../services/data';
import { persistCompletedRun } from '../../../services/runs/runPersistenceService';
import type { RunBundle } from '../../../services/runs/runPersistenceService';

vi.mock('../../../services/runs/runPersistenceService', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../services/runs/runPersistenceService')>();
  return { ...actual, persistCompletedRun: vi.fn() };
});

const mockedPersist = vi.mocked(persistCompletedRun);

// 067F / G49 (Nacharbeit P1): Produktive Runs liefern vollständige Bundles —
// finalState, Zeitreihe, Events und mindestens den Final-Snapshot.
describe('runServerPersist (G49 Bundle-Vollständigkeit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    systemContext.__overrideForTest({
      now: () => '2026-01-01T00:00:00.000Z',
      nextScenarioId: () => 'scen-persist',
      nextRunId: (seed, versionNumber) => `run-persist-s${seed}-v${versionNumber}`,
      nextCorrelationId: () => 'corr-persist',
      newRunSeed: () => 777001,
    });
    dataSourceRegistry.setActive('simulated-crm');
    ScenarioRepository.getInstance().resetToDefaults();
    BaselineSnapshotService.clear();
    mockedPersist.mockResolvedValue('run-persist-s777001-v1');
  });

  it('persistToServer sendet finalState, Zeitreihe, Events und Final-Snapshot', async () => {
    const service = ScenarioService.getInstance();
    const { version } = service.createScenario('Persist-Voll', 'v23-persist-voll');
    await service.runScenarioVersion(version.id, 777001, 5, {
      dataSourceId: 'simulated-crm',
      organizationId: 'org-a',
      persistToServer: true,
    });

    expect(mockedPersist).toHaveBeenCalledTimes(1);
    const bundle = mockedPersist.mock.calls[0]?.[0] as RunBundle;
    expect(bundle.organizationId).toBe('org-a');
    expect(bundle.run.finalState?.tickCount).toBe(5);
    expect(bundle.timeSeries).toHaveLength(6);
    expect(bundle.events.length).toBeGreaterThan(0);
    expect(bundle.snapshots.length).toBeGreaterThan(0);
    const final = bundle.snapshots.find((s) => s.tickId === 5);
    expect(final?.snapshotId).toBe(`${bundle.run.runId}_tick_5`);
    expect(final?.state).toBeDefined();
  });

  it('ohne persistToServer kein Serverkontakt', async () => {
    const service = ScenarioService.getInstance();
    const { version } = service.createScenario('Persist-Aus', 'v23-persist-aus');
    await service.runScenarioVersion(version.id, 777001, 5, {
      dataSourceId: 'simulated-crm',
    });
    expect(mockedPersist).not.toHaveBeenCalled();
  });
});
