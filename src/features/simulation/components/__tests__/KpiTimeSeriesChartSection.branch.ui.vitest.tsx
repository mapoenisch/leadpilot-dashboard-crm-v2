import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KpiTimeSeriesChartSection } from '../KpiTimeSeriesChartSection';
import { KPI_CONFIGS } from '../kpiTimeSeriesConfig';
import type { AggregatedTimeSeriesPoint } from '../kpiTimeSeriesConfig';
import type { MetricStats } from '../../../../types/aggregation';
import type { SimulationRun } from '../../../../types/scenario';

function stats(median: number): MetricStats {
  return {
    median,
    p10: Math.round(median * 0.9),
    p90: Math.round(median * 1.1),
    mean: median,
    stdDev: 1000,
    min: Math.round(median * 0.8),
    max: Math.round(median * 1.2),
  };
}

function point(
  tick: number,
  arrMedian: number,
  opts?: { mrr?: number; customers?: number; wonDeals?: number; ebitda?: number },
): AggregatedTimeSeriesPoint {
  return {
    tick,
    dayIndex: tick,
    simulatedDate: `01.0${tick + 1}.26`,
    metrics: {
      arr: stats(arrMedian),
      mrr: stats(opts?.mrr ?? 34000),
      customers: stats(opts?.customers ?? 66),
      wonDeals: stats(opts?.wonDeals ?? 5),
      ...(opts?.ebitda !== undefined ? { ebitda: stats(opts.ebitda) } : {}),
    },
  } as unknown as AggregatedTimeSeriesPoint;
}

function completedRun(runId: string, liveARR: number, seed = 7): SimulationRun {
  return {
    runId,
    scenarioId: 'sc-1',
    scenarioVersionId: 'v-1',
    seed,
    rngState: seed,
    modelVersion: 'v1',
    schemaVersion: '1',
    baselineVersion: 'baseline-2026',
    status: 'COMPLETED',
    startedAt: new Date().toISOString(),
    manifest: {
      runId,
      scenarioId: 'sc-1',
      scenarioVersionId: 'v-1',
      seed,
      initialRngState: seed,
      modelVersion: 'v1',
      schemaVersion: '1',
      baselineVersion: 'baseline-2026',
      baselineId: 'b1',
      baselineHash: 'h1',
      organizationId: 'org-1',
      createdAt: new Date().toISOString(),
      simulationStartDate: '2026-01-01',
      targetTicks: 30,
      parameters: {},
      correlationId: 'c1',
    },
    finalMetrics: { liveARR },
    timeSeries: [0, 1, 2].map((t) => ({
      tick: t,
      dayIndex: t,
      simulatedDate: `01.0${t + 1}.26`,
      metrics: { arr: 411840 + t * 1000, mrr: 34320, customers: 66, wonDeals: t },
    })),
    correlationId: 'c1',
  } as unknown as SimulationRun;
}

const arrConfig = KPI_CONFIGS[0]!;
const mrrConfig = KPI_CONFIGS.find((c) => c.key === 'liveMRR')!;
const customersConfig = KPI_CONFIGS.find((c) => c.key === 'liveCustomers')!;
const wonDealsConfig = KPI_CONFIGS.find((c) => c.key === 'liveWonDeals')!;
const ebitdaConfig = KPI_CONFIGS.find((c) => c.key === 'ebitda')!;

describe('KpiTimeSeriesChartSection (branch)', () => {
  it('DELTA-Modus rendert Chart mit Delta-Achsenbeschriftung', () => {
    const { container } = render(
      <KpiTimeSeriesChartSection
        activeKpiConfig={arrConfig}
        comparisonMode="DELTA"
        rawTimeSeries={[point(0, 411840), point(1, 420000), point(2, 400000)]}
        completedRuns={[]}
        selectedRunIds={[]}
        onToggleRunSelection={() => {}}
      />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
    // Delta enthält negative Werte (400000 - 411840) -> kein '+'-Präfix-Zweig
    expect(container.textContent).toContain('€');
  });

  it('PERCENT mit Baseline 0 (WonDeals) trifft Guard-Zweig und rendert', () => {
    const { container } = render(
      <KpiTimeSeriesChartSection
        activeKpiConfig={wonDealsConfig}
        comparisonMode="PERCENT"
        rawTimeSeries={[point(0, 411840, { wonDeals: 3 }), point(1, 420000, { wonDeals: 7 })]}
        completedRuns={[]}
        selectedRunIds={[]}
        onToggleRunSelection={() => {}}
      />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.textContent).toContain('%');
  });

  it('KPI-Schlüssel liveMRR / liveCustomers / liveWonDeals wählen je Extraktionszweig', () => {
    for (const cfg of [mrrConfig, customersConfig, wonDealsConfig]) {
      const { container, unmount } = render(
        <KpiTimeSeriesChartSection
          activeKpiConfig={cfg}
          comparisonMode="ABSOLUTE"
          rawTimeSeries={[point(0, 411840), point(1, 425000)]}
          completedRuns={[]}
          selectedRunIds={[]}
          onToggleRunSelection={() => {}}
        />,
      );
      expect(container.querySelector('svg')).not.toBeNull();
      unmount();
    }
  });

  it('ebitda-Fallback: fehlende ebitda-Metriken (?? 0) vs. vorhandene Werte', () => {
    const withoutEbitda = render(
      <KpiTimeSeriesChartSection
        activeKpiConfig={ebitdaConfig}
        comparisonMode="ABSOLUTE"
        rawTimeSeries={[point(0, 411840), point(1, 411840)]}
        completedRuns={[]}
        selectedRunIds={[]}
        onToggleRunSelection={() => {}}
      />,
    );
    expect(withoutEbitda.container.querySelector('svg')).not.toBeNull();
    withoutEbitda.unmount();

    const withEbitda = render(
      <KpiTimeSeriesChartSection
        activeKpiConfig={ebitdaConfig}
        comparisonMode="ABSOLUTE"
        rawTimeSeries={[point(0, 411840, { ebitda: 12000 }), point(1, 411840, { ebitda: 15000 })]}
        completedRuns={[]}
        selectedRunIds={[]}
        onToggleRunSelection={() => {}}
      />,
    );
    expect(withEbitda.container.querySelector('svg')).not.toBeNull();
    withEbitda.unmount();
  });

  it('flache Serie (minY === maxY) trifft Padding-Zweig und rendert trotzdem', () => {
    const { container } = render(
      <KpiTimeSeriesChartSection
        activeKpiConfig={arrConfig}
        comparisonMode="ABSOLUTE"
        rawTimeSeries={[point(0, 411840), point(1, 411840), point(2, 411840)]}
        completedRuns={[]}
        selectedRunIds={[]}
        onToggleRunSelection={() => {}}
      />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('Konfig ohne Target blendet Zielpfad-Legende aus', () => {
    const noTarget = { ...arrConfig, target: undefined };
    render(
      <KpiTimeSeriesChartSection
        activeKpiConfig={noTarget}
        comparisonMode="ABSOLUTE"
        rawTimeSeries={[point(0, 411840), point(1, 420000)]}
        completedRuns={[]}
        selectedRunIds={[]}
        onToggleRunSelection={() => {}}
      />,
    );
    expect(screen.queryByText('Zielpfad')).not.toBeInTheDocument();
    expect(screen.getByText('P10–P90 Band')).toBeInTheDocument();
  });

  it('Hover über Datenpunkt zeigt Detail-Bar, Leave blendet sie aus', () => {
    const { container } = render(
      <KpiTimeSeriesChartSection
        activeKpiConfig={arrConfig}
        comparisonMode="ABSOLUTE"
        rawTimeSeries={[point(0, 411840), point(1, 420000), point(2, 430000)]}
        completedRuns={[]}
        selectedRunIds={[]}
        onToggleRunSelection={() => {}}
      />,
    );
    expect(screen.queryByText(/P50 \(Median\):/)).not.toBeInTheDocument();
    const dot = container.querySelector('circle.cursor-pointer');
    expect(dot).not.toBeNull();
    fireEvent.mouseEnter(dot!);
    expect(screen.getByText(/P50 \(Median\):/)).toBeInTheDocument();
    expect(screen.getByText(/Tick #/)).toBeInTheDocument();
    fireEvent.mouseLeave(dot!);
    expect(screen.queryByText(/P50 \(Median\):/)).not.toBeInTheDocument();
  });

  it('unbekannte selektierte Run-ID (fehlender Run) rendert ohne Overlay-Crash', () => {
    const { container } = render(
      <KpiTimeSeriesChartSection
        activeKpiConfig={arrConfig}
        comparisonMode="ABSOLUTE"
        rawTimeSeries={[point(0, 411840), point(1, 420000)]}
        completedRuns={[]}
        selectedRunIds={['missing-run']}
        onToggleRunSelection={() => {}}
      />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('mehrere Runs: alle Toggle-Buttons klickbar, Auswahlfarben bei Selektion', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const runs = [completedRun('run-1', 450000), completedRun('run-2', 460000, 8)];
    const { rerender } = render(
      <KpiTimeSeriesChartSection
        activeKpiConfig={arrConfig}
        comparisonMode="DELTA"
        rawTimeSeries={[point(0, 411840), point(1, 420000)]}
        completedRuns={runs}
        selectedRunIds={[]}
        onToggleRunSelection={onToggle}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Run #1/ }));
    await user.click(screen.getByRole('button', { name: /Run #2/ }));
    expect(onToggle).toHaveBeenCalledWith('run-1');
    expect(onToggle).toHaveBeenCalledWith('run-2');

    // selektiert: Overlays + farbige Buttons rendern
    rerender(
      <KpiTimeSeriesChartSection
        activeKpiConfig={arrConfig}
        comparisonMode="DELTA"
        rawTimeSeries={[point(0, 411840), point(1, 420000)]}
        completedRuns={runs}
        selectedRunIds={['run-1', 'run-2']}
        onToggleRunSelection={onToggle}
      />,
    );
    expect(screen.getByText('2 / 5 ausgewählt')).toBeInTheDocument();
  });

  it('lange Serie trifft Sparse-Label-Zweig (einige Ticks ohne Label)', () => {
    const pts = Array.from({ length: 13 }, (_, t) => point(t, 411840 + t * 500));
    const { container } = render(
      <KpiTimeSeriesChartSection
        activeKpiConfig={arrConfig}
        comparisonMode="ABSOLUTE"
        rawTimeSeries={pts}
        completedRuns={[]}
        selectedRunIds={[]}
        onToggleRunSelection={() => {}}
      />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
