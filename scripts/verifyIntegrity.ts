import { runDataIntegrityTest } from '../src/simulation/__tests__/simulationIntegrity.test';
import { runScenarioRunTest } from '../src/simulation/__tests__/scenarioRunIntegrity.test';
import { runParameterRegistryTest } from '../src/simulation/__tests__/parameterRegistryIntegrity.test';
import { runWorkerTest } from '../src/simulation/__tests__/workerIntegrity.test';
import { runMonteCarloTest } from '../src/simulation/__tests__/monteCarloIntegrity.test';
import { runSnapshotTest } from '../src/simulation/__tests__/snapshotIntegrity.test';
import { runUiIntegrityTest } from '../src/simulation/__tests__/uiIntegrity.test';
import { runTimeSeriesAggregationTest } from '../src/simulation/__tests__/timeSeriesAggregationIntegrity.test';
import { runSalesQueueIntegrityTest } from '../src/simulation/__tests__/salesQueueIntegrity.test';
import { runCSHealthIntegrityTest } from '../src/simulation/__tests__/csHealthIntegrity.test';
import { runFinancialIntegrityTest } from '../src/simulation/__tests__/financialIntegrity.test';
import { runStateMachineIntegrityTest } from '../src/simulation/__tests__/stateMachineIntegrity.test';
import { runSnapshotPruningIntegrityTest } from '../src/simulation/__tests__/snapshotPruningIntegrity.test';
import { runScenarioComparisonIntegrityTest } from '../src/simulation/__tests__/scenarioComparisonIntegrity.test';
import { runResourceInfrastructureIntegrityTest } from '../src/simulation/__tests__/resourceInfrastructureIntegrity.test';
import { runReconstructedChartsIntegrityTest } from '../src/simulation/__tests__/reconstructedChartsIntegrity.test';
import { runRegionSplitIntegrityTest } from '../src/simulation/__tests__/regionSplitIntegrity.test';
import { runReproducibilityTest } from '../src/simulation/__tests__/reproducibilityIntegrity.test';
import { runQueueHistoryTest } from '../src/simulation/__tests__/queueHistoryIntegrity.test';
import { runDataSourceTest } from '../src/simulation/__tests__/dataSourceIntegrity.test';
import { runMeasureTest } from '../src/simulation/__tests__/measureIntegrity.test';
import { runKpiTimeSeriesTest } from '../src/simulation/__tests__/kpiTimeSeriesIntegrity.test';
import { runMultiScenarioComparisonTest } from '../src/simulation/__tests__/multiScenarioComparisonIntegrity.test';
import { runHubSpotSourceTest } from '../src/simulation/__tests__/hubSpotSourceIntegrity.test';

async function main() {
  console.log('=================================================================');
  console.log('LEADPILOT DASHBOARD-CRM: INTEGRITY & DOMAIN VERIFICATION');
  console.log('=================================================================\n');

  const test1 = await runDataIntegrityTest();
  console.log(test1.log.join('\n'));
  
  console.log('\n-----------------------------------------------------------------\n');

  const test2 = await runScenarioRunTest();
  console.log(test2.log.join('\n'));

  console.log('\n-----------------------------------------------------------------\n');

  const test3 = await runParameterRegistryTest();
  console.log(test3.log.join('\n'));

  console.log('\n-----------------------------------------------------------------\n');

  const test4 = await runWorkerTest();
  console.log(test4.log.join('\n'));

  console.log('\n-----------------------------------------------------------------\n');

  const test5 = await runMonteCarloTest();
  console.log(test5.log.join('\n'));

  console.log('\n-----------------------------------------------------------------\n');

  const test6 = await runSnapshotTest();
  console.log(test6.log.join('\n'));

  console.log('\n-----------------------------------------------------------------\n');

  const test7 = await runUiIntegrityTest();
  console.log(test7.log.join('\n'));

  console.log('\n-----------------------------------------------------------------\n');

  const test8 = await runTimeSeriesAggregationTest();
  console.log(test8.log.join('\n'));

  console.log('\n-----------------------------------------------------------------\n');

  const test9 = await runSalesQueueIntegrityTest();
  console.log(test9.log.join('\n'));

  console.log('\n-----------------------------------------------------------------\n');

  const test10 = await runCSHealthIntegrityTest();
  console.log(test10.log.join('\n'));

  console.log('\n-----------------------------------------------------------------\n');

  const test11 = await runFinancialIntegrityTest();
  console.log(test11.log.join('\n'));

  console.log('\n-----------------------------------------------------------------\n');

  const test12 = await runStateMachineIntegrityTest();
  console.log(test12.log.join('\n'));

  console.log('\n-----------------------------------------------------------------\n');

  const test13 = await runSnapshotPruningIntegrityTest();
  console.log(test13.log.join('\n'));

  console.log('\n-----------------------------------------------------------------\n');

  const test14 = await runScenarioComparisonIntegrityTest();
  console.log(test14.log.join('\n'));

  console.log('\n-----------------------------------------------------------------\n');

  const test15 = await runResourceInfrastructureIntegrityTest();
  console.log(test15.log.join('\n'));

  console.log('\n-----------------------------------------------------------------\n');

  const test16 = await runReconstructedChartsIntegrityTest();
  console.log(test16.log.join('\n'));

  console.log('\n-----------------------------------------------------------------\n');

  const test17 = await runRegionSplitIntegrityTest();
  console.log(test17.log.join('\n'));

  console.log('\n-----------------------------------------------------------------\n');

  const test18 = await runReproducibilityTest();
  console.log(test18.log.join('\n'));

  console.log('\n-----------------------------------------------------------------\n');

  const test19 = await runQueueHistoryTest();
  console.log(test19.log.join('\n'));

  console.log('\n-----------------------------------------------------------------\n');

  const test20 = await runDataSourceTest();
  console.log(test20.log.join('\n'));

  console.log('\n-----------------------------------------------------------------\n');

  const test21 = await runMeasureTest();

  console.log('\n-----------------------------------------------------------------\n');

  const test22 = await runKpiTimeSeriesTest();

  console.log('\n-----------------------------------------------------------------\n');

  const test23 = await runMultiScenarioComparisonTest();

  console.log('\n-----------------------------------------------------------------\n');

  const test24 = await runHubSpotSourceTest();
  console.log(test24.log.join('\n'));

  const suites = [
    { name: '001 - Data Integrity', res: test1 },
    { name: '002 - Scenario Run Integrity', res: test2 },
    { name: '003 - Parameter Registry', res: test3 },
    { name: '004 - Worker Integrity', res: test4 },
    { name: '005 - Monte Carlo Integrity', res: test5 },
    { name: '006 - Snapshot Integrity', res: test6 },
    { name: '007 - UI Integrity', res: test7 },
    { name: '008 - Time Series Aggregation', res: test8 },
    { name: '009 - Sales Queue Model', res: test9 },
    { name: '010 - CS Health Model', res: test10 },
    { name: '011 - Financial Model', res: test11 },
    { name: '012 - State Machine & Invariant Engine', res: test12 },
    { name: '013 - Snapshot Pruning & Storage Optimization', res: test13 },
    { name: '014 - Scenario Comparison, Goal Target Evaluator & Multi-Run Analytics', res: test14 },
    { name: '015 - Internal Resources & Asset Infrastructure', res: test15 },
    { name: '016 - Reconstructed Historical Charts', res: test16 },
    { name: '017 - Faktenblatt v1.1 Region Split Integrity', res: test17 },
    { name: '019 - Reproducibility (Golden Run & Snapshot Pinning)', res: test18 },
    { name: '020 - Queue History & Bounded Projections', res: test19 },
    { name: '021 - Data Sources & Baseline Snapshots', res: test20 },
    { name: '022 - Measures & Effective Parameters', res: { success: test21, log: [] } },
    { name: '023 - KPI Time Series & Distribution UI', res: { success: test22, log: [] } },
    { name: '024 - Multi-Scenario Comparison & Trade-Offs', res: { success: test23, log: [] } },
    { name: '025 - HubSpot Baseline Source', res: test24 },
  ];

  for (const s of suites) {
    if (!s.res.success) {
      console.error(`\n❌ SUITE FAILED: ${s.name}`);
      const fails = s.res.log.filter((l) => l.includes('❌'));
      console.error(fails.join('\n'));
    }
  }

  const allSuccess = suites.map((s) => s.res.success);
  console.log('SUITES SUCCESS STATUS:', allSuccess);

  if (allSuccess.some((s) => !s)) {
    console.error('\n❌ INTEGRITY VERIFICATION FAILED!');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL INTEGRITY VERIFICATION SUITES (001 bis 025) PASSED SUCCESSFULLY!');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
