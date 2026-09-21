import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CRMView } from '../CRMView';

// Mock child pages to keep test lightweight
vi.mock('../pages/LeadsPage', () => ({
  LeadsPage: () => <div data-testid="leads-page">Leads Content</div>,
}));
vi.mock('../pages/CompaniesPage', () => ({
  CompaniesPage: () => <div data-testid="companies-page">Companies Content</div>,
}));
vi.mock('../pages/DealsPage', () => ({
  DealsPage: () => <div data-testid="deals-page">Deals Content</div>,
}));
vi.mock('../pages/ActivitiesPage', () => ({
  ActivitiesPage: () => <div data-testid="activities-page">Activities Content</div>,
}));

function renderWithClient(ui: React.ReactElement, client?: QueryClient) {
  const queryClient = client ?? new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  return { ...view, queryClient };
}

describe('CRMView (067O Provenienz-Leiste)', () => {
  it('renders CRM header and shows loading when no query has completed yet', () => {
    renderWithClient(<CRMView activeSubView="s-leads" />);
    expect(screen.getByText('CRM-Quellenwahrheit & Datenfrische')).toBeDefined();
    expect(screen.getByTestId('data-source-status')).toBeDefined();
    expect(screen.getByText('Lade Quellenstatus…')).toBeDefined();
    expect(screen.getByTestId('leads-page')).toBeDefined();
  });

  it('renders companies subview with header', () => {
    renderWithClient(<CRMView activeSubView="s-companies" />);
    expect(screen.getByText('CRM-Quellenwahrheit & Datenfrische')).toBeDefined();
    expect(screen.getByTestId('companies-page')).toBeDefined();
  });

  it('reactively updates to healthy with real timestamp when query data arrives', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderWithClient(<CRMView activeSubView="s-leads" />, client);

    // Initial state: loading
    expect(screen.getByText('Lade Quellenstatus…')).toBeDefined();

    // Data arrives reactively
    client.setQueryData(['crm', 'list', 'contacts', { page: 1 }], { items: [] });

    // Header must re-render reactively
    expect(await screen.findByText('Supabase CRM')).toBeDefined();
    expect(screen.getByText(/Status: Gesund/)).toBeDefined();
    expect(screen.getByText(/Frische: Aktuell/)).toBeDefined();
  });

  it('reactively updates to unavailable and displays sanitized error code when query fails', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderWithClient(<CRMView activeSubView="s-leads" />, client);

    // Query fails
    const query = client.getQueryCache().build(client, {
      queryKey: ['crm', 'list', 'contacts', { page: 1 }],
    });
    query.setState({
      status: 'error',
      error: new Error('AUTH_REQUIRED'),
    });

    // Header must re-render reactively with error badge
    expect(await screen.findByText(/Status: Nicht verfügbar/)).toBeDefined();
    expect(screen.getByText(/AUTH_REQUIRED/)).toBeDefined();
  });

  it('observes subview-specific query for companies', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderWithClient(<CRMView activeSubView="s-companies" />, client);

    const query = client.getQueryCache().build(client, {
      queryKey: ['crm', 'list', 'companies', { page: 1 }],
    });
    query.setState({
      status: 'error',
      error: new Error('FORBIDDEN'),
    });

    expect(await screen.findByText(/Status: Nicht verfügbar/)).toBeDefined();
    expect(screen.getByText(/FORBIDDEN/)).toBeDefined();
  });
});
