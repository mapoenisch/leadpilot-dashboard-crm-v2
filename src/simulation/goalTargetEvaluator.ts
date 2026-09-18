import {
  BaselineComparisonResult,
  GoalTarget,
  GoalTargetEvaluationResult,
  GoalTargetStatus,
} from '../types/kpi';
import { KPIRegistry } from './kpiRegistry';

/**
 * Pure, deterministic Goal Target & Baseline Comparison Engine (Auftrag 014).
 * Performs all goal target evaluations and baseline comparison calculations outside of React.
 */
export class GoalTargetEvaluator {
  /**
   * Evaluates a KPI value against a target deterministically.
   * Enforces Decision 1313: KPIs without targets return NO_TARGET with 0 artificial probabilities.
   * Enforces Decision 1318-1320: Fixed central thresholds (80%/100%) and transparent explanations.
   */
  public static evaluateGoalTarget(
    kpiId: string,
    actualValue: number,
    target?: GoalTarget,
    tick = 0,
  ): GoalTargetEvaluationResult {
    const kpiDef = KPIRegistry.getKPI(kpiId);

    if (!target || typeof target.targetValue !== 'number') {
      return {
        kpiId,
        status: 'NO_TARGET',
        actualValue,
        explanation: `Kein Zielwert für ${kpiDef.label} definiert.`,
        evaluatedAtTick: tick,
      };
    }

    const targetVal = target.targetValue;
    let achievementPercent = 0;
    let status: GoalTargetStatus = 'NO_TARGET';
    let explanation = '';

    if (kpiDef.direction === 'HIGHER_IS_BETTER') {
      achievementPercent =
        targetVal !== 0 ? parseFloat(((actualValue / targetVal) * 100).toFixed(1)) : 100;

      if (achievementPercent >= 100) {
        status = 'ACHIEVED';
        explanation = `Ziel erreicht: ${actualValue.toLocaleString('de-DE')} ${kpiDef.unit} (${achievementPercent}% von Ziel ${targetVal.toLocaleString('de-DE')} ${kpiDef.unit}).`;
      } else if (achievementPercent >= 80) {
        status = 'AT_RISK';
        explanation = `Ziel gefährdet: ${actualValue.toLocaleString('de-DE')} ${kpiDef.unit} liegt bei ${achievementPercent}% des Ziels (${targetVal.toLocaleString('de-DE')} ${kpiDef.unit}; Schwelle: < 100%).`;
      } else {
        status = 'MISSED';
        explanation = `Ziel verfehlt: ${actualValue.toLocaleString('de-DE')} ${kpiDef.unit} liegt bei nur ${achievementPercent}% des Ziels (${targetVal.toLocaleString('de-DE')} ${kpiDef.unit}; Schwelle: < 80%).`;
      }
    } else {
      // LOWER_IS_BETTER (e.g. CAC, Churn, Queue Time)
      achievementPercent =
        actualValue !== 0 ? parseFloat(((targetVal / actualValue) * 100).toFixed(1)) : 100;

      if (actualValue <= targetVal) {
        status = 'ACHIEVED';
        explanation = `Ziel erreicht: ${actualValue.toLocaleString('de-DE')} ${kpiDef.unit} liegt unter/gleich dem Zielwert von ${targetVal.toLocaleString('de-DE')} ${kpiDef.unit}.`;
      } else if (actualValue <= targetVal * 1.25) {
        status = 'AT_RISK';
        explanation = `Ziel gefährdet: ${actualValue.toLocaleString('de-DE')} ${kpiDef.unit} übersteigt den Zielwert (${targetVal.toLocaleString('de-DE')} ${kpiDef.unit}) um weniger als 25%.`;
      } else {
        status = 'MISSED';
        explanation = `Ziel verfehlt: ${actualValue.toLocaleString('de-DE')} ${kpiDef.unit} übersteigt den Zielwert (${targetVal.toLocaleString('de-DE')} ${kpiDef.unit}) um mehr als 25%.`;
      }
    }

    return {
      kpiId,
      status,
      actualValue,
      targetValue: targetVal,
      achievementPercent,
      explanation,
      evaluatedAtTick: tick,
    };
  }

  /**
   * Computes baseline comparison deltas (Absolute Δ & Percentage %) deterministically.
   * Safely protects against division by zero (baselineValue = 0) without NaN or Infinity.
   */
  public static computeBaselineComparison(
    kpiId: string,
    scenarioValue: number,
    baselineValue: number,
  ): BaselineComparisonResult {
    const kpiDef = KPIRegistry.getKPI(kpiId);
    const absoluteDelta = parseFloat((scenarioValue - baselineValue).toFixed(2));

    let percentChange = 0;
    if (baselineValue === 0) {
      percentChange = scenarioValue === 0 ? 0 : 100;
    } else {
      percentChange = parseFloat(
        (((scenarioValue - baselineValue) / Math.abs(baselineValue)) * 100).toFixed(2),
      );
    }

    const isPositiveChange =
      kpiDef.direction === 'HIGHER_IS_BETTER' ? absoluteDelta >= 0 : absoluteDelta <= 0;

    return {
      kpiId,
      scenarioValue,
      baselineValue,
      absoluteDelta,
      percentChange,
      isPositiveChange,
    };
  }
}
