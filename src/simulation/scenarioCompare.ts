import { V1_PARAMETER_DEFINITIONS } from './parameterRegistry';
import { ScenarioRepository } from './scenarioRepository';
import { KPIRegistry } from './kpiRegistry';
import { GoalTargetEvaluator } from './goalTargetEvaluator';
import { GoalTarget } from '../types/kpi';
import {
  KPIComparisonItem,
  ParameterDiffItem,
  ScenarioError,
  ScenarioParameters,
  VersionComparisonResult,
} from '../types/scenario';
import { ScenarioAggregationResult } from '../types/aggregation';

// 067K / G57 — aus scenarioService.ts herausgelöster Zwei-Versionen-Vergleich
// (reine Code-Bewegung, keine Verhaltensänderung; Entscheidungen 1637-1648).
// Aggregationen fließen über eine explizite Funktion ein.
export function compareVersionsWith(
  repo: ScenarioRepository,
  aggregate: (versionId: string) => ScenarioAggregationResult,
  versionIdA: string,
  versionIdB: string,
  targets?: Record<string, GoalTarget>,
): VersionComparisonResult {
  const versionA = repo.getVersion(versionIdA);
  const versionB = repo.getVersion(versionIdB);

  if (!versionA || !versionB) {
    throw new ScenarioError(
      'NOT_FOUND',
      `Eine oder beide ScenarioVersions (${versionIdA}, ${versionIdB}) wurden nicht gefunden.`,
    );
  }

  // 1. Parameter Diff using V1_PARAMETER_DEFINITIONS
  const parameterDiffs: ParameterDiffItem[] = [];
  const paramKeys = Object.keys(V1_PARAMETER_DEFINITIONS) as (keyof ScenarioParameters)[];

  for (const key of paramKeys) {
    const def = V1_PARAMETER_DEFINITIONS[key];
    const valA = versionA.parameters[key];
    const valB = versionB.parameters[key];

    let hasChanged = false;
    let delta: number | undefined = undefined;
    let deltaPercent: number | undefined = undefined;
    let formattedValueA = '';
    let formattedValueB = '';

    if (typeof valA === 'number' && typeof valB === 'number') {
      hasChanged = valA !== valB;
      delta = parseFloat((valB - valA).toFixed(2));
      deltaPercent = valA !== 0 ? parseFloat(((delta / Math.abs(valA)) * 100).toFixed(1)) : 0;
      formattedValueA = `${valA.toLocaleString('de-DE')} ${def.unit}`;
      formattedValueB = `${valB.toLocaleString('de-DE')} ${def.unit}`;
    } else if (typeof valA === 'object' && typeof valB === 'object') {
      const strA = JSON.stringify(valA);
      const strB = JSON.stringify(valB);
      hasChanged = strA !== strB;
      formattedValueA = Object.entries(valA || {})
        .map(([k, v]) => `${k}: ${v}%`)
        .join(', ');
      formattedValueB = Object.entries(valB || {})
        .map(([k, v]) => `${k}: ${v}%`)
        .join(', ');
    } else {
      hasChanged = valA !== valB;
      formattedValueA = String(valA ?? '');
      formattedValueB = String(valB ?? '');
    }

    parameterDiffs.push({
      key,
      label: def.label,
      unit: def.unit,
      valueA: valA,
      valueB: valB,
      hasChanged,
      delta,
      deltaPercent,
      formattedValueA,
      formattedValueB,
    });
  }

  // 2. KPI Diff using GoalTargetEvaluator & KPIRegistry
  const aggA = aggregate(versionIdA);
  const aggB = aggregate(versionIdB);
  const hasRunsA = aggA.validRunCount > 0;
  const hasRunsB = aggB.validRunCount > 0;

  const kpisToCompare = [
    {
      id: 'liveARR',
      baseline: 411840,
      valA: aggA.metrics.arr.median,
      valB: aggB.metrics.arr.median,
    },
    {
      id: 'liveMRR',
      baseline: 34320,
      valA: aggA.metrics.mrr.median,
      valB: aggB.metrics.mrr.median,
    },
    {
      id: 'liveCustomers',
      baseline: 66,
      valA: aggA.metrics.customers.median,
      valB: aggB.metrics.customers.median,
    },
    {
      id: 'liveWonDeals',
      baseline: 0,
      valA: aggA.metrics.wonDeals.median,
      valB: aggB.metrics.wonDeals.median,
    },
  ];

  const kpiComparisons: KPIComparisonItem[] = kpisToCompare.map((item) => {
    const kpiDef = KPIRegistry.getKPI(item.id);
    const defaultTargetValue =
      item.id === 'liveARR'
        ? 500000
        : item.id === 'liveMRR'
          ? 41666
          : item.id === 'liveCustomers'
            ? 80
            : 15;
    const target = targets?.[item.id] || { kpiId: item.id, targetValue: defaultTargetValue };

    const comparisonAB =
      hasRunsA && hasRunsB
        ? GoalTargetEvaluator.computeBaselineComparison(item.id, item.valB, item.valA)
        : undefined;
    const comparisonBaselineA = hasRunsA
      ? GoalTargetEvaluator.computeBaselineComparison(item.id, item.valA, item.baseline)
      : undefined;
    const comparisonBaselineB = hasRunsB
      ? GoalTargetEvaluator.computeBaselineComparison(item.id, item.valB, item.baseline)
      : undefined;

    const goalEvaluationA = hasRunsA
      ? GoalTargetEvaluator.evaluateGoalTarget(item.id, item.valA, target)
      : undefined;
    const goalEvaluationB = hasRunsB
      ? GoalTargetEvaluator.evaluateGoalTarget(item.id, item.valB, target)
      : undefined;

    return {
      kpiId: item.id,
      label: kpiDef.label,
      unit: kpiDef.unit,
      direction: kpiDef.direction,
      baselineValue: item.baseline,
      valueA: item.valA,
      valueB: item.valB,
      hasResultA: hasRunsA,
      hasResultB: hasRunsB,
      comparisonAB,
      comparisonBaselineA,
      comparisonBaselineB,
      goalEvaluationA,
      goalEvaluationB,
    };
  });

  // 3. Structured Summary Explanation
  const changedParams = parameterDiffs.filter((p) => p.hasChanged);
  const arrComp = kpiComparisons.find((k) => k.kpiId === 'liveARR')?.comparisonAB;

  let summaryExplanation = '';
  if (!hasRunsA && !hasRunsB) {
    summaryExplanation = `Vergleich v${versionA.versionNumber} ➔ v${versionB.versionNumber}: ${
      changedParams.length === 0
        ? 'Keine Parameterunterschiede'
        : `${changedParams.length} Parameter geändert (${changedParams.map((p) => p.label).join(', ')})`
    }. Beide Versionen wurden noch nicht simuliert (0 Runs).`;
  } else if (hasRunsA && !hasRunsB) {
    summaryExplanation = `Vergleich v${versionA.versionNumber} ➔ v${versionB.versionNumber}: ${
      changedParams.length === 0
        ? 'Keine Parameterunterschiede'
        : `${changedParams.length} Parameter geändert (${changedParams.map((p) => p.label).join(', ')})`
    }. Version ${versionB.versionNumber} wurde noch nicht simuliert (Simulation ausstehend).`;
  } else if (!hasRunsA && hasRunsB) {
    summaryExplanation = `Vergleich v${versionA.versionNumber} ➔ v${versionB.versionNumber}: ${
      changedParams.length === 0
        ? 'Keine Parameterunterschiede'
        : `${changedParams.length} Parameter geändert (${changedParams.map((p) => p.label).join(', ')})`
    }. Version ${versionA.versionNumber} besitzt noch keine Simulationsläufe.`;
  } else {
    summaryExplanation =
      changedParams.length === 0
        ? `Keine Parameterunterschiede zwischen Version ${versionA.versionNumber} und Version ${versionB.versionNumber}.`
        : `Vergleich v${versionA.versionNumber} ➔ v${versionB.versionNumber}: ${
            changedParams.length
          } Parameter geändert (${changedParams.map((p) => p.label).join(', ')}). ARR-Differenz: ${
            arrComp?.absoluteDelta && arrComp.absoluteDelta > 0 ? '+' : ''
          }${arrComp?.absoluteDelta.toLocaleString('de-DE')} € (${arrComp?.percentChange}%).`;
  }

  return {
    versionA,
    versionB,
    hasRunsA,
    hasRunsB,
    validRunCountA: aggA.validRunCount,
    validRunCountB: aggB.validRunCount,
    parameterDiffs,
    kpiComparisons,
    summaryExplanation,
  };
}
