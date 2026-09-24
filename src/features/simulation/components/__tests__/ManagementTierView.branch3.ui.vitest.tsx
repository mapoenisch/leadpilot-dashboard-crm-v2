import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManagementTierView } from '../ManagementTierView';
import { useSimulationStore } from '@/store/simulationStore';

let presenterOverride: ((agg: unknown, st: unknown) => unknown) | null = null;
vi.mock('../../../../simulation/managementPresenter', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../../../simulation/managementPresenter')>();
  return {
    ManagementPresenter: {
      ...mod.ManagementPresenter,
      getManagementViewData: (agg: unknown, st: unknown) =>
        presenterOverride
          ? presenterOverride(agg, st)
          : mod.ManagementPresenter.getManagementViewData(agg as never, st as never),
    },
  };
});

function baseProps() {
  return {
    onOpenScenarioModal: vi.fn(),
    onOpenRunModal: vi.fn(),
    onOpenMeasureModal: vi.fn(),
    onOpenMultiCompareModal: vi.fn(),
  };
}

function comp(
  over: Partial<{ absoluteDelta: number; percentChange: number; isPositive: boolean }> = {},
) {
  return {
    absoluteDelta: over.absoluteDelta ?? 5000,
    percentChange: over.percentChange ?? 1.2,
    isPositiveChange: over.isPositive ?? true,
  };
}

describe('ManagementTierView (branch3)', () => {
  let saved: Record<string, unknown> = {};

  beforeEach(() => {
    presenterOverride = null;
    const s = useSimulationStore.getState();
    saved = {
      state: s.state,
      aggregation: s.aggregation,
      workerProgress: s.workerProgress,
      draftMeasures: s.draftMeasures,
      activeScenarioId: s.activeScenarioId,
      activeVersionId: s.activeVersionId,
      versions: s.versions,
    };
  });

  afterEach(() => {
    presenterOverride = null;
    useSimulationStore.setState(saved as never);
  });

  function setMetrics(patch: Record<string, unknown>) {
    const prev = useSimulationStore.getState();
    useSimulationStore.setState({
      state: {
        ...prev.state,
        metrics: { ...((prev.state.metrics ?? {}) as Record<string, unknown>), ...patch },
      } as never,
    });
  }

  it('Fallback-Labels ohne Szenario und ohne Versionen', () => {
    useSimulationStore.setState({ activeScenarioId: 'fehlt', versions: [] } as never);
    render(<ManagementTierView {...baseProps()} />);
    expect(screen.getByText(/SZENARIO: Base 2026 \(v1\)/)).toBeInTheDocument();
    expect(screen.getByText(/0 Valide/)).toBeInTheDocument();
  });

  it('valide Läufe schalten den Fortschritts-Chip auf Mint', () => {
    const agg = useSimulationStore.getState().aggregation;
    useSimulationStore.setState({
      aggregation: { ...agg, validRunCount: 3 },
      workerProgress: { completedRuns: 3, totalRuns: 5 },
    } as never);
    render(<ManagementTierView {...baseProps()} />);
    expect(screen.getByText('3 / 5 Runs (3 Valide)')).toBeInTheDocument();
  });

  it('Delta- und Prozentmodus zeigen Vorzeichen je KPI', async () => {
    const user = userEvent.setup();
    presenterOverride = () => ({
      baselineARR: 411840,
      baselineMRR: 34320,
      baselineCustomers: 66,
      arrComp: comp(),
      mrrComp: comp(),
      custComp: comp(),
      arrGoal: { status: 'ACHIEVED', explanation: 'OK' },
    });
    render(<ManagementTierView {...baseProps()} />);
    await user.click(screen.getByRole('button', { name: 'Delta Baseline (Δ)' }));
    expect(screen.getAllByText('+5.000 €').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('+5000 Kunden')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Prozentual (%)' }));
    expect(screen.getAllByText('+1.2 %').length).toBeGreaterThanOrEqual(3);
  });

  it('negative Deltas ohne Pluszeichen in beiden Vergleichsmodi', async () => {
    const user = userEvent.setup();
    presenterOverride = () => ({
      baselineARR: 411840,
      baselineMRR: 34320,
      baselineCustomers: 66,
      arrComp: comp({ absoluteDelta: -8000, percentChange: -1.9, isPositive: false }),
      mrrComp: comp({ absoluteDelta: -8000, percentChange: -1.9, isPositive: false }),
      custComp: comp({ absoluteDelta: -8000, percentChange: -1.9, isPositive: false }),
      arrGoal: { status: 'MISSED', explanation: 'Daneben' },
    });
    render(<ManagementTierView {...baseProps()} />);
    await user.click(screen.getByRole('button', { name: 'Delta Baseline (Δ)' }));
    expect(screen.getAllByText(/-8\.000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('+5.000 €')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Prozentual (%)' }));
    expect(screen.getAllByText(/-1\.9 %/).length).toBeGreaterThanOrEqual(1);
  });

  it('Finanzkennzahlen aus der Aggregation mit Positiv-Farben', () => {
    const agg = useSimulationStore.getState().aggregation;
    useSimulationStore.setState({
      aggregation: {
        ...agg,
        metrics: {
          ...agg.metrics,
          financialMetrics: {
            netRevenue: { median: 200000 },
            ebitda: { median: 10000 },
            operatingMargin: { median: 7.5 },
            netCashFlow: { median: 5000 },
          },
        },
      },
    } as never);
    setMetrics({ financialMetrics: { ebitda: 20000, netCashFlow: 8000 } });
    render(<ManagementTierView {...baseProps()} />);
    expect(screen.getByText('200.000 €')).toBeInTheDocument();
    expect(screen.getByText('7.5%')).toBeInTheDocument();
    expect(screen.getByText('10.000 €').className).toContain('text-primary');
    expect(screen.getByText('5.000 €').className).toContain('text-accent');
    expect(screen.queryByText('Finanzwarung: Negatives EBITDA')).not.toBeInTheDocument();
  });

  it('negatives Aggregations-EBITDA trägt die Warnfarbe', () => {
    const agg = useSimulationStore.getState().aggregation;
    useSimulationStore.setState({
      aggregation: {
        ...agg,
        metrics: {
          ...agg.metrics,
          financialMetrics: {
            netRevenue: { median: 100000 },
            ebitda: { median: -5000 },
            operatingMargin: { median: -2 },
            netCashFlow: { median: -1000 },
          },
        },
      },
    } as never);
    render(<ManagementTierView {...baseProps()} />);
    expect(screen.getByText(/-5\.000/).className).toContain('text-warning');
  });

  it('State-Fallback und Null-Fallback der Finanzkennzahlen', () => {
    const agg = useSimulationStore.getState().aggregation;
    useSimulationStore.setState({
      aggregation: { ...agg, metrics: { ...agg.metrics, financialMetrics: undefined } },
    } as never);
    setMetrics({
      financialMetrics: {
        netRevenue: 111111,
        ebitda: 2222,
        operatingMargin: 3.3,
        netCashFlow: 4444,
      },
    });
    const { unmount } = render(<ManagementTierView {...baseProps()} />);
    expect(screen.getByText('111.111 €')).toBeInTheDocument();
    unmount();

    setMetrics({ financialMetrics: undefined });
    render(<ManagementTierView {...baseProps()} />);
    expect(screen.getAllByText('0 €').length).toBeGreaterThanOrEqual(1);
  });

  it('Maßnahmen-Zähler spiegelt die Entwurfsliste', () => {
    useSimulationStore.setState({
      draftMeasures: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }],
    } as never);
    render(<ManagementTierView {...baseProps()} />);
    expect(screen.getByText('Maßnahmen (3)')).toBeInTheDocument();
  });
});
