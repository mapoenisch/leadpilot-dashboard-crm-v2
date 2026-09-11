import { systemContext } from '../systemContext';
import { ScenarioRepository } from '../scenarioRepository';
import { ScenarioService } from '../scenarioService';
import { dataSourceRegistry } from '../../services/data';
import { DataSourceError } from '../../types/dataSource';

export async function runReproducibilityTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  let ok = true;

  log.push('=== STARTING AUFTRAG 015 & 016 TEST SUITE (REPRODUCIBILITY & SNAPSHOT PINNING) ===');

  try {
    systemContext.__overrideForTest({
      now: () => '2026-01-01T00:00:00.000Z',
      nextScenarioId: () => 'scen-fixed',
      nextRunId: (s, v) => `run-fixed-s${s}-v${v}`,
      nextCorrelationId: () => 'corr-fixed',
      newRunSeed: () => 777001,
    });

    dataSourceRegistry.setActive('simulated-crm');

    const repo = ScenarioRepository.getInstance();
    repo.resetToDefaults();
    const svc = ScenarioService.getInstance();

    const { version } = svc.createScenario('Golden', 'reproducibility');
    const A = await svc.runScenarioVersion(version.id, 777001, 120);
    const B = await svc.runScenarioVersion(version.id, 777001, 120);

    // 1) Manifeste identisch (alle Quellen injiziert -> byte-gleich)
    ok = assert(log, 'Manifest identical across repeated runs', JSON.stringify(A.run.manifest) === JSON.stringify(B.run.manifest)) && ok;

    // 2) Event-Stream identisch (id, type, correlationId, Reihenfolge)
    const sig = (r: typeof A) => r.events.map((e) => `${e.id}|${e.type}|${e.correlationId}`).join('\n');
    ok = assert(log, 'Event-Stream identical (id, type, correlationId, sequence)', sig(A) === sig(B)) && ok;

    // 3) End-Snapshot / RNG-State identisch
    ok = assert(log, 'End RNG-State identical across runs', A.run.rngState === B.run.rngState) && ok;
    ok = assert(log, 'Final Metrics identical across runs', JSON.stringify(A.run.finalMetrics) === JSON.stringify(B.run.finalMetrics)) && ok;

    // 4) simulationStartDate stammt NICHT aus der Wall-Clock
    ok = assert(log, 'simulationStartDate deterministic (2026-01-01)', A.run.manifest.simulationStartDate === '2026-01-01') && ok;

    // 5) BaselineVersion in Manifest verankert & gepinnt
    ok = assert(
      log,
      'Initialer Run pinnt konkrete baselineVersion & dataSourceId',
      Boolean(A.run.manifest.baselineVersion) &&
        A.run.manifest.baselineVersion === 'baseline-simulated-crm-2026-01-01' &&
        A.run.manifest.dataSourceId === 'simulated-crm'
    ) && ok;

    // 6) Wechsel der aktiven Datenquelle beeinflusst reproduce(runId) NICHT
    dataSourceRegistry.setActive('baseline-file:2026-09-15-v2');
    ok = assert(log, 'Aktive Datenquelle umgestellt auf baseline-file:2026-09-15-v2', dataSourceRegistry.getActive().info.id === 'baseline-file:2026-09-15-v2') && ok;

    const repro = await svc.reproduce(A.run.runId, 120);
    ok = assert(log, 'reproduce(originalRunId) bindet weiterhin die ursprüngliche baselineVersion', repro.run.manifest.baselineVersion === A.run.manifest.baselineVersion) && ok;
    ok = assert(log, 'reproduce(originalRunId) liefert identischen End-RNG-State trotz geänderter aktiver DataSource', repro.run.rngState === A.run.rngState) && ok;
    ok = assert(log, 'reproduce(originalRunId) liefert identische Final Metrics', JSON.stringify(repro.run.finalMetrics) === JSON.stringify(A.run.finalMetrics)) && ok;

    // Reset active data source
    dataSourceRegistry.setActive('simulated-crm');

    // 7) Nicht verfügbare Baseline-Version wird kontrolliert über DataSourceError behandelt
    let threwUnknown = false;
    try {
      await svc.runScenarioVersion(version.id, 777001, 10, {
        baselineVersion: 'non-existent-baseline-version-xyz',
      });
    } catch (err) {
      if (err instanceof DataSourceError && err.code === 'UNKNOWN_SOURCE') {
        threwUnknown = true;
      }
    }
    ok = assert(log, 'Nicht verfügbare Baseline-Version löst kontrolliert DataSourceError("UNKNOWN_SOURCE") aus', threwUnknown) && ok;
  } catch (err: any) {
    log.push(`❌ Unexpected error in Reproducibility Test: ${err.message}`);
    ok = false;
  } finally {
    systemContext.__resetForTest();
  }

  log.push('\n=================================================================');
  if (ok) {
    log.push('🎉 ALL REPRODUCIBILITY & SNAPSHOT PINNING TESTS PASSED SUCCESSFULLY!\n');
  } else {
    log.push('⚠️ SOME TESTS FAILED IN REPRODUCIBILITY TEST SUITE.\n');
  }

  return { success: ok, log };
}

function assert(log: string[], name: string, cond: boolean): boolean {
  log.push(`${cond ? '✅' : '❌'} ${name}`);
  return cond;
}
