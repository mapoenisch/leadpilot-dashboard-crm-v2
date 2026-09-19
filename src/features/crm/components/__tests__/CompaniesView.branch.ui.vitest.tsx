import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CompaniesView } from '../CompaniesView';
import type { Company } from '@/types/crm';

const companies: Company[] = [
  {
    id: 'c1',
    name: 'Acme GmbH',
    domain: 'acme.de',
    industry: 'Software',
    city: 'Berlin',
    postalCode: '10115',
    employeeCount: 40,
  },
  {
    id: 'c2',
    name: 'Beta Maschinenbau',
    domain: 'beta-maschinen.de',
    industry: 'Maschinenbau',
    city: 'München',
    postalCode: '80331',
    employeeCount: 120,
  },
  {
    id: 'c3',
    name: 'Gamma IT',
    domain: 'gamma-it.de',
    industry: 'Software',
    city: 'Hamburg',
    postalCode: '20095',
    employeeCount: 20,
  },
];

function renderView(props = {}) {
  return render(
    <MemoryRouter initialEntries={['/crm/companies']}>
      <CompaniesView companies={companies} {...props} />
    </MemoryRouter>,
  );
}

describe('CompaniesView (branch)', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/crm/companies');
  });

  it('rendert KPIs aus dem Bestand', () => {
    renderView();
    expect(screen.getByRole('heading', { name: 'Unternehmen (Accounts)' })).toBeInTheDocument();
    expect(screen.getByText('180 MA')).toBeInTheDocument();
    expect(screen.getByText(/Ø 60 MA je Account/)).toBeInTheDocument();
    expect(screen.getByText('3 von 3 Unternehmen')).toBeInTheDocument();
  });

  it('filtert per Suche über Name, Domain und Stadt', async () => {
    const user = userEvent.setup();
    renderView();
    await user.type(screen.getByRole('searchbox', { name: 'Unternehmen suchen' }), 'gamma');
    expect(screen.getByText('1 von 3 Unternehmen')).toBeInTheDocument();
    expect(screen.getByText('Gamma IT')).toBeInTheDocument();
    expect(screen.queryByText('Acme GmbH')).toBeNull();
  });

  it('filtert per Branchen-Select', async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Maschinenbau' }));
    expect(screen.getByText('1 von 3 Unternehmen')).toBeInTheDocument();
    expect(screen.getByText('Beta Maschinenbau')).toBeInTheDocument();
    expect(screen.queryByText('Gamma IT')).toBeNull();
  });

  it('kombiniert Suche und Branche bis zum Leerzustand', async () => {
    const user = userEvent.setup();
    renderView();
    await user.type(screen.getByRole('searchbox', { name: 'Unternehmen suchen' }), 'acme');
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Maschinenbau' }));
    expect(screen.getByText('0 von 3 Unternehmen')).toBeInTheDocument();
    expect(screen.getByText('Keine Einträge vorhanden')).toBeInTheDocument();
  });

  it('zeigt den Ladezustand', () => {
    renderView({ loading: true });
    expect(screen.getByText('Lade Unternehmensdaten...')).toBeInTheDocument();
    expect(screen.queryByText('Acme GmbH')).toBeNull();
  });

  it('rechnet leeren Bestand ohne Division durch null', () => {
    render(
      <MemoryRouter initialEntries={['/crm/companies']}>
        <CompaniesView companies={[]} />
      </MemoryRouter>,
    );
    expect(screen.getByText('0 von 0 Unternehmen')).toBeInTheDocument();
    expect(screen.getByText(/Ø 0 MA je Account/)).toBeInTheDocument();
    expect(screen.getByText('Keine Einträge vorhanden')).toBeInTheDocument();
  });
});
