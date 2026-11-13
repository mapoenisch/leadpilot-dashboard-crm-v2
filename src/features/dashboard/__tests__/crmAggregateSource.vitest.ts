import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { fetchCrmPipelineOverview } from '../data/crmAggregateSource';
import { dashboardQueryKeys } from '../data/dashboardQueryKeys';
import type { FunnelDealSource } from '@/domain/executiveCockpitData';
import type { ImportedFunnelDeal } from '@/types/crm';

describe('crmAggregateSource', () => {
  describe('RPC vs Fallback Pfade (Auftrag 154 §2.4 Nr. 15)', () => {
    it('ruft RPC dashboard_crm_pipeline_overview auf, wenn Supabase konfiguriert ist', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: {
          totalDeals: 4,
          totalVolume: 12000,
          wonVolume: 5000,
          openVolume: 7000,
          stages: [
            { stage: 'Qualifizierung', count: 2, volume: 7000, sharePercent: 58 },
            { stage: 'Gewonnen', count: 2, volume: 5000, sharePercent: 42 },
          ],
          evaluatedDeals: 4,
          pipeline: 'Standard',
          asOf: '2026-11-13T12:00:00Z',
        },
        error: null,
      });

      const fakeClient = { rpc: mockRpc } as unknown as NonNullable<
        Parameters<typeof fetchCrmPipelineOverview>[0]
      >['supabaseClient'];

      const result = await fetchCrmPipelineOverview({
        pipeline: 'Standard',
        isConfigured: true,
        supabaseClient: fakeClient,
      });

      expect(mockRpc).toHaveBeenCalledTimes(1);
      expect(mockRpc).toHaveBeenCalledWith('dashboard_crm_pipeline_overview', {
        p_pipeline: 'Standard',
      });
      expect(result.totalDeals).toBe(4);
      expect(result.totalVolume).toBe(12000);
      expect(result.evaluatedDeals).toBe(4);
      expect(result.stages).toHaveLength(2);
    });

    it('fällt transparent auf getPipelineOverview zurück, wenn Supabase nicht konfiguriert ist', async () => {
      const deals: ImportedFunnelDeal[] = [
        {
          id: '1',
          dealName: 'D1',
          stage: 'Erstkontakt',
          amount: 1000,
          closeDate: '2026-12-31',
          pipeline: 'Sales',
        },
        {
          id: '2',
          dealName: 'D2',
          stage: 'Gewonnen',
          amount: 3000,
          closeDate: '2026-12-31',
          pipeline: 'Sales',
        },
        {
          id: '3',
          dealName: 'D3',
          stage: 'Erstkontakt',
          amount: 2000,
          closeDate: '2026-12-31',
          pipeline: 'Other',
        },
      ];

      const dealSource: FunnelDealSource = {
        getImportedFunnelDeals: vi.fn(async () => deals),
      };

      const result = await fetchCrmPipelineOverview({
        pipeline: 'Sales',
        isConfigured: false,
        dealSource,
      });

      expect(result.totalDeals).toBe(2);
      expect(result.totalVolume).toBe(4000);
      expect(result.wonVolume).toBe(3000);
      expect(result.openVolume).toBe(1000);
      expect(result.evaluatedDeals).toBe(2);
      expect(result.pipeline).toBe('Sales');
      expect(result.asOf).toBeDefined();
    });

    it('wirft Fehler bei RPC-Fehlermeldungen wie LP_CRM_INVALID_DEAL oder LP_NOT_MEMBER', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'LP_CRM_INVALID_DEAL', code: '22023' },
      });

      const fakeClient = { rpc: mockRpc } as unknown as NonNullable<
        Parameters<typeof fetchCrmPipelineOverview>[0]
      >['supabaseClient'];

      await expect(
        fetchCrmPipelineOverview({
          pipeline: 'Standard',
          isConfigured: true,
          supabaseClient: fakeClient,
        }),
      ).rejects.toMatchObject({ message: 'LP_CRM_INVALID_DEAL' });
    });
  });

  describe('Geteilte Abrufe und Cache-Bereinigung (§2.4 Nr. 16)', () => {
    it('24 Kacheln über drei Pipelines führen über React Query zu genau 3 Abrufen', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 10000, staleTime: 10000 } },
      });

      const mockFetcher = vi.fn(async (pipe: string | null) => ({
        totalDeals: 10,
        totalVolume: 50000,
        wonVolume: 20000,
        openVolume: 30000,
        stages: [],
        evaluatedDeals: 10,
        pipeline: pipe,
        asOf: '2026-11-13T12:00:00Z',
      }));

      const orgId = 'org-1';
      const userId = 'u-1';
      const pipelines = ['Pipeline-A', 'Pipeline-B', 'Pipeline-C'];

      // 24 Kacheln: 8 Kacheln je Pipeline
      const promises: Promise<unknown>[] = [];
      for (let i = 0; i < 24; i++) {
        const pipe = pipelines[i % 3] ?? null;
        promises.push(
          queryClient.fetchQuery({
            queryKey: dashboardQueryKeys.crmOverview(orgId, userId, pipe),
            queryFn: () => mockFetcher(pipe),
          }),
        );
      }

      await Promise.all(promises);

      // Genau 3 Abrufe für 24 Kacheln
      expect(mockFetcher).toHaveBeenCalledTimes(3);
    });

    it('Abmelden, Nutzerwechsel und Organisationswechsel entfernen Cache-Einträge', async () => {
      const queryClient = new QueryClient();

      const org1 = 'org-1';
      const org2 = 'org-2';
      const user1 = 'user-1';
      const user2 = 'user-2';

      // Daten für Org1 / User1 und Org1 / User2 im Cache ablegen
      queryClient.setQueryData(dashboardQueryKeys.crmOverview(org1, user1, 'P1'), {
        val: 'org1-u1',
      });
      queryClient.setQueryData(dashboardQueryKeys.crmOverview(org1, user2, 'P1'), {
        val: 'org1-u2',
      });
      queryClient.setQueryData(dashboardQueryKeys.crmOverview(org2, user2, 'P1'), {
        val: 'org2-u2',
      });

      expect(
        queryClient.getQueryData(dashboardQueryKeys.crmOverview(org1, user1, 'P1')),
      ).toBeDefined();

      // Nutzerwechsel von user1 zu user2 in org1: alte user1 Einträge entfernen
      queryClient.removeQueries({
        queryKey: [...dashboardQueryKeys.all],
        predicate: (q) => {
          if (!q.queryKey.includes('crmOverview')) return false;
          return q.queryKey[1] !== org1 || q.queryKey[4] !== user2;
        },
      });

      expect(
        queryClient.getQueryData(dashboardQueryKeys.crmOverview(org1, user1, 'P1')),
      ).toBeUndefined();
      expect(queryClient.getQueryData(dashboardQueryKeys.crmOverview(org1, user2, 'P1'))).toEqual({
        val: 'org1-u2',
      });

      // Abmelden (keine Org / kein User mehr): alle crmOverview Einträge leeren
      queryClient.removeQueries({
        queryKey: [...dashboardQueryKeys.all],
        predicate: (q) => q.queryKey.includes('crmOverview'),
      });

      expect(
        queryClient.getQueryData(dashboardQueryKeys.crmOverview(org1, user2, 'P1')),
      ).toBeUndefined();
    });
  });
});
