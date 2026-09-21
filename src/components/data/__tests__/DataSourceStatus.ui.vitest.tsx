import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DataSourceStatus } from '../DataSourceStatus';
import { deriveExecutiveProvenanceState } from '@/services/data/sourceFreshness';
import type { CrmReadModelEnvelope } from '../../../types/dataSource';

function renderWithClient(ui: React.ReactElement) {
  const testClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(<QueryClientProvider client={testClient}>{ui}</QueryClientProvider>);
}

describe('DataSourceStatus', () => {
  const now = Date.now();

  const healthyEnvelope: CrmReadModelEnvelope = {
    organizationId: 'org-test',
    sourceId: 'supabase',
    sourceKind: 'supabase',
    status: 'healthy',
    fetchedAt: new Date(now - 2 * 60 * 1000).toISOString(), // 2 minutes ago -> fresh
    contentHash: 'hash-abc',
    data: {
      companies: [],
      contacts: [],
      deals: [],
      activities: [],
      audit: {
        companiesLoaded: 10,
        companiesValid: 10,
        companiesErrors: 0,
        contactsLoaded: 0,
        contactsValid: 0,
        contactsMatched: 0,
        contactsErrors: 0,
        dealsLoaded: 0,
        dealsValid: 0,
        dealsErrors: 0,
      },
    },
  };

  it('renders compact badges with text and icons for healthy state', () => {
    renderWithClient(
      <DataSourceStatus variant="compact" envelope={healthyEnvelope} isLoading={false} />,
    );

    expect(screen.getByText('Supabase CRM')).toBeDefined();
    expect(screen.getByText('Real')).toBeDefined();
    expect(screen.getByText(/Status: Gesund/)).toBeDefined();
    expect(screen.getByText(/Frische: Aktuell/)).toBeDefined();
    expect(screen.getByText(/Stand:/)).toBeDefined();
  });

  it('renders degraded banner with explicit warning text', () => {
    const degradedEnvelope: CrmReadModelEnvelope = {
      ...healthyEnvelope,
      status: 'degraded',
      sourceKind: 'synthetic',
      sourceId: 'simulated-crm',
      fetchedAt: new Date(now - 20 * 60 * 1000).toISOString(), // 20 min ago -> stale
      data: {
        ...healthyEnvelope.data,
        audit: {
          ...healthyEnvelope.data.audit,
          companiesErrors: 2,
        },
      },
    };

    renderWithClient(
      <DataSourceStatus variant="banner" envelope={degradedEnvelope} isLoading={false} />,
    );

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText(/Eingeschränkte Datenqualität \(degraded\)/)).toBeDefined();
    expect(screen.getByText(/2 Fehler bei Unternehmen/)).toBeDefined();
    expect(screen.getByText(/Synthetisch/)).toBeDefined();
  });

  it('renders unavailable banner with fail-closed message and no live indicator', () => {
    renderWithClient(
      <DataSourceStatus
        variant="banner"
        envelope={null}
        error={new Error('DATA_SOURCE_UNAVAILABLE')}
        isLoading={false}
      />,
    );

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Datenquelle nicht verfügbar')).toBeDefined();
    expect(screen.getByText(/DATA_SOURCE_UNAVAILABLE/)).toBeDefined();
    expect(screen.getByText(/Es werden keine Ersatzdaten oder Annahmen angezeigt/)).toBeDefined();

    // Must NOT show healthy or live indicators
    expect(screen.queryByText(/Status: Gesund/)).toBeNull();
    expect(screen.queryByText(/Frische: Aktuell/)).toBeNull();
  });

  it('renders loading state clearly', () => {
    renderWithClient(<DataSourceStatus variant="compact" isLoading={true} />);

    expect(screen.getByText('Lade Quellenstatus…')).toBeDefined();
  });

  it('renders timeless baseline without false freshness claim', () => {
    const baselineProvenance = deriveExecutiveProvenanceState(now);
    renderWithClient(
      <DataSourceStatus variant="compact" provenance={baselineProvenance} isLoading={false} />,
    );

    expect(screen.getByText('LeadPilot Baseline (Ebene A)')).toBeDefined();
    expect(screen.getByText(/Snapshot: Stand 31.12.2025/)).toBeDefined();
    // Must NOT claim "Frische: Aktuell"
    expect(screen.queryByText(/Frische: Aktuell/)).toBeNull();
  });
});
