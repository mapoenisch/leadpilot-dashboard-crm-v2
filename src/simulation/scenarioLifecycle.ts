import { systemContext } from './systemContext';
import { parameterRegistry } from './parameterRegistry';
import { DEFAULT_BASE_2026_PARAMETERS, ScenarioRepository } from './scenarioRepository';
import { Scenario, ScenarioError, ScenarioParameters, ScenarioVersion } from '../types/scenario';

// 067K / G57 — aus scenarioService.ts herausgelöste Lebenszyklus-Methoden
// (reine Code-Bewegung, keine Verhaltensänderung). Das Repository wird
// explizit übergeben statt aus Instanzzustand gelesen.
export function createScenarioWith(
  repo: ScenarioRepository,
  name: string,
  description?: string,
  parameters?: Partial<ScenarioParameters>,
  parentScenarioId?: string,
): { scenario: Scenario; version: ScenarioVersion } {
  const scenarioId = systemContext.nextScenarioId();
  const versionId = `ver-${scenarioId}-v1`;
  const nowIso = systemContext.now();

  const mergedParams: ScenarioParameters = {
    ...DEFAULT_BASE_2026_PARAMETERS,
    ...parameters,
  };

  const validation = parameterRegistry.validateAllParameters(mergedParams);
  if (!validation.valid) {
    throw new ScenarioError(
      'VALIDATION_ERROR',
      `Parameter-Validierung fehlgeschlagen: ${validation.errors.join('; ')}`,
    );
  }

  const version: ScenarioVersion = {
    id: versionId,
    scenarioId,
    versionNumber: 1,
    parameters: Object.freeze(JSON.parse(JSON.stringify(validation.normalizedParams))),
    createdAt: nowIso,
    description: description || 'Initialversion v1',
  };

  const scenario: Scenario = {
    id: scenarioId,
    name,
    description,
    status: 'ACTIVE',
    createdAt: nowIso,
    updatedAt: nowIso,
    currentVersionId: versionId,
    isProtected: false,
    parentScenarioId,
  };

  repo.saveVersion(version);
  repo.saveScenario(scenario);

  return { scenario, version };
}

/**
 * Creates a new immutable ScenarioVersion (e.g. v2) for an existing scenario.
 * Past versions remain 100% immutable.
 */
export function createScenarioVersionWith(
  repo: ScenarioRepository,
  scenarioId: string,
  parameters: Partial<ScenarioParameters>,
  description?: string,
): ScenarioVersion {
  const scenario = repo.getScenario(scenarioId);
  if (!scenario) {
    throw new ScenarioError('NOT_FOUND', `Szenario "${scenarioId}" wurde nicht gefunden.`);
  }

  const existingVersions = repo.getVersionsByScenario(scenarioId);
  const nextVersionNum = existingVersions.length + 1;
  const versionId = `ver-${scenarioId}-v${nextVersionNum}`;
  const nowIso = systemContext.now();

  const latestVersion = existingVersions[existingVersions.length - 1];
  const baseParams = latestVersion ? latestVersion.parameters : DEFAULT_BASE_2026_PARAMETERS;
  const mergedParams: ScenarioParameters = {
    ...baseParams,
    ...parameters,
  };

  const validation = parameterRegistry.validateAllParameters(mergedParams);
  if (!validation.valid) {
    throw new ScenarioError(
      'VALIDATION_ERROR',
      `Parameter-Validierung fehlgeschlagen: ${validation.errors.join('; ')}`,
    );
  }

  const newVersion: ScenarioVersion = {
    id: versionId,
    scenarioId,
    versionNumber: nextVersionNum,
    parameters: Object.freeze(JSON.parse(JSON.stringify(validation.normalizedParams))),
    createdAt: nowIso,
    description: description || `Version v${nextVersionNum}`,
  };

  repo.saveVersion(newVersion);

  scenario.currentVersionId = versionId;
  scenario.updatedAt = nowIso;
  repo.saveScenario(scenario);

  return newVersion;
}
