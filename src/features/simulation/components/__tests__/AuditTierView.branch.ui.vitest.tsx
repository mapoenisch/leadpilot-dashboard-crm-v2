import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditTierView } from '../AuditTierView';
import { useSimulationStore } from '@/store/simulationStore';
import type { SimulationRun } from '../../../../types/scenario';

function mkRun(runId: string, over: Record<string, unknown> = {}): SimulationRun {
  return {
    runId,
    scenarioId: 'sc-1',
    scenarioVersionId: 'v-1',
    seed: 42,
    rngState: 'rng-abc-123',
    modelVersion: 'sim-v1',
    schemaVersion: 'schema-3',
    baselineVersion: 'baseline-2026',
    status: 'COMPLETED',
    startedAt: new Date().toISOString(),
    manifest: {
      runId,
      scenarioId: 'sc-1',
      scenarioVersionId: 'v-1',
      seed: 42,
      initialRngState: 42,
      modelVersion: 'sim-v1',
      schemaVersion: 'schema-3',
      baselineVersion: 'baseline-2026',
      baselineId: 'b1',
      baselineHash: 'h1',
      organizationId: 'org-1',
      dataSourceId: 'simulated-crm',
      createdAt: new Date().toISOString(),
      simulationStartDate: '2026-01-01',
      targetTicks: 30,
      parameters: { salesRepCount: 2 },
      correlationId: 'corr-1',
    },
    finalMetrics: { liveARR: 450000 },
    finalState: {
      tickCount: 30,
      dayIndex: 30,
      hasInvariantViolation: false,
      rejectedTransitions: [],
    },
    correlationId: 'corr-1',
    ...over,
  } as unknown as SimulationRun;
}

describe('AuditTierView (branch)', () => {
  const orig = {
    reRun: useSimulationStore.getState().reRun,
    reproduce: useSimulationStore.getState().reproduce,
  };

  beforeEach(() => {
    useSimulationStore.setState({ runs: [] });
  });

  afterEach(() => {
    useSimulationStore.setState({ runs: [], reRun: orig.reRun, reproduce: orig.reproduce });
  });

  it('alle Statusvarianten + Null-Fallbacks für ARR und Datum', () => {
    useSimulationStore.setState({
      runs: [
        mkRun('run-running', { status: 'RUNNING' }),
        mkRun('run-cancelled', { status: 'CANCELLED' }),
        mkRun('run-failed', { status: 'FAILED' }),
        mkRun('run-weird', { status: 'UNKNOWN_STATE' }),
        mkRun('run-empty', {
          finalMetrics: undefined,
          finalState: undefined,
          startedAt: undefined,
        }),
      ],
    });
    render(<AuditTierView />);
    expect(screen.getByText('Gesamtläufe: 5')).toBeInTheDocument();
    for (const s of ['RUNNING', 'CANCELLED', 'FAILED', 'UNKNOWN_STATE']) {
      expect(screen.getByText(s)).toBeInTheDocument();
    }
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('Manifest-Tab: Maßnahmen-Block vs. ohne, Frozen-Badge, Run-Parameter', async () => {
    const user = userEvent.setup();
    useSimulationStore.setState({
      runs: [
        mkRun('run-measures', {
          manifest: {
            ...(mkRun('x').manifest as object),
            measures: [{ id: 'm1', name: 'Demo-Maßnahme' }],
          },
        }),
        mkRun('run-plain'),
      ],
    });
    render(<AuditTierView />);
    await user.click(screen.getAllByRole('button', { name: 'Audit' })[0]!);
    expect(screen.getByRole('dialog', { name: 'Audit-Details: run-measures' })).toBeInTheDocument();
    expect(screen.getByText(/Eingefrorene Maßnahmen \(1\):/)).toBeInTheDocument();
    expect(screen.getByText(/EINGEFROREN|FROZEN IN RUN/)).toBeInTheDocument();
    expect(screen.getByText('Eingefrorene Run-Parameter:')).toBeInTheDocument();
    // zurück auf Manifest-Tab
    await user.click(screen.getByRole('button', { name: 'RunManifest & Parameter' }));
    expect(screen.getByText('Seed:')).toBeInTheDocument();
  });

  it('Snapshot-Tab: Invarianten valide vs. verletzt, Finanz-Snapshot, RNG', async () => {
    const user = userEvent.setup();
    useSimulationStore.setState({
      runs: [
        mkRun('run-ok'),
        mkRun('run-bad', {
          finalState: {
            tickCount: 30,
            dayIndex: 30,
            hasInvariantViolation: true,
            rejectedTransitions: [{ a: 1 }, { b: 2 }, { c: 3 }],
          },
          finalMetrics: {
            liveARR: 100,
            financialMetrics: { netRevenue: 1, ebitda: 2, totalOpex: 3, cac: 4, netCashFlow: 5 },
          },
        }),
      ],
    });
    render(<AuditTierView />);
    // valider Run
    await user.click(screen.getAllByRole('button', { name: 'Audit' })[0]!);
    await user.click(screen.getByRole('button', { name: 'Snapshot Integrität & State' }));
    expect(screen.getByText('INVARIANTEN 100% VALIDE')).toBeInTheDocument();
    expect(screen.getByText('rng-abc-123')).toBeInTheDocument();
    expect(screen.getByText('Finanzdaten-Snapshot:')).toBeInTheDocument();
    // zurück auf Manifest, Modal zu
    await user.click(screen.getByRole('button', { name: 'RunManifest & Parameter' }));
    expect(screen.getByText('Seed:')).toBeInTheDocument();
  });

  it('verletzter Run zeigt ROT-Badge und Rejected-Count', async () => {
    const user = userEvent.setup();
    useSimulationStore.setState({
      runs: [
        mkRun('run-bad', {
          finalState: {
            tickCount: 30,
            dayIndex: 30,
            hasInvariantViolation: true,
            rejectedTransitions: [{ a: 1 }, { b: 2 }],
          },
        }),
      ],
    });
    render(<AuditTierView />);
    await user.click(screen.getByRole('button', { name: 'Audit' }));
    await user.click(screen.getByRole('button', { name: 'Snapshot Integrität & State' }));
    expect(screen.getByText('INVARIANTEN-VERLETZUNG')).toBeInTheDocument();
    expect(screen.getByText(/2 Einträge/)).toBeInTheDocument();
  });

  it('Zeilen-Buttons Re-Run/Reproduce rufen Aktionen mit korrekten IDs', async () => {
    const user = userEvent.setup();
    const reRun = vi.fn().mockResolvedValue(undefined);
    const reproduce = vi.fn().mockResolvedValue(undefined);
    useSimulationStore.setState({
      runs: [mkRun('run-act')],
      reRun: reRun as never,
      reproduce: reproduce as never,
    });
    render(<AuditTierView />);
    await user.click(screen.getByRole('button', { name: 'Re-Run' }));
    expect(reRun).toHaveBeenCalledWith('v-1');
    await user.click(screen.getByRole('button', { name: 'Reproduce' }));
    expect(reproduce).toHaveBeenCalledWith('run-act');
  });

  it('Reproduce-Button im Snapshot-Tab reproduziert geöffneten Run', async () => {
    const user = userEvent.setup();
    const reproduce = vi.fn().mockResolvedValue(undefined);
    useSimulationStore.setState({
      runs: [mkRun('run-modal-repro')],
      reproduce: reproduce as never,
    });
    render(<AuditTierView />);
    await user.click(screen.getByRole('button', { name: 'Audit' }));
    await user.click(screen.getByRole('button', { name: 'Snapshot Integrität & State' }));
    await user.click(screen.getByRole('button', { name: 'Diesen Run exakt Reproduzieren' }));
    expect(reproduce).toHaveBeenCalledWith('run-modal-repro');
  });
});
