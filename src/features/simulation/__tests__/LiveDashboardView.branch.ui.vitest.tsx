import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveDashboardView } from '../LiveDashboardView';
import { useSimulationStore } from '@/store/simulationStore';

function mkLead(id: string, status: string, score: number, estimatedValue = 12000) {
  return {
    id,
    companyName: `Firma ${id}`,
    contactName: `Kontakt ${id}`,
    email: `${id}@test.de`,
    source: 'LinkedIn',
    score,
    status,
    estimatedValue,
    owner: 'Sales A',
    createdAtTick: 2,
  };
}

function mkDeal(id: string) {
  return {
    id,
    dealName: `Deal ${id}`,
    companyName: `Firma ${id}`,
    packageName: 'Growth',
    arr: 24000,
    mrr: 2000,
    closeDate: '15.02.26',
    wonAtTick: 5,
  };
}

describe('LiveDashboardView (branch)', () => {
  beforeEach(() => {
    useSimulationStore.setState({ runs: [], draftMeasures: [], leads: [], deals: [], events: [] });
  });

  async function goOperativ(user: ReturnType<typeof userEvent.setup>) {
    render(<LiveDashboardView />);
    await user.click(screen.getByRole('tab', { name: /Operative Simulation/ }));
  }

  it('Statusfilter: alle Buttons klickbar, Hot filtert Liste', async () => {
    const user = userEvent.setup();
    useSimulationStore.setState({
      leads: [mkLead('l1', 'Hot', 90), mkLead('l2', 'New', 50), mkLead('l3', 'Lost', 30)] as never,
    });
    await goOperativ(user);
    for (const name of ['Alle', 'New', 'MQL', 'SQL', 'Hot', 'Won', 'Lost']) {
      await user.click(screen.getByRole('button', { name: name }));
    }
    // nach Filter Hot: nur Hot-Lead sichtbar
    await user.click(screen.getByRole('button', { name: 'Hot' }));
    expect(screen.getByText('Firma l1')).toBeInTheDocument();
    expect(screen.queryByText('Firma l2')).not.toBeInTheDocument();
    expect(screen.queryByText('Firma l3')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Alle' }));
    expect(screen.getByText('Firma l2')).toBeInTheDocument();
  });

  it('alle Status-Badge-Varianten und Score-Farben', async () => {
    const user = userEvent.setup();
    useSimulationStore.setState({
      leads: [
        mkLead('s-hot', 'Hot', 95, 11000),
        mkLead('s-won', 'Won', 82, 12000),
        mkLead('s-sql', 'SQL', 70, 13000),
        mkLead('s-mql', 'MQL', 66, 14000),
        mkLead('s-new', 'New', 60, 15000),
        mkLead('s-lost', 'Lost', 20, 16000),
      ] as never,
    });
    await goOperativ(user);
    for (const id of ['s-hot', 's-won', 's-sql', 's-mql', 's-new', 's-lost']) {
      expect(screen.getByText(`Firma ${id}`)).toBeInTheDocument();
    }
    expect(screen.getByText('95 / 100')).toBeInTheDocument();
    expect(screen.getByText('20 / 100')).toBeInTheDocument();
    expect(screen.getByText('12.000 €/J.')).toBeInTheDocument();
  });

  it('Deals-Tab rendert Deals, Events-Tab alle Border-Zweige', async () => {
    const user = userEvent.setup();
    useSimulationStore.setState({
      deals: [mkDeal('d1')] as never,
      events: [
        {
          id: 'e1',
          tick: 1,
          type: 'DEAL_WON',
          title: 'Deal gewonnen',
          details: 'd',
          timestamp: 't1',
        },
        { id: 'e2', tick: 2, type: 'NEW_LEAD', title: 'Lead neu', details: 'd', timestamp: 't2' },
        { id: 'e3', tick: 3, type: 'QUALIFIED_HOT', title: 'Hot', details: 'd', timestamp: 't3' },
      ] as never,
    });
    await goOperativ(user);
    await user.click(screen.getByRole('tab', { name: /Live Won Deals/ }));
    expect(screen.getByText('Deal d1')).toBeInTheDocument();
    expect(screen.getByText('24.000 €')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Live Event Stream/ }));
    expect(screen.getByText('Deal gewonnen')).toBeInTheDocument();
    expect(screen.getByText('Lead neu')).toBeInTheDocument();
    expect(screen.getByText('Tick #3')).toBeInTheDocument();
  });

  it('Isolation-Tab zeigt Garantie-Alert', async () => {
    const user = userEvent.setup();
    await goOperativ(user);
    await user.click(screen.getByRole('tab', { name: /Daten-Isolation/ }));
    expect(screen.getByText('100% Technische Daten-Isolation Garantiert')).toBeInTheDocument();
  });

  it('alle vier Modals öffnen und schließen', async () => {
    const user = userEvent.setup();
    render(<LiveDashboardView />);
    await user.click(screen.getByRole('button', { name: 'Szenarien & Parameter' }));
    expect(
      screen.getByRole('dialog', { name: 'Szenario- & Versions-Entscheidungswerkbank' }),
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Run / Re-Run' }));
    expect(screen.getByRole('dialog', { name: 'SimulationRun Steuerung' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: /Maßnahmen \(/ }));
    expect(
      screen.getByRole('dialog', { name: 'Maßnahmenmanager & Geführte Wirkungskette' }),
    ).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Szenariovergleich (3–4)' }));
    expect(
      screen.getByRole('dialog', {
        name: 'Multi-Szenario-Vergleich & Trade-Off-Entscheidungsfläche',
      }),
    ).toBeInTheDocument();
  });

  it('leere operative Listen rendern Tabellenköpfe ohne Zeilen', async () => {
    const user = userEvent.setup();
    await goOperativ(user);
    expect(screen.getByText('Unternehmen')).toBeInTheDocument();
    expect(screen.queryByText(/Firma /)).not.toBeInTheDocument();
  });
});
