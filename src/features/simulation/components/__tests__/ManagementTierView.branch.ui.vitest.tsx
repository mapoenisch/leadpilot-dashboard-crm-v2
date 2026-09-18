import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ManagementTierView } from '../ManagementTierView';
import { useSimulationStore } from '@/store/simulationStore';

// Presenter per Test übersteuerbar (Goal-/Delta-Varianten), sonst Original.
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

function viewData(
  over: {
    goalStatus?: string;
    arrComp?: ReturnType<typeof comp>;
  } = {},
) {
  return {
    baselineARR: 411840,
    baselineMRR: 34320,
    baselineCustomers: 66,
    arrComp: over.arrComp ?? comp(),
    mrrComp: comp(),
    custComp: comp(),
    arrGoal: { status: over.goalStatus ?? 'ACHIEVED', explanation: 'Ziel-Erklärung' },
    ebitdaGoal: { status: 'ACHIEVED', explanation: '' },
  };
}

describe('ManagementTierView (branch)', () => {
  let savedState: unknown;

  beforeEach(() => {
    presenterOverride = null;
    savedState = useSimulationStore.getState().state;
  });

  afterEach(() => {
    presenterOverride = null;
    useSimulationStore.setState({ state: savedState as never });
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

  it('Start/Pause-Umschaltung und Zurücksetzen-Button', async () => {
    const user = userEvent.setup();
    render(<ManagementTierView {...baseProps()} />);
    const startBtn = screen.getByRole('button', { name: 'Simulation Starten' });
    await user.click(startBtn);
    expect(screen.getByRole('button', { name: 'Simulation Pausieren' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Simulation Pausieren' }));
    expect(screen.getByRole('button', { name: 'Simulation Starten' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Zurücksetzen' }));
    expect(screen.getByRole('button', { name: 'Simulation Starten' })).toBeInTheDocument();
  });

  it('alle drei Vergleichsmodi durchschalten (Absolut/Delta/Prozent)', async () => {
    const user = userEvent.setup();
    render(<ManagementTierView {...baseProps()} />);
    await user.click(screen.getByRole('button', { name: 'Delta Baseline (Δ)' }));
    expect(screen.getByText('Jahresumsatz (ARR P50 Median)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Prozentual (%)' }));
    expect(screen.getByText('Jahresumsatz (ARR P50 Median)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Absolutwerte' }));
    expect(screen.getByText('Jahresumsatz (ARR P50 Median)')).toBeInTheDocument();
  });

  it('Szenariovergleich-Callback wird geklickt', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    render(<ManagementTierView {...props} />);
    await user.click(screen.getByRole('button', { name: 'Szenariovergleich (3–4)' }));
    expect(props.onOpenMultiCompareModal).toHaveBeenCalledTimes(1);
  });

  it('Zielstatus ACHIEVED (mint) vs. AT_RISK (orange) vs. sonst (neutral)', () => {
    for (const status of ['ACHIEVED', 'AT_RISK', 'MISSED']) {
      presenterOverride = () => viewData({ goalStatus: status });
      const { unmount } = render(<ManagementTierView {...baseProps()} />);
      expect(screen.getByText(`ZIELSTATUS ARR: ${status}`)).toBeInTheDocument();
      expect(screen.getByText('Ziel-Erklärung')).toBeInTheDocument();
      unmount();
    }
  });

  it('negatives Delta: orangenes Badge, fallender Trend, ohne Pluszeichen', () => {
    presenterOverride = () =>
      viewData({ arrComp: comp({ absoluteDelta: -8000, percentChange: -1.9, isPositive: false }) });
    render(<ManagementTierView {...baseProps()} />);
    expect(screen.getByText(/-8.000/)).toBeInTheDocument();
  });

  it('Sales-Bottleneck-Alert erscheint nur bei Engpass', () => {
    setMetrics({
      salesQueueMetrics: {
        isSalesBottleneck: true,
        capacityUtilization: 97,
        avgQueueTicks: 6,
        waitingCount: 12,
      },
    });
    const { unmount } = render(<ManagementTierView {...baseProps()} />);
    expect(
      screen.getByText('Vertriebs-Engpass erkannt (Sales Capacity Bottleneck)'),
    ).toBeInTheDocument();
    unmount();

    setMetrics({
      salesQueueMetrics: {
        isSalesBottleneck: false,
        capacityUtilization: 40,
        avgQueueTicks: 0,
        waitingCount: 0,
      },
    });
    render(<ManagementTierView {...baseProps()} />);
    expect(
      screen.queryByText('Vertriebs-Engpass erkannt (Sales Capacity Bottleneck)'),
    ).not.toBeInTheDocument();
  });

  it('CS-Bottleneck-Alert erscheint nur bei Engpass', () => {
    setMetrics({
      csQueueMetrics: { isCSBottleneck: true, capacityUtilization: 95, avgQueueTicks: 4 },
      customerHealthMetrics: { atRiskCustomerCount: 3 },
    });
    const { unmount } = render(<ManagementTierView {...baseProps()} />);
    expect(
      screen.getByText('Customer Success Engpass erkannt (CS Capacity Bottleneck)'),
    ).toBeInTheDocument();
    unmount();

    setMetrics({ csQueueMetrics: { isCSBottleneck: false } });
    render(<ManagementTierView {...baseProps()} />);
    expect(
      screen.queryByText('Customer Success Engpass erkannt (CS Capacity Bottleneck)'),
    ).not.toBeInTheDocument();
  });

  it('negative Finanzwerte zeigen EBITDA- und Cashflow-Warnungen, positive nicht', () => {
    setMetrics({ financialMetrics: { ebitda: -12000, netCashFlow: -5000 } });
    const { unmount } = render(<ManagementTierView {...baseProps()} />);
    expect(screen.getByText('Finanzwarung: Negatives EBITDA')).toBeInTheDocument();
    expect(screen.getByText('Finanzwarnung: Negativer Net Cash Flow')).toBeInTheDocument();
    unmount();

    setMetrics({ financialMetrics: { ebitda: 20000, netCashFlow: 8000 } });
    render(<ManagementTierView {...baseProps()} />);
    expect(screen.queryByText('Finanzwarung: Negatives EBITDA')).not.toBeInTheDocument();
    expect(screen.queryByText('Finanzwarnung: Negativer Net Cash Flow')).not.toBeInTheDocument();
  });
});
