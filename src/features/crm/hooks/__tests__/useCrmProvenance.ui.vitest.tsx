import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCrmProvenance, getCrmSubViewQueryKeyPrefix } from '../useCrmProvenance';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

describe('useCrmProvenance', () => {
  it('correctly maps subview keys and resource names to query key prefixes', () => {
    // Subviews
    expect(getCrmSubViewQueryKeyPrefix('s-leads')).toEqual(['crm', 'list', 'contacts']);
    expect(getCrmSubViewQueryKeyPrefix('s-companies')).toEqual(['crm', 'list', 'companies']);
    expect(getCrmSubViewQueryKeyPrefix('s-deals')).toEqual(['crm', 'list', 'deals']);
    expect(getCrmSubViewQueryKeyPrefix('s-activities')).toEqual(['crm', 'envelope']);
    expect(getCrmSubViewQueryKeyPrefix('s-crm')).toEqual(['crm']);
    // Direct resource names
    expect(getCrmSubViewQueryKeyPrefix('contacts')).toEqual(['crm', 'list', 'contacts']);
    expect(getCrmSubViewQueryKeyPrefix('companies')).toEqual(['crm', 'list', 'companies']);
    expect(getCrmSubViewQueryKeyPrefix('deals')).toEqual(['crm', 'list', 'deals']);
    expect(getCrmSubViewQueryKeyPrefix('funnel_deals')).toEqual(['crm', 'list', 'deals']);
    expect(getCrmSubViewQueryKeyPrefix('activities')).toEqual(['crm', 'envelope']);
    expect(getCrmSubViewQueryKeyPrefix('envelope')).toEqual(['crm', 'envelope']);
    expect(getCrmSubViewQueryKeyPrefix('crm')).toEqual(['crm']);
    expect(getCrmSubViewQueryKeyPrefix('all')).toEqual(['crm']);
    expect(getCrmSubViewQueryKeyPrefix('unknown')).toEqual(['crm', 'list', 'contacts']);
  });

  it('starts in loading state when no queries exist yet', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCrmProvenance('s-leads'), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.provenance.status).toBe('healthy');
  });

  it('updates reactively when query succeeds', () => {
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useCrmProvenance('s-leads'), { wrapper });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      queryClient.setQueryData(['crm', 'list', 'contacts', { page: 1 }], {
        items: [{ id: '1' }],
      });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.provenance.status).toBe('healthy');
    expect(result.current.provenance.sourceLabel).toBe('Supabase CRM');
    expect(result.current.provenance.fetchedAt).toBeTruthy();
  });

  it('updates reactively when query errors with sanitized code', () => {
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useCrmProvenance('s-deals'), { wrapper });

    act(() => {
      const query = queryClient.getQueryCache().build(queryClient, {
        queryKey: ['crm', 'list', 'deals', { page: 1 }],
      });
      query.setState({
        status: 'error',
        error: new Error('DATABASE_CONNECTION_TIMEOUT'),
      });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.provenance.status).toBe('unavailable');
    expect(result.current.provenance.errorCode).toBe('TIMEOUT');
  });

  it('dynamically adapts when active resource changes (e.g. tab switch)', () => {
    const { queryClient, wrapper } = createWrapper();

    // 1. Contacts query is healthy
    queryClient.setQueryData(['crm', 'list', 'contacts', { page: 1 }], {
      items: [{ id: 'contact-1' }],
    });

    // 2. Deals query is failed with error
    const dealsQuery = queryClient.getQueryCache().build(queryClient, {
      queryKey: ['crm', 'list', 'deals', { page: 1 }],
    });
    dealsQuery.setState({
      status: 'error',
      error: new Error('FORBIDDEN'),
    });

    // Render initially with contacts
    const { result, rerender } = renderHook(
      ({ resource }: { resource: string }) => useCrmProvenance(resource),
      {
        wrapper,
        initialProps: { resource: 'contacts' },
      },
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.provenance.status).toBe('healthy');
    expect(result.current.provenance.sourceLabel).toBe('Supabase CRM');

    // Dynamically switch resource to deals (as happens when user changes tab in LeadsPage)
    act(() => {
      rerender({ resource: 'deals' });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.provenance.status).toBe('unavailable');
    expect(result.current.provenance.errorCode).toBe('FORBIDDEN');
  });
});
