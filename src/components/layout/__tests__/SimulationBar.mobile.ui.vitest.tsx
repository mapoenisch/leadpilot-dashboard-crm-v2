// Auftrag 089 (Paket E): mobil kompakte Simulationsleiste. Start/Pause und Tempo bleiben immer
// erreichbar; Ereignis und Kennzahlen klappen über „Details“ auf, ohne die Simulation zu berühren.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SimulationBar } from '../SimulationBar';
import { simulationService } from '@/simulation/simulationService';

const isClosed = (element: HTMLElement) => /(^| )hidden( |$)/.test(element.className);

describe('SimulationBar mobil', () => {
  it('zeigt Steuerung immer, Details erst nach dem Aufklappen', async () => {
    const user = userEvent.setup();
    const start = vi.spyOn(simulationService, 'start').mockImplementation(() => {});
    render(<SimulationBar />);
    const details = screen.getByTestId('simulation-details');
    const toggle = screen.getByRole('button', { name: 'Details' });
    expect(screen.getByRole('button', { name: /Starten/ })).toBeInTheDocument();
    expect(
      screen.getByRole('radiogroup', { name: 'Simulationsgeschwindigkeit' }),
    ).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle.getAttribute('aria-controls')).toBe(details.id);
    expect(isClosed(details)).toBe(true);
    expect(details.className).toContain('md:flex');

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Weniger' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(isClosed(details)).toBe(false);
    expect(start).not.toHaveBeenCalled();
    start.mockRestore();
  });
});
