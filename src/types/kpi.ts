export type KPIDirection = 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';

export type KPICategory = 'OPERATIVE' | 'FINANCIAL' | 'CAPACITY';

export interface KPIDefinition {
  id: string;
  label: string;
  unit: string;
  category: KPICategory;
  direction: KPIDirection;
  description: string;
}

export interface GoalTarget {
  kpiId: string;
  targetValue: number;
  targetDate?: string;
  targetTick?: number;
}

export type GoalTargetStatus = 'ACHIEVED' | 'AT_RISK' | 'MISSED' | 'NO_TARGET';

export interface GoalTargetEvaluationResult {
  kpiId: string;
  status: GoalTargetStatus;
  actualValue: number;
  targetValue?: number;
  achievementPercent?: number; // e.g. 95.5%
  explanation: string;
  evaluatedAtTick: number;
}

export type BaselineComparisonMode = 'ABSOLUTE' | 'DELTA' | 'PERCENT';

export interface BaselineComparisonResult {
  kpiId: string;
  scenarioValue: number;
  baselineValue: number;
  absoluteDelta: number;
  percentChange: number; // e.g. +12.5% or -5.2%
  isPositiveChange: boolean; // True if change is favorable per KPI directionality
}
