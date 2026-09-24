import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DetailTierView } from '../DetailTierView';
import { useSimulationStore } from '@/store/simulationStore';

describe('DetailTierView (branch)', () => {
  let saved: Record<string, unknown>;

  beforeEach(() => {
    const s = useSimulationStore.getState();
    saved = {
      state: s.state,
      versions: s.versions,
      activeVersionId: s.activeVersionId,
      aggregation: s.aggregation,
      events: s.events,
      runs: s.runs,
    };
    useSimulationStore.setState({ runs: [], events: [] });
  });

  afterEach(() => {
    useSimulationStore.setState(saved as never);
  });

  function patchState(patch: Record<string, unknown>) {
    useSimulationStore.setState((s) => ({
      state: { ...(s.state as object), ...patch } as never,
    }));
  }

  function patchMetrics(patch: Record<string, unknown>) {
    useSimulationStore.setState((s) => {
      const st = s.state as { metrics?: Record<string, unknown> };
      return {
        state: { ...(st as object), metrics: { ...(st.metrics ?? {}), ...patch } } as never,
      };
    });
  }

  it('ohne aktive Version: Parameter-Leerstand, Rest rendert weiter', () => {
    useSimulationStore.setState({ versions: [], activeVersionId: '' });
    render(<DetailTierView />);
    expect(screen.getByText('Keine Parameterdaten verfügbar.')).toBeInTheDocument();
    expect(
      screen.getByText('Sales Capacity & Sales Queue Analytics (Process Time vs. Queue Time)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Aktueller Simulations-Event-Stream (Tick #0)')).toBeInTheDocument();
  });

  it('Sales-Engpassklasse vs. Normal + Projection-Fallbacks', () => {
    patchState({ salesQueueProjection: undefined });
    patchMetrics({ salesQueueMetrics: { isSalesBottleneck: false, capacityUtilization: 30 } });
    const { unmount, container } = render(<DetailTierView />);
    // Fallbacks: 2 FTE/Slots, je 1 Prozess-Tick, 0 Queue
    expect(container.textContent).toContain('2 FTE (2 Slots)');
    unmount();

    patchState({
      salesQueueProjection: {
        availableCapacity: 1,
        avgProcessTicks: 3,
        avgQueueTicks: 7,
        maxQueueTicks: 12,
      },
    });
    patchMetrics({ salesQueueMetrics: { isSalesBottleneck: true, capacityUtilization: 99 } });
    render(<DetailTierView />);
    expect(screen.getByText('7 Ticks')).toBeInTheDocument();
    expect(screen.getByText('Max. Wartezeit: 12 Ticks')).toBeInTheDocument();
    expect(screen.getByText('10 Ticks')).toBeInTheDocument(); // 3 + 7 Total
  });

  it('Health-Warnklasse unter 50 + Churn-Breakdown', () => {
    patchMetrics({
      customerHealthMetrics: {
        avgHealthScore: 42,
        atRiskCustomerCount: 5,
        churnedCustomerCount: 2,
        churnCausesBreakdown: { HEALTH_PROBLEM: 1, CS_CAPACITY: 1, BASELINE_CHURN: 0 },
      },
      csQueueMetrics: { isCSBottleneck: false, capacityUtilization: 50 },
    });
    patchState({
      csQueueProjection: {
        availableCapacity: 2,
        avgQueueTicks: 1,
        avgProcessTicks: 2,
        maxQueueTicks: 3,
      },
    });
    render(<DetailTierView />);
    expect(screen.getByText('42 / 100')).toBeInTheDocument();
    expect(screen.getByText(/Gefährdet \(< 50\): 5/)).toBeInTheDocument();
    expect(screen.getByText('Gekündigt: 2')).toBeInTheDocument();
    expect(screen.getByText('Max CS Wartezeit: 3 Ticks')).toBeInTheDocument();
  });

  it('CS-Engpassklasse vs. Normal', () => {
    patchMetrics({ csQueueMetrics: { isCSBottleneck: true, capacityUtilization: 98 } });
    patchState({ csQueueProjection: { avgQueueTicks: 9, avgProcessTicks: 2 } });
    const { unmount } = render(<DetailTierView />);
    expect(screen.getByText(/9 Ticks Queue \//)).toBeInTheDocument();
    unmount();

    patchMetrics({ csQueueMetrics: { isCSBottleneck: false } });
    render(<DetailTierView />);
    expect(
      screen.getByText('Customer Success Health & CS Queue Analytics (Decisions 1374-1398)'),
    ).toBeInTheDocument();
  });

  it('Finanz-Fallbackkette: Aggregation -> State -> 0', () => {
    // State-Werte greifen, wenn Aggregation keine financialMetrics hat
    useSimulationStore.setState((s) => ({
      aggregation: {
        ...(s.aggregation as object),
        metrics: {
          ...((s.aggregation as { metrics: object }).metrics as object),
          financialMetrics: undefined,
        },
      } as never,
    }));
    patchMetrics({
      financialMetrics: {
        netRevenue: 400000,
        grossRevenue: 410000,
        churnLoss: 10000,
        totalOpex: 300000,
        salesHeadcountCost: 16000,
        csHeadcountCost: 13000,
        ebitda: -5000,
        operatingMargin: -1,
        cac: 1200,
        netCashFlow: -2000,
        cumulativeCashFlow: 50000,
      },
    });
    const { unmount } = render(<DetailTierView />);
    expect(screen.getByText(/400.000/)).toBeInTheDocument();
    unmount();

    // weder Aggregation noch State -> 0
    patchMetrics({ financialMetrics: undefined });
    useSimulationStore.setState((s) => ({
      state: { ...(s.state as object), metrics: undefined } as never,
    }));
    render(<DetailTierView />);
    expect(
      screen.getByText(
        'Financial Analysis & P&L Model (Gross/Net Revenue, Headcount OPEX, EBITDA, Cash Flow)',
      ),
    ).toBeInTheDocument();
  });

  it('Event-Stream: befüllt mit Zeilen, leer ohne', () => {
    useSimulationStore.setState({
      events: [
        { id: 'e1', tick: 3, title: 'Deal X', details: 'Gewonnen', timestamp: '10:00' },
        { id: 'e2', tick: 4, title: 'Lead Y', details: 'Neu', timestamp: '10:01' },
      ] as never,
    });
    const { unmount } = render(<DetailTierView />);
    expect(screen.getByText('Deal X:')).toBeInTheDocument();
    expect(screen.getByText('Tick #3')).toBeInTheDocument();
    expect(screen.getByText('10:01')).toBeInTheDocument();
    unmount();

    useSimulationStore.setState({ events: [] });
    render(<DetailTierView />);
    expect(screen.queryByText('Deal X:')).not.toBeInTheDocument();
  });
});
