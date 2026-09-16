// G44 (Auftrag 067A, Block B): Grüner Schutztest gegen fachliche Drift des
// v2.2.0-Simulationsstands. Ein frischer Run mit Golden-Inputs (Seed 777001,
// 120 Ticks, 2026-01-01, feste IDs) muss exakt der Fixture
// v2.2.0-golden-run.json entsprechen. Gehört zur normalen Vitest-Suite.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DeterministicRNG } from '../../prng';
import { ScenarioRepository } from '../../scenarioRepository';
import { ScenarioService } from '../../scenarioService';
import { systemContext } from '../../systemContext';
import { BaselineSnapshotService } from '../../../services/data/baselineSnapshotService';
import { dataSourceRegistry } from '../../../services/data';

const fixturePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../review/fixtures/v2.2.0-golden-run.json',
);

describe('v23 golden run characterization', () => {
  it('reproduziert die v2.2.0-Golden-Fixture exakt', async () => {
    systemContext.__overrideForTest({
      now: () => '2026-01-01T00:00:00.000Z',
      nextScenarioId: () => 'scen-fixed',
      nextRunId: (seed, versionNumber) => `run-fixed-s${seed}-v${versionNumber}`,
      nextCorrelationId: () => 'corr-fixed',
      newRunSeed: () => 777001,
    });
    dataSourceRegistry.setActive('simulated-crm');
    ScenarioRepository.getInstance().resetToDefaults();
    BaselineSnapshotService.clear();

    const service = ScenarioService.getInstance();
    const { version } = service.createScenario('Golden', 'v23-golden-run');
    const result = await service.runScenarioVersion(version.id, 777001, 120);

    const timeSeries = result.run.timeSeries ?? [];
    const fresh = {
      input: {
        seed: 777001,
        ticks: 120,
        simulationStartDate: '2026-01-01',
        dataSourceId: 'simulated-crm',
        now: '2026-01-01T00:00:00.000Z',
      },
      manifest: result.run.manifest,
      finalMetrics: result.run.finalMetrics,
      rngState: result.run.rngState,
      eventSignature: result.events.map(
        (event) => `${event.id}|${event.type}|${event.correlationId}`,
      ),
      timeSeriesHash: createHash('sha256').update(JSON.stringify(timeSeries), 'utf-8').digest('hex'),
      timeSeriesLength: timeSeries.length,
    };

    const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as unknown;
    expect(fresh).toEqual(fixture);
    expect(result.run.manifest.simulationStartDate).toBe('2026-01-01');
    expect(result.run.manifest.createdAt).toBe('2026-01-01T00:00:00.000Z');
  }, 60_000);

  it('hält die PRNG-Goldwerte für Seed 42', () => {
    const rng = new DeterministicRNG(42);
    expect(rng.next()).toBeCloseTo(0.6011, 3);
    expect(rng.next()).toBeCloseTo(0.4483, 3);
    expect(rng.next()).toBeCloseTo(0.8525, 3);
  });
});
