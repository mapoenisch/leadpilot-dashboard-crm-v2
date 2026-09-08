import { ScenarioAggregationResult } from '../types/aggregation';
import { BaselineComparisonResult, GoalTargetEvaluationResult } from '../types/kpi';
import { SimulationState } from '../types/simulation';
import { GoalTargetEvaluator } from './goalTargetEvaluator';

export interface ManagementViewData {
  baselineARR: number;
  baselineMRR: number;
  baselineCustomers: number;
  arrComp: BaselineComparisonResult;
  mrrComp: BaselineComparisonResult;
  custComp: BaselineComparisonResult;
  arrGoal: GoalTargetEvaluationResult;
  ebitdaGoal: GoalTargetEvaluationResult;
}

/**
 * Presenter layer for Executive Management View (Auftrag 014 / Schichtentrennung).
 * Pre-computes all baseline deltas and goal target evaluations outside of React JSX/render cycles.
 */
export class ManagementPresenter {
  public static readonly BASELINE_ARR = 411840;
  public static readonly BASELINE_MRR = 34320;
  public static readonly BASELINE_CUSTOMERS = 66;

  public static getManagementViewData(
    aggregation: ScenarioAggregationResult,
    state: SimulationState
  ): ManagementViewData {
    const arrMedian = aggregation.metrics.arr.median;
    const mrrMedian = aggregation.metrics.mrr.median;
    const custMedian = aggregation.metrics.customers.median;
    const ebitdaVal =
      aggregation.metrics.financialMetrics?.ebitda.median ?? state.metrics?.financialMetrics?.ebitda ?? 0;

    const arrComp = GoalTargetEvaluator.computeBaselineComparison(
      'liveARR',
      arrMedian,
      this.BASELINE_ARR
    );
    const mrrComp = GoalTargetEvaluator.computeBaselineComparison(
      'liveMRR',
      mrrMedian,
      this.BASELINE_MRR
    );
    const custComp = GoalTargetEvaluator.computeBaselineComparison(
      'liveCustomers',
      custMedian,
      this.BASELINE_CUSTOMERS
    );

    const arrGoal = GoalTargetEvaluator.evaluateGoalTarget(
      'liveARR',
      arrMedian,
      { kpiId: 'liveARR', targetValue: 500000 },
      state.tickCount
    );

    const ebitdaGoal = GoalTargetEvaluator.evaluateGoalTarget(
      'ebitda',
      ebitdaVal,
      { kpiId: 'ebitda', targetValue: 50000 },
      state.tickCount
    );

    return {
      baselineARR: this.BASELINE_ARR,
      baselineMRR: this.BASELINE_MRR,
      baselineCustomers: this.BASELINE_CUSTOMERS,
      arrComp,
      mrrComp,
      custComp,
      arrGoal,
      ebitdaGoal,
    };
  }
}
