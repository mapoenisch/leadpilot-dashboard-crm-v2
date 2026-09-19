import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DealsView } from '../DealsView';
import type { ImportedFunnelDeal } from '@/types/crm';

const deals: ImportedFunnelDeal[] = [
  {
    id: 'd1',
    dealName: 'Leere Stage',
    stage: '',
    amount: 0,
    closeDate: '2026-01-01',
    pipeline: 'Inbound',
  },
  {
    id: 'd2',
    dealName: 'Gewonnen Deal',
    stage: 'Auftrag gewonnen',
    amount: 5000,
    closeDate: '2026-02-01',
    pipeline: 'Inbound',
  },
  {
    id: 'd3',
    dealName: 'Verloren Deal',
    stage: 'Angebot verloren',
    amount: 2000,
    closeDate: '2026-03-01',
    pipeline: 'Outbound',
  },
  {
    id: 'd4',
    dealName: 'Offener Deal',
    stage: 'Qualifizierung',
    amount: 10000,
    closeDate: '2026-04-01',
    pipeline: 'Outbound',
  },
];

function renderView(list: ImportedFunnelDeal[] = deals, loading = false) {
  return render(
    <MemoryRouter initialEntries={['/crm/deals']}>
      <DealsView deals={list} loading={loading} />
    </MemoryRouter>,
  );
}

describe('DealsView (branch3)', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/crm/deals');
  });

  it('leere Stage wird aus den Filteroptionen entfernt', async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(screen.getByRole('combobox'));
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
    expect(options.map((o) => o.textContent)).toEqual([
      'Alle Stages',
      'Auftrag gewonnen',
      'Angebot verloren',
      'Qualifizierung',
    ]);
  });

  it('Volumina trennen gewonnen, verloren und offen mit Durchschnitt', () => {
    renderView();
    expect(screen.getByText('17.000 €')).toBeInTheDocument();
    expect(screen.getByText(/4\.250/)).toBeInTheDocument();
    expect(screen.getByText('(5.000 €)')).toBeInTheDocument();
    expect(screen.getByText('(10.000 €)')).toBeInTheDocument();
    expect(screen.getByText('4 von 4 Deals')).toBeInTheDocument();
  });

  it('Suche trifft auch den Pipeline-Namen', async () => {
    const user = userEvent.setup();
    renderView();
    await user.type(screen.getByRole('searchbox', { name: 'Deals suchen' }), 'outbound');
    expect(screen.getByText('2 von 4 Deals')).toBeInTheDocument();
    expect(screen.getByText('Verloren Deal')).toBeInTheDocument();
    expect(screen.getByText('Offener Deal')).toBeInTheDocument();
    expect(screen.queryByText('Gewonnen Deal')).not.toBeInTheDocument();
  });

  it('Stage-Filter auf verlorene Deals', async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Angebot verloren' }));
    expect(screen.getByText('1 von 4 Deals')).toBeInTheDocument();
    expect(screen.getByText('Verloren Deal')).toBeInTheDocument();
    expect(screen.queryByText('Gewonnen Deal')).not.toBeInTheDocument();
  });

  it('leere Liste zeigt Null-Durchschnitt und Leerzustand', () => {
    renderView([]);
    expect(screen.getByText('0 von 0 Deals')).toBeInTheDocument();
    expect(screen.getByText('Keine Einträge vorhanden')).toBeInTheDocument();
    expect(screen.getByText(/Ø 0 € je Deal/)).toBeInTheDocument();
  });

  it('Suche ohne Treffer zeigt den Leerzustand', async () => {
    const user = userEvent.setup();
    renderView();
    await user.type(screen.getByRole('searchbox', { name: 'Deals suchen' }), 'xyz-nirgendwo');
    expect(screen.getByText('0 von 4 Deals')).toBeInTheDocument();
    expect(screen.getByText('Keine Einträge vorhanden')).toBeInTheDocument();
  });
});
