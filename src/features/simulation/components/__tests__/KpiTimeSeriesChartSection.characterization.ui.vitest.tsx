import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

function point(tick: number, arrMedian: number): AggregatedTimeSeriesPoint {
  return {
    tick,
    dayIndex: tick,
    simulatedDate: `01.0${tick + 1}.26`,
    metrics: {
      arr: stats(arrMedian),
      mrr: stats(34000),
      customers: stats(66),
      wonDeals: stats(5),
    },
  } as AggregatedTimeSeriesPoint;
}

function completedRun(runId: string, liveARR: number): SimulationRun {
  return {
    runId,
    scenarioId: 'sc-1',
    scenarioVersionId: 'v-1',
    seed: 7,
    rngState: 7,
    modelVersion: 'v1',
    schemaVersion: '1',
    baselineVersion: 'baseline-2026',
    status: 'COMPLETED',
    startedAt: new Date().toISOString(),
    manifest: {
      runId,
      scenarioId: 'sc-1',
      scenarioVersionId: 'v-1',
      seed: 7,
      initialRngState: 7,
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

describe('KpiTimeSeriesChartSection (characterization)', () => {
  it('leerer Zeitreihen-Stand zeigt Hinweistext und Legende', () => {
    render(
      <KpiTimeSeriesChartSection
        activeKpiConfig={arrConfig}
        comparisonMode="ABSOLUTE"
        rawTimeSeries={[]}
        completedRuns={[]}
        selectedRunIds={[]}
        onToggleRunSelection={() => {}}
      />,
    );
    expect(
      screen.getByText('Zeitreihen-Verlauf & Unsicherheitsband (P10 · P50 Median · P90)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Keine Zeitreihendaten für diese Version verfügbar.'),
    ).toBeInTheDocument();
    expect(screen.getByText('P10–P90 Band')).toBeInTheDocument();
    expect(screen.getByText('P50 Median')).toBeInTheDocument();
  });

  it('befüllte Zeitreihe rendert SVG-Chart, Zielpfad-Legende und Ebene-A-Marker', () => {
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
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.getByText('Zielpfad')).toBeInTheDocument();
    expect(screen.getByText('Ebene A (01.01.26)')).toBeInTheDocument();
  });

  it('PERCENT-Modus formatiert Y-Achse prozentual', () => {
    const { container } = render(
      <KpiTimeSeriesChartSection
        activeKpiConfig={arrConfig}
        comparisonMode="PERCENT"
        rawTimeSeries={[point(0, 411840), point(1, 420000), point(2, 430000)]}
        completedRuns={[]}
        selectedRunIds={[]}
        onToggleRunSelection={() => {}}
      />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.textContent).toContain('%');
  });

  it('Run-Overlays: Button klick ruft Toggle auf, Auswahlzähler reagiert', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const run = completedRun('run-1', 450000);
    const { rerender } = render(
      <KpiTimeSeriesChartSection
        activeKpiConfig={arrConfig}
        comparisonMode="ABSOLUTE"
        rawTimeSeries={[point(0, 411840), point(1, 420000)]}
        completedRuns={[run]}
        selectedRunIds={[]}
        onToggleRunSelection={onToggle}
      />,
    );
    expect(screen.getByText('0 / 5 ausgewählt')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Run #1/ }));
    expect(onToggle).toHaveBeenCalledWith('run-1');

    rerender(
      <KpiTimeSeriesChartSection
        activeKpiConfig={arrConfig}
        comparisonMode="ABSOLUTE"
        rawTimeSeries={[point(0, 411840), point(1, 420000)]}
        completedRuns={[run]}
        selectedRunIds={['run-1']}
        onToggleRunSelection={onToggle}
      />,
    );
    expect(screen.getByText('1 / 5 ausgewählt')).toBeInTheDocument();
  });
});
