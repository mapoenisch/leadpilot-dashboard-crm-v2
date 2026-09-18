import { V1_PARAMETER_DEFINITIONS } from './parameterRegistry';
import { ScenarioRepository } from './scenarioRepository';
import { KPIRegistry } from './kpiRegistry';
import { GoalTargetEvaluator } from './goalTargetEvaluator';
import { GoalTarget } from '../types/kpi';
import {
  KpiMatrixRow,
  KpiMatrixValue,
  MultiVersionComparisonResult,
  ParameterMatrixRow,
  ScenarioError,
  ScenarioParameters,
  ScenarioVersion,
} from '../types/scenario';
import { ScenarioAggregationResult } from '../types/aggregation';
import { evaluateTradeOffs, identifyKeyDifferences } from './scenarioTradeoffs';

// 067K / G57 — aus scenarioService.ts herausgelöster Tiefen-Multi-Vergleich
// (reine Code-Bewegung, keine Verhaltensänderung; Decisions 849–873).
// Aggregationen fließen über eine explizite Funktion ein, Trade-offs und
// Key-Differences kommen aus scenarioTradeoffs.
export function compareMultipleVersionsWith(
  repo: ScenarioRepository,
  aggregate: (versionId: string) => ScenarioAggregationResult,
  versionIds: string[],
  _targets?: Record<string, GoalTarget>,
  referenceVersionId?: string,
): MultiVersionComparisonResult {
  if (!versionIds || versionIds.length < 2 || versionIds.length > 4) {
    throw new ScenarioError(
      'INVALID_VERSION',
      `Multi-Szenario-Vergleich erfordert zwischen 2 und 4 Versionen (erhalten: ${versionIds?.length ?? 0}).`,
    );
  }

  // 1. Fetch and validate all versions
  const versions: ScenarioVersion[] = [];
  for (const vid of versionIds) {
    const v = repo.getVersion(vid);
    if (!v) {
      throw new ScenarioError('NOT_FOUND', `ScenarioVersion "${vid}" wurde nicht gefunden.`);
    }
    versions.push(v);
  }

  const refId =
    referenceVersionId && versionIds.includes(referenceVersionId)
      ? referenceVersionId
      : versionIds[0];
  if (!refId) {
    // Unerreichbar: versionIds enthält per Guard oben 2–4 Einträge.
    throw new ScenarioError('INVALID_VERSION', 'Keine Referenzversion bestimmbar.');
  }
  const refVersion = versions.find((v) => v.id === refId)!;

  // 2. Build Parameter Matrix
  const paramKeys = Object.keys(V1_PARAMETER_DEFINITIONS) as (keyof ScenarioParameters)[];
  const parameterMatrix: ParameterMatrixRow[] = [];

  for (const key of paramKeys) {
    const def = V1_PARAMETER_DEFINITIONS[key];
    const valuesByVersionId: Record<string, ScenarioParameters[keyof ScenarioParameters]> = {};
    const formattedValuesByVersionId: Record<string, string> = {};
    const hasChangedAgainstRef: Record<string, boolean> = {};

    const refVal = refVersion.parameters[key];

    for (const v of versions) {
      const val = v.parameters[key];
      valuesByVersionId[v.id] = val;

      if (typeof val === 'number') {
        formattedValuesByVersionId[v.id] = `${val.toLocaleString('de-DE')} ${def.unit}`;
        hasChangedAgainstRef[v.id] = val !== refVal;
      } else if (typeof val === 'object') {
        formattedValuesByVersionId[v.id] = Object.entries(val || {})
          .map(([k, count]) => `${k}: ${count}%`)
          .join(', ');
        hasChangedAgainstRef[v.id] = JSON.stringify(val) !== JSON.stringify(refVal);
      } else {
        formattedValuesByVersionId[v.id] = String(val ?? '');
        hasChangedAgainstRef[v.id] = val !== refVal;
      }
    }

    parameterMatrix.push({
      key,
      label: def.label,
      unit: def.unit,
      valuesByVersionId,
      formattedValuesByVersionId,
      hasChangedAgainstRef,
    });
  }

  // 3. Build KPI Matrix with Aggregations
  const aggregations: Record<string, ScenarioAggregationResult> = {};
  for (const v of versions) {
    aggregations[v.id] = aggregate(v.id);
  }

  const kpiDefinitions = [
    { id: 'liveARR', baseline: 411840, extract: (a: ScenarioAggregationResult) => a.metrics.arr },
    { id: 'liveMRR', baseline: 34320, extract: (a: ScenarioAggregationResult) => a.metrics.mrr },
    {
      id: 'liveCustomers',
      baseline: 66,
      extract: (a: ScenarioAggregationResult) => a.metrics.customers,
    },
    {
      id: 'liveWonDeals',
      baseline: 0,
      extract: (a: ScenarioAggregationResult) => a.metrics.wonDeals,
    },
    {
      id: 'ebitda',
      baseline: 0,
      extract: (a: ScenarioAggregationResult) =>
        a.metrics.financialMetrics?.ebitda ?? {
          median: 0,
          p10: 0,
          p90: 0,
          mean: 0,
          stdDev: 0,
          min: 0,
          max: 0,
        },
    },
    {
      id: 'netRevenue',
      baseline: 411840,
      extract: (a: ScenarioAggregationResult) =>
        a.metrics.financialMetrics?.netRevenue ?? {
          median: 411840,
          p10: 411840,
          p90: 411840,
          mean: 411840,
          stdDev: 0,
          min: 411840,
          max: 411840,
        },
    },
    {
      id: 'netCashFlow',
      baseline: 0,
      extract: (a: ScenarioAggregationResult) =>
        a.metrics.financialMetrics?.netCashFlow ?? {
          median: 0,
          p10: 0,
          p90: 0,
          mean: 0,
          stdDev: 0,
          min: 0,
          max: 0,
        },
    },
    {
      id: 'cac',
      baseline: 600,
      extract: (a: ScenarioAggregationResult) =>
        a.metrics.financialMetrics?.cac ?? {
          median: 600,
          p10: 600,
          p90: 600,
          mean: 600,
          stdDev: 0,
          min: 600,
          max: 600,
        },
    },
  ];

  const kpiMatrix: KpiMatrixRow[] = [];

  for (const kDef of kpiDefinitions) {
    const kpiInfo = KPIRegistry.getKPI(kDef.id);
    const valuesByVersionId: Record<string, KpiMatrixValue | undefined> = {};
    const deltasAgainstRef: Record<string, number | undefined> = {};
    const percentAgainstRef: Record<string, number | undefined> = {};
    const isFavorableAgainstRef: Record<string, boolean | undefined> = {};

    const refAgg = aggregations[refId];
    if (!refAgg) {
      // Unerreichbar: aggregations wird für alle versions aufgebaut, refId ist eine gültige Version.
      throw new ScenarioError('NOT_FOUND', `Keine Aggregation für Referenzversion "${refId}".`);
    }
    const refKpiStats = refAgg.validRunCount > 0 ? kDef.extract(refAgg) : undefined;
    const refMedian = refKpiStats?.median;

    for (const v of versions) {
      const agg = aggregations[v.id];
      if (!agg) {
        // Unerreichbar: aggregations wird oben für alle versions aufgebaut.
        throw new ScenarioError('NOT_FOUND', `Keine Aggregation für Version "${v.id}".`);
      }
      if (agg.validRunCount > 0) {
        const stats = kDef.extract(agg);
        valuesByVersionId[v.id] = {
          median: stats.median,
          p10: stats.p10,
          p90: stats.p90,
          mean: stats.mean,
        };

        if (refMedian !== undefined) {
          const comp = GoalTargetEvaluator.computeBaselineComparison(
            kDef.id,
            stats.median,
            refMedian,
          );
          deltasAgainstRef[v.id] = comp.absoluteDelta;
          percentAgainstRef[v.id] = comp.percentChange;
          isFavorableAgainstRef[v.id] = comp.isPositiveChange;
        }
      } else {
        valuesByVersionId[v.id] = undefined;
        deltasAgainstRef[v.id] = undefined;
        percentAgainstRef[v.id] = undefined;
        isFavorableAgainstRef[v.id] = undefined;
      }
    }

    kpiMatrix.push({
      kpiId: kDef.id,
      label: kpiInfo.label,
      unit: kpiInfo.unit,
      direction: kpiInfo.direction,
      baselineValue: kDef.baseline,
      valuesByVersionId,
      deltasAgainstRef,
      percentAgainstRef,
      isFavorableAgainstRef,
    });
  }

  const tradeOffs = evaluateTradeOffs(versions, kpiMatrix);
  const keyDifferences = identifyKeyDifferences(versions, parameterMatrix);

  // 6. Validation of Equal Run Count & Duration (Decisions 854, 855)
  const comparisonWarnings: string[] = [];
  const completedVersions = versions.filter((v) => {
    const agg = aggregations[v.id];
    if (!agg) {
      // Unerreichbar: aggregations wird oben für alle versions aufgebaut.
      throw new ScenarioError('NOT_FOUND', `Keine Aggregation für Version "${v.id}".`);
    }
    return agg.validRunCount > 0;
  });

  if (completedVersions.length > 1) {
    const firstCompleted = completedVersions[0];
    if (!firstCompleted) {
      // Unerreichbar: length > 1 wurde gerade geprüft.
      throw new ScenarioError('INVALID_VERSION', 'Keine abgeschlossene Version.');
    }
    const firstCount = aggregations[firstCompleted.id]?.validRunCount ?? 0;
    const hasDifferentCounts = completedVersions.some(
      (v) => (aggregations[v.id]?.validRunCount ?? 0) !== firstCount,
    );
    if (hasDifferentCounts) {
      comparisonWarnings.push(
        `Unterschiedliche Run-Anzahl festgestellt (${completedVersions.map((v) => `v${v.versionNumber}: ${aggregations[v.id]?.validRunCount ?? 0} Runs`).join(', ')}). Für maximale statistische Vergleichbarkeit wird die gleiche Run-Anzahl empfohlen (Entscheidung 855).`,
      );
    }

    const firstDuration = aggregations[firstCompleted.id]?.metrics?.timeSeries?.length ?? 0;
    const hasDifferentDurations = completedVersions.some(
      (v) => (aggregations[v.id]?.metrics?.timeSeries?.length ?? 0) !== firstDuration,
    );
    if (hasDifferentDurations) {
      comparisonWarnings.push(
        `Unterschiedliche Simulationsdauer festgestellt. Gleicher Zeithorizont wird für fairen Vergleich empfohlen (Entscheidung 854).`,
      );
    }
  }

  const summaryText = `Multi-Szenario-Vergleich (${versions.length} Versionen): ${
    keyDifferences.length === 0
      ? 'Alle verglichenen Versionen weisen identische Parameterkonfigurationen auf.'
      : `${keyDifferences.length} primäre Treiber-Unterschiede identifiziert. Trade-offs zwischen ${tradeOffs.map((t) => t.label).join(', ')} sind transparent ausgewiesen.`
  }`;

  return {
    referenceVersionId: refId,
    versions,
    parameterMatrix,
    kpiMatrix,
    tradeOffs,
    keyDifferences,
    comparisonWarnings,
    summaryText,
  };
}
