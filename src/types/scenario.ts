import { ChannelMix } from './parameter';
import { SimulationMetrics, SimulationState } from './simulation';
import { TimeSeriesPoint } from './aggregation';

// V1 PARAMETER SURFACE — bewusster Ausschnitt (10 Felder). NICHT in V1:
// Kanalbudgets einzeln, Ramp-ups, Lead-Expiration, Setup-Fees, Paketpreise (Entsch. 149–478).
// Erweiterung = eigener Auftrag: ParameterRegistry-Eintrag + Validierung + UI + Test.
export interface ScenarioParameters {
  marketingBudgetYearly: number; // e.g. 65.000 €/Jahr (30.000 - 150.000 €)
  channelMix: ChannelMix; // 5 channels, auto-normalized to 100%
  trialToPaidConversion: number; // e.g. 18 % (10 - 40 %)
  salesRepCount: number; // e.g. 2 FTE (2 - 10 FTE)
  csRepCount: number; // e.g. 2 FTE (2 - 10 FTE)
  churnRateMonthly: number; // e.g. 2.8 %/Monat (0.5 - 5.0 %/Monat) [BINDING!]
  salesCycleDays: number; // e.g. 38 Tage (14 - 120 Tage)
  targetPackageFocus: 'Starter' | 'Growth' | 'Pro' | 'Balanced';
  winProbabilityMultiplier: number; // e.g. 1.0 (0.5 - 2.0)
  discountPercent: number; // e.g. 0 % (0 - 50 %)
}

export type ScenarioStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  status: ScenarioStatus;
  createdAt: string;
  updatedAt: string;
  currentVersionId: string;
  isProtected: boolean;
  parentScenarioId?: string;
}

export interface ScenarioVersion {
  id: string;
  scenarioId: string;
  versionNumber: number;
  parameters: Readonly<ScenarioParameters>; // Full immutable parameter set
  createdAt: string;
  createdBy?: string;
  description?: string;
}

import { Measure } from './measure';

export type RunStatus = 'PREPARING' | 'RUNNING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';

export interface RunManifest {
  readonly runId: string;
  readonly scenarioId: string;
  readonly scenarioVersionId: string;
  readonly seed: number;
  readonly initialRngState: number;
  readonly modelVersion: string;
  readonly schemaVersion: string;
  readonly baselineVersion: string;
  // 067E / G48: Baseline-Identität, kanonischer Hash und Mandant werden vor
  // jeder Reproduktion erneut geprüft (BASELINE_HASH_MISMATCH / ORG_MISMATCH).
  readonly baselineId: string;
  readonly baselineHash: string;
  readonly organizationId: string;
  readonly dataSourceId?: string;
  readonly createdAt: string;
  readonly simulationStartDate: string;
  readonly targetTicks: number;
  readonly parameters: Readonly<ScenarioParameters>;
  readonly correlationId: string;
  readonly measures?: readonly Measure[];
}

export interface SimulationRun {
  runId: string;
  scenarioId: string;
  scenarioVersionId: string;
  seed: number;
  rngState: number;
  modelVersion: string;
  schemaVersion: string;
  baselineVersion: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  manifest: Readonly<RunManifest>;
  finalState?: Readonly<SimulationState>;
  finalMetrics?: Readonly<SimulationMetrics>;
  timeSeries?: TimeSeriesPoint[];
  errorInfo?: string;
  correlationId: string;
  measures?: readonly Measure[];
}

export interface RunOptions {
  simulationStartDate?: string;
  correlationId?: string;
  baselineVersion?: string;
  dataSourceId?: string;
  measures?: Measure[];
  persist?: boolean;
  seed?: number;
  // 067E / G48: Mandant des Laufs und erwarteter Baseline-Hash. Reproduktion
  // übergibt beides aus dem Manifest; Abweichungen brechen fail-closed ab.
  organizationId?: string;
  expectedBaselineHash?: string;
}

import { BaselineComparisonResult, GoalTargetEvaluationResult } from './kpi';

export class ScenarioError extends Error {
  constructor(
    public code:
      | 'MAX_RUNS_EXCEEDED'
      | 'SCENARIO_PROTECTED_ERROR'
      | 'NOT_FOUND'
      | 'INVALID_VERSION'
      | 'VALIDATION_ERROR'
      | 'BASELINE_HASH_MISMATCH'
      | 'ORG_MISMATCH',
    message: string,
  ) {
    super(message);
    this.name = 'ScenarioError';
  }
}

export interface ParameterDiffItem {
  key: keyof ScenarioParameters;
  label: string;
  unit: string;
  valueA: ScenarioParameters[keyof ScenarioParameters];
  valueB: ScenarioParameters[keyof ScenarioParameters];
  hasChanged: boolean;
  delta?: number;
  deltaPercent?: number;
  formattedValueA: string;
  formattedValueB: string;
}

export interface KPIComparisonItem {
  kpiId: string;
  label: string;
  unit: string;
  direction: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';
  baselineValue: number;
  valueA: number;
  valueB: number;
  hasResultA: boolean;
  hasResultB: boolean;
  comparisonAB?: BaselineComparisonResult;
  comparisonBaselineA?: BaselineComparisonResult;
  comparisonBaselineB?: BaselineComparisonResult;
  goalEvaluationA?: GoalTargetEvaluationResult;
  goalEvaluationB?: GoalTargetEvaluationResult;
}

export interface VersionComparisonResult {
  versionA: ScenarioVersion;
  versionB: ScenarioVersion;
  hasRunsA: boolean;
  hasRunsB: boolean;
  validRunCountA: number;
  validRunCountB: number;
  parameterDiffs: ParameterDiffItem[];
  kpiComparisons: KPIComparisonItem[];
  summaryExplanation: string;
}

// ---------------------------------------------------------------------------
// AUFTRAG 019: Multi-Scenario Comparison & Trade-Off Dimensions (Decisions 849–873)
// ---------------------------------------------------------------------------

export type TradeOffDimension =
  'GROWTH' | 'PROFITABILITY' | 'LIQUIDITY' | 'ACQUISITION' | 'RETENTION';

export interface ParameterMatrixRow {
  key: keyof ScenarioParameters;
  label: string;
  unit: string;
  valuesByVersionId: Record<string, ScenarioParameters[keyof ScenarioParameters]>;
  formattedValuesByVersionId: Record<string, string>;
  hasChangedAgainstRef: Record<string, boolean>;
}

export interface KpiMatrixValue {
  median: number;
  p10: number;
  p90: number;
  mean?: number;
}

export interface KpiMatrixRow {
  kpiId: string;
  label: string;
  unit: string;
  direction: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';
  baselineValue: number;
  valuesByVersionId: Record<string, KpiMatrixValue | undefined>;
  deltasAgainstRef: Record<string, number | undefined>;
  percentAgainstRef: Record<string, number | undefined>;
  isFavorableAgainstRef: Record<string, boolean | undefined>;
}

export interface TradeOffVersionEvaluation {
  versionId: string;
  versionName: string;
  isLeader: boolean;
  metricHighlight: string;
  pros: string[];
  cons: string[];
}

export interface TradeOffEvaluation {
  dimension: TradeOffDimension;
  label: string;
  description: string;
  primaryKpiId: string;
  bestVersionId: string;
  evaluations: Record<string, TradeOffVersionEvaluation>;
  tradeOffSummary: string;
}

export interface KeyDifferenceItem {
  id: string;
  parameterKey: keyof ScenarioParameters;
  parameterLabel: string;
  affectedKpiId: string;
  affectedKpiLabel: string;
  dimension: TradeOffDimension;
  explanation: string;
  divergenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  causeClarity: 'CLEAR' | 'MULTIPLE_POSSIBLE' | 'INDETERMINATE';
}

export interface MultiVersionComparisonResult {
  referenceVersionId: string;
  versions: ScenarioVersion[];
  parameterMatrix: ParameterMatrixRow[];
  kpiMatrix: KpiMatrixRow[];
  tradeOffs: TradeOffEvaluation[];
  keyDifferences: KeyDifferenceItem[];
  comparisonWarnings: string[];
  summaryText: string;
}
