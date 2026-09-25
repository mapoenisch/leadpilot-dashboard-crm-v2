// G44 (Auftrag 067A, Block C/D): Daten-, Simulations- und Worker-Verträge.
// Ursprünglich bewusst rot — frieren die bestätigten Mängel als Sollverträge ein.
//
// 067R / G64 — Neuausrichtung nach Entscheid Marc Poenisch (25.09.2026), Muster
// G46/PR-SEED-05: PR-SOURCE-04, PR-BASELINE-06, PR-FREEZE-07, PR-PERSIST-08 und
// PR-WORKER-09 prüften veraltete Dateien bzw. Namen (die G47–G50-Umsetzung liegt
// in neuen Modulen) oder forderten den Mangel positiv (PR-SOURCE-04, G44-Review
// Befund 4). Die Verträge prüfen jetzt das tatsächliche Verhalten derselben
// Soll-Aussage — ID, Titel, Zielgate und Absicht unverändert, keine Abschwächung.
// Jeder neu ausgerichtete Vertrag ist per Negativprobe gegen den alten Mangel
// als rot belegt (docs/BUILD_LOG.md, 067R).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as supabaseClientModule from '../../services/db/supabaseClient';
import { CRMRepository } from '../../services/db/crmRepository';
import { BaselineSnapshotService } from '../../services/data/baselineSnapshotService';
import { dataSourceRegistry } from '../../services/data';
import { DEMO_ORGANIZATION_ID, loadCrmReadModel } from '../../services/data/crmReadModelService';
import { ScenarioRepository } from '../../simulation/scenarioRepository';
import { ScenarioService } from '../../simulation/scenarioService';
import { systemContext } from '../../simulation/systemContext';
import { workerRunner } from '../../simulation/worker/simulation.worker';
import type { WorkerMessageCommand, WorkerMessageEvent } from '../../types/workerMessages';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const GOLDEN_NOW = '2026-01-01T00:00:00.000Z';
const REAL_ORG = '11111111-1111-4111-8111-111111111111';

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

/** Supabase-Client-Attrappe: konfiguriert, aber jeder Abruf scheitert. */
function mockFailingSupabase(): void {
  const failing = {
    from: () => ({
      select: () => ({ order: () => Promise.reject(new Error('Netzwerk getrennt')) }),
    }),
  };
  vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
  vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(
    failing as unknown as typeof supabaseClientModule.supabase,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('v2.3.0 data and simulation findings', () => {
  it('[PR-SOURCE-04] kennzeichnet jede CRM-Antwort mit Quellen-Envelope', async () => {
    // 1. Envelope: Quelle und Modus sind an jeder Antwort ablesbar.
    const envelope = await loadCrmReadModel(DEMO_ORGANIZATION_ID, 'simulated-crm', {
      allowSynthetic: true,
    });
    expect.soft(envelope.sourceId, 'Envelope nennt die Quelle').toBe('simulated-crm');
    // Modus: synthetic = Demo, supabase = Live, hubspot = Baseline-Import.
    expect
      .soft(envelope.sourceKind, 'Envelope nennt live/demo/baseline (supabase/synthetic/hubspot)')
      .toMatch(/^(supabase|synthetic|hubspot)$/);
    expect.soft(envelope.status, 'Envelope nennt den Zustand').toBe('healthy');
    expect.soft(envelope.data.companies.length).toBeGreaterThan(0);

    // 2. Kein stiller Demo-Ersatz für einen realen Mandanten.
    const realOrg = await loadCrmReadModel(REAL_ORG, 'simulated-crm');
    expect.soft(realOrg.status, 'Envelope nennt Ausfall statt Demodaten').toBe('unavailable');
    expect.soft(realOrg.data.companies, 'keine Ersatzdaten im Ausfall').toEqual([]);

    // 3. Repository: Supabase-Fehler wird zum Quellenfehler, nie zu Demodaten.
    // Ergebnis als Text, damit der Befund-Marker in jeder Fehlermeldung steht.
    const outcome = (read: () => Promise<unknown>) =>
      read().then(
        () => 'still Demodaten geliefert',
        (e: unknown) => (e instanceof Error ? e.message : String(e)),
      );
    mockFailingSupabase();
    expect
      .soft(
        await outcome(() => CRMRepository.getCompanies()),
        'Supabase-Fehler trägt DATA_SOURCE_UNAVAILABLE',
      )
      .toMatch(/^DATA_SOURCE_UNAVAILABLE/);
    expect
      .soft(
        await outcome(() => CRMRepository.getImportedFunnelDeals()),
        'Deals: DATA_SOURCE_UNAVAILABLE statt Demo',
      )
      .toMatch(/^DATA_SOURCE_UNAVAILABLE/);
    expect
      .soft(
        await outcome(() => CRMRepository.getAuditSummary()),
        'Audit: DATA_SOURCE_UNAVAILABLE statt Demo',
      )
      .toMatch(/^DATA_SOURCE_UNAVAILABLE/);

    // 4. Leere Supabase-Tabelle ist ein gültiges leeres Ergebnis, kein Anlass
    //    für Demodaten. Der Repository-Pfad bleibt für reale Mandanten die
    //    Supabase-Lesung (RLS), denn eine mandantenfähige Supabase-Quelle für
    //    den Envelope gibt es nicht (Codex-Review #28).
    vi.restoreAllMocks();
    const empty = {
      from: () => ({ select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
    };
    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
    vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(
      empty as unknown as typeof supabaseClientModule.supabase,
    );
    expect
      .soft(
        (await CRMRepository.getImportedFunnelDeals()).length,
        'leere Tabelle ohne DATA_SOURCE_UNAVAILABLE-Ersatz durch Demodaten',
      )
      .toBe(0);
  });

  it('[PR-SEED-05] seedet ausschließlich privilegiert und atomar', () => {
    // G46-Nacharbeit (User-Entscheid): Browser-Seeder gelöscht — Nicht-Existenz
    // ist der Nachweis. Einziger legitimer Ersatzpfad: transaktionale,
    // idempotente SQL-Bootstrap-Migration für die Demo-Organisation.
    const seederPath = resolve(repoRoot, 'src/services/import/crmSeeder.ts');
    expect(existsSync(seederPath), 'Browser-Seeder gelöscht').toBe(false);
    const repositorySource = readRepo('src/services/db/crmRepository.ts');
    expect
      .soft(repositorySource, 'kein Seeder-Verweis im Produktpfad')
      .not.toContain('seedSupabaseDatabase');
    expect.soft(repositorySource, 'kein Seeder-Import').not.toContain('crmSeeder');
    const bootstrap = readRepo('supabase/migrations/20260920_demo_bootstrap.sql');
    expect.soft(bootstrap, 'Bootstrap transaktional').toMatch(/BEGIN[\s\S]*COMMIT/);
    expect.soft(bootstrap, 'Bootstrap idempotent').toContain('ON CONFLICT DO NOTHING');
  });

  it('[PR-BASELINE-06] speist unterschiedliche Baselines in die Engine ein', async () => {
    // Nach Marcs 067E-Entscheid tragen Baselines ohne eigene Kennzahlen den
    // versionierten Anker; fachlich verschiedene Baselines unterscheiden sich
    // über ihre historicalMetrics. Der Vertrag beweist beide Richtungen.
    applyDeterministicContext();
    dataSourceRegistry.setActive('simulated-crm');
    ScenarioRepository.getInstance().resetToDefaults();
    BaselineSnapshotService.clear();
    const anchor = await BaselineSnapshotService.capture(
      'simulated-crm',
      'v23-test-anchor',
      '2026-01-01',
      GOLDEN_NOW,
    );
    const grown = await BaselineSnapshotService.capture(
      'simulated-crm',
      'v23-test-grown',
      '2026-01-01',
      GOLDEN_NOW,
      { historicalMetrics: { baseCustomers: 120, baseMRR: 60000, baseARR: 720000 } },
    );
    expect(grown.baselineHash, 'Baselines sind fachlich verschieden').not.toBe(anchor.baselineHash);

    const service = ScenarioService.getInstance();
    const { version } = service.createScenario('Baseline-Probe', 'v23-baseline-06');
    const runAnchor = await service.runScenarioVersion(version.id, 777001, 120, {
      baselineVersion: 'v23-test-anchor',
    });
    const runGrown = await service.runScenarioVersion(version.id, 777001, 120, {
      baselineVersion: 'v23-test-grown',
    });
    const runAnchorAgain = await service.runScenarioVersion(version.id, 777001, 120, {
      baselineVersion: 'v23-test-anchor',
    });
    expect(
      runGrown.run.finalMetrics,
      'verschiedene Baseline, gleicher Seed → anderes Ergebnis',
    ).not.toEqual(runAnchor.run.finalMetrics);
    expect(
      runAnchorAgain.run.finalMetrics,
      'gleiche Baseline, gleicher Seed → bit-identisches Ergebnis',
    ).toEqual(runAnchor.run.finalMetrics);
    expect
      .soft(runGrown.run.manifest.baselineHash, 'Manifest bindet die Baseline')
      .toBe(grown.baselineHash);
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
    expect.soft(Object.isFrozen(dataset), 'Dataset eingefroren').toBe(true);
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
    expect
      .soft(Object.isFrozen(dataset.historicalMetrics), 'historicalMetrics eingefroren')
      .toBe(true);
    // G48 führt den kanonischen Inhalts-Hash als `baselineHash`.
    expect
      .soft(dataset.baselineHash, 'kanonischer SHA-256 (baselineHash)')
      .toMatch(/^[a-f0-9]{64}$/);
    // Kanonisch: gleicher Inhalt zu anderer Zeit → gleicher Hash; anderer Inhalt → anderer Hash.
    const later = await BaselineSnapshotService.capture(
      'simulated-crm',
      'v23-test-freeze',
      '2026-01-01',
      '2026-06-30T12:00:00.000Z',
    );
    expect.soft(later.baselineHash, 'Hash unabhängig von capturedAt').toBe(dataset.baselineHash);
    const other = await BaselineSnapshotService.capture(
      'simulated-crm',
      'v23-test-freeze',
      '2026-01-01',
      GOLDEN_NOW,
      { historicalMetrics: { baseCustomers: 1, baseMRR: 1, baseARR: 12 } },
    );
    expect.soft(other.baselineHash, 'anderer Inhalt → anderer Hash').not.toBe(dataset.baselineHash);
    expect
      .soft(() => {
        (dataset.companies as unknown as unknown[]).push({ id: 'manipuliert' });
      }, 'Mutation eines eingefrorenen Arrays scheitert')
      .toThrow(TypeError);
  });

  it('[PR-PERSIST-08] persistiert Szenarien und Runs reload-fähig', async () => {
    applyDeterministicContext();
    dataSourceRegistry.setActive('simulated-crm');
    const repo = ScenarioRepository.getInstance();
    repo.resetToDefaults();
    BaselineSnapshotService.clear();
    await BaselineSnapshotService.capture(
      'simulated-crm',
      'v23-test-persist',
      '2026-01-01',
      GOLDEN_NOW,
      { organizationId: REAL_ORG },
    );
    const service = ScenarioService.getInstance();
    const { scenario, version } = service.createScenario('Persistenz-Probe', 'v23-persist-08');

    // Ohne Server gibt es keinen stillen In-Memory-Ersatz. Der Client wird
    // ausdrücklich entfernt — die Probe darf nicht von VITE_SUPABASE_* abhängen.
    vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(null);
    const offline = await service
      .runScenarioVersion(version.id, 777001, 30, {
        baselineVersion: 'v23-test-persist',
        organizationId: REAL_ORG,
        persistToServer: true,
      })
      .then(
        () => 'still nur im Speicher abgelegt',
        (e: unknown) => String((e as { code?: unknown }).code),
      );
    expect
      .soft(
        offline,
        'Reload-fähiges Repository: ohne Backend NOT_CONFIGURED statt stillem Speicher',
      )
      .toBe('NOT_CONFIGURED');

    // Mit Backend: genau ein atomarer Server-Schreibpfad für das ganze Bundle.
    const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
    const selects: Array<{ table: string; column: string; value: unknown }> = [];
    const rows: Record<string, unknown[]> = {};
    const backend = {
      rpc: (fn: string, args: Record<string, unknown>) => {
        rpcCalls.push({ fn, args });
        return Promise.resolve({ data: (args.p_run as { runId: string }).runId, error: null });
      },
      from: (table: string) => ({
        select: () => ({
          eq: (column: string, value: unknown) => {
            selects.push({ table, column, value });
            return Promise.resolve({ data: rows[table] ?? [], error: null });
          },
        }),
      }),
    };
    vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(
      backend as unknown as typeof supabaseClientModule.supabase,
    );
    const { run } = await service.runScenarioVersion(version.id, 777001, 30, {
      baselineVersion: 'v23-test-persist',
      organizationId: REAL_ORG,
      persistToServer: true,
    });
    const persist = rpcCalls.filter((call) => call.fn === 'persist_completed_run');
    expect(persist, 'Reload-fähiges Repository: Run erreicht den Server-RPC').toHaveLength(1);
    const args = persist[0]?.args ?? {};
    expect.soft(args.p_organization_id, 'mandantengebunden').toBe(REAL_ORG);
    expect.soft((args.p_run as { runId: string }).runId).toBe(run.runId);
    expect.soft((args.p_scenario as { id: string }).id).toBe(scenario.id);
    expect.soft((args.p_version as { id: string }).id).toBe(version.id);
    expect.soft((args.p_events as unknown[]).length, 'Events im Bundle').toBeGreaterThan(0);
    expect
      .soft((args.p_timeseries as unknown[]).length, 'Zeitreihe im Bundle')
      .toBe(run.timeSeries?.length ?? -1);
    expect.soft((args.p_snapshots as unknown[]).length, 'Final-Snapshot im Bundle').toBe(1);

    // Reload: In-Memory-Zustand verloren, Server-Zeilen stellen den Run wieder her.
    rows.simulation_scenarios = [{ id: scenario.id, name: scenario.name, status: 'draft' }];
    rows.simulation_scenario_versions = [
      { id: version.id, scenario_id: scenario.id, version_number: version.versionNumber },
    ];
    rows.simulation_runs = [
      {
        run_id: run.runId,
        scenario_id: scenario.id,
        scenario_version_id: version.id,
        seed: run.seed,
        status: run.status,
        manifest: run.manifest,
        final_metrics: run.finalMetrics,
        final_state: run.finalState,
        rng_state: run.rngState,
        started_at: run.startedAt,
        completed_at: run.completedAt,
      },
    ];
    repo.resetToDefaults();
    expect.soft(repo.getRun(run.runId), 'Reload verliert den Speicherzustand').toBeNull();
    await service.loadScenarioWorkspace(REAL_ORG);
    const reloaded = repo.getRun(run.runId);
    expect(reloaded, 'Reload-fähiges Repository: Run nach Reload vorhanden').not.toBeNull();
    expect.soft(reloaded?.finalMetrics).toEqual(run.finalMetrics);
    expect.soft(reloaded?.seed).toBe(run.seed);
    const tables = [...new Set(selects.map((s) => s.table))].sort();
    expect
      .soft(tables, 'Workspace lädt alle Persistenztabellen')
      .toEqual([
        'simulation_events',
        'simulation_runs',
        'simulation_scenario_versions',
        'simulation_scenarios',
        'simulation_snapshots',
        'simulation_timeseries',
      ]);
    expect
      .soft(
        selects.every((s) => s.column === 'organization_id' && s.value === REAL_ORG),
        'jeder Lesezugriff mandantengefiltert',
      )
      .toBe(true);
    // Der Server-RPC ist atomar und per pgTAP abgesichert (22 Tests, CI-Job e2e).
    expect
      .soft(readRepo('supabase/migrations/20260922_scenario_run_persistence.sql'))
      .toContain('persist_completed_run');
    expect
      .soft(existsSync(resolve(repoRoot, 'supabase/tests/scenario_run_persistence.sql')))
      .toBe(true);
  }, 60_000);

  it('[PR-WORKER-09] führt Produkt-Runs im Web Worker aus', async () => {
    // Browser-Umgebung nachbilden: `window` + `Worker`. Die Worker-Attrappe
    // führt die echte Worker-Logik (workerRunner) asynchron aus und liefert
    // deren Ereignisse wie ein nativer Worker per onmessage zurück.
    applyDeterministicContext();
    dataSourceRegistry.setActive('simulated-crm');
    ScenarioRepository.getInstance().resetToDefaults();
    BaselineSnapshotService.clear();
    const service = ScenarioService.getInstance();
    const { version } = service.createScenario('Worker-Probe', 'v23-worker-09');
    const mainThread = await service.runScenarioVersion(version.id, 777001, 60);

    const constructed: Array<{ url: string; type?: string }> = [];
    const commands: WorkerMessageCommand['command'][] = [];
    let terminated = 0;
    // Der Worker-Kontext sendet über das globale postMessage; solange die
    // Attrappe lebt, landen diese Ereignisse bei ihrem onmessage.
    const g = globalThis as { postMessage?: (evt: WorkerMessageEvent) => void };
    const previousPostMessage = g.postMessage;
    class FakeWorker {
      onmessage: ((e: { data: WorkerMessageEvent }) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      constructor(url: URL | string, opts?: { type?: string }) {
        constructed.push({ url: String(url), type: opts?.type });
        g.postMessage = (evt) => this.onmessage?.({ data: evt });
      }
      postMessage(command: WorkerMessageCommand): void {
        commands.push(command.command);
        setTimeout(() => workerRunner.handleMessage(command), 0);
      }
      terminate(): void {
        terminated += 1;
        g.postMessage = previousPostMessage;
      }
    }
    vi.stubGlobal('window', globalThis);
    vi.stubGlobal('Worker', FakeWorker);
    try {
      const inWorker = await service.runScenarioVersion(version.id, 777001, 60);
      expect(
        constructed.length,
        'Produktpfad ruft den Worker-Adapter auf (createWorkerAdapter( → new Worker)',
      ).toBe(1);
      expect.soft(constructed[0]?.url, 'Worker-Skript').toMatch(/simulation\.worker\.ts$/);
      expect.soft(constructed[0]?.type, 'Modul-Worker').toBe('module');
      expect.soft(commands, 'START an den Worker gesendet').toContain('START');
      expect.soft(terminated, 'Worker nach Abschluss terminiert (kein Zombie)').toBe(1);
      expect
        .soft(inWorker.run.finalMetrics, 'Worker-Ergebnis bit-identisch zum Referenzlauf')
        .toEqual(mainThread.run.finalMetrics);
    } finally {
      g.postMessage = previousPostMessage;
      vi.unstubAllGlobals();
    }
  }, 60_000);
});
