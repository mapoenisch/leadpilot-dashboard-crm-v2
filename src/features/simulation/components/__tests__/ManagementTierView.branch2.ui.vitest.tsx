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

function baseProps(over: Record<string, unknown> = {}) {
  return {
    onOpenScenarioModal: vi.fn(),
    onOpenRunModal: vi.fn(),
    onOpenMeasureModal: vi.fn(),
    onOpenMultiCompareModal: undefined as unknown as (() => void) | undefined,
    ...over,
  };
}

describe('ManagementTierView (branch2)', () => {
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

  it('ohne MultiCompare-Callback kein Szenariovergleich-Button', () => {
    render(<ManagementTierView {...baseProps()} />);
    expect(screen.queryByText('Szenariovergleich (3–4)')).not.toBeInTheDocument();
    expect(screen.getByText('Szenarien & Parameter')).toBeInTheDocument();
    expect(screen.getByText('Run / Re-Run')).toBeInTheDocument();
    expect(screen.getByText('Zurücksetzen')).toBeInTheDocument();
  });

  it('Toolbar-Buttons rufen Szenario-, Maßnahmen- und Run-Callbacks', async () => {
    const user = userEvent.setup();
    const props = baseProps({ onOpenMultiCompareModal: vi.fn() });
    render(<ManagementTierView {...props} />);
    await user.click(screen.getByText('Szenarien & Parameter'));
    expect(props.onOpenScenarioModal).toHaveBeenCalledTimes(1);
    await user.click(screen.getByText(/Maßnahmen \(/));
    expect(props.onOpenMeasureModal).toHaveBeenCalledTimes(1);
    await user.click(screen.getByText('Run / Re-Run'));
    expect(props.onOpenRunModal).toHaveBeenCalledTimes(1);
    await user.click(screen.getByText('Szenariovergleich (3–4)'));
    expect(props.onOpenMultiCompareModal).toHaveBeenCalledTimes(1);
  });

  it('unbekannter Zielstatus fällt auf neutralen Chip zurück', () => {
    presenterOverride = () => ({
      baselineARR: 411840,
      baselineMRR: 34320,
      baselineCustomers: 66,
      arrComp: { absoluteDelta: 0, percentChange: 0, isPositiveChange: false },
      mrrComp: { absoluteDelta: 0, percentChange: 0, isPositiveChange: false },
      custComp: { absoluteDelta: 0, percentChange: 0, isPositiveChange: false },
      arrGoal: { status: 'OHNE_ZIEL', explanation: 'Kein Ziel gesetzt' },
    });
    render(<ManagementTierView {...baseProps()} />);
    expect(screen.getByText('ZIELSTATUS ARR: OHNE_ZIEL')).toBeInTheDocument();
    expect(screen.getByText('Kein Ziel gesetzt')).toBeInTheDocument();
  });

  it('Won-Deals-Karte zeigt Min-Max-Streubereich', () => {
    render(<ManagementTierView {...baseProps()} />);
    expect(screen.getByText('Gewonnene Neugeschäft-Deals')).toBeInTheDocument();
    expect(screen.getByText(/Streubereich Min-Max:/)).toBeInTheDocument();
  });

  it('positive Finanzwerte: keine EBITDA-/Cashflow-Warnungen', () => {
    setMetrics({
      financialMetrics: { ebitda: 50000, netCashFlow: 20000 },
      salesQueueMetrics: { isSalesBottleneck: false },
      csQueueMetrics: { isCSBottleneck: false },
    });
    render(<ManagementTierView {...baseProps()} />);
    expect(screen.queryByText('Finanzwarung: Negatives EBITDA')).not.toBeInTheDocument();
    expect(screen.queryByText('Finanzwarnung: Negativer Net Cash Flow')).not.toBeInTheDocument();
    expect(screen.queryByText(/Vertriebs-Engpass erkannt/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Customer Success Engpass/)).not.toBeInTheDocument();
    expect(screen.getByText(/Management-Zusammenfassung & Unsicherheitsband/)).toBeInTheDocument();
  });
});
