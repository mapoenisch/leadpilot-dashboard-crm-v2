import React, { useState, useMemo, useCallback } from 'react';
import { useActiveVersion, useAggregation, useRuns, useSimulationEvents, useSimulationState } from '../../../store/hooks';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ChartFrame, MonteCarloHistogramChart } from '../../../components/ui/Charts';
import { GoalTargetEvaluator } from '../../../simulation/goalTargetEvaluator';
import { BaselineComparisonMode } from '../../../types/kpi';
import { AggregatedTimeSeriesPoint, KPI_CONFIGS, KpiConfigItem, SelectedKpiKey } from './kpiTimeSeriesConfig';
import { KpiTimeSeriesChartSection } from './KpiTimeSeriesChartSection';
import { KpiTimeSeriesDriversSection, TopDriverItem } from './KpiTimeSeriesDriversSection';

export const KpiTimeSeriesDetailView: React.FC = () => {
  const activeVersion = useActiveVersion();
  const aggregation = useAggregation();
  const runs = useRuns();
  const events = useSimulationEvents();
  const state = useSimulationState();

  const [selectedKpiKey, setSelectedKpiKey] = useState<SelectedKpiKey>('liveARR');
  const [comparisonMode, setComparisonMode] = useState<BaselineComparisonMode>('ABSOLUTE');
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);

  const completedRuns = useMemo(() => runs.filter((r) => r.status === 'COMPLETED'), [runs]);
  const activeKpiConfig: KpiConfigItem = useMemo(
    () => (KPI_CONFIGS.find((c) => c.key === selectedKpiKey) ?? KPI_CONFIGS[0])!,
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

  const toggleRunSelection = useCallback((runId: string) => {
    setSelectedRunIds((prev) => {
      if (prev.includes(runId)) {
        return prev.filter((id) => id !== runId);
      } else {
        if (prev.length >= 5) return prev; // Strict Limit: Max 5 runs (Decision 1301)
        return [...prev, runId];
      }
    });
  }, []);

  // Extract raw time series points
  const rawTimeSeries = useMemo<AggregatedTimeSeriesPoint[]>(
    () => aggregation.metrics.timeSeries || [],
    [aggregation]
  );

  // Histogram calculation
  const histogramData = useMemo(() => {
    if (completedRuns.length === 0) return null;
    const values = completedRuns.map((r) => activeKpiConfig.runValueExtractor(r));
    const minVal = values.length > 0 ? Math.min(...values) : 0;
    const maxVal = values.length > 0 ? Math.max(...values) : 0;

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
        const b = buckets[i];
        if (!b) continue;
        if (v >= b.min && (i === buckets.length - 1 ? v <= b.max : v < b.max)) {
          b.count++;
          break;
        }
      }
    });

    const maxCount = Math.max(...buckets.map((b) => b.count), 1);
    return { buckets, minVal, maxVal, maxCount, totalRuns: values.length };
  }, [completedRuns, activeKpiConfig]);

  // Top 3 Drivers analysis
  const topDrivers = useMemo<TopDriverItem[]>(() => {
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
      <KpiTimeSeriesChartSection
        activeKpiConfig={activeKpiConfig}
        comparisonMode={comparisonMode}
        rawTimeSeries={rawTimeSeries}
        completedRuns={completedRuns}
        selectedRunIds={selectedRunIds}
        onToggleRunSelection={toggleRunSelection}
      />

      {/* 4. Monte-Carlo Run Distribution Histogram */}
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

      {/* 5. Top 3 Growth Drivers & Event Drilldown */}
      <KpiTimeSeriesDriversSection
        topDrivers={topDrivers}
        filteredEvents={filteredEvents}
      />
    </div>
  );
};
