import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RunActionModal } from '../RunActionModal';
import { useSimulationStore } from '@/store/simulationStore';
import type { SimulationRun } from '../../../../types/scenario';

function mkRun(runId: string): SimulationRun {
  return {
    runId,
    scenarioId: 'sc-1',
    scenarioVersionId: 'v-1',
    seed: 42,
    rngState: 42,
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
      createdAt: new Date().toISOString(),
      simulationStartDate: '2026-01-01',
      targetTicks: 30,
      parameters: {},
      correlationId: 'corr-1',
    },
    finalMetrics: { liveARR: 450000 },
    correlationId: 'corr-1',
  } as unknown as SimulationRun;
}

function mkMeasure(id: string) {
  return {
    id,
    name: `Maßnahme ${id}`,
    startTick: 0,
    changes: [{ parameter: 'salesRepCount', mode: 'set', value: 4 }],
    createdAt: new Date().toISOString(),
  };
}

describe('RunActionModal (branch)', () => {
  const orig = {
    runVersion: useSimulationStore.getState().runVersion,
    reRun: useSimulationStore.getState().reRun,
    reproduce: useSimulationStore.getState().reproduce,
  };
  let savedVersions: unknown;
  let savedActiveVersionId: unknown;

  beforeEach(() => {
    savedVersions = useSimulationStore.getState().versions;
    savedActiveVersionId = useSimulationStore.getState().activeVersionId;
    useSimulationStore.setState({ runs: [], draftMeasures: [] });
  });

  afterEach(() => {
    useSimulationStore.setState({
      runVersion: orig.runVersion,
      reRun: orig.reRun,
      reproduce: orig.reproduce,
      runs: [],
      draftMeasures: [],
      versions: savedVersions as never,
      activeVersionId: savedActiveVersionId as never,
    });
  });

  it('Start erfolgreich schliesst Modal, Fehler zeigt Alert', async () => {
    const user = userEvent.setup();
    const runVersion = vi.fn().mockResolvedValue(undefined);
    useSimulationStore.setState({ runVersion: runVersion as never });
    const onClose = vi.fn();
    const { unmount } = render(<RunActionModal isOpen={true} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Neuen Run Starten' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(runVersion).toHaveBeenCalledTimes(1);
    unmount();

    runVersion.mockRejectedValueOnce(new Error('Run boom'));
    const onClose2 = vi.fn();
    render(<RunActionModal isOpen={true} onClose={onClose2} />);
    await user.click(screen.getByRole('button', { name: 'Neuen Run Starten' }));
    await waitFor(() => expect(screen.getByText('Fehler bei Run-Ausführung')).toBeInTheDocument());
    expect(screen.getByText('Run boom')).toBeInTheDocument();
    expect(onClose2).not.toHaveBeenCalled();
  });

  it('Re-Run erfolgreich schliesst Modal, Fehler zeigt Standardtext bei leerer Message', async () => {
    const user = userEvent.setup();
    const reRun = vi.fn().mockResolvedValue(undefined);
    useSimulationStore.setState({ reRun: reRun as never });
    const onClose = vi.fn();
    const { unmount } = render(<RunActionModal isOpen={true} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Re-Run Ausführen' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    unmount();

    reRun.mockRejectedValueOnce(new Error());
    render(<RunActionModal isOpen={true} onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Re-Run Ausführen' }));
    await waitFor(() =>
      expect(screen.getByText('Fehler beim Ausführen von Re-Run.')).toBeInTheDocument(),
    );
  });

  it('Reproduce mit gewähltem Run: Erfolg schliesst, Fehler zeigt Alert', async () => {
    const user = userEvent.setup();
    useSimulationStore.setState({ runs: [mkRun('run-sel-1')] });
    const reproduce = vi.fn().mockResolvedValue(undefined);
    useSimulationStore.setState({ reproduce: reproduce as never });

    const onClose = vi.fn();
    const { unmount } = render(<RunActionModal isOpen={true} onClose={onClose} />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: /run-sel-1/ }));
    await user.click(screen.getByRole('button', { name: 'Reproduzieren' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(reproduce).toHaveBeenCalledWith('run-sel-1');
    unmount();

    reproduce.mockRejectedValueOnce(new Error('Repro boom'));
    render(<RunActionModal isOpen={true} onClose={() => {}} />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: /run-sel-1/ }));
    await user.click(screen.getByRole('button', { name: 'Reproduzieren' }));
    await waitFor(() => expect(screen.getByText('Repro boom')).toBeInTheDocument());
  });

  it('ohne aktive Version: "Keine", Start/Re-Run sind No-Ops', async () => {
    const user = userEvent.setup();
    useSimulationStore.setState({ versions: [], activeVersionId: '' });
    const runVersion = vi.fn();
    const reRun = vi.fn();
    useSimulationStore.setState({ runVersion: runVersion as never, reRun: reRun as never });
    const onClose = vi.fn();
    render(<RunActionModal isOpen={true} onClose={onClose} />);
    expect(screen.getByText('Keine')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Neuen Run Starten' }));
    await user.click(screen.getByRole('button', { name: 'Re-Run Ausführen' }));
    expect(runVersion).not.toHaveBeenCalled();
    expect(reRun).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Maßnahmenzähler: Singular vs. Plural vs. keine', () => {
    const { unmount: u1 } = render(<RunActionModal isOpen={true} onClose={() => {}} />);
    expect(screen.queryByText(/aktive Maßnahme/)).not.toBeInTheDocument();
    u1();

    useSimulationStore.setState({ draftMeasures: [mkMeasure('m1')] as never });
    const { unmount: u2 } = render(<RunActionModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('(1 aktive Maßnahme)')).toBeInTheDocument();
    u2();

    useSimulationStore.setState({ draftMeasures: [mkMeasure('m1'), mkMeasure('m2')] as never });
    render(<RunActionModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('(2 aktive Maßnahmen)')).toBeInTheDocument();
  });
});
