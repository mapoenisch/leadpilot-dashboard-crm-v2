import { CRMRepository } from '../../services/db/crmRepository';

// 067K / G57 — aus snapshotIntegrity.test.ts herausgelöster Schlussteil
// (TEST V; reine Code-Bewegung, keine Verhaltensänderung).
export async function runSnapshotTailChecks(log: string[]): Promise<boolean> {
  // ---------------------------------------------------------
  // TEST V: Ebene A CRM Baseline Integrity
  // ---------------------------------------------------------
  log.push('\n--- TEST V: Ebene A CRM Baseline Integrity ---');
  const baselineCompanies = await CRMRepository.getCompanies();
  const baselineContacts = await CRMRepository.getContacts();
  const baselineDeals = await CRMRepository.getImportedFunnelDeals();

  const testVPassed =
    baselineCompanies.length === 20 &&
    baselineContacts.length === 100 &&
    baselineDeals.length === 40;

  if (testVPassed) {
    log.push(
      '✅ TEST V PASSED: Historical Ebene A CRM baseline remains 100% pristine (20 Companies, 100 Contacts, 40 Deals).',
    );
    return true;
  }
  log.push(
    '❌ TEST V FAILED: Historical Ebene A baseline was mutated by Snapshot Store test execution!',
  );
  return false;
}
