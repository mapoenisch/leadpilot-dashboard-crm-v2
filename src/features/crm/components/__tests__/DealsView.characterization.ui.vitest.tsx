import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DealsView } from '../DealsView';
import type { ImportedFunnelDeal } from '@/types/crm';

const deals: ImportedFunnelDeal[] = [
  {
    id: 'd1',
    dealName: 'Acme ERP-Einführung',
    stage: 'Qualifizierung',
    amount: 12000,
    closeDate: '2026-03-01',
    pipeline: 'Inbound',
  },
  {
    id: 'd2',
    dealName: 'Beta CRM-Rollout',
    stage: 'Gewonnen',
    amount: 30000,
    closeDate: '2026-02-15',
    pipeline: 'Outbound',
  },
  {
    id: 'd3',
    dealName: 'Gamma Pilotprojekt',
    stage: 'Verloren',
    amount: 5000,
    closeDate: '2026-01-20',
    pipeline: 'Inbound',
  },
];

describe('DealsView (characterization)', () => {
  it('rendert KPIs, Filter und alle Deals', () => {
    render(<DealsView deals={deals} />);
    expect(screen.getByText('Deal Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Funnel Deals Gesamt')).toBeInTheDocument();
    expect(screen.getByText('3 von 3 Deals')).toBeInTheDocument();
    expect(screen.getByText('Acme ERP-Einführung')).toBeInTheDocument();
    expect(screen.getByText('Beta CRM-Rollout')).toBeInTheDocument();
    expect(screen.getByText('Gamma Pilotprojekt')).toBeInTheDocument();
  });

  it('filtert per Suche über Deal- und Pipelinenamen', async () => {
    const user = userEvent.setup();
    render(<DealsView deals={deals} />);
    await user.type(screen.getByRole('searchbox', { name: 'Deals suchen' }), 'acme');
    expect(screen.getByText('1 von 3 Deals')).toBeInTheDocument();
    expect(screen.getByText('Acme ERP-Einführung')).toBeInTheDocument();
    expect(screen.queryByText('Beta CRM-Rollout')).not.toBeInTheDocument();
  });

  it('filtert per Stage-Select über die Combobox', async () => {
    const user = userEvent.setup();
    render(<DealsView deals={deals} />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Gewonnen' }));
    expect(screen.getByText('1 von 3 Deals')).toBeInTheDocument();
    expect(screen.getByText('Beta CRM-Rollout')).toBeInTheDocument();
    expect(screen.queryByText('Acme ERP-Einführung')).not.toBeInTheDocument();
  });

  it('zeigt Lade- und Leerzustand', () => {
    const { rerender } = render(<DealsView deals={deals} loading />);
    expect(screen.getByText('Lade Deal-Pipeline...')).toBeInTheDocument();
    rerender(<DealsView deals={[]} />);
    expect(screen.getByText('0 von 0 Deals')).toBeInTheDocument();
    expect(screen.getByText('Keine Einträge vorhanden')).toBeInTheDocument();
  });
});
