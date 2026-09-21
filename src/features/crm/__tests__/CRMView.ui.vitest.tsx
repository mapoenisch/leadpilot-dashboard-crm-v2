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

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('CRMView (067O Provenienz-Leiste)', () => {
  it('renders CRM header with DataSourceStatus and subview', () => {
    renderWithClient(<CRMView activeSubView="s-leads" />);
    expect(screen.getByText('CRM-Quellenwahrheit & Datenfrische')).toBeDefined();
    expect(screen.getByTestId('data-source-status')).toBeDefined();
    expect(screen.getByTestId('leads-page')).toBeDefined();
  });

  it('renders companies subview with header', () => {
    renderWithClient(<CRMView activeSubView="s-companies" />);
    expect(screen.getByText('CRM-Quellenwahrheit & Datenfrische')).toBeDefined();
    expect(screen.getByTestId('companies-page')).toBeDefined();
  });
});
