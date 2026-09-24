import { parameterRegistry } from './parameterRegistry';
import {
  Scenario,
  ScenarioError,
  ScenarioParameters,
  ScenarioVersion,
  SimulationRun,
} from '../types/scenario';
import { SimulationEvent } from '../types/simulation';
import { SimulationSnapshot } from '../types/snapshot';

export const DEFAULT_BASE_2026_PARAMETERS: Readonly<ScenarioParameters> = Object.freeze(
  parameterRegistry.getDefaultParameters(),
);

export const DEFAULT_BASE_2026_SCENARIO_ID = 'scenario-base-2026';
export const DEFAULT_BASE_2026_VERSION_ID = 'ver-base-2026-v1';

export interface IScenarioRepository {
  getScenario(id: string): Scenario | null;
  getAllScenarios(): Scenario[];
  saveScenario(scenario: Scenario): void;
  deleteScenario(id: string): void;

  getVersion(versionId: string): ScenarioVersion | null;
  getVersionsByScenario(scenarioId: string): ScenarioVersion[];
  saveVersion(version: ScenarioVersion): void;

  getRun(runId: string): SimulationRun | null;
  getAllRuns(): SimulationRun[];
  getRunsByScenario(scenarioId: string): SimulationRun[];
  getRunsByVersion(versionId: string): SimulationRun[];
  saveRun(run: SimulationRun): void;

  // 067F / G49 (Nacharbeit): Run-Detailhistorie je Run (Events, Snapshots)
  // für die Workspace-Hydrierung nach Reload / zweiter Sitzung.
  getEventsByRun(runId: string): SimulationEvent[];
  saveEvents(runId: string, events: SimulationEvent[]): void;
  getSnapshotsByRun(runId: string): SimulationSnapshot[];
  saveSnapshots(runId: string, snapshots: SimulationSnapshot[]): void;
}

export class ScenarioRepository implements IScenarioRepository {
  private static instance: ScenarioRepository;

  private scenarios: Map<string, Scenario> = new Map();
  private versions: Map<string, ScenarioVersion> = new Map();
  private runs: Map<string, SimulationRun> = new Map();
  private eventsByRun: Map<string, SimulationEvent[]> = new Map();
  private snapshotsByRun: Map<string, SimulationSnapshot[]> = new Map();

  private constructor() {
    this.seedDefaultBaseScenario();
  }

  public static getInstance(): ScenarioRepository {
    if (!ScenarioRepository.instance) {
      ScenarioRepository.instance = new ScenarioRepository();
    }
    return ScenarioRepository.instance;
  }

  public resetToDefaults(): void {
    this.scenarios.clear();
    this.versions.clear();
    this.runs.clear();
    this.eventsByRun.clear();
    this.snapshotsByRun.clear();
    this.seedDefaultBaseScenario();
  }

  private seedDefaultBaseScenario(): void {
    const baseScenario: Scenario = {
      id: DEFAULT_BASE_2026_SCENARIO_ID,
      name: 'LeadPilot Basis-Szenario 2026',
      description: 'Offizielles Referenzszenario gemäß Faktenblatt v1.1',
      status: 'ACTIVE',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      currentVersionId: DEFAULT_BASE_2026_VERSION_ID,
      isProtected: true,
    };

    const baseVersion: ScenarioVersion = {
      id: DEFAULT_BASE_2026_VERSION_ID,
      scenarioId: DEFAULT_BASE_2026_SCENARIO_ID,
      versionNumber: 1,
      parameters: JSON.parse(JSON.stringify(DEFAULT_BASE_2026_PARAMETERS)),
      createdAt: '2026-01-01T00:00:00.000Z',
      description: 'Basis 2026 Ausgangsparameter',
    };

    this.scenarios.set(baseScenario.id, baseScenario);
    this.versions.set(baseVersion.id, baseVersion);
  }

  public getScenario(id: string): Scenario | null {
    const item = this.scenarios.get(id);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  public getAllScenarios(): Scenario[] {
    return Array.from(this.scenarios.values()).map((s) => JSON.parse(JSON.stringify(s)));
  }

  public saveScenario(scenario: Scenario): void {
    this.scenarios.set(scenario.id, JSON.parse(JSON.stringify(scenario)));
  }

  public deleteScenario(id: string): void {
    const scenario = this.scenarios.get(id);
    if (!scenario) {
      throw new ScenarioError('NOT_FOUND', `Szenario "${id}" wurde nicht gefunden.`);
    }
    if (scenario.isProtected) {
      throw new ScenarioError(
        'SCENARIO_PROTECTED_ERROR',
        `Das geschützte Basis-Szenario "${scenario.name}" kann nicht gelöscht werden.`,
      );
    }
    this.scenarios.delete(id);
  }

  public getVersion(versionId: string): ScenarioVersion | null {
    const item = this.versions.get(versionId);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  public getVersionsByScenario(scenarioId: string): ScenarioVersion[] {
    return Array.from(this.versions.values())
      .filter((v) => v.scenarioId === scenarioId)
      .map((v) => JSON.parse(JSON.stringify(v)));
  }

  public saveVersion(version: ScenarioVersion): void {
    this.versions.set(version.id, JSON.parse(JSON.stringify(version)));
  }

  public getRun(runId: string): SimulationRun | null {
    const item = this.runs.get(runId);
    return item ? JSON.parse(JSON.stringify(item)) : null;
  }

  public getAllRuns(): SimulationRun[] {
    return Array.from(this.runs.values()).map((r) => JSON.parse(JSON.stringify(r)));
  }

  public getRunsByScenario(scenarioId: string): SimulationRun[] {
    return Array.from(this.runs.values())
      .filter((r) => r.scenarioId === scenarioId)
      .map((r) => JSON.parse(JSON.stringify(r)));
  }

  public getRunsByVersion(versionId: string): SimulationRun[] {
    return Array.from(this.runs.values())
      .filter((r) => r.scenarioVersionId === versionId)
      .map((r) => JSON.parse(JSON.stringify(r)));
  }

  public saveRun(run: SimulationRun): void {
    const scenarioRuns = this.getRunsByScenario(run.scenarioId);
    const isExisting = this.runs.has(run.runId);

    // Max 10 saved runs rule per scenario
    if (!isExisting && scenarioRuns.length >= 10) {
      throw new ScenarioError(
        'MAX_RUNS_EXCEEDED',
        `Das Limit von maximal 10 Ergebnisläufen für Szenario "${run.scenarioId}" ist erreicht. Ein 11. Lauf wurde fachlich abgelehnt.`,
      );
    }

    // Freeze manifest and parameters for immutability
    const clonedRun: SimulationRun = JSON.parse(JSON.stringify(run));
    Object.freeze(clonedRun.manifest.parameters);
    Object.freeze(clonedRun.manifest);
    Object.freeze(clonedRun);

    this.runs.set(run.runId, clonedRun);
  }

  public getEventsByRun(runId: string): SimulationEvent[] {
    const items = this.eventsByRun.get(runId) ?? [];
    return JSON.parse(JSON.stringify(items));
  }

  public saveEvents(runId: string, events: SimulationEvent[]): void {
    this.eventsByRun.set(runId, JSON.parse(JSON.stringify(events)));
  }

  public getSnapshotsByRun(runId: string): SimulationSnapshot[] {
    const items = this.snapshotsByRun.get(runId) ?? [];
    return JSON.parse(JSON.stringify(items));
  }

  public saveSnapshots(runId: string, snapshots: SimulationSnapshot[]): void {
    this.snapshotsByRun.set(runId, JSON.parse(JSON.stringify(snapshots)));
  }
}

export const scenarioRepository: IScenarioRepository = ScenarioRepository.getInstance();
