// Auftrag 159 (P10a): Fortsetzen invalidiert nur die eigenen CRM-Übersichten — genau einmal.
import { describe, expect, it } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { dashboardQueryKeys } from '../data/dashboardQueryKeys';
import { invalidateCrmOverviewQueries } from '../time/resumeCrmRefresh';

const calls: Record<string, number> = {};

function Probe({
  organizationId,
  userId,
  pipeline,
}: {
  organizationId: string;
  userId: string;
  pipeline: string;
}) {
  const key = `${organizationId}|${userId}|${pipeline}`;
  useQuery({
    queryKey: dashboardQueryKeys.crmOverview(organizationId, userId, pipeline),
    queryFn: async () => {
      calls[key] = (calls[key] ?? 0) + 1;
      return key;
    },
  });
  return <span data-testid={`q-${key}`}>{calls[key] ?? 0}</span>;
}

describe('resumeCrmRefresh', () => {
  it('lädt genau die drei sichtbaren Pipelines der eigenen Organisation neu', async () => {
    for (const key of Object.keys(calls)) delete calls[key];
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <Probe organizationId="org-a" userId="user-a" pipeline="p1" />
        <Probe organizationId="org-a" userId="user-a" pipeline="p2" />
        <Probe organizationId="org-a" userId="user-a" pipeline="p3" />
        <Probe organizationId="org-b" userId="user-b" pipeline="p1" />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(calls['org-a|user-a|p1']).toBe(1));
    await waitFor(() => expect(calls['org-a|user-a|p2']).toBe(1));
    await waitFor(() => expect(calls['org-a|user-a|p3']).toBe(1));
    await waitFor(() => expect(calls['org-b|user-b|p1']).toBe(1));

    await act(async () => {
      await invalidateCrmOverviewQueries(queryClient, 'org-a', 'user-a');
    });

    await waitFor(() => expect(calls['org-a|user-a|p1']).toBe(2));
    await waitFor(() => expect(calls['org-a|user-a|p2']).toBe(2));
    await waitFor(() => expect(calls['org-a|user-a|p3']).toBe(2));
    // Fremde Organisation bleibt unberührt.
    expect(calls['org-b|user-b|p1']).toBe(1);
    expect(screen.getAllByTestId(/^q-/)).toHaveLength(4);
  });
});
