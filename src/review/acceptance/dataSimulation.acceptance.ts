// G44 (Auftrag 067A, Block C/D): Rote Daten-, Simulations- und Worker-Verträge.
// Bewusst rot — friert die bestätigten Mängel als Sollverträge ein.
// Produktdateien werden dafür nicht verändert.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CRMRepository } from '../../services/db/crmRepository';
import { BaselineSnapshotService } from '../../services/data/baselineSnapshotService';
import { dataSourceRegistry } from '../../services/data';
import { ScenarioRepository } from '../../simulation/scenarioRepository';
import { ScenarioService } from '../../simulation/scenarioService';
import { systemContext } from '../../simulation/systemContext';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const GOLDEN_NOW = '2026-01-01T00:00:00.000Z';

function readRepo(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), 'utf-8');
}

function applyDeterministicContext(): void {
  systemContext.__overrideForTest({
    now: () => GOLDEN_NOW,
    nextScenarioId: () => 'scen-fixed',
    nextRunId: (seed, versionNumber) => `run-fixed-s${seed}-v${versionNumber}`,
    nextCorrelationId: () => 'corr-fixed',
    newRunSeed: () => 777001,
  });
}

describe('v2.3.0 data and simulation findings', () => {
  it('[PR-SOURCE-04] kennzeichnet jede CRM-Antwort mit Quellen-Envelope', async () => {
    dataSourceRegistry.setActive('simulated-crm');
    const companies = await CRMRepository.getCompanies();
    expect(companies.length, 'stiller Fallback liefert Daten').toBeGreaterThan(0);
    const repositorySource = readRepo('src/services/db/crmRepository.ts');
    expect.soft(
      /catch[\s\S]{0,400}getActive/.test(repositorySource),
      'stiller Fallback-Mechanismus belegt (catch → getActive)',
    ).toBe(true);
    expect.soft(
      repositorySource,
      'Supabase-Fehler trägt expliziten Quellen-Fehlercode',
    ).toMatch(/DATA_SOURCE_UNAVAILABLE|DATA_SOURCE_INTEGRITY/);
    const envelope = (companies as unknown as { envelope?: { source?: unknown; mode?: unknown } })
      .envelope;
    expect.soft(envelope?.source, 'Envelope nennt die Quelle').toBeDefined();
    expect.soft(envelope?.mode, 'Envelope nennt live/demo/baseline').toMatch(
      /^(live|demo|baseline)$/,
    );
  });

  it('[PR-SEED-05] seedet ausschließlich privilegiert und atomar', () => {
    const repositorySource = readRepo('src/services/db/crmRepository.ts');
    expect.soft(repositorySource, 'kein Seeder im Browser-Produktpfad').not.toContain(
      'seedSupabaseDatabase',
    );
    const seederSource = readRepo('src/services/import/crmSeeder.ts');
    expect.soft(seederSource, 'kein Browser-Client für Schreibpfade').not.toContain(
      'services/db/supabaseClient',
    );
    expect.soft(
      seederSource,
      'unprivilegierter Pfad belegt (kein Service-Key)',
    ).not.toMatch(/service_role|service-role|SERVICE_KEY/);
    expect.soft(
      seederSource,
      'atomarer privilegierter Seed (RPC/Transaktion)',
    ).toMatch(/\.rpc\(|transaction/i);
  });

  it('[PR-BASELINE-06] speist unterschiedliche Baselines in die Engine ein', async () => {
    applyDeterministicContext();
    dataSourceRegistry.setActive('simulated-crm');
    ScenarioRepository.getInstance().resetToDefaults();
    BaselineSnapshotService.clear();
    await BaselineSnapshotService.capture(
      'simulated-crm',
      'v23-test-sim',
      '2026-01-01',
      GOLDEN_NOW,
    );
    await BaselineSnapshotService.capture(
      'hubspot-baseline:2026-09-01',
      'v23-test-hubspot',
      '2026-01-01',
      GOLDEN_NOW,
    );
    const simBaseline = BaselineSnapshotService.get('v23-test-sim');
    const hubspotBaseline = BaselineSnapshotService.get('v23-test-hubspot');
    expect(hubspotBaseline.counts, 'Baselines sind fachlich verschieden').not.toEqual(
      simBaseline.counts,
    );

    const service = ScenarioService.getInstance();
    const { version } = service.createScenario('Baseline-Probe', 'v23-baseline-06');
    const runSim = await service.runScenarioVersion(version.id, 777001, 120, {
      baselineVersion: 'v23-test-sim',
    });
    const runHubspot = await service.runScenarioVersion(version.id, 777001, 120, {
      baselineVersion: 'v23-test-hubspot',
    });
    expect(
      runHubspot.run.finalMetrics,
      'verschiedene Baseline, gleicher Seed → anderes Ergebnis',
    ).not.toEqual(runSim.run.finalMetrics);
  }, 60_000);

  it('[PR-FREEZE-07] friert Baselines tief ein und hasht kanonisch', async () => {
    applyDeterministicContext();
    dataSourceRegistry.setActive('simulated-crm');
    BaselineSnapshotService.clear();
    const dataset = await BaselineSnapshotService.capture(
      'simulated-crm',
      'v23-test-freeze',
      '2026-01-01',
      GOLDEN_NOW,
    );
    expect.soft(Object.isFrozen(dataset)).toBe(true);
    const collections: Record<string, readonly unknown[]> = {
      companies: dataset.companies,
      contacts: dataset.contacts,
      deals: dataset.deals,
      activities: dataset.activities,
    };
    for (const [name, collection] of Object.entries(collections)) {
      expect.soft(Object.isFrozen(collection), `${name}: Array eingefroren`).toBe(true);
      collection.forEach((entry, index) => {
        expect.soft(Object.isFrozen(entry), `${name}[${index}]: Objekt eingefroren`).toBe(true);
      });
    }
    expect.soft((dataset as { contentHash?: unknown }).contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('[PR-PERSIST-08] persistiert Szenarien und Runs reload-fähig', () => {
    const repositorySource = readRepo('src/simulation/scenarioRepository.ts');
    expect.soft(repositorySource, 'In-Memory-Maps bestätigt').toContain('new Map');
    expect.soft(
      repositorySource,
      'Speicherung erfolgt ausschließlich per Map.set',
    ).toContain('.set(');
    expect.soft(
      repositorySource,
      'Reload-fähiges Repository (Serialisierungs-/Lade-API oder Backend)',
    ).toMatch(/toJSON|fromJSON|serializ|deserializ|exportState|importState|saveTo|loadFrom|storage|persist|snapshot|indexedDB|localStorage|supabase/i);
  });

  it('[PR-WORKER-09] führt Produkt-Runs im Web Worker aus', () => {
    const adapterSource = readRepo('src/simulation/worker/workerAdapter.ts');
    expect.soft(adapterSource, 'Worker-Adapter existiert').toContain('createWorkerAdapter');
    const productPath = [
      readRepo('src/simulation/scenarioService.ts'),
      readRepo('src/store/slices/runSlice.ts'),
    ].join('\n');
    expect.soft(productPath, 'Produktpfad ruft den Worker-Adapter auf').toContain(
      'createWorkerAdapter(',
    );
  });
});
