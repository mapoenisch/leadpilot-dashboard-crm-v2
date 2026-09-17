import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSimulationStore } from '../simulationStore';
import { ScenarioRepository } from '@/simulation/scenarioRepository';
import type { Scenario, ScenarioVersion, SimulationRun } from '@/types/scenario';
import type { ScenarioWorkspace } from '@/services/runs/runPersistenceService';

vi.mock('@/services/runs/runPersistenceService', () => ({
  loadScenarioWorkspace: vi.fn(),
  persistCompletedRun: vi.fn(),
}));

import { loadScenarioWorkspace as mockedLoad } from '@/services/runs/runPersistenceService';

function scenario(id: string): Scenario {
  return {
    id,
    name: id,
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    currentVersionId: `${id}-v1`,
    isProtected: false,
  };
}

function version(id: string, scenarioId: string): ScenarioVersion {
  return {
    id,
    scenarioId,
    versionNumber: 1,
    parameters: {} as ScenarioVersion['parameters'],
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function run(id: string, scenarioId: string, versionId: string, org: string): SimulationRun {
  return {
    runId: id,
    scenarioId,
    scenarioVersionId: versionId,
    seed: 1,
    rngState: 1,
    modelVersion: '1.0.0-v1',
    schemaVersion: '1.0.0',
    baselineVersion: 'b',
    status: 'COMPLETED',
    startedAt: '2026-01-01T00:00:00.000Z',
    manifest: {
      runId: id,
      scenarioId,
      scenarioVersionId: versionId,
      seed: 1,
      initialRngState: 1,
      modelVersion: '1.0.0-v1',
      schemaVersion: '1.0.0',
      baselineVersion: 'b',
      baselineId: 'b',
      baselineHash: 'h'.repeat(64),
      organizationId: org,
      createdAt: '2026-01-01T00:00:00.000Z',
      simulationStartDate: '2026-01-01',
      targetTicks: 1,
      parameters: {} as ScenarioVersion['parameters'],
      correlationId: 'corr',
    },
    correlationId: 'corr',
  };
}

// 067F / G49 (Nacharbeit P1): Organisationswechsel im selben Browser leakt
// keinen lokalen Zustand — die Hydrierung ersetzt den Workspace.
describe('workspaceHydration (G49 Org-Wechsel)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ScenarioRepository.getInstance().resetToDefaults();
  });

  it('ersetzt Szenarien, Versionen, Runs und Auswahl beim Mandantenwechsel', async () => {
    const repo = ScenarioRepository.getInstance();
    repo.saveScenario(scenario('scen-a'));
    repo.saveVersion(version('ver-a-1', 'scen-a'));
    repo.saveRun(run('run-a-1', 'scen-a', 'ver-a-1', 'org-a'));
    expect(repo.getScenario('scen-a')).not.toBeNull();

    const workspaceB: ScenarioWorkspace = {
      scenarios: [scenario('scen-b')],
      versions: [version('ver-b-1', 'scen-b')],
      runs: [run('run-b-1', 'scen-b', 'ver-b-1', 'org-b')],
    };
    vi.mocked(mockedLoad).mockResolvedValue(workspaceB);

    await useSimulationStore.getState().hydrateWorkspace('org-b');

    expect(mockedLoad).toHaveBeenCalledWith('org-b');
    expect(repo.getScenario('scen-a')).toBeNull();
    expect(repo.getRun('run-a-1')).toBeNull();
    expect(repo.getScenario('scen-b')).not.toBeNull();
    expect(repo.getRun('run-b-1')).not.toBeNull();
    const state = useSimulationStore.getState();
    expect(state.activeOrganizationId).toBe('org-b');
    expect(state.activeScenarioId).toBe('scen-b');
    expect(state.runs.some((r) => r.runId === 'run-a-1')).toBe(false);
    expect(state.runs.some((r) => r.runId === 'run-b-1')).toBe(true);
  });

  it('lässt den alten Stand bei Serverfehler unberührt', async () => {
    const repo = ScenarioRepository.getInstance();
    repo.saveScenario(scenario('scen-a'));
    useSimulationStore.setState({ activeOrganizationId: 'org-a', activeScenarioId: 'scen-a' });
    vi.mocked(mockedLoad).mockRejectedValue(new Error('offline'));
    await expect(useSimulationStore.getState().hydrateWorkspace('org-b')).rejects.toThrow(
      'offline',
    );
    expect(repo.getScenario('scen-a')).not.toBeNull();
    expect(useSimulationStore.getState().activeOrganizationId).toBe('org-a');
    expect(useSimulationStore.getState().activeScenarioId).toBe('scen-a');
  });
});
