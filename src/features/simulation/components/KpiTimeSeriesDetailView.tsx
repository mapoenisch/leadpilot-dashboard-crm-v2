import React, { useState, useMemo, useCallback } from 'react';
import { useActiveVersion, useAggregation, useRuns, useSimulationEvents, useSimulationState } from '../../../store/hooks';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ChartFrame, MonteCarloHistogramChart } from '../../../components/ui/Charts';
import { GoalTargetEvaluator } from '../../../simulation/goalTargetEvaluator';
import { BaselineComparisonMode, GoalTarget } from '../../../types/kpi';
import { MetricStats, TimeSeriesPoint } from '../../../types/aggregation';
import { SimulationRun } from '../../../types/scenario';

interface KpiAggSource {
  metrics: { arr: MetricStats; mrr: MetricStats; customers: MetricStats };
}

export type SelectedKpiKey =
  | 'liveARR'
  | 'liveMRR'
  | 'liveCustomers'
  | 'liveWonDeals'
  | 'ebitda'
  | 'netRevenue'
  | 'netCashFlow';

const KPI_CONFIGS: {
  key: SelectedKpiKey;
  label: string;
  unit: string;
  baseline: number;
  target?: GoalTarget;
  timeSeriesExtractor: (pt: TimeSeriesPoint) => number;
  statsExtractor: (agg: KpiAggSource) => MetricStats;
  runValueExtractor: (run: SimulationRun) => number;
}[] = [
  {
    key: 'liveARR',
    label: 'ARR (Jährlich wiederkehrend)',
    unit: '€',
    baseline: 411840,
    target: { kpiId: 'liveARR', targetValue: 500000 },
    timeSeriesExtractor: (pt) => pt.metrics.arr,
    statsExtractor: (agg) => agg.metrics.arr,
    runValueExtractor: (r) => r.finalMetrics?.liveARR ?? r.finalState?.metrics?.liveARR ?? 0,
  },
  {
    key: 'liveMRR',
    label: 'MRR (Monatlich wiederkehrend)',
    unit: '€',
    baseline: 34320,
    target: { kpiId: 'liveMRR', targetValue: 41667 },
    timeSeriesExtractor: (pt) => pt.metrics.mrr,
    statsExtractor: (agg) => agg.metrics.mrr,
    runValueExtractor: (r) => r.finalMetrics?.liveMRR ?? r.finalState?.metrics?.liveMRR ?? 0,
  },
  {
    key: 'liveCustomers',
    label: 'Aktive Kunden',
    unit: 'Kunden',
    baseline: 66,
    target: { kpiId: 'liveCustomers', targetValue: 100 },
    timeSeriesExtractor: (pt) => pt.metrics.customers,
    statsExtractor: (agg) => agg.metrics.customers,
    runValueExtractor: (r) => r.finalMetrics?.liveCustomers ?? r.finalState?.metrics?.liveCustomers ?? 0,
  },
  {
    key: 'liveWonDeals',
    label: 'Gewonnene Deals',
    unit: 'Deals',
    baseline: 0,
    target: { kpiId: 'liveWonDeals', targetValue: 34 },
    timeSeriesExtractor: (pt) => pt.metrics.wonDeals,
    statsExtractor: (agg) => agg.metrics.wonDeals,
    runValueExtractor: (r) => r.finalMetrics?.liveWonDeals ?? r.finalState?.metrics?.liveWonDeals ?? 0,
  },
  {
    key: 'ebitda',
    label: 'EBITDA (Operatives Ergebnis)',
    unit: '€',
    baseline: 0,
    target: { kpiId: 'ebitda', targetValue: 50000 },
    timeSeriesExtractor: (pt) => pt.metrics.ebitda ?? 0,
    statsExtractor: (agg) =>
      agg.metrics.financialMetrics?.ebitda ?? {
        median: 0,
        p10: 0,
        p90: 0,
        mean: 0,
        stdDev: 0,
        min: 0,
        max: 0,
      },
    runValueExtractor: (r) =>
      r.finalMetrics?.financialMetrics?.ebitda ?? r.finalState?.metrics?.financialMetrics?.ebitda ?? 0,
  },
  {
    key: 'netRevenue',
    label: 'Nettoumsatz (Net Revenue)',
    unit: '€',
    baseline: 411840,
    target: { kpiId: 'netRevenue', targetValue: 500000 },
    timeSeriesExtractor: (pt) => pt.metrics.netRevenue ?? 0,
    statsExtractor: (agg) =>
      agg.metrics.financialMetrics?.netRevenue ?? {
        median: 411840,
        p10: 411840,
        p90: 411840,
        mean: 411840,
        stdDev: 0,
        min: 411840,
        max: 411840,
      },
    runValueExtractor: (r) =>
      r.finalMetrics?.financialMetrics?.netRevenue ??
      r.finalState?.metrics?.financialMetrics?.netRevenue ??
      0,
  },
  {
    key: 'netCashFlow',
    label: 'Netto-Cashflow',
    unit: '€',
    baseline: 0,
    target: { kpiId: 'netCashFlow', targetValue: 30000 },
    timeSeriesExtractor: (pt) => pt.metrics.netCashFlow ?? 0,
    statsExtractor: (agg) =>
      agg.metrics.financialMetrics?.netCashFlow ?? {
        median: 0,
        p10: 0,
        p90: 0,
        mean: 0,
        stdDev: 0,
        min: 0,
        max: 0,
      },
    runValueExtractor: (r) =>
      r.finalMetrics?.financialMetrics?.netCashFlow ??
      r.finalState?.metrics?.financialMetrics?.netCashFlow ??
      0,
  },
];

const RUN_OVERLAY_COLORS = ['#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#06b6d4'];

export const KpiTimeSeriesDetailView: React.FC = () => {
  const activeVersion = useActiveVersion();
  const aggregation = useAggregation();
  const runs = useRuns();
  const events = useSimulationEvents();
  const state = useSimulationState();

  const [selectedKpiKey, setSelectedKpiKey] = useState<SelectedKpiKey>('liveARR');
  const [comparisonMode, setComparisonMode] = useState<BaselineComparisonMode>('ABSOLUTE');
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [hoveredTick, setHoveredTick] = useState<number | null>(null);

  const completedRuns = useMemo(() => runs.filter((r) => r.status === 'COMPLETED'), [runs]);
  const activeKpiConfig = useMemo(
    () => KPI_CONFIGS.find((c) => c.key === selectedKpiKey) || KPI_CONFIGS[0],
    [selectedKpiKey]
  );

  const stats = useMemo(
    () => activeKpiConfig.statsExtractor(aggregation),
    [activeKpiConfig, aggregation]
  );

  // Goal & Baseline evaluation using GoalTargetEvaluator
  const baselineComp = useMemo(() => {
    return GoalTargetEvaluator.computeBaselineComparison(
      activeKpiConfig.key,
      stats.median,
      activeKpiConfig.baseline
    );
  }, [activeKpiConfig, stats.median]);

  const goalEvaluation = useMemo(() => {
    return GoalTargetEvaluator.evaluateGoalTarget(
      activeKpiConfig.key,
      stats.median,
      activeKpiConfig.target,
      state.tickCount
    );
  }, [activeKpiConfig, stats.median, state.tickCount]);

  const toggleRunSelection = (runId: string) => {
    if (selectedRunIds.includes(runId)) {
      setSelectedRunIds(selectedRunIds.filter((id) => id !== runId));
    } else {
      if (selectedRunIds.length >= 5) return; // Strict Limit: Max 5 runs (Decision 1301)
      setSelectedRunIds([...selectedRunIds, runId]);
    }
  };

  // Extract raw time series points
  const rawTimeSeries = useMemo(
    () => aggregation.metrics.timeSeries || [],
    [aggregation]
  );

  // Transform values per comparison mode
  const transformValue = useCallback(
    (val: number): number => {
      if (comparisonMode === 'DELTA') {
        return val - activeKpiConfig.baseline;
      }
      if (comparisonMode === 'PERCENT') {
        if (activeKpiConfig.baseline === 0) return 0;
        return parseFloat((((val - activeKpiConfig.baseline) / Math.abs(activeKpiConfig.baseline)) * 100).toFixed(1));
      }
      return val;
    },
    [comparisonMode, activeKpiConfig]
  );

  const formatDisplayValue = (val: number): string => {
    if (comparisonMode === 'PERCENT') {
      return `${val >= 0 ? '+' : ''}${val.toLocaleString('de-DE')} %`;
    }
    if (comparisonMode === 'DELTA') {
      return `${val >= 0 ? '+' : ''}${val.toLocaleString('de-DE')} ${activeKpiConfig.unit}`;
    }
    return `${val.toLocaleString('de-DE')} ${activeKpiConfig.unit}`;
  };

  // Compute SVG chart metrics & boundaries
  const chartData = useMemo(() => {
    if (rawTimeSeries.length === 0) return null;

    const points = rawTimeSeries.map((pt) => {
      const p10Raw =
        activeKpiConfig.key === 'liveARR'
          ? pt.metrics.arr.p10
          : activeKpiConfig.key === 'liveMRR'
          ? pt.metrics.mrr.p10
          : activeKpiConfig.key === 'liveCustomers'
          ? pt.metrics.customers.p10
          : activeKpiConfig.key === 'liveWonDeals'
          ? pt.metrics.wonDeals.p10
          : (pt.metrics.ebitda?.p10 ?? 0);

      const medianRaw =
        activeKpiConfig.key === 'liveARR'
          ? pt.metrics.arr.median
          : activeKpiConfig.key === 'liveMRR'
          ? pt.metrics.mrr.median
          : activeKpiConfig.key === 'liveCustomers'
          ? pt.metrics.customers.median
          : activeKpiConfig.key === 'liveWonDeals'
          ? pt.metrics.wonDeals.median
          : (pt.metrics.ebitda?.median ?? 0);

      const p90Raw =
        activeKpiConfig.key === 'liveARR'
          ? pt.metrics.arr.p90
          : activeKpiConfig.key === 'liveMRR'
          ? pt.metrics.mrr.p90
          : activeKpiConfig.key === 'liveCustomers'
          ? pt.metrics.customers.p90
          : activeKpiConfig.key === 'liveWonDeals'
          ? pt.metrics.wonDeals.p90
          : (pt.metrics.ebitda?.p90 ?? 0);

      const meanRaw =
        activeKpiConfig.key === 'liveARR'
          ? pt.metrics.arr.mean
          : activeKpiConfig.key === 'liveMRR'
          ? pt.metrics.mrr.mean
          : activeKpiConfig.key === 'liveCustomers'
          ? pt.metrics.customers.mean
          : activeKpiConfig.key === 'liveWonDeals'
          ? pt.metrics.wonDeals.mean
          : (pt.metrics.ebitda?.mean ?? 0);

      return {
        tick: pt.tick,
        date: pt.simulatedDate,
        p10: transformValue(p10Raw),
        median: transformValue(medianRaw),
        p90: transformValue(p90Raw),
        mean: transformValue(meanRaw),
        rawMedian: medianRaw,
      };
    });

    const targetTransformed = activeKpiConfig.target?.targetValue !== undefined
      ? transformValue(activeKpiConfig.target.targetValue)
      : undefined;

    // Determine Y min & max
    const allYValues: number[] = [];
    points.forEach((p) => {
      allYValues.push(p.p10, p.median, p.p90, p.mean);
    });
    if (targetTransformed !== undefined) allYValues.push(targetTransformed);

    // Add selected runs data
    const selectedRunsData = selectedRunIds.map((id, idx) => {
      const run = completedRuns.find((r) => r.runId === id);
      const ts = run?.timeSeries || [];
      const pts = ts.map((t) => ({
        tick: t.tick,
        val: transformValue(activeKpiConfig.timeSeriesExtractor(t)),
      }));
      pts.forEach((p) => allYValues.push(p.val));
      return {
        runId: id,
        color: RUN_OVERLAY_COLORS[idx % RUN_OVERLAY_COLORS.length],
        points: pts,
      };
    });

    let minY = Math.min(...allYValues);
    let maxY = Math.max(...allYValues);
    if (minY === maxY) {
      minY = minY * 0.9;
      maxY = maxY * 1.1 || 100;
    }
    const padding = (maxY - minY) * 0.08;
    minY -= padding;
    maxY += padding;

    return { points, minY, maxY, targetTransformed, selectedRunsData };
  }, [rawTimeSeries, activeKpiConfig, selectedRunIds, completedRuns, transformValue]);

  // Histogram calculation
  const histogramData = useMemo(() => {
    if (completedRuns.length === 0) return null;
    const values = completedRuns.map((r) => activeKpiConfig.runValueExtractor(r));
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    const bucketCount = Math.min(10, Math.max(4, Math.floor(Math.sqrt(values.length))));
    const bucketSize = (maxVal - minVal) / bucketCount || 1;

    const buckets: { min: number; max: number; count: number; label: string }[] = [];
    for (let i = 0; i < bucketCount; i++) {
      const bMin = minVal + i * bucketSize;
      const bMax = i === bucketCount - 1 ? maxVal : bMin + bucketSize;
      buckets.push({
        min: bMin,
        max: bMax,
        count: 0,
        label: `${Math.round(bMin).toLocaleString('de-DE')} - ${Math.round(bMax).toLocaleString('de-DE')}`,
      });
    }

    values.forEach((v) => {
      for (let i = 0; i < buckets.length; i++) {
        if (v >= buckets[i].min && (i === buckets.length - 1 ? v <= buckets[i].max : v < buckets[i].max)) {
          buckets[i].count++;
          break;
        }
      }
    });

    const maxCount = Math.max(...buckets.map((b) => b.count), 1);
    return { buckets, minVal, maxVal, maxCount, totalRuns: values.length };
  }, [completedRuns, activeKpiConfig]);

  // Top 3 Drivers analysis
  const topDrivers = useMemo(() => {
    const p = activeVersion?.parameters;
    if (!p) return [];

    if (selectedKpiKey === 'liveARR' || selectedKpiKey === 'liveMRR') {
      return [
        {
          title: 'Vertriebs-Kapazität (Sales FTE)',
          impact: `${p.salesRepCount} FTE (${p.salesRepCount * 3} max. Deals gleichzeitig)`,
          description: 'Direkter Einfluss auf den Durchsatz qualifizierter Leads in Won Deals.',
          badgeVariant: 'cyan' as const,
        },
        {
          title: 'Trial-to-Paid Abschlussquote',
          impact: `${p.trialToPaidConversion} % Conversion`,
          description: 'Skaliert die Wahrscheinlichkeit erfolgreicher Vertragsschlüsse bei Hot-Opportunities.',
          badgeVariant: 'mint' as const,
        },
        {
          title: 'Marketing-Budget & Lead-Inflow',
          impact: `${p.marketingBudgetYearly.toLocaleString('de-DE')} €/Jahr`,
          description: 'Sättigungskurve steuert die Inflow-Frequenz neuer Rohleads.',
          badgeVariant: 'orange' as const,
        },
      ];
    } else if (selectedKpiKey === 'liveCustomers') {
      return [
        {
          title: 'Neukunden-Zuwachs',
          impact: `${stats.median} Kunden (P50)`,
          description: 'Erfolgreich gewonnene Verträge erhöhen den aktiven Kundenbestand.',
          badgeVariant: 'mint' as const,
        },
        {
          title: 'Monatliche Kündigungsquote (Churn Rate)',
          impact: `${p.churnRateMonthly} % / Monat`,
          description: 'Verringert den aktiven Bestand bei Kündigungseintritt.',
          badgeVariant: 'orange' as const,
        },
        {
          title: 'Customer Success Betreuung',
          impact: `${p.csRepCount} CS FTE`,
          description: 'Hält die Kundenzufriedenheit stabil und verhindert vorzeitigen Churn.',
          badgeVariant: 'cyan' as const,
        },
      ];
    } else {
      return [
        {
          title: 'Umsatzerlöse (Gross Revenue)',
          impact: `${(stats.median || 0).toLocaleString('de-DE')} €`,
          description: 'Basis aller operativen Finanz- und Deckungsbeitragskennzahlen.',
          badgeVariant: 'mint' as const,
        },
        {
          title: 'Personalkosten Vertrieb & CS',
          impact: `${p.salesRepCount * 8000 + p.csRepCount * 6500} €/Monat`,
          description: 'Feste Headcount-Kosten für Vertrieb und Bestandskundenbetreuung.',
          badgeVariant: 'orange' as const,
        },
        {
          title: 'Marketing- & Betriebsaufwand',
          impact: `${Math.round(p.marketingBudgetYearly / 12) + 3000} €/Monat`,
          description: 'Marketing OPEX und laufende Betriebskosten.',
          badgeVariant: 'neutral' as const,
        },
      ];
    }
  }, [activeVersion, selectedKpiKey, stats.median]);

  // Filter events relevant to selected KPI
  const filteredEvents = useMemo(() => {
    if (selectedKpiKey === 'liveARR' || selectedKpiKey === 'liveMRR' || selectedKpiKey === 'liveWonDeals') {
      return events.filter((e) => e.type === 'DEAL_WON' || e.type === 'QUALIFIED_HOT').slice(0, 8);
    }
    if (selectedKpiKey === 'liveCustomers') {
      return events.filter((e) => e.type === 'DEAL_WON' || e.type === 'CUSTOMER_CHURNED').slice(0, 8);
    }
    return events.filter((e) => e.type === 'DEAL_WON' || e.type === 'NEW_LEAD').slice(0, 8);
  }, [events, selectedKpiKey]);

  return (
    <div className="flex flex-col gap-[var(--space-5)]">
      {/* 1. KPI Selection Tabs */}
      <Card padding="var(--space-3)">
        <div className="flex gap-[8px] overflow-x-auto pb-[4px]">
          {KPI_CONFIGS.map((cfg) => {
            const isSelected = cfg.key === selectedKpiKey;
            return (
              <Button
                key={cfg.key}
                size="sm"
                variant={isSelected ? 'primary' : 'secondary'}
                onClick={() => {
                  setSelectedKpiKey(cfg.key);
                  setSelectedRunIds([]);
                }}
              >
                {cfg.label}
              </Button>
            );
          })}
        </div>
      </Card>

      {/* 2. Executive KPI Summary Card & Target Status */}
      <Card padding="var(--space-5)">
        <div className="flex justify-between items-start flex-wrap gap-[var(--space-4)]">
          <div>
            <div className="flex items-center gap-[var(--space-2)] mb-[4px]">
              <span className="text-[13px] font-semibold uppercase text-[var(--color-text-muted)]">
                {activeKpiConfig.label} · Detailanalyse (P50 Median)
              </span>
              <Badge variant="neutral">Baseline 2025: {activeKpiConfig.baseline.toLocaleString('de-DE')} {activeKpiConfig.unit}</Badge>
              {completedRuns.length < 3 ? (
                <Badge variant="orange">⚠️ Aussagekraft eingeschränkt ({completedRuns.length} Runs)</Badge>
              ) : (
                <Badge variant="mint">Statistische Aussagekraft: Hoch ({completedRuns.length} Runs)</Badge>
              )}
            </div>
            <div className="flex items-baseline gap-[var(--space-3)]">
              <span className="font-display text-[28px] font-extrabold text-primary">
                {stats.median.toLocaleString('de-DE')} {activeKpiConfig.unit}
              </span>
              <span className={`text-[14px] font-semibold ${baselineComp.isPositiveChange ? 'text-success' : ''}`}>
                {baselineComp.absoluteDelta >= 0 ? `+${baselineComp.absoluteDelta.toLocaleString('de-DE')}` : baselineComp.absoluteDelta.toLocaleString('de-DE')} {activeKpiConfig.unit} ({baselineComp.percentChange >= 0 ? `+${baselineComp.percentChange}` : baselineComp.percentChange} %)
              </span>
            </div>
          </div>

          {/* Goal Target Badge & Explanation */}
          {activeKpiConfig.target && (
            <div className="text-right">
              <div className="flex items-center gap-[8px] justify-end mb-[4px]">
                <span className="text-[12px] text-[var(--color-text-muted)]">Zielwert ({activeKpiConfig.target.targetValue.toLocaleString('de-DE')} {activeKpiConfig.unit}):</span>
                <Badge
                  variant={
                    goalEvaluation.status === 'ACHIEVED'
                      ? 'mint'
                      : goalEvaluation.status === 'AT_RISK'
                      ? 'orange'
                      : 'red'
                  }
                >
                  {goalEvaluation.status === 'ACHIEVED'
                    ? '🎯 Ziel Erreicht'
                    : goalEvaluation.status === 'AT_RISK'
                    ? '⚠️ Ziel Gefährdet'
                    : '❌ Ziel Verfehlt'}
                </Badge>
              </div>
              <div className="text-[12px] max-w-[380px] text-[var(--color-text-muted)]">
                {goalEvaluation.explanation}
              </div>
            </div>
          )}
        </div>

        {/* View Mode Switcher & Metric Statistics Bar */}
        <div className="border-0 border-t border-solid border-border-soft flex justify-between items-center flex-wrap gap-[12px] mt-[16px] pt-[12px]">
          <div className="flex items-center gap-[8px] text-[12.5px] text-[var(--color-text-muted)]">
            <span>Darstellungsmodus:</span>
            <div className="flex gap-[4px] rounded bg-background-deep p-[2px]">
              <Button
                size="sm"
                variant={comparisonMode === 'ABSOLUTE' ? 'primary' : 'secondary'}
                onClick={() => setComparisonMode('ABSOLUTE')}
              >
                Absolut ({activeKpiConfig.unit})
              </Button>
              <Button
                size="sm"
                variant={comparisonMode === 'DELTA' ? 'primary' : 'secondary'}
                onClick={() => setComparisonMode('DELTA')}
              >
                Delta Baseline (Δ)
              </Button>
              <Button
                size="sm"
                variant={comparisonMode === 'PERCENT' ? 'primary' : 'secondary'}
                onClick={() => setComparisonMode('PERCENT')}
              >
                Prozentual (%)
              </Button>
            </div>
          </div>

          <div className="flex gap-[12px] text-[12px] flex-wrap items-center">
            <span><strong>Min:</strong> {stats.min.toLocaleString('de-DE')} {activeKpiConfig.unit}</span>
            <span className="text-[#fb923c]"><strong>P10:</strong> {stats.p10.toLocaleString('de-DE')} {activeKpiConfig.unit}</span>
            <span className="text-accent"><strong>P50 (Median):</strong> {stats.median.toLocaleString('de-DE')} {activeKpiConfig.unit}</span>
            <span className="text-primary"><strong>P90:</strong> {stats.p90.toLocaleString('de-DE')} {activeKpiConfig.unit}</span>
            <span><strong>Max:</strong> {stats.max.toLocaleString('de-DE')} {activeKpiConfig.unit}</span>
            <span className="text-[var(--color-text-muted)]"><strong>StdDev:</strong> ±{stats.stdDev.toLocaleString('de-DE')}</span>
          </div>
        </div>
      </Card>

      {/* 3. Interactive SVG Time Series Chart with P10/P90 Uncertainty Band */}
      <Card padding="var(--space-5)">
        <div className="flex justify-between items-center flex-wrap gap-[var(--space-3)] mb-[var(--space-3)]">
          <div>
            <h4 className="m-0 text-[15px] text-text">
              Zeitreihen-Verlauf & Unsicherheitsband (P10 · P50 Median · P90)
            </h4>
            <span className="text-[12px] text-[var(--color-text-muted)]">
              Visualisiert die zeitliche Entwicklung über alle Ticks. Ebene A (31.12.2025) ist als unveränderlicher Startpunkt bei Tick 0 fixiert.
            </span>
          </div>
          <div className="flex gap-[12px] text-[12px] items-center flex-wrap">
            <span className="flex items-center gap-[4px]">
              <span className="block w-[12px] h-[12px] rounded-[2px] border border-solid border-[rgba(0,229,255,0.4)] bg-[rgba(0,229,255,0.15)]" />
              P10–P90 Band
            </span>
            <span className="flex items-center gap-[4px]">
              <span className="block w-[14px] h-[3px] bg-accent" />
              P50 Median
            </span>
            {activeKpiConfig.target && (
              <span className="flex items-center gap-[4px]">
                <span className="block w-[14px] h-[2px] border-0 border-t-2 border-dashed border-[#22c55e]" />
                Zielpfad
              </span>
            )}
          </div>
        </div>

        {chartData && chartData.points.length > 0 ? (
          <div className="w-full relative">
            <svg
              viewBox="0 0 800 320"
              className="w-full h-[320px] overflow-visible"
            >
              {/* Grid Lines */}
              <line x1="50" y1="20" x2="780" y2="20" stroke="var(--color-border-soft)" strokeDasharray="3 3" />
              <line x1="50" y1="90" x2="780" y2="90" stroke="var(--color-border-soft)" strokeDasharray="3 3" />
              <line x1="50" y1="160" x2="780" y2="160" stroke="var(--color-border-soft)" strokeDasharray="3 3" />
              <line x1="50" y1="230" x2="780" y2="230" stroke="var(--color-border-soft)" strokeDasharray="3 3" />
              <line x1="50" y1="280" x2="780" y2="280" stroke="var(--color-border)" />

              {/* Y Axis Labels */}
              <text x="40" y="24" fill="var(--color-text-muted)" fontSize="10" textAnchor="end">
                {formatDisplayValue(chartData.maxY)}
              </text>
              <text x="40" y="164" fill="var(--color-text-muted)" fontSize="10" textAnchor="end">
                {formatDisplayValue((chartData.maxY + chartData.minY) / 2)}
              </text>
              <text x="40" y="284" fill="var(--color-text-muted)" fontSize="10" textAnchor="end">
                {formatDisplayValue(chartData.minY)}
              </text>

              {/* SVG Scaler Functions */}
              {(() => {
                const pts = chartData.points;
                const maxX = Math.max(pts.length - 1, 1);
                const getY = (val: number) => {
                  const range = chartData.maxY - chartData.minY || 1;
                  return 280 - ((val - chartData.minY) / range) * 260;
                };
                const getX = (idx: number) => 50 + (idx / maxX) * 730;

                // Build P10-P90 Corridor Polygon
                const p90Coords = pts.map((p, i) => `${getX(i)},${getY(p.p90)}`).join(' ');
                const p10CoordsReversed = pts
                  .slice()
                  .reverse()
                  .map((p, i) => `${getX(pts.length - 1 - i)},${getY(p.p10)}`)
                  .join(' ');
                const polygonPath = `${p90Coords} ${p10CoordsReversed}`;

                // Build Median Line Path
                const medianPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.median)}`).join(' ');

                // Build Target Path if available
                const targetPath =
                  chartData.targetTransformed !== undefined
                    ? `M 50 ${getY(chartData.targetTransformed)} L 780 ${getY(chartData.targetTransformed)}`
                    : null;

                return (
                  <g>
                    {/* Corridor Polygon */}
                    <polygon
                      points={polygonPath}
                      fill="rgba(0, 229, 255, 0.12)"
                      stroke="rgba(0, 229, 255, 0.3)"
                      strokeWidth="1"
                    />

                    {/* Target Line */}
                    {targetPath && (
                      <path
                        d={targetPath}
                        stroke="#22c55e"
                        strokeWidth="2"
                        strokeDasharray="5 4"
                      />
                    )}

                    {/* Selected Run Overlays */}
                    {chartData.selectedRunsData.map((sRun) => {
                      const runPath = sRun.points
                        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.val)}`)
                        .join(' ');
                      return (
                        <path
                          key={sRun.runId}
                          d={runPath}
                          fill="none"
                          stroke={sRun.color}
                          strokeWidth="1.8"
                          strokeDasharray="2 2"
                          opacity="0.85"
                        />
                      );
                    })}

                    {/* Median Line */}
                    <path
                      d={medianPath}
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth="2.8"
                    />

                    {/* Ebene A Baseline Marker at Tick 0 */}
                    <circle cx="50" cy={getY(pts[0].median)} r="4.5" fill="var(--color-primary)" />
                    <text x="54" y={getY(pts[0].median) - 8} fill="var(--color-primary)" fontSize="10" fontWeight="bold">
                      Ebene A (01.01.26)
                    </text>

                    {/* Data Points on Median */}
                    {pts.map((p, i) => (
                      <g key={i}>
                        <circle
                          cx={getX(i)}
                          cy={getY(p.median)}
                          r={hoveredTick === p.tick ? 5 : 2.5}
                          fill="var(--color-accent)"
                          onMouseEnter={() => setHoveredTick(p.tick)}
                          onMouseLeave={() => setHoveredTick(null)}
                          className="cursor-pointer"
                        />
                        {/* X-axis tick labels (sparse) */}
                        {i % Math.max(1, Math.floor(pts.length / 6)) === 0 && (
                          <text x={getX(i)} y="298" fill="var(--color-text-muted)" fontSize="9" textAnchor="middle">
                            {p.date}
                          </text>
                        )}
                      </g>
                    ))}
                  </g>
                );
              })()}
            </svg>

            {/* Hovered Tick Details Bar */}
            {hoveredTick !== null && (
              <div className="rounded border border-solid border-border bg-background-deep flex justify-between text-[12px] mt-[10px] px-[12px] py-[8px]">
                <span><strong>Tick #{hoveredTick}</strong></span>
                <span>P10: {chartData.points.find((p) => p.tick === hoveredTick)?.p10.toLocaleString('de-DE')}</span>
                <span className="font-bold text-accent">
                  P50 (Median): {chartData.points.find((p) => p.tick === hoveredTick)?.median.toLocaleString('de-DE')}
                </span>
                <span>P90: {chartData.points.find((p) => p.tick === hoveredTick)?.p90.toLocaleString('de-DE')}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center p-[30px] text-[var(--color-text-muted)]">
            Keine Zeitreihendaten für diese Version verfügbar.
          </div>
        )}

        {/* 4. Individual Run Overlays (Max 5) */}
        {completedRuns.length > 0 && (
          <div className="border-0 border-t border-solid border-border-soft mt-[16px] pt-[12px]">
            <div className="flex justify-between items-center mb-[8px]">
              <span className="text-[12.5px] font-semibold text-text">
                Einzel-Run Overlays (Maximal 5 auswählbar, Entscheidungen 1300–1301):
              </span>
              <span className="text-[11px] text-[var(--color-text-muted)]">
                {selectedRunIds.length} / 5 ausgewählt
              </span>
            </div>
            <div className="flex gap-[8px] flex-wrap">
              {completedRuns.slice(0, 15).map((r, idx) => {
                const isSelected = selectedRunIds.includes(r.runId);
                const colorIdx = selectedRunIds.indexOf(r.runId);
                const assignedColor = colorIdx >= 0 ? RUN_OVERLAY_COLORS[colorIdx] : undefined;
                return (
                  <Button
                    key={r.runId}
                    size="sm"
                    variant={isSelected ? 'primary' : 'secondary'}
                    onClick={() => toggleRunSelection(r.runId)}
                    // G39 Welle 3: Overlay-Farben aus Daten-Array
                    // (RUN_OVERLAY_COLORS per Laufzeit-Index) — als Klasse
                    // nicht darstellbar (Entscheidung 2).
                    // eslint-disable-next-line react/forbid-dom-props -- Laufzeit-Farben (Overlay-Palette aus Daten), siehe Auftrag 056 Entscheidung 2
                    style={{
                      borderColor: assignedColor,
                      color: isSelected ? '#fff' : assignedColor || 'var(--color-text-muted)',
                      background: isSelected ? assignedColor : undefined,
                    }}
                  >
                    Run #{idx + 1} ({activeKpiConfig.runValueExtractor(r).toLocaleString('de-DE')} {activeKpiConfig.unit})
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* 5. Monte-Carlo Run Distribution Histogram */}
      <ChartFrame
        title="Monte-Carlo Häufigkeitsverteilung (Histogramm)"
        subtitle={`Statistische Verteilung der Endergebnisse aus ${histogramData?.totalRuns ?? 0} validen Simulationsläufen.`}
        sourceLabel="Monte-Carlo Engine"
        headerAction={
          <div className="flex gap-[8px]">
            <Badge variant="cyan">Median: {stats.median.toLocaleString('de-DE')} {activeKpiConfig.unit}</Badge>
            <Badge variant="neutral">Mean: {stats.mean.toLocaleString('de-DE')} {activeKpiConfig.unit}</Badge>
          </div>
        }
      >
        <MonteCarloHistogramChart
          buckets={histogramData?.buckets || []}
          totalRuns={histogramData?.totalRuns ?? 0}
          median={stats.median}
          mean={stats.mean}
          p10={stats.p10}
          p90={stats.p90}
          unit={activeKpiConfig.unit}
          minRequiredRuns={3}
        />
      </ChartFrame>

      {/* 6. Top 3 Growth Drivers & Event Drilldown */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-[var(--space-5)]">
        {/* Top 3 Drivers */}
        <Card padding="var(--space-5)">
          <h4 className="m-0 mb-[var(--space-4)] text-[15px] text-text">
            Top-3 Einfluss- & Wachstumstreiber (Entscheidungen 1295–1297)
          </h4>
          <div className="flex flex-col gap-[var(--space-3)]">
            {topDrivers.map((d, i) => (
              <div
                key={i}
                className="rounded border border-solid border-border-soft bg-background-deep p-[12px]"
              >
                <div className="flex justify-between items-center mb-[4px]">
                  <span className="text-[13px] font-semibold text-text">
                    #{i + 1} {d.title}
                  </span>
                  <Badge variant={d.badgeVariant}>{d.impact}</Badge>
                </div>
                <p className="m-0 text-[12px] text-[var(--color-text-muted)]">
                  {d.description}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Event Drilldown */}
        <Card padding="var(--space-5)">
          <h4 className="m-0 mb-[var(--space-4)] text-[15px] text-text">
            Relevante Simulations-Ereignisse (Drill-Down, Entscheidung 1298)
          </h4>
          {filteredEvents.length > 0 ? (
            <div className="flex flex-col gap-[8px] max-h-[250px] overflow-y-auto">
              {filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className={`rounded bg-background-deep border-0 border-l-[3px] border-solid text-[12px] px-[10px] py-[8px] ${evt.type === 'DEAL_WON' ? 'border-l-success' : 'border-l-primary'}`}
                >
                  <div className="flex justify-between font-semibold">
                    <span>{evt.title}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">Tick #{evt.tick}</span>
                  </div>
                  <div className="text-[11px] mt-[2px] text-[var(--color-text-muted)]">
                    {evt.details}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[12.5px] py-[16px] px-0 text-[var(--color-text-muted)]">
              Keine relevanten Ereignisse für diese Kennzahl im aktuellen Verlauf protokolliert.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
