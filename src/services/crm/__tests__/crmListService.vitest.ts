// G60 (Auftrag 067N, Step 1): Unit-Tests für crmListService
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCrmList, CrmServiceError } from '../crmListService';
import { supabase } from '@/services/db/supabaseClient';

vi.mock('@/services/db/supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe('crmListService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('wirft UNAUTHORIZED wenn keine aktive Sitzung vorliegt', async () => {
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);

    await expect(
      fetchCrmList({ resource: 'companies', page: 1, pageSize: 20 }),
    ).rejects.toThrowError(CrmServiceError);

    try {
      await fetchCrmList({ resource: 'companies', page: 1, pageSize: 20 });
    } catch (err) {
      expect((err as CrmServiceError).code).toBe('UNAUTHORIZED');
    }
  });

  it('sendet korrekten Payload und Header mit Bearer-Token an die Edge Function', async () => {
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'valid-test-token' } },
      error: null,
    } as never);

    const mockResponse = {
      items: [{ id: 'c1', name: 'Test GmbH' }],
      total: 1,
      page: 1,
      pageSize: 20,
      resource: 'companies',
    };

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as never);

    const result = await fetchCrmList({
      resource: 'companies',
      q: 'Test',
      filters: { industry: 'IT' },
      sortBy: 'name',
      sortOrder: 'asc',
      page: 1,
      pageSize: 20,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/crm-query-export'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer valid-test-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          action: 'list',
          resource: 'companies',
          q: 'Test',
          filters: { industry: 'IT' },
          sortBy: 'name',
          sortOrder: 'asc',
          page: 1,
          pageSize: 20,
        }),
      }),
    );

    expect(result).toEqual(mockResponse);
  });

  it('übersetzt serverseitige Fehler in typisierte CrmServiceErrors (400, 401, 403, 500)', async () => {
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'valid-test-token' } },
      error: null,
    } as never);

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ code: 'FORBIDDEN', message: 'Zugriff verweigert.' }),
    } as never);

    try {
      await fetchCrmList({ resource: 'companies', page: 1, pageSize: 20 });
      expect.unreachable('Sollte werfen');
    } catch (err) {
      expect(err).toBeInstanceOf(CrmServiceError);
      expect((err as CrmServiceError).code).toBe('FORBIDDEN');
      expect((err as CrmServiceError).message).toBe(
        'Zugriff verweigert. Fehlende Berechtigung für diese CRM-Aktion.',
      );
    }
  });
});
