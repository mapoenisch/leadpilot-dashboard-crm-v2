// 067Q / G63 — Steuerleiste: Aktionen je Zustand und Rolle, Viewer read-only,
// Befehle erreichen den Store, gespeicherte Pausen nur für Admin/Manager.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PausedRunsPanel, RunControlBar } from '../RunControlBar';
import { useOrganization } from '@/auth/organizationContext';
import { useSimulationStore } from '@/store/simulationStore';
import type { OrganizationRole } from '@/types/organization';
import type { RunResumeSnapshot } from '@/types/runControl';

vi.mock('@/auth/organizationContext', () => ({ useOrganization: vi.fn() }));
const mockedOrg = vi.mocked(useOrganization);

function asRole(role: OrganizationRole) {
  mockedOrg.mockReturnValue({
    session: { userId: 'u-1', organizationId: 'org-a', role },
    isLoading: false,
  });
}

const initial = useSimulationStore.getState();
const pauseRun = vi.fn();
const resumeRun = vi.fn();
const cancelRun = vi.fn();
const retryRun = vi.fn().mockResolvedValue(undefined);
const loadPausedRuns = vi.fn().mockResolvedValue(undefined);
const resumePausedRun = vi.fn().mockResolvedValue(undefined);
const discardPausedRun = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.clearAllMocks();
  useSimulationStore.setState({
    runProgress: null,
    interruptedRun: null,
    pausedRuns: [],
    runControlError: null,
    pauseRun,
    resumeRun,
    cancelRun,
    retryRun,
    loadPausedRuns,
    resumePausedRun,
    discardPausedRun,
  });
});

afterEach(() => {
  useSimulationStore.setState(initial, true);
});

describe('RunControlBar (G63)', () => {
  it('ohne Run nichts anzeigen', () => {
    asRole('admin');
    const { container } = render(<RunControlBar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('laufender Run: Manager kann pausieren und abbrechen', () => {
    asRole('manager');
    useSimulationStore.setState({
      runProgress: { status: 'progress', processedUnits: 10, totalUnits: 50 },
    });
    render(<RunControlBar />);
    expect(screen.getByTestId('run-control-status')).toHaveTextContent('Run rechnet');
    expect(screen.getByTestId('run-control-units')).toHaveTextContent('10/50');
    expect(screen.queryByRole('button', { name: 'Fortsetzen' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pausieren' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(pauseRun).toHaveBeenCalledWith('manager');
    expect(cancelRun).toHaveBeenCalledWith('manager');
  });

  it('pausierter Run: Fortsetzen und Abbrechen, kein Pausieren', () => {
    asRole('admin');
    useSimulationStore.setState({
      runProgress: { status: 'paused', processedUnits: 20, totalUnits: 50 },
    });
    render(<RunControlBar />);
    expect(screen.getByTestId('run-control-status')).toHaveTextContent('Run pausiert');
    expect(screen.queryByRole('button', { name: 'Pausieren' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fortsetzen' }));
    expect(resumeRun).toHaveBeenCalledWith('admin');
  });

  it('abgebrochener Run: Wiederholen mit Hinweis auf gleichen Seed', () => {
    asRole('admin');
    useSimulationStore.setState({
      interruptedRun: {
        versionId: 'ver-1',
        seed: 1,
        status: 'cancelled',
        message: 'Run abgebrochen.',
      },
    });
    render(<RunControlBar />);
    expect(screen.getByTestId('run-control-status')).toHaveTextContent('Run abgebrochen');
    expect(screen.getByText(/demselben\s+Seed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Wiederholen' }));
    expect(retryRun).toHaveBeenCalledWith('admin');
  });

  it('Viewer sieht den Zustand, aber keine Aktion', () => {
    asRole('viewer');
    useSimulationStore.setState({
      runProgress: { status: 'progress', processedUnits: 5, totalUnits: 50 },
    });
    render(<RunControlBar />);
    expect(screen.getByText('(nur Lesezugriff)')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('Fehler eines Befehls wird als Alert angezeigt', () => {
    asRole('admin');
    pauseRun.mockImplementationOnce(() => {
      throw new Error('Befehl "pause" ist im Zustand "paused" nicht zulässig.');
    });
    useSimulationStore.setState({
      runProgress: { status: 'progress', processedUnits: 5, totalUnits: 50 },
    });
    render(<RunControlBar />);
    fireEvent.click(screen.getByRole('button', { name: 'Pausieren' }));
    expect(screen.getByRole('alert')).toHaveTextContent('nicht zulässig');
  });
});

describe('PausedRunsPanel (G63)', () => {
  const paused = { runId: 'run-p1', tick: 12, targetTicks: 50 } as RunResumeSnapshot;

  it('lädt Pausen der Organisation und setzt als Manager fort', async () => {
    asRole('manager');
    useSimulationStore.setState({ pausedRuns: [paused] });
    await act(async () => {
      render(<PausedRunsPanel />);
    });
    expect(loadPausedRuns).toHaveBeenCalledWith('org-a');
    expect(screen.getByText('run-p1 · Tick 12/50')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Run run-p1 fortsetzen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run run-p1 verwerfen' }));
    expect(resumePausedRun).toHaveBeenCalledWith('run-p1', 'manager');
    expect(discardPausedRun).toHaveBeenCalledWith('run-p1', 'manager');
  });

  it('Viewer: nur Lesezugriff, keine Buttons', async () => {
    asRole('viewer');
    useSimulationStore.setState({ pausedRuns: [paused] });
    await act(async () => {
      render(<PausedRunsPanel />);
    });
    expect(screen.getByText('nur Lesezugriff')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
