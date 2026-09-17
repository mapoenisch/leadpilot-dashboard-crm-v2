import { dataSourceRegistry } from '../../services/data';
import { BaselineSnapshotService } from '../../services/data/baselineSnapshotService';
import { DataSourceError } from '../../types/dataSource';
import { CRMRepository } from '../../services/db/crmRepository';
import { resolveRunSourceAudit } from '../../services/data/runSourceAudit';
import { ScenarioParameters, SimulationRun } from '../../types/scenario';

export async function runDataSourceTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  let ok = true;

  log.push('=== STARTING AUFTRAG 016 TEST SUITE (DATA SOURCE ABSTRACTION & BASELINE SNAPSHOTS) ===');

  // 1. Simulated CRM registered
  ok = a(log, 'simulated-crm registriert', dataSourceRegistry.list().some((s) => s.id === 'simulated-crm')) && ok;

  // 2. Baseline capture & counts check
  const snap = await BaselineSnapshotService.capture('simulated-crm', 'test-v1', '2026-01-01', '2026-01-01T00:00:00.000Z');
  ok = a(log, 'counts (20 Companies, 100 Contacts, 40 Deals)', snap.counts.companies === 20 && snap.counts.contacts === 100 && snap.counts.deals === 40) && ok;

  // 3. Contact -> Company FK integrity
  const companyIds = new Set(snap.companies.map((c) => c.id));
  ok = a(log, 'contact->company refs', snap.contacts.every((c) => companyIds.has(c.companyId))) && ok;

  // 4. Frozen snapshot retrieval
  ok = a(log, 'frozen abrufbar', BaselineSnapshotService.get('test-v1').version === 'test-v1') && ok;

  // 5. Unknown source throws DataSourceError
  let threw = false;
  try {
    dataSourceRegistry.get('does-not-exist');
  } catch (e) {
    threw = e instanceof DataSourceError && e.code === 'UNKNOWN_SOURCE';
  }
  ok = a(log, 'unknown source throws UNKNOWN_SOURCE', threw) && ok;

  // 6. Deterministic reproduction of capture
  const s2 = await BaselineSnapshotService.capture('simulated-crm', 'test-v2', '2026-01-01', '2026-01-01T00:00:00.000Z');
  ok = a(log, 'capture deterministisch', JSON.stringify(snap.companies) === JSON.stringify(s2.companies)) && ok;

  // 7. Baseline file source v1 & v2 registered and loadable
  ok = a(log, 'baseline-file:2026-08-31-v1 registriert', dataSourceRegistry.list().some((s) => s.id === 'baseline-file:2026-08-31-v1')) && ok;
  ok = a(log, 'baseline-file:2026-09-15-v2 registriert', dataSourceRegistry.list().some((s) => s.id === 'baseline-file:2026-09-15-v2')) && ok;
  const fileV1 = await dataSourceRegistry.get('baseline-file:2026-08-31-v1').fetchSnapshot();
  ok = a(log, 'baseline-file v1 daten intakt (20/100/40)', fileV1.companies.length === 20 && fileV1.contacts.length === 100 && fileV1.deals.length === 40) && ok;
  const fileV2 = await dataSourceRegistry.get('baseline-file:2026-09-15-v2').fetchSnapshot();
  ok = a(log, 'baseline-file v2 daten intakt (20/100/40)', fileV2.companies.length === 20 && fileV2.contacts.length === 100 && fileV2.deals.length === 40) && ok;

  // 8. CRMRepository queries active data source
  const comps = await CRMRepository.getCompanies();
  ok = a(log, 'CRMRepository.getCompanies() liefert 20 Companies aus aktiver DataSource', comps.length === 20) && ok;

  // 9. Write stubs throw informative error
  let stubThrew = false;
  try {
    CRMRepository.getLeads();
  } catch (e) {
    const message = e instanceof Error ? e.message : (e as { message: string }).message;
    stubThrew = message.includes('Operativer CRM-Schreibpfad ist nicht Teil dieser App');
  }
  ok = a(log, 'CRMRepository operative write stubs guard with informative throw', stubThrew) && ok;

  // 10. Pluggable custom source registration test (HubSpot stub check)
  const dummyHubspot = {
    info: {
      id: 'hubspot-test-stub',
      kind: 'external' as const,
      label: 'HubSpot Test Stub',
      description: 'Test',
      supportsLiveFeed: false,
    },
    async fetchSnapshot() {
      throw new DataSourceError('FETCH_FAILED', 'not implemented');
    },
  };
  dataSourceRegistry.register(dummyHubspot);
  ok = a(log, 'Pluggable source registration succeeds without breaking code', dataSourceRegistry.list().some((s) => s.id === 'hubspot-test-stub')) && ok;

  // 11. AuditTierView metadata resolution test (Pflichtkorrektur 1)
  const mockRunSimulated: SimulationRun = {
    runId: 'run-audit-test-sim',
    scenarioId: 'scenario-base-2026',
    scenarioVersionId: 'ver-scenario-base-2026-v1',
    seed: 42,
    status: 'COMPLETED',
    rngState: 12345,
    modelVersion: '1.0.0-v1',
    schemaVersion: '1.0.0',
    baselineVersion: 'test-v1',
    startedAt: '2026-01-01T00:00:00.000Z',
    manifest: {
      runId: 'run-audit-test-sim',
      scenarioId: 'scenario-base-2026',
      scenarioVersionId: 'ver-scenario-base-2026-v1',
      seed: 42,
      initialRngState: 42,
      modelVersion: '1.0.0-v1',
      schemaVersion: '1.0.0',
      baselineVersion: 'test-v1',
      baselineId: 'test-v1',
      baselineHash: 'a'.repeat(64),
      organizationId: 'unknown',
      dataSourceId: 'simulated-crm',
      createdAt: '2026-01-01T00:00:00.000Z',
      simulationStartDate: '2026-01-01',
      targetTicks: 50,
      parameters: {} as ScenarioParameters,
      correlationId: 'corr-audit-sim',
    },
    correlationId: 'corr-audit-sim',
  };

  const auditSim = resolveRunSourceAudit(mockRunSimulated);
  ok = a(
    log,
    'AuditTierView resolveRunSourceAudit visualisiert baselineVersion, dataSourceId, sourceKind und sourceLabel fehlerfrei (simulated-crm)',
    auditSim.baselineVersion === 'test-v1' &&
      auditSim.dataSourceId === 'simulated-crm' &&
      auditSim.sourceKind === 'simulated' &&
      auditSim.sourceLabel === 'Simuliertes CRM' &&
      auditSim.isFrozen === true &&
      auditSim.counts?.companies === 20
  ) && ok;

  const mockRunFile: SimulationRun = {
    runId: 'run-audit-test-file',
    scenarioId: 'scenario-base-2026',
    scenarioVersionId: 'ver-scenario-base-2026-v1',
    seed: 99,
    status: 'COMPLETED',
    rngState: 54321,
    modelVersion: '1.0.0-v1',
    schemaVersion: '1.0.0',
    baselineVersion: 'baseline-file:2026-08-31-v1',
    startedAt: '2026-01-01T00:00:00.000Z',
    manifest: {
      runId: 'run-audit-test-file',
      scenarioId: 'scenario-base-2026',
      scenarioVersionId: 'ver-scenario-base-2026-v1',
      seed: 99,
      initialRngState: 99,
      modelVersion: '1.0.0-v1',
      schemaVersion: '1.0.0',
      baselineVersion: 'baseline-file:2026-08-31-v1',
      baselineId: 'baseline-file:2026-08-31-v1',
      baselineHash: 'b'.repeat(64),
      organizationId: 'unknown',
      dataSourceId: 'baseline-file:2026-08-31-v1',
      createdAt: '2026-01-01T00:00:00.000Z',
      simulationStartDate: '2026-01-01',
      targetTicks: 50,
      parameters: {} as ScenarioParameters,
      correlationId: 'corr-audit-file',
    },
    correlationId: 'corr-audit-file',
  };

  const auditFile = resolveRunSourceAudit(mockRunFile);
  ok = a(
    log,
    'AuditTierView resolveRunSourceAudit visualisiert baseline-file Quelle fehlerfrei',
    auditFile.baselineVersion === 'baseline-file:2026-08-31-v1' &&
      auditFile.dataSourceId === 'baseline-file:2026-08-31-v1' &&
      auditFile.sourceKind === 'file' &&
      auditFile.sourceLabel === 'Baseline-Datei 2026-08-31-v1'
  ) && ok;

  log.push('\n=================================================================');
  if (ok) {
    log.push('🎉 ALL AUFTRAG 016 DATA SOURCE TESTS PASSED SUCCESSFULLY!\n');
  } else {
    log.push('⚠️ SOME TESTS FAILED IN AUFTRAG 016 DATA SOURCE TEST SUITE.\n');
  }

  return { success: ok, log };
}

const a = (log: string[], n: string, c: boolean) => {
  log.push(`${c ? '✅' : '❌'} ${n}`);
  return c;
};
