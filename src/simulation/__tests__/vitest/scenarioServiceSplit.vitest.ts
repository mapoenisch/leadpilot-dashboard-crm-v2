// 067K / G57: Aufteilungsnachweis für scenarioService.ts — jede delegierte
// Methode liefert identische Ergebnisse wie die direkt aufgerufene
// Modulfunktion (reine Code-Bewegung, keine Verhaltensänderung).
import { describe, it, expect } from 'vitest';
import { ScenarioService, scenarioService } from '../../scenarioService';
import { ScenarioRepository } from '../../scenarioRepository';
import { compareVersionsWith } from '../../scenarioCompare';
import { compareMultipleVersionsWith } from '../../scenarioMultiCompare';
import { diffFinalMetrics, getScenarioAggregationWith } from '../../scenarioWorkspace';
import { executeTicksMainThread } from '../../scenarioTickRunner';

describe('067K ScenarioService-Aufteilung', () => {
  it('öffentliche API ist vollständig erhalten', () => {
    for (const method of [
      'createScenario',
      'createScenarioVersion',
      'runScenarioVersion',
      'reRun',
      'reproduce',
      'loadScenarioWorkspace',
      'previewMeasures',
      'deleteScenario',
      'getScenarioAggregation',
      'getScenarios',
      'getScenario',
      'getVersionsForScenario',
      'getVersion',
      'getRunsForVersion',
      'getAllRuns',
      'getRun',
      'compareVersions',
      'compareMultipleVersions',
      'adoptConfiguration',
      'cancelActiveRun',
      'pruneCompletedRun',
      'setSnapshotRepository',
    ] as const) {
      expect(typeof (scenarioService as unknown as Record<string, unknown>)[method], method).toBe(
        'function',
      );
    }
    expect(ScenarioService.getInstance()).toBe(scenarioService);
    expect(typeof executeTicksMainThread).toBe('function');
  });

  it('Modulfunktionen stimmen mit Service-Delegaten überein', () => {
    const { scenario, version } = scenarioService.createScenario('Split-Nachweis');
    const repo = ScenarioRepository.getInstance();
    const aggregate = (versionId: string) => getScenarioAggregationWith(repo, versionId);

    // Leere Aggregation ohne Runs ist deterministisch identisch.
    expect(getScenarioAggregationWith(repo, version.id)).toEqual(
      scenarioService.getScenarioAggregation(version.id),
    );

    // Vergleich ohne Runs: identische Struktur und Texte.
    expect(compareVersionsWith(repo, aggregate, version.id, version.id)).toEqual(
      scenarioService.compareVersions(version.id, version.id),
    );
    expect(compareMultipleVersionsWith(repo, aggregate, [version.id, version.id])).toEqual(
      scenarioService.compareMultipleVersions([version.id, version.id]),
    );

    // Differenz reiner Null-Metriken ist stabil.
    expect(diffFinalMetrics(undefined, undefined)).toEqual([
      expect.objectContaining({ kpiId: 'liveARR', delta: 0, deltaPercent: 0 }),
      expect.objectContaining({ kpiId: 'liveMRR', delta: 0, deltaPercent: 0 }),
      expect.objectContaining({ kpiId: 'liveCustomers', delta: 0, deltaPercent: 0 }),
      expect.objectContaining({ kpiId: 'liveCash', delta: 0, deltaPercent: 0 }),
      expect.objectContaining({ kpiId: 'liveEBITDA', delta: 0, deltaPercent: 0 }),
    ]);

    expect(scenario.id).toBeTruthy();
  });
});
