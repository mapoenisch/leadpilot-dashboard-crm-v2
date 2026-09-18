import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SimulationBar } from '../SimulationBar';
import { simulationService } from '@/simulation/simulationService';
import { SimulationEventRules } from '@/simulation/eventRules';
import type { SimulationEvent, SimulationState } from '@/types/simulation';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SimulationBar (branch3)', () => {
  it('Metrik-Fallback ohne Live-Metriken nutzt Summenfelder und Bereitschaftstext', () => {
    const real = simulationService.getState();
    vi.spyOn(simulationService, 'getState').mockReturnValue({
      ...real,
      metrics: undefined,
      totalLeadsGenerated: 7,
      totalDealsWon: 3,
      currentARR: 500000,
      isRunning: false,
      speed: 1,
      tickCount: 42,
    });
    render(<SimulationBar />);
    expect(screen.getByText('SIMULATION PAUSIERT')).toBeInTheDocument();
    expect(screen.getByText('Tick #42')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('500.000 €')).toBeInTheDocument();
    expect(screen.getByText('Unternehmenssimulation bereit (Ebene B).')).toBeInTheDocument();
  });

  it('laufende Simulation zeigt Aktiv-Chip, Pause-Button mit Glow und Speed-Auswahl', async () => {
    const user = userEvent.setup();
    const real = simulationService.getState();
    vi.spyOn(simulationService, 'getState').mockReturnValue({
      ...real,
      metrics: {
        ...SimulationEventRules.recalculateMetrics([], [], []),
        liveLeads: 11,
        liveWonDeals: 4,
        liveARR: 420000,
      },
      isRunning: true,
      speed: 5,
      tickCount: 9,
    });
    const pauseSpy = vi.spyOn(simulationService, 'pause').mockImplementation(() => {});
    render(<SimulationBar />);
    expect(screen.getByText('SIMULATION AKTIV')).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Pausieren' });
    expect(toggle.getAttribute('style')).toContain('shadow-glow-cyan');
    expect(screen.getByRole('radio', { name: '5x' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '1x' })).toHaveAttribute('aria-checked', 'false');
    await user.click(toggle);
    expect(pauseSpy).toHaveBeenCalledTimes(1);
  });

  it('eingehende Events ersetzen den Bereitschaftstext im Stream', () => {
    type Listener = (event: SimulationEvent, state: SimulationState) => void;
    let captured: Listener | undefined;
    vi.spyOn(simulationService, 'subscribe').mockImplementation(((cb: Listener) => {
      captured = cb;
      return () => {};
    }) as never);
    render(<SimulationBar />);
    expect(screen.getByText('Unternehmenssimulation bereit (Ebene B).')).toBeInTheDocument();
    act(() => {
      captured!(
        { title: 'Lead-Blitz', details: '5 neue Leads' } as SimulationEvent,
        simulationService.getState(),
      );
    });
    expect(screen.getByText('Lead-Blitz:')).toBeInTheDocument();
    expect(screen.getByText(/5 neue Leads/)).toBeInTheDocument();
  });

  it('alle Tempi lassen sich anwählen', async () => {
    const user = userEvent.setup();
    const speedSpy = vi.spyOn(simulationService, 'setSpeed').mockImplementation(() => {});
    render(<SimulationBar />);
    for (const label of ['1x', '2x', '10x'] as const) {
      await user.click(screen.getByRole('radio', { name: label }));
    }
    expect(speedSpy).toHaveBeenCalledWith(1);
    expect(speedSpy).toHaveBeenCalledWith(2);
    expect(speedSpy).toHaveBeenCalledWith(10);
  });
});
