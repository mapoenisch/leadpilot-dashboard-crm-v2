export interface WhatIfParameters {
  churnRate: number; // in Prozent (z. B. 2.8 für 2,8 %)
  salesCycleDays: number; // in Tagen (z. B. 38)
  marketingBudget: number; // in Euro/Jahr (z. B. 65.000)
  winRate: number; // in Prozent (z. B. 12.0 für 12,0 %)
}

export interface MonthlyProjectionPoint {
  month: number;
  monthLabel: string;
  baselineArr: number;
  whatIfArr: number;
  deltaArr: number;
  customers: number;
  newCustomers: number;
  churnedCustomers: number;
}

export interface WhatIfResult {
  parameters: WhatIfParameters;
  baselineArrM12: number;
  targetArr: number;
  deltaArr: number;
  deltaArrPercent: number;
  newArrTotal: number;
  churnLossTotal: number;
  netNewArr: number;
  startingCustomers: number;
  finalCustomers: number;
  newCustomersTotal: number;
  churnedCustomersTotal: number;
  netNewCustomers: number;
  cac: number;
  cacPaybackMonths: number;
  baselineCacPaybackMonths: number;
  monthlyCurve: MonthlyProjectionPoint[];
}

export interface TornadoLeverItem {
  key: keyof WhatIfParameters;
  label: string;
  unit: string;
  currentValue: number;
  favorableValue: number;
  unfavorableValue: number;
  favorableArrDelta: number; // Delta ARR bei günstiger Abweichung
  unfavorableArrDelta: number; // Delta ARR bei ungünstiger Abweichung
  swing: number; // Spannweite (favorable - unfavorable)
}

export const BASELINE_PARAMS: Readonly<WhatIfParameters> = {
  churnRate: 2.8,
  salesCycleDays: 38,
  marketingBudget: 65000,
  winRate: 12.0,
};

export const BASELINE_METRICS = {
  startingArr: 411840,
  startingCustomers: 66,
  acv: 6240, // 520 € MRR pro Kunde
  monthlyContributionMargin: 333, // Deckungsbeitrag je Kunde/Monat
  costPerLead: 128.01, // Kalibriert für exakt 620.000 € Plan-ARR bei Baseline
};

export const PARAM_LIMITS = {
  churnRate: { min: 1.0, max: 4.5, step: 0.1, unit: '%' },
  salesCycleDays: { min: 20, max: 60, step: 1, unit: 'Tage' },
  marketingBudget: { min: 30000, max: 150000, step: 5000, unit: '€' },
  winRate: { min: 6.0, max: 24.0, step: 0.5, unit: '%' },
} as const;

export type PresetKey = 'growth' | 'efficiency' | 'stress' | 'baseline';

export interface PresetScenario {
  id: PresetKey;
  name: string;
  icon: string;
  description: string;
  params: WhatIfParameters;
}

export const PRESETS: Record<PresetKey, PresetScenario> = {
  growth: {
    id: 'growth',
    name: 'Wachstums-Offensive',
    icon: '🚀',
    description: 'Marketing +40k €, Win-Rate +3 %, Churn unverändert',
    params: {
      churnRate: 2.8,
      salesCycleDays: 38,
      marketingBudget: 105000,
      winRate: 15.0,
    },
  },
  efficiency: {
    id: 'efficiency',
    name: 'Effizienz & Retention',
    icon: '🛡️',
    description: 'Churn -1,3 %, Sales Cycle -10 Tage, Budget unverändert',
    params: {
      churnRate: 1.5,
      salesCycleDays: 28,
      marketingBudget: 65000,
      winRate: 12.0,
    },
  },
  stress: {
    id: 'stress',
    name: 'Stresstest / Krise',
    icon: '🌧️',
    description: 'Churn +1,0 %, Sales Cycle +12 Tage, Win-Rate -4,0 %',
    params: {
      churnRate: 3.8,
      salesCycleDays: 50,
      marketingBudget: 65000,
      winRate: 8.0,
    },
  },
  baseline: {
    id: 'baseline',
    name: 'Baseline-Status',
    icon: '↩️',
    description: 'Ausgangswerte des Faktenblatts FY 2025 / Plan 2026',
    params: BASELINE_PARAMS,
  },
};

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mär',
  'Apr',
  'Mai',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dez',
];

export function clampParameters(p: Partial<WhatIfParameters>): WhatIfParameters {
  const clamp = (val: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Number(val) || min));

  return {
    churnRate: clamp(
      p.churnRate ?? BASELINE_PARAMS.churnRate,
      PARAM_LIMITS.churnRate.min,
      PARAM_LIMITS.churnRate.max,
    ),
    salesCycleDays: clamp(
      p.salesCycleDays ?? BASELINE_PARAMS.salesCycleDays,
      PARAM_LIMITS.salesCycleDays.min,
      PARAM_LIMITS.salesCycleDays.max,
    ),
    marketingBudget: clamp(
      p.marketingBudget ?? BASELINE_PARAMS.marketingBudget,
      PARAM_LIMITS.marketingBudget.min,
      PARAM_LIMITS.marketingBudget.max,
    ),
    winRate: clamp(
      p.winRate ?? BASELINE_PARAMS.winRate,
      PARAM_LIMITS.winRate.min,
      PARAM_LIMITS.winRate.max,
    ),
  };
}

function run12MonthSimulation(params: WhatIfParameters) {
  const monthlyMarketing = params.marketingBudget / 12;
  const cycleMultiplier = 38 / params.salesCycleDays;
  const leadsPerMonth = monthlyMarketing / BASELINE_METRICS.costPerLead;
  const newCustomersPerMonth = leadsPerMonth * (params.winRate / 100) * cycleMultiplier;

  let currentCustomers = BASELINE_METRICS.startingCustomers;
  let totalNewCustomers = 0;
  let totalChurnedCustomers = 0;

  const points: {
    month: number;
    monthLabel: string;
    arr: number;
    customers: number;
    newCustomers: number;
    churnedCustomers: number;
  }[] = [];

  for (let m = 1; m <= 12; m += 1) {
    const churnedThisMonth = currentCustomers * (params.churnRate / 100);
    currentCustomers = currentCustomers + newCustomersPerMonth - churnedThisMonth;
    totalNewCustomers += newCustomersPerMonth;
    totalChurnedCustomers += churnedThisMonth;

    const currentArr = Math.round(currentCustomers * BASELINE_METRICS.acv);
    points.push({
      month: m,
      monthLabel: MONTH_LABELS[m - 1] ?? `M${m}`,
      arr: currentArr,
      customers: Math.round(currentCustomers),
      newCustomers: Math.round(newCustomersPerMonth * 10) / 10,
      churnedCustomers: Math.round(churnedThisMonth * 10) / 10,
    });
  }

  return {
    points,
    finalCustomers: Math.round(currentCustomers),
    totalNewCustomers,
    totalChurnedCustomers,
    finalArr: Math.round(currentCustomers * BASELINE_METRICS.acv),
  };
}

export function calculateProjection(rawParams: WhatIfParameters): WhatIfResult {
  const params = clampParameters(rawParams);
  const baselineSim = run12MonthSimulation(BASELINE_PARAMS);
  const whatIfSim = run12MonthSimulation(params);

  const baselineArrM12 = baselineSim.finalArr;
  const targetArr = whatIfSim.finalArr;
  const deltaArr = targetArr - baselineArrM12;
  const deltaArrPercent =
    baselineArrM12 > 0 ? Math.round((deltaArr / baselineArrM12) * 1000) / 10 : 0;

  const newArrTotal = Math.round(whatIfSim.totalNewCustomers * BASELINE_METRICS.acv);
  const churnLossTotal = Math.round(whatIfSim.totalChurnedCustomers * BASELINE_METRICS.acv);
  const netNewArr = newArrTotal - churnLossTotal;

  const totalNewCustomersRounded = Math.round(whatIfSim.totalNewCustomers);
  const cac =
    totalNewCustomersRounded > 0
      ? Math.round(params.marketingBudget / totalNewCustomersRounded)
      : params.marketingBudget;

  const cacPaybackMonths =
    BASELINE_METRICS.monthlyContributionMargin > 0
      ? Math.round((cac / BASELINE_METRICS.monthlyContributionMargin) * 10) / 10
      : 0;

  const baselineNewCust = Math.round(baselineSim.totalNewCustomers);
  const baselineCac =
    baselineNewCust > 0 ? Math.round(BASELINE_PARAMS.marketingBudget / baselineNewCust) : 0;
  const baselineCacPaybackMonths =
    Math.round((baselineCac / BASELINE_METRICS.monthlyContributionMargin) * 10) / 10;

  const monthlyCurve: MonthlyProjectionPoint[] = whatIfSim.points.map((pt, i) => {
    const basePt = baselineSim.points[i];
    const baseArr = basePt?.arr ?? pt.arr;
    return {
      month: pt.month,
      monthLabel: pt.monthLabel,
      baselineArr: baseArr,
      whatIfArr: pt.arr,
      deltaArr: pt.arr - baseArr,
      customers: pt.customers,
      newCustomers: pt.newCustomers,
      churnedCustomers: pt.churnedCustomers,
    };
  });

  return {
    parameters: params,
    baselineArrM12,
    targetArr,
    deltaArr,
    deltaArrPercent,
    newArrTotal,
    churnLossTotal,
    netNewArr,
    startingCustomers: BASELINE_METRICS.startingCustomers,
    finalCustomers: whatIfSim.finalCustomers,
    newCustomersTotal: totalNewCustomersRounded,
    churnedCustomersTotal: Math.round(whatIfSim.totalChurnedCustomers),
    netNewCustomers: whatIfSim.finalCustomers - BASELINE_METRICS.startingCustomers,
    cac,
    cacPaybackMonths,
    baselineCacPaybackMonths,
    monthlyCurve,
  };
}

export function calculateTornadoSensitivity(currentParams: WhatIfParameters): TornadoLeverItem[] {
  const base = calculateProjection(currentParams);
  const currentTargetArr = base.targetArr;

  // 1. Churn-Rate: günstiger ist -20% (bessere Retention), ungünstiger ist +20%
  const churnFav = clampParameters({
    ...currentParams,
    churnRate: Math.round(currentParams.churnRate * 0.8 * 10) / 10,
  });
  const churnUnfav = clampParameters({
    ...currentParams,
    churnRate: Math.round(currentParams.churnRate * 1.2 * 10) / 10,
  });
  const churnFavArr = calculateProjection(churnFav).targetArr - currentTargetArr;
  const churnUnfavArr = calculateProjection(churnUnfav).targetArr - currentTargetArr;

  // 2. Sales Cycle: günstiger ist -20% (schnellere Abschlüsse), ungünstiger ist +20%
  const cycleFav = clampParameters({
    ...currentParams,
    salesCycleDays: Math.round(currentParams.salesCycleDays * 0.8),
  });
  const cycleUnfav = clampParameters({
    ...currentParams,
    salesCycleDays: Math.round(currentParams.salesCycleDays * 1.2),
  });
  const cycleFavArr = calculateProjection(cycleFav).targetArr - currentTargetArr;
  const cycleUnfavArr = calculateProjection(cycleUnfav).targetArr - currentTargetArr;

  // 3. Marketing-Budget: günstiger ist +20% (mehr Leads), ungünstiger ist -20%
  const mktFav = clampParameters({
    ...currentParams,
    marketingBudget: Math.round((currentParams.marketingBudget * 1.2) / 1000) * 1000,
  });
  const mktUnfav = clampParameters({
    ...currentParams,
    marketingBudget: Math.round((currentParams.marketingBudget * 0.8) / 1000) * 1000,
  });
  const mktFavArr = calculateProjection(mktFav).targetArr - currentTargetArr;
  const mktUnfavArr = calculateProjection(mktUnfav).targetArr - currentTargetArr;

  // 4. Win-Rate: günstiger ist +20% (bessere Konversion), ungünstiger ist -20%
  const winFav = clampParameters({
    ...currentParams,
    winRate: Math.round(currentParams.winRate * 1.2 * 10) / 10,
  });
  const winUnfav = clampParameters({
    ...currentParams,
    winRate: Math.round(currentParams.winRate * 0.8 * 10) / 10,
  });
  const winFavArr = calculateProjection(winFav).targetArr - currentTargetArr;
  const winUnfavArr = calculateProjection(winUnfav).targetArr - currentTargetArr;

  const items: TornadoLeverItem[] = [
    {
      key: 'churnRate',
      label: 'Churn-Rate',
      unit: '%',
      currentValue: currentParams.churnRate,
      favorableValue: churnFav.churnRate,
      unfavorableValue: churnUnfav.churnRate,
      favorableArrDelta: churnFavArr,
      unfavorableArrDelta: churnUnfavArr,
      swing: Math.abs(churnFavArr - churnUnfavArr),
    },
    {
      key: 'salesCycleDays',
      label: 'Sales Cycle',
      unit: 'Tage',
      currentValue: currentParams.salesCycleDays,
      favorableValue: cycleFav.salesCycleDays,
      unfavorableValue: cycleUnfav.salesCycleDays,
      favorableArrDelta: cycleFavArr,
      unfavorableArrDelta: cycleUnfavArr,
      swing: Math.abs(cycleFavArr - cycleUnfavArr),
    },
    {
      key: 'marketingBudget',
      label: 'Marketing-Budget',
      unit: '€',
      currentValue: currentParams.marketingBudget,
      favorableValue: mktFav.marketingBudget,
      unfavorableValue: mktUnfav.marketingBudget,
      favorableArrDelta: mktFavArr,
      unfavorableArrDelta: mktUnfavArr,
      swing: Math.abs(mktFavArr - mktUnfavArr),
    },
    {
      key: 'winRate',
      label: 'Win-Rate (Konversion)',
      unit: '%',
      currentValue: currentParams.winRate,
      favorableValue: winFav.winRate,
      unfavorableValue: winUnfav.winRate,
      favorableArrDelta: winFavArr,
      unfavorableArrDelta: winUnfavArr,
      swing: Math.abs(winFavArr - winUnfavArr),
    },
  ];

  // Absteigend sortiert nach Hebelwirkung (Swing) -> Klassische Tornado-Form
  return items.sort((a, b) => b.swing - a.swing);
}
