import { ScenarioParameters } from './scenario';
import { ChannelMix } from './parameter';

/** V1-Maßnahmenkatalog (Entscheidungen 449–458). Bewusst NICHT: churnRateMonthly, csRepCount, targetPackageFocus. */
export type MeasureParameterKey =
  | 'marketingBudgetYearly'
  | 'channelMix'
  | 'trialToPaidConversion'
  | 'salesRepCount'
  | 'salesCycleDays'
  | 'discountPercent';

export const MEASURE_PARAMETER_KEYS: readonly MeasureParameterKey[] = [
  'marketingBudgetYearly',
  'channelMix',
  'trialToPaidConversion',
  'salesRepCount',
  'salesCycleDays',
  'discountPercent',
];

export type MeasureChangeMode = 'set' | 'delta' | 'multiply';

export interface MeasureChange {
  parameter: MeasureParameterKey;
  mode: MeasureChangeMode; // 'set' = Zielwert, 'delta' = +/- absolut, 'multiply' = Faktor
  value: number;
}

export interface Measure {
  id: string;
  name: string;
  description?: string;
  startTick: number; // >= 0
  durationTicks?: number; // undefined = dauerhaft (Entscheidungen 419–428)
  rampUpTicks?: number; // 0 / undefined = sofort wirksam (Entscheidungen 459–468)
  changes: MeasureChange[]; // mind. 1
  createdAt: string; // systemContext.now()
}

export interface MeasureConflict {
  parameter: MeasureParameterKey;
  measureIds: string[];
  kind: 'MULTIPLE_SET' | 'SET_AND_RELATIVE';
  message: string;
}

export interface MeasureKpiDelta {
  kpiId: 'liveARR' | 'liveMRR' | 'liveCustomers' | 'liveCash' | 'liveEBITDA';
  label: string;
  unit: string;
  baseValue: number;
  withMeasuresValue: number;
  delta: number;
  deltaPercent: number;
}

export class MeasureError extends Error {
  constructor(
    public code: 'INVALID_PARAMETER' | 'INVALID_TIMING' | 'EMPTY_CHANGES' | 'OUT_OF_BOUNDS',
    message: string
  ) {
    super(message);
    this.name = 'MeasureError';
  }
}
