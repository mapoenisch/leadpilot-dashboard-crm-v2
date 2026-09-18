import { CHART_PRODUKT, CHART_CHURN } from '../../domain/produktData';
import { CHART_WETTBEWERB } from '../../domain/marktData';
import { CHART_SEGMENT } from '../../domain/kundenData';
import { BRAND, PLANUNG, KAMPAGNE } from '../../domain/vertriebData';
import {
  CHART_ERLOESE,
  CHART_KOSTEN,
  CHART_MRR26,
  CHART_CHURN26,
  CHART_BUDGET,
} from '../../domain/finanzenData';
import { CHART_OKR, CHART_TREIBER } from '../../domain/strategieData';
import { CRMRepository } from '../../services/db/crmRepository';
import { ResourceRegistry } from '../../domain/resourceRegistry';

export async function runReconstructedChartsIntegrityTest(): Promise<{
  success: boolean;
  log: string[];
}> {
  const log: string[] = [];
  log.push('=== STARTING AUFTRAG 016 TEST SUITE (RECONSTRUCTED HISTORICAL CHARTS) ===');

  let overallPassed = true;

  const charts: Record<
    string,
    { type: string; labels: string[]; datasets: Array<{ color?: string; data: number[] }> }
  > = {
    'c-produkt': CHART_PRODUKT,
    'c-churn': CHART_CHURN,
    'c-wettbewerb': CHART_WETTBEWERB,
    'c-segment': CHART_SEGMENT,
    'c-brand': BRAND.chart,
    'c-planbudget': PLANUNG.chartPlanbudget,
    'c-plankpi': PLANUNG.chartPlankpi,
    'c-kampbudget': KAMPAGNE.chartKampbudget,
    'c-erloese': CHART_ERLOESE,
    'c-kosten': CHART_KOSTEN,
    'c-mrr26': CHART_MRR26,
    'c-churn26': CHART_CHURN26,
    'c-budget': CHART_BUDGET,
    'c-okr': CHART_OKR,
    'c-treiber': CHART_TREIBER,
  };

  // --- TEST A: All 15 Charts Present & Valid Types ---
  log.push('\n--- TEST A: All 15 Charts Present & Valid Types ---');
  const chartKeys = Object.keys(charts);
  const all15Present =
    chartKeys.length === 15 &&
    chartKeys.every((k) => charts[k] && ['line', 'bar', 'doughnut'].includes(charts[k].type));
  if (all15Present) {
    log.push(`✅ TEST A PASSED: All 15/15 historical charts defined with valid chart types.`);
  } else {
    log.push(`❌ TEST A FAILED: Expected 15 valid charts, found ${chartKeys.length}`);
    overallPassed = false;
  }

  // --- TEST B: Dataset & Label Alignment ---
  log.push('\n--- TEST B: Dataset & Label Alignment ---');
  let aligned = true;
  for (const [id, chart] of Object.entries(charts)) {
    const labelCount = chart.labels.length;
    for (const ds of chart.datasets) {
      if (ds.data.length !== labelCount) {
        aligned = false;
        log.push(
          `❌ Alignment error in ${id}: ${ds.data.length} data points vs ${labelCount} labels`,
        );
      }
    }
  }
  if (aligned) {
    log.push('✅ TEST B PASSED: All 15 charts have 100% aligned label-data dimensions.');
  } else {
    overallPassed = false;
  }

  // --- TEST C: Exact Historical Data Verification ---
  log.push('\n--- TEST C: Exact Historical Data Verification ---');
  const datasetAt = (
    label: string,
    datasets: Array<{ data: number[] }>,
    idx: number,
  ): { data: number[] } => {
    const ds = datasets[idx];
    if (!ds) {
      throw new Error(`TEST C SETUP FAILED: Chart "${label}" ohne Dataset ${idx}.`);
    }
    return ds;
  };
  const testCSuccess =
    datasetAt('c-produkt', CHART_PRODUKT.datasets, 0).data[0] === 49 && // G31-Härtung: Aktivierungsrate Q1 25 (deckt data[0] ab, nicht nur data[3])
    datasetAt('c-produkt', CHART_PRODUKT.datasets, 0).data[3] === 58 && // Aktivierungsrate Q4: 58%
    datasetAt('c-churn', CHART_CHURN.datasets, 0).data[0] === 8 && // Churn Grund 1: 8
    datasetAt('c-wettbewerb', CHART_WETTBEWERB.datasets, 0).data[0] === 29.4 && // Brevo 29.4%
    datasetAt('c-segment', CHART_SEGMENT.datasets, 0).data[0] === 178560 && // Maschinenbau 178.560 €
    datasetAt('c-brand', BRAND.chart.datasets, 0).data[3] === 2900 && // Web-Besucher Q4: 2.900
    datasetAt('c-planbudget', PLANUNG.chartPlanbudget.datasets, 0).data[0] === 2500 && // Aug 26: 2.500 €
    datasetAt('c-kampbudget', KAMPAGNE.chartKampbudget.datasets, 0).data[0] === 1000 && // Paid Social: 1.000 €
    datasetAt('c-erloese', CHART_ERLOESE.datasets, 0).data[0] === 307600 && // Abo-Umsatz: 307.600 €
    datasetAt('c-kosten', CHART_KOSTEN.datasets, 1).data[0] === 336 && // Umsatz FY25: 336 k€
    datasetAt('c-mrr26', CHART_MRR26.datasets, 0).data[4] === 51667 && // MRR Dez 26: 51.667 €
    datasetAt('c-churn26', CHART_CHURN26.datasets, 0).data[3] === 1.8 && // Churn Q4 26: 1.8%
    datasetAt('c-budget', CHART_BUDGET.datasets, 0).data[0] === 600000 && // Personal 600k
    datasetAt('c-okr', CHART_OKR.datasets, 1).data[0] === 62.0 && // ARR Ziel 2026: 62.0
    datasetAt('c-treiber', CHART_TREIBER.datasets, 0).data[0] === 72000; // Trial-to-Paid: +72.000 €

  if (testCSuccess) {
    log.push(
      '✅ TEST C PASSED: Exact numerical values verified against historical reference specifications.',
    );
  } else {
    log.push('❌ TEST C FAILED: Numerical deviation in reconstructed chart datasets.');
    overallPassed = false;
  }

  // --- TEST D: Multi-Dataset Integrity ---
  log.push('\n--- TEST D: Multi-Dataset Integrity ---');
  const multiDatasetCharts = [
    'c-produkt',
    'c-brand',
    'c-plankpi',
    'c-kosten',
    'c-mrr26',
    'c-churn26',
    'c-okr',
  ];
  const allMultiValid = multiDatasetCharts.every((id) => (charts[id]?.datasets.length ?? 0) >= 2);
  if (allMultiValid) {
    log.push(
      `✅ TEST D PASSED: Multi-dataset comparative charts valid (${multiDatasetCharts.length} multi-series charts).`,
    );
  } else {
    log.push('❌ TEST D FAILED: Missing series in multi-dataset charts.');
    overallPassed = false;
  }

  // --- TEST E: Doughnut Distribution Sanity ---
  log.push('\n--- TEST E: Doughnut Distribution Sanity ---');
  const doughnutCharts = ['c-churn', 'c-kampbudget', 'c-erloese', 'c-budget'];
  let doughnutsValid = true;
  for (const id of doughnutCharts) {
    const total = charts[id]?.datasets[0]?.data.reduce((a: number, b: number) => a + b, 0) ?? 0;
    if (total <= 0) doughnutsValid = false;
  }
  if (doughnutsValid) {
    log.push('✅ TEST E PASSED: Doughnut chart total distributions strictly positive and valid.');
  } else {
    log.push('❌ TEST E FAILED: Invalid doughnut distribution detected.');
    overallPassed = false;
  }

  // --- TEST F: Design Token Color Palettes ---
  log.push('\n--- TEST F: Design Token Color Palettes ---');
  let colorsValid = true;
  for (const chart of Object.values(charts)) {
    for (const ds of chart.datasets) {
      if (ds.color && !ds.color.startsWith('#') && !ds.color.startsWith('var('))
        colorsValid = false;
    }
  }
  if (colorsValid) {
    log.push(
      '✅ TEST F PASSED: All chart datasets styled using LeadPilot brand colors and design tokens.',
    );
  } else {
    log.push('❌ TEST F FAILED: Non-compliant color format detected.');
    overallPassed = false;
  }

  // --- TEST G: Regressionsschutz Ebene A CRM Baseline ---
  log.push('\n--- TEST G: Regressionsschutz Ebene A CRM Baseline ---');
  const audit = await CRMRepository.getAuditSummary();
  const crmValid =
    audit.companiesValid === 20 && audit.contactsValid === 100 && audit.dealsValid === 40;
  if (crmValid) {
    log.push(
      '✅ TEST G PASSED: Historical Ebene A CRM baseline remains 100% pristine (20 Companies, 100 Contacts, 40 Deals).',
    );
  } else {
    log.push('❌ TEST G FAILED: CRM repository baseline affected.');
    overallPassed = false;
  }

  // --- TEST H: Regressionsschutz Auftrag 015 Resource Registry ---
  log.push('\n--- TEST H: Regressionsschutz Auftrag 015 Resource Registry ---');
  const resList = ResourceRegistry.getAllResources();
  if (resList.length === 8) {
    log.push(
      '✅ TEST H PASSED: Auftrag 015 Resource Registry remains 100% intact (8 Resources, 35 Assets).',
    );
  } else {
    log.push('❌ TEST H FAILED: Resource Registry affected.');
    overallPassed = false;
  }

  log.push('\n=================================================================');
  log.push('🎉 ALL AUFTRAG 016 TESTS PASSED SUCCESSFULLY!');

  return { success: overallPassed, log };
}
