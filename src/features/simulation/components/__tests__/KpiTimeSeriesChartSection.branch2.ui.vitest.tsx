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
  } as unknown as AggregatedTimeSeriesPoint;
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

describe('KpiTimeSeriesChartSection (branch2)', () => {
  it('leere Serie: Hinweistext statt Chart, Overlay-Sektion bei Runs trotzdem', () => {
    render(
      <KpiTimeSeriesChartSection
        activeKpiConfig={arrConfig}
        comparisonMode="ABSOLUTE"
        rawTimeSeries={[]}
        completedRuns={[completedRun('r-1', 420000)]}
        selectedRunIds={[]}
        onToggleRunSelection={() => {}}
      />,
    );
    expect(
      screen.getByText('Keine Zeitreihendaten für diese Version verfügbar.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Einzel-Run Overlays/)).toBeInTheDocument();
    expect(screen.getByText('0 / 5 ausgewählt')).toBeInTheDocument();
  });

  it('ohne Runs keine Overlay-Sektion', () => {
    render(
      <KpiTimeSeriesChartSection
        activeKpiConfig={arrConfig}
        comparisonMode="ABSOLUTE"
        rawTimeSeries={[point(0, 411840), point(1, 420000)]}
        completedRuns={[]}
        selectedRunIds={[]}
        onToggleRunSelection={() => {}}
      />,
    );
    expect(screen.queryByText(/Einzel-Run Overlays/)).not.toBeInTheDocument();
    expect(screen.getByText('Ebene A (01.01.26)')).toBeInTheDocument();
  });

  it('mehr als 15 Runs: nur erste 15 als Buttons', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const runs = Array.from({ length: 17 }, (_, i) => completedRun(`r-${i}`, 410000 + i));
    render(
      <KpiTimeSeriesChartSection
        activeKpiConfig={arrConfig}
        comparisonMode="ABSOLUTE"
        rawTimeSeries={[point(0, 411840), point(1, 420000)]}
        completedRuns={runs}
        selectedRunIds={[]}
        onToggleRunSelection={onToggle}
      />,
    );
    expect(screen.getByRole('button', { name: /Run #15/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Run #16/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Run #1 \(/ }));
    expect(onToggle).toHaveBeenCalledWith('r-0');
  });

  it('Konfig mit Target: Zielpfad-Legende und Ziel-Linie im SVG', () => {
    const withTarget = {
      ...arrConfig,
      target: { kpiId: 'liveARR', targetValue: 500000, label: 'Ziel' },
    };
    const { container } = render(
      <KpiTimeSeriesChartSection
        activeKpiConfig={withTarget}
        comparisonMode="ABSOLUTE"
        rawTimeSeries={[point(0, 411840), point(1, 420000), point(2, 430000)]}
        completedRuns={[]}
        selectedRunIds={[]}
        onToggleRunSelection={() => {}}
      />,
    );
    expect(screen.getByText('Zielpfad')).toBeInTheDocument();
    const dashed = container.querySelector('path[stroke-dasharray="5 4"]');
    expect(dashed).not.toBeNull();
  });

  it('vorselektierter Run rendert Overlay-Pfad in Overlay-Farbe', () => {
    const { container } = render(
      <KpiTimeSeriesChartSection
        activeKpiConfig={arrConfig}
        comparisonMode="ABSOLUTE"
        rawTimeSeries={[point(0, 411840), point(1, 420000), point(2, 430000)]}
        completedRuns={[completedRun('r-1', 420000)]}
        selectedRunIds={['r-1']}
        onToggleRunSelection={() => {}}
      />,
    );
    expect(screen.getByText('1 / 5 ausgewählt')).toBeInTheDocument();
    const overlay = container.querySelector('path[stroke-dasharray="2 2"]');
    expect(overlay).not.toBeNull();
  });
});
