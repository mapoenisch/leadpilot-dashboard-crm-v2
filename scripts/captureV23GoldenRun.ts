// G44 (Auftrag 067A, Block B): Reproduzierbare Erzeugung der
// v2.2.0-Golden-Fixture. Führt denselben Run (Seed 777001, 120 Ticks,
// 2026-01-01, feste IDs) zweimal mit vollständig zurückgesetztem Zustand aus
// und schreibt die Fixture nur bei Bytegleichheit beider Läufe.
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ScenarioRepository } from '../src/simulation/scenarioRepository.js';
import { ScenarioService } from '../src/simulation/scenarioService.js';
import { systemContext } from '../src/simulation/systemContext.js';
import { BaselineSnapshotService } from '../src/services/data/baselineSnapshotService.js';
import { dataSourceRegistry } from '../src/services/data/index.js';

export const GOLDEN_SEED = 777001;
export const GOLDEN_TICKS = 120;
export const GOLDEN_NOW = '2026-01-01T00:00:00.000Z';
export const GOLDEN_START_DATE = '2026-01-01';
export const GOLDEN_SOURCE_ID = 'simulated-crm';

const outputPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../src/review/fixtures/v2.2.0-golden-run.json',
);

export function applyGoldenOverrides(): void {
  systemContext.__overrideForTest({
    now: () => GOLDEN_NOW,
    nextScenarioId: () => 'scen-fixed',
    nextRunId: (seed, versionNumber) => `run-fixed-s${seed}-v${versionNumber}`,
    nextCorrelationId: () => 'corr-fixed',
    newRunSeed: () => GOLDEN_SEED,
  });
}

export function resetGoldenState(): void {
  applyGoldenOverrides();
  dataSourceRegistry.setActive(GOLDEN_SOURCE_ID);
  ScenarioRepository.getInstance().resetToDefaults();
  BaselineSnapshotService.clear();
}

function sha256Hex(payload: string): string {
  return createHash('sha256').update(payload, 'utf-8').digest('hex');
}

export interface GoldenRunCapture {
  input: {
    seed: number;
    ticks: number;
    simulationStartDate: string;
    dataSourceId: string;
    now: string;
  };
  manifest: unknown;
  finalMetrics: unknown;
  rngState: unknown;
  eventSignature: string[];
  timeSeriesHash: string;
  timeSeriesLength: number;
}

export async function captureGoldenRun(): Promise<GoldenRunCapture> {
  const service = ScenarioService.getInstance();
  const { version } = service.createScenario('Golden', 'v23-golden-run');
  const result = await service.runScenarioVersion(version.id, GOLDEN_SEED, GOLDEN_TICKS);
  const timeSeries = result.run.timeSeries ?? [];
  return {
    input: {
      seed: GOLDEN_SEED,
      ticks: GOLDEN_TICKS,
      simulationStartDate: GOLDEN_START_DATE,
      dataSourceId: GOLDEN_SOURCE_ID,
      now: GOLDEN_NOW,
    },
    manifest: result.run.manifest,
    finalMetrics: result.run.finalMetrics,
    rngState: result.run.rngState,
    eventSignature: result.events.map(
      (event) => `${event.id}|${event.type}|${event.correlationId}`,
    ),
    timeSeriesHash: sha256Hex(JSON.stringify(timeSeries)),
    timeSeriesLength: timeSeries.length,
  };
}

async function main(): Promise<void> {
  resetGoldenState();
  const first = await captureGoldenRun();
  resetGoldenState();
  const second = await captureGoldenRun();
  assert.deepEqual(second, first);
  writeFileSync(outputPath, `${JSON.stringify(first, null, 2)}\n`);
  // eslint-disable-next-line no-console
  console.log(`[captureV23GoldenRun] Fixture geschrieben: ${outputPath}`);
}

await main();
