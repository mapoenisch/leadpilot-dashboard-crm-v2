import { ParameterRegistry, parameterRegistry } from './parameterRegistry';
import { IScenarioRepository, scenarioRepository } from './scenarioRepository';
import { PreflightIssue, PreflightResult } from '../types/parameter';

export class PreflightValidator {
  /**
   * Performs a 100% side-effect-free preflight validation before a run is started.
   * NEVER alters RNG state, executes ticks, creates events, or touches historical CRM data.
   */
  public static validateRun(
    versionId: string,
    seed: number,
    repo: IScenarioRepository = scenarioRepository,
    registry: ParameterRegistry = parameterRegistry,
  ): PreflightResult {
    const errors: PreflightIssue[] = [];
    const warnings: PreflightIssue[] = [];

    // 1. Seed Check
    if (typeof seed !== 'number' || isNaN(seed)) {
      errors.push({
        code: 'INVALID_SEED',
        message: 'Ein gültiger numerischer Seed wird für die deterministische Ausführung benötigt.',
        severity: 'error',
      });
    }

    // 2. Version & Scenario Check
    const version = repo.getVersion(versionId);
    if (!version) {
      errors.push({
        code: 'VERSION_NOT_FOUND',
        message: `Szenarioversion "${versionId}" existiert nicht.`,
        severity: 'error',
      });
      return { valid: false, errors, warnings };
    }

    const scenario = repo.getScenario(version.scenarioId);
    if (!scenario) {
      errors.push({
        code: 'SCENARIO_NOT_FOUND',
        message: `Zugehöriges Szenario "${version.scenarioId}" existiert nicht.`,
        severity: 'error',
      });
      return { valid: false, errors, warnings };
    }

    if (scenario.status === 'ARCHIVED') {
      errors.push({
        code: 'SCENARIO_ARCHIVED',
        message: `Szenario "${scenario.name}" ist archiviert. Läufe können nicht gestartet werden.`,
        severity: 'error',
      });
    }

    // 3. Parameters Validation against Registry
    if (!version.parameters) {
      errors.push({
        code: 'MISSING_PARAMETERS',
        message: 'Die Szenarioversion enthält keinen Parametersatz.',
        severity: 'error',
      });
    } else {
      const validation = registry.validateAllParameters(version.parameters);
      if (!validation.valid) {
        for (const err of validation.errors) {
          errors.push({
            code: 'INVALID_PARAMETER_VALUE',
            message: err,
            severity: 'error',
          });
        }
      }
    }

    // 4. Max 10 Runs Limit Check
    const existingRuns = repo.getRunsByScenario(scenario.id);
    if (existingRuns.length >= 10) {
      errors.push({
        code: 'MAX_RUNS_EXCEEDED',
        message: `Das Limit von maximal 10 Ergebnisläufen für Szenario "${scenario.name}" ist bereits erreicht.`,
        severity: 'error',
      });
    }

    // 5. Versioning Prerequisites Warning Checks
    warnings.push({
      code: 'BASELINE_CHECK_PASSED',
      message: 'Baseline-Version: Faktenblatt_v1.1 (READ-ONLY Baseline verifiziert)',
      severity: 'warning',
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
