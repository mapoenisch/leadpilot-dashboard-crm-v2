import { REGIONEN } from '../../domain/kundenData';
import { ICP_SPECS } from '../../domain/icpData';
import { EXEC_KPIS_1 } from '../../domain/execData';
import { CRMRepository } from '../../services/db/crmRepository';

export async function runRegionSplitIntegrityTest(): Promise<{ success: boolean; log: string[] }> {
  const log: string[] = [];
  log.push('=== STARTING AUFTRAG 018-A TEST SUITE (FAKTENBLATT V1.1 REGION SPLIT INTEGRITY) ===');

  let overallPassed = true;

  // --- TEST A: REGIONEN structure exists & contains valid fields ---
  log.push('\n--- TEST A: REGIONEN structure exists & contains valid fields ---');
  const hasValidStructure = !!(
    REGIONEN &&
    REGIONEN.rows &&
    Array.isArray(REGIONEN.rows) &&
    REGIONEN.distribution &&
    typeof REGIONEN.distribution === 'object'
  );
  if (hasValidStructure) {
    log.push(
      '✅ TEST A PASSED: REGIONEN object contains valid rows array and distribution mapping.',
    );
  } else {
    log.push('❌ TEST A FAILED: REGIONEN structure is invalid or missing.');
    overallPassed = false;
  }

  // --- TEST B: Exact Faktenblatt v1.1 region values ---
  log.push('\n--- TEST B: Exact Faktenblatt v1.1 region values ---');
  const de = REGIONEN.distribution.deutschland;
  const at = REGIONEN.distribution.oesterreich;
  const ch = REGIONEN.distribution.schweiz;
  const total = REGIONEN.total;

  const deRow = REGIONEN.rows.find((r) => r.region === 'Deutschland');
  const atRow = REGIONEN.rows.find((r) => r.region === 'Österreich');
  const chRow = REGIONEN.rows.find((r) => r.region === 'Schweiz');

  if (de === 61 && at === 3 && ch === 2 && total === 66) {
    log.push(
      `✅ TEST B PASSED: Exact region distribution verified: Deutschland=${de}, Österreich=${at}, Schweiz=${ch}, Total=${total}.`,
    );
  } else {
    log.push(
      `❌ TEST B FAILED: Region distribution mismatch (DE=${de}, AT=${at}, CH=${ch}, Total=${total}).`,
    );
    overallPassed = false;
  }

  // --- TEST C: Region values are strictly positive (> 0) ---
  log.push('\n--- TEST C: Region values are strictly positive (> 0) ---');
  if (
    de > 0 &&
    at > 0 &&
    ch > 0 &&
    deRow?.kunden === 61 &&
    atRow?.kunden === 3 &&
    chRow?.kunden === 2
  ) {
    log.push(
      '✅ TEST C PASSED: All regional customer values are strictly positive and consistent in table rows.',
    );
  } else {
    log.push('❌ TEST C FAILED: Non-positive or inconsistent regional values detected.');
    overallPassed = false;
  }

  // --- TEST D: Region sum matches EXEC_KPIS active customer count ---
  log.push('\n--- TEST D: Region sum matches EXEC_KPIS active customer count ---');
  const calculatedSum = de + at + ch;
  const execKundenKpi = EXEC_KPIS_1.find(
    (k) => k.label.includes('Kunden') || k.label.includes('Aktive Kunden'),
  );
  const execKundenValue = execKundenKpi ? parseInt(execKundenKpi.value, 10) : 0;

  if (calculatedSum === 66 && calculatedSum === execKundenValue) {
    log.push(
      `✅ TEST D PASSED: Regional customer sum (${calculatedSum}) equals EXEC_KPIS customer count (${execKundenValue}).`,
    );
  } else {
    log.push(
      `❌ TEST D FAILED: Regional sum (${calculatedSum}) does not match EXEC_KPIS (${execKundenValue}).`,
    );
    overallPassed = false;
  }

  // --- TEST E: ICP_SPECS region description reflects Faktenblatt v1.1 without full-coverage claim ---
  log.push('\n--- TEST E: ICP_SPECS region description reflects Faktenblatt v1.1 ---');
  const regionFirmografie = ICP_SPECS.firmografie.find((f) => f.key === 'Region');
  const val = regionFirmografie?.value || '';
  const containsPreciseInfo =
    val.includes('Deutschland 61') && val.includes('Österreich 3') && val.includes('Schweiz 2');
  if (containsPreciseInfo) {
    log.push(
      `✅ TEST E PASSED: ICP_SPECS region explicitly documents current customer count: "${val}"`,
    );
  } else {
    log.push(
      `❌ TEST E FAILED: ICP_SPECS region does not contain precise customer numbers: "${val}"`,
    );
    overallPassed = false;
  }

  // --- TEST F: Regressionsschutz Ebene A CRM Baseline ---
  log.push('\n--- TEST F: Regressionsschutz Ebene A CRM Baseline ---');
  const audit = await CRMRepository.getAuditSummary();
  const crmValid =
    audit.companiesValid === 20 && audit.contactsValid === 100 && audit.dealsValid === 40;
  if (crmValid) {
    log.push(
      '✅ TEST F PASSED: Historical Ebene A CRM baseline remains 100% pristine (20 Companies, 100 Contacts, 40 Deals).',
    );
  } else {
    log.push(
      `❌ TEST F FAILED: CRM Baseline mutated (${audit.companiesValid}/${audit.contactsValid}/${audit.dealsValid})`,
    );
    overallPassed = false;
  }

  return { success: overallPassed, log };
}
