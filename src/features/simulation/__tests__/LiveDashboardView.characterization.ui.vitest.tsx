import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveDashboardView } from '../LiveDashboardView';
import { useSimulationStore } from '@/store/simulationStore';

describe('LiveDashboardView (characterization)', () => {
  beforeEach(() => {
    useSimulationStore.setState({ runs: [], draftMeasures: [] });
  });

  it('Standard-Render zeigt Management-Ebene mit allen Tier-Tabs', () => {
    render(<LiveDashboardView />);
    expect(
      screen.getByRole('tab', { name: /Management-Ebene \(P50 Forecast & Corridor\)/ }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Strategische Management-Prognose (P50 Median)')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Detail-Ebene/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Technik & Audit/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Operative Simulation/ })).toBeInTheDocument();
  });

  it('Wechsel auf Detail-Ebene zeigt Wachstumstreiber', async () => {
    const user = userEvent.setup();
    render(<LiveDashboardView />);
    await user.click(screen.getByRole('tab', { name: /Detail-Ebene/ }));
    expect(screen.getByText('Aktive V1-Wachstumstreiber (Parameter Registry)')).toBeInTheDocument();
  });

  it('Wechsel auf Technik & Audit zeigt Run-Historie', async () => {
    const user = userEvent.setup();
    render(<LiveDashboardView />);
    await user.click(screen.getByRole('tab', { name: /Technik & Audit/ }));
    expect(screen.getByText('Technik & Audit-Ebene: Technische Run-Historie')).toBeInTheDocument();
  });

  it('Operative Ebene: Lead-Tabelle mit Filter, dann Deals-Tab', async () => {
    const user = userEvent.setup();
    render(<LiveDashboardView />);
    await user.click(screen.getByRole('tab', { name: /Operative Simulation/ }));
    expect(screen.getByText('Simulierte Operative Leads (Ebene B)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alle' })).toBeInTheDocument();
    expect(screen.getByText('Unternehmen')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Live Won Deals/ }));
    expect(
      screen.getByText('Echtzeit-Gewonnene Deals (Simulations-Abschlüsse)'),
    ).toBeInTheDocument();
  });
});
