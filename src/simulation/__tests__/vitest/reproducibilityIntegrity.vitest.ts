// Vitest-Wrapper: 019 - Reproducibility
// G31: Vier-Schritte-Verfahren. Original-Harness (reproducibilityIntegrity.test.ts) unverändert.
//
// HAERTUNG: Mutations-Beweis zeigte, dass der Original-Harness eine veraenderte PRNG-Konstante
// ueberlebt (Reproduzierbarkeit bleibt erhalten, absoluter Wert nicht geprueft).
// Zusaetzlicher Golden-Value-Test faengt PRNG-Algo-Aenderungen ab.

import { describe, it, expect } from 'vitest';
import { DeterministicRNG } from '../../prng';
import { runReproducibilityTest } from '../reproducibilityIntegrity.test';
import { ScenarioRepository } from '../../scenarioRepository';
import { ScenarioService } from '../../scenarioService';
import { systemContext } from '../../systemContext';
import { BaselineSnapshotService } from '../../../services/data/baselineSnapshotService';
import { dataSourceRegistry } from '../../../services/data';

describe('019 - Reproducibility', () => {
  it('verifyIntegrity-Harness besteht', async () => {
    const result = await runReproducibilityTest();
    if (!result.success) {
      const failures = result.log.filter((l) => l.includes('❌'));
      throw new Error(
        'Integrity-Suite fehlgeschlagen:\n' +
          (failures.join('\n') || result.log.slice(-5).join('\n')),
      );
    }
    expect(result.success).toBe(true);
  }, 60_000);

  it('PRNG Mulberry32 Golden Value — Seed 42 erste drei Werte', () => {
    // Goldwerte fuer Mulberry32 mit Seed 42 und Konstante 0x6d2b79f5.
    // Schlaegt fehl wenn PRNG-Konstante oder Algorithmus veraendert wird.
    const rng = new DeterministicRNG(42);
    const v1 = rng.next();
    const v2 = rng.next();
    const v3 = rng.next();
    expect(v1).toBeCloseTo(0.6011, 3);
    expect(v2).toBeCloseTo(0.4483, 3);
    expect(v3).toBeCloseTo(0.8525, 3);
  });
});

describe('067E G48 — Baseline-Verdrahtung und Hash-Prüfung', () => {
  function setup() {
    systemContext.__overrideForTest({
      now: () => '2026-01-01T00:00:00.000Z',
      nextScenarioId: () => 'scen-g48',
      nextRunId: (seed, versionNumber) => `run-g48-s${seed}-v${versionNumber}`,
      nextCorrelationId: () => 'corr-g48',
      newRunSeed: () => 777001,
    });
    dataSourceRegistry.setActive('simulated-crm');
    ScenarioRepository.getInstance().resetToDefaults();
    BaselineSnapshotService.clear();
  }

  it('gleiche Baseline + gleicher Seed = bit-identisches Ergebnis', async () => {
    setup();
    const service = ScenarioService.getInstance();
    const { version } = service.createScenario('G48-Determinismus', 'v23-g48-determinism');
    const first = await service.runScenarioVersion(version.id, 777001, 5, {
      dataSourceId: 'simulated-crm',
    });
    const second = await service.runScenarioVersion(version.id, 777001, 5, {
      dataSourceId: 'simulated-crm',
    });
    expect(second.run.finalMetrics).toEqual(first.run.finalMetrics);
    expect(second.run.manifest.baselineHash).toBe(first.run.manifest.baselineHash);
  }, 60_000);

  it('andere Baseline + gleicher Seed = fachlich anderes Ergebnis', async () => {
    setup();
    await BaselineSnapshotService.capture(
      'simulated-crm',
      'g48-other',
      '2026-01-01',
      '2026-01-01T00:00:00.000Z',
      {
        historicalMetrics: { baseCustomers: 10, baseMRR: 1000, baseARR: 12000 },
      },
    );
    const service = ScenarioService.getInstance();
    const { version } = service.createScenario('G48-Differenz', 'v23-g48-difference');
    const anchored = await service.runScenarioVersion(version.id, 777001, 5, {
      dataSourceId: 'simulated-crm',
    });
    const other = await service.runScenarioVersion(version.id, 777001, 5, {
      baselineVersion: 'g48-other',
    });
    expect(other.run.finalMetrics).not.toEqual(anchored.run.finalMetrics);
    expect(other.run.manifest.baselineHash).not.toBe(anchored.run.manifest.baselineHash);
    // P1a-Negativtest: Die Override-Baseline (baseARR 12000) verletzt keine
    // Invariante — der Validator rechnet mit Baseline-Werten, nicht mit 411840.
    expect(other.run.finalState?.hasInvariantViolation).toBe(false);
  }, 60_000);

  it('manipulierte Baseline bricht mit BASELINE_HASH_MISMATCH ab', async () => {
    setup();
    const service = ScenarioService.getInstance();
    const { version } = service.createScenario('G48-Manipulation', 'v23-g48-tamper');
    const good = await service.runScenarioVersion(version.id, 777001, 5, {
      dataSourceId: 'simulated-crm',
    });
    await expect(
      service.runScenarioVersion(version.id, 777001, 5, {
        baselineVersion: good.run.manifest.baselineVersion,
        expectedBaselineHash: 'f'.repeat(64),
      }),
    ).rejects.toMatchObject({ name: 'ScenarioError', code: 'BASELINE_HASH_MISMATCH' });
    // Reproduktion mit korrektem Hash läuft dagegen durch.
    const reproduced = await service.reproduce(good.run.runId, 5);
    expect(reproduced.run.finalMetrics).toEqual(good.run.finalMetrics);
  }, 60_000);

  it('Reproduktion gelingt nach Speicher-Verlust (Reload) per Rekonstruktion', async () => {
    setup();
    const service = ScenarioService.getInstance();
    const { version } = service.createScenario('G49-Reload', 'v23-g49-reload');
    const good = await service.runScenarioVersion(version.id, 777001, 5, {
      dataSourceId: 'simulated-crm',
    });
    // Reload-Simulation: eingefrorene Baselines vergessen, Repository bleibt.
    BaselineSnapshotService.clear();
    expect(BaselineSnapshotService.has(good.run.manifest.baselineVersion)).toBe(false);
    const reproduced = await service.reproduce(good.run.runId, 5);
    expect(reproduced.run.finalMetrics).toEqual(good.run.finalMetrics);
    expect(reproduced.run.manifest.baselineHash).toBe(good.run.manifest.baselineHash);
  }, 60_000);

  it('fremder Mandant bricht mit ORG_MISMATCH ab', async () => {
    setup();
    await BaselineSnapshotService.capture(
      'simulated-crm',
      'g48-org',
      '2026-01-01',
      '2026-01-01T00:00:00.000Z',
      {
        organizationId: 'org-a',
      },
    );
    const service = ScenarioService.getInstance();
    const { version } = service.createScenario('G48-Mandant', 'v23-g48-org');
    await expect(
      service.runScenarioVersion(version.id, 777001, 5, {
        baselineVersion: 'g48-org',
        organizationId: 'org-b',
      }),
    ).rejects.toMatchObject({ name: 'ScenarioError', code: 'ORG_MISMATCH' });
    const same = await service.runScenarioVersion(version.id, 777001, 5, {
      baselineVersion: 'g48-org',
      organizationId: 'org-a',
    });
    expect(same.run.manifest.organizationId).toBe('org-a');
  }, 60_000);

  it('unknown-Baseline bedient keinen realen Mandanten (und umgekehrt)', async () => {
    setup();
    await BaselineSnapshotService.capture(
      'simulated-crm',
      'g48-legacy',
      '2026-01-01',
      '2026-01-01T00:00:00.000Z',
    );
    await BaselineSnapshotService.capture(
      'simulated-crm',
      'g48-org-mix',
      '2026-01-01',
      '2026-01-01T00:00:00.000Z',
      {
        organizationId: 'org-a',
      },
    );
    const service = ScenarioService.getInstance();
    const { version } = service.createScenario('G48-Legacy-Mix', 'v23-g48-legacy-mix');
    await expect(
      service.runScenarioVersion(version.id, 777001, 5, {
        baselineVersion: 'g48-legacy',
        organizationId: 'org-real-review',
      }),
    ).rejects.toMatchObject({ name: 'ScenarioError', code: 'ORG_MISMATCH' });
    await expect(
      service.runScenarioVersion(version.id, 777001, 5, {
        baselineVersion: 'g48-org-mix',
      }),
    ).rejects.toMatchObject({ name: 'ScenarioError', code: 'ORG_MISMATCH' });
    // unknown-gegen-unknown (Legacy, z. B. Golden Run) bleibt zulässig.
    const legacy = await service.runScenarioVersion(version.id, 777001, 5, {
      baselineVersion: 'g48-legacy',
    });
    expect(legacy.run.manifest.organizationId).toBe('unknown');
  }, 60_000);
});
