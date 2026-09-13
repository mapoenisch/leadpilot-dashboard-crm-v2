import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SimulationBar } from '../SimulationBar';
import { simulationService } from '@/simulation/simulationService';

describe('SimulationBar', () => {
  it('renders region, status chip, speed options and metrics', () => {
    render(<SimulationBar />);

    expect(screen.getByRole('region', { name: 'Simulation Command Strip' })).toBeInTheDocument();
    expect(screen.getByText('SIMULATION PAUSIERT')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Simulationsgeschwindigkeit' })).toBeInTheDocument();
    expect(screen.getByText(/Tick #/i)).toBeInTheDocument();
    expect(screen.getByText(/ARR:/i)).toBeInTheDocument();
  });

  it('toggles simulation run state when button is clicked', async () => {
    const user = userEvent.setup();
    const startSpy = vi.spyOn(simulationService, 'start').mockImplementation(() => {});
    const pauseSpy = vi.spyOn(simulationService, 'pause').mockImplementation(() => {});

    render(<SimulationBar />);

    const toggleBtn = screen.getByRole('button', { name: /Starten|Pausieren/i });
    await user.click(toggleBtn);

    expect(startSpy.mock.calls.length + pauseSpy.mock.calls.length).toBeGreaterThanOrEqual(1);

    startSpy.mockRestore();
    pauseSpy.mockRestore();
  });

  it('selects simulation speed on speed radio button click', async () => {
    const user = userEvent.setup();
    const speedSpy = vi.spyOn(simulationService, 'setSpeed').mockImplementation(() => {});

    render(<SimulationBar />);

    const speed5x = screen.getByRole('radio', { name: '5x' });
    await user.click(speed5x);

    expect(speedSpy).toHaveBeenCalledWith(5);
    speedSpy.mockRestore();
  });
});
