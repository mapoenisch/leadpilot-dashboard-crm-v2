import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StandaloneKitView } from '../StandaloneKitView';

vi.mock('@/features/overview/OverviewView', () => ({
  OverviewView: () => <div>Mock-Übersicht</div>,
}));

describe('StandaloneKitView (branch)', () => {
  it('rendert standardmäßig die Übersicht', () => {
    render(<StandaloneKitView />);
    expect(screen.getByText('Mock-Übersicht')).toBeInTheDocument();
  });

  it('filtert Leads per Tabs (all/hot/won/new)', async () => {
    const user = userEvent.setup();
    render(<StandaloneKitView view="leads" />);
    expect(screen.getByText('Ari Chen')).toBeInTheDocument();
    expect(screen.getByText('Owen Reyes')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Hot' }));
    expect(screen.getByText('Ari Chen')).toBeInTheDocument();
    expect(screen.getByText('Nadia Farouk')).toBeInTheDocument();
    expect(screen.queryByText('Sam Okafor')).toBeNull();

    await user.click(screen.getByRole('tab', { name: 'Won' }));
    expect(screen.getByText('Priya Rao')).toBeInTheDocument();
    expect(screen.queryByText('Ari Chen')).toBeNull();

    await user.click(screen.getByRole('tab', { name: 'New' }));
    expect(screen.getByText('Sam Okafor')).toBeInTheDocument();
    expect(screen.getByText('Jules Martin')).toBeInTheDocument();
    expect(screen.queryByText('Priya Rao')).toBeNull();
  });

  it('öffnet und schließt das Lead-Modal', async () => {
    const user = userEvent.setup();
    render(<StandaloneKitView view="leads" />);
    expect(screen.queryByText('Add a new lead')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'New lead' }));
    expect(screen.getByText('Add a new lead')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Jordan Lee')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Add a new lead')).toBeNull();
  });

  it('rendert die Sequenz-Ansicht mit allen Schritten', () => {
    render(<StandaloneKitView view="sequences" />);
    expect(screen.getByText('Outbound — new leads')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    for (const title of ['Intro email', 'Follow-up', 'Value nudge', 'Final check-in']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getByText('Day 14')).toBeInTheDocument();
  });

  it('rendert die Einstellungen mit Eingaben und Speichern', () => {
    render(<StandaloneKitView view="settings" />);
    expect(screen.getByDisplayValue('LeadPilot Sales')).toBeInTheDocument();
    expect(screen.getByDisplayValue('alerts@leadpilot.io')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });
});
