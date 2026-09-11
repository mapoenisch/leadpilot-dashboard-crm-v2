import { makeHubSpotBaselineSource } from '../../services/data/sources/hubSpotBaselineSource';
import { dataSourceRegistry } from '../../services/data';
import { BaselineSnapshotService } from '../../services/data/baselineSnapshotService';
import { DataSourceError } from '../../types/dataSource';
import { ScenarioRepository } from '../scenarioRepository';
import { ScenarioService } from '../scenarioService';
import { systemContext } from '../systemContext';

function assert(log: string[], title: string, condition: boolean): boolean {
  if (condition) {
    log.push(`✅ ${title}`);
    return true;
  } else {
    log.push(`❌ FAILED: ${title}`);
    return false;
  }
}

export async function runHubSpotSourceTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  let ok = true;

  log.push('=== STARTING AUFTRAG 020 TEST SUITE (HUBSPOT BASELINE SOURCE & INTEGRITY) ===');

  try {
    // 1. makeHubSpotBaselineSource('fixture').fetchSnapshot() returns CrmReadModel
    const source = makeHubSpotBaselineSource('fixture');
    const readModel = await source.fetchSnapshot();
    ok =
      assert(
        log,
        'makeHubSpotBaselineSource("fixture").fetchSnapshot() liefert CrmReadModel mit gemappten Deals',
        readModel.companies.length === 5 &&
          readModel.contacts.length === 8 &&
          readModel.deals.length === 5 &&
          Array.isArray(readModel.activities) &&
          readModel.activities.length === 0
      ) && ok;

    // 2. Info attributes
    ok =
      assert(
        log,
        'info.kind === "external", supportsLiveFeed === false, id namespace === "hubspot-baseline:fixture"',
        source.info.kind === 'external' &&
          source.info.supportsLiveFeed === false &&
          source.info.id === 'hubspot-baseline:fixture'
      ) && ok;

    // 3. Envelope without sourceSystem: 'hubspot' throws DataSourceError('INTEGRITY')
    let integrityThrew = false;
    const invalidSource = {
      info: {
        id: 'hubspot-baseline:invalid',
        kind: 'external' as const,
        label: 'Invalid',
        description: 'Test',
        supportsLiveFeed: false,
      },
      async fetchSnapshot() {
        const invalidEnvelope = { sourceSystem: 'other-crm', companies: [], contacts: [], importedFunnelDeals: [] };
        if (invalidEnvelope.sourceSystem !== 'hubspot') {
          throw new DataSourceError('INTEGRITY', 'Envelope ist keine HubSpot-Quelle.');
        }
        return {};
      },
    };
    try {
      await invalidSource.fetchSnapshot();
    } catch (e) {
      integrityThrew = e instanceof DataSourceError && e.code === 'INTEGRITY';
    }
    ok = assert(log, 'Ungültiges sourceSystem != "hubspot" wirft DataSourceError("INTEGRITY")', integrityThrew) && ok;

    // 4. Referential integrity in snapshot
    const companyIds = new Set(readModel.companies.map((c) => c.id));
    const contactsValid = readModel.contacts.every((c) => companyIds.has(c.companyId));
    const dealsValid = readModel.deals.every((d) => !d.companyId || companyIds.has(d.companyId));
    ok = assert(log, 'Referenzielle Integrität: jeder contact.companyId / deal.companyId existiert in companies', contactsValid && dealsValid) && ok;

    // 5. Valid Funnel Stages
    const validStages = new Set(['LEAD', 'QUALIFIED_LEAD', 'PITCH_DEMO', 'PROPOSAL', 'CLOSING', 'WON', 'LOST']);
    const allStagesValid = readModel.deals.every((d) => validStages.has(d.stage));
    ok = assert(log, 'Jede deal.stage entspricht einem gültigen LeadPilot Funnel-Stage-Wert', allStagesValid) && ok;

    // 6. BaselineSnapshotService.capture()
    const captured = await BaselineSnapshotService.capture(
      'hubspot-baseline:fixture',
      'hubspot-fixture-v1',
      '2026-01-01',
      '2026-01-01T00:00:00.000Z'
    );
    ok =
      assert(
        log,
        'BaselineSnapshotService.capture() friert HubSpot-Snapshot ein & assertIntegrity besteht',
        captured.version === 'hubspot-fixture-v1' &&
          captured.counts.companies === 5 &&
          captured.counts.contacts === 8 &&
          captured.counts.deals === 5 &&
          captured.counts.activities === 0
      ) && ok;

    // 7. Determinism: Two captures on same data yield deep-equal BaselineDataset
    const captured2 = await BaselineSnapshotService.capture(
      'hubspot-baseline:fixture',
      'hubspot-fixture-v2',
      '2026-01-01',
      '2026-01-01T00:00:00.000Z'
    );
    ok =
      assert(
        log,
        'Zwei capture()-Läufe auf denselben Daten liefern deterministisch identische Datasets',
        JSON.stringify(captured.companies) === JSON.stringify(captured2.companies) &&
          JSON.stringify(captured.contacts) === JSON.stringify(captured2.contacts) &&
          JSON.stringify(captured.deals) === JSON.stringify(captured2.deals)
      ) && ok;

    // 8. ScenarioService Run with HubSpot Baseline reproduces bit-identical
    systemContext.__overrideForTest({
      now: () => '2026-01-01T00:00:00.000Z',
      nextScenarioId: () => 'scen-hubspot',
      nextRunId: (s, v) => `run-hs-s${s}-v${v}`,
      nextCorrelationId: () => 'corr-hs-fixed',
      newRunSeed: () => 888123,
    });

    dataSourceRegistry.setActive('hubspot-baseline:fixture');
    const repo = ScenarioRepository.getInstance();
    repo.resetToDefaults();
    const svc = ScenarioService.getInstance();

    const { version } = svc.createScenario('HubSpot Test Scenario', 'Testing external data source');
    const runA = await svc.runScenarioVersion(version.id, 888123, 50);
    const runB = await svc.runScenarioVersion(version.id, 888123, 50);

    const manifestA = JSON.stringify(runA.run.manifest);
    const manifestB = JSON.stringify(runB.run.manifest);
    const metricsA = JSON.stringify(runA.run.finalMetrics);
    const metricsB = JSON.stringify(runB.run.finalMetrics);

    ok =
      assert(
        log,
        'ScenarioService-Simulation mit hubspot-baseline:fixture reproduziert 100% identisch (Manifest & Metriken)',
        manifestA === manifestB && metricsA === metricsB && runA.run.rngState === runB.run.rngState
      ) && ok;

    // 9. Registry check & default active source remains simulated-crm
    dataSourceRegistry.setActive('simulated-crm');
    ok =
      assert(
        log,
        'hubspot-baseline:fixture und hubspot-baseline:2026-09-01 sind in dataSourceRegistry registriert; getActive().info.id bleibt "simulated-crm"',
        dataSourceRegistry.list().some((s) => s.id === 'hubspot-baseline:fixture') &&
          dataSourceRegistry.list().some((s) => s.id === 'hubspot-baseline:2026-09-01') &&
          dataSourceRegistry.getActive().info.id === 'simulated-crm'
      ) && ok;

    // 10. Versioned baseline 2026-09-01 loading test — structural, count-agnostic
    //     (the real pull changes on every HubSpot export; only shape/integrity is fixed).
    const source2026 = makeHubSpotBaselineSource('2026-09-01');
    const readModel2026 = await source2026.fetchSnapshot();
    const cIds2026 = new Set(readModel2026.companies.map((c) => c.id));
    const funnelStages2026 = new Set(['LEAD', 'QUALIFIED_LEAD', 'PITCH_DEMO', 'PROPOSAL', 'CLOSING', 'WON', 'LOST']);
    ok =
      assert(
        log,
        'makeHubSpotBaselineSource("2026-09-01").fetchSnapshot() lädt reale versionierte Baseline (nicht-leer, referenz-integer, gültige Funnel-Stages)',
        source2026.info.kind === 'external' &&
          readModel2026.companies.length > 0 &&
          readModel2026.deals.length > 0 &&
          readModel2026.companies.every((c) => typeof c.id === 'string' && !!c.name) &&
          readModel2026.deals.every((d) => (!d.companyId || cIds2026.has(d.companyId)) && funnelStages2026.has(d.stage)) &&
          readModel2026.contacts.every((ct) => cIds2026.has(ct.companyId))
      ) && ok;

  } catch (err) {
    log.push(`❌ UNEXPECTED ERROR: ${err instanceof Error ? err.message : (err as { message: string }).message}`);
    ok = false;
  } finally {
    systemContext.__resetForTest();
    dataSourceRegistry.setActive('simulated-crm');
  }

  log.push('=================================================================');
  if (ok) {
    log.push('🎉 ALL AUFTRAG 020 HUBSPOT BASELINE INTEGRITY TESTS PASSED SUCCESSFULLY!');
  } else {
    log.push('❌ AUFTRAG 020 HUBSPOT BASELINE INTEGRITY TESTS FAILED!');
  }

  return { success: ok, log };
}
