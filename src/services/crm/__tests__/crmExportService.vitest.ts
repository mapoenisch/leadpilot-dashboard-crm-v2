// @vitest-environment jsdom
// G60 (Auftrag 067N, Step 1): Unit-Tests für crmExportService
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadCrmExport, fetchCrmExportBlob } from '../crmExportService';
import { CrmServiceError } from '../crmListService';
import { supabase } from '@/services/db/supabaseClient';

vi.mock('@/services/db/supabaseClient', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe('crmExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('fetchCrmExportBlob wirft UNAUTHORIZED wenn keine aktive Sitzung vorliegt', async () => {
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);

    await expect(fetchCrmExportBlob({ resource: 'companies' })).rejects.toThrowError(
      CrmServiceError,
    );

    try {
      await fetchCrmExportBlob({ resource: 'companies' });
    } catch (err) {
      expect((err as CrmServiceError).code).toBe('UNAUTHORIZED');
    }
  });

  it('fetchCrmExportBlob sendet action export und liefert Blob bei Erfolg', async () => {
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'valid-test-token' } },
      error: null,
    } as never);

    const csvContent = 'ID,Name\nc1,Firma A1';
    const mockBlob = new Blob([csvContent], { type: 'text/csv; charset=utf-8' });

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="companies-export.csv"',
      }),
      blob: async () => mockBlob,
    } as never);

    const blob = await fetchCrmExportBlob({
      resource: 'companies',
      q: 'Firma',
      filters: { industry: 'IT' },
      sortBy: 'name',
      sortOrder: 'asc',
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
          action: 'export',
          resource: 'companies',
          q: 'Firma',
          filters: { industry: 'IT' },
          sortBy: 'name',
          sortOrder: 'asc',
        }),
      }),
    );

    expect(blob).toBe(mockBlob);
  });

  it('fetchCrmExportBlob wirft FORBIDDEN wenn Server 403 liefert (Viewer-Rolle)', async () => {
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'viewer-token' } },
      error: null,
    } as never);

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({
        code: 'FORBIDDEN',
        message: 'Export für Rolle viewer nicht gestattet.',
      }),
    } as never);

    try {
      await fetchCrmExportBlob({ resource: 'companies' });
      expect.unreachable('Sollte werfen');
    } catch (err) {
      expect(err).toBeInstanceOf(CrmServiceError);
      expect((err as CrmServiceError).code).toBe('FORBIDDEN');
    }
  });

  it('downloadCrmExport triggert sauberen Download und räumt Object-URL auf', async () => {
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'admin-token' } },
      error: null,
    } as never);

    const mockBlob = new Blob(['test'], { type: 'text/csv' });
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      headers: new Headers({
        'content-disposition': 'attachment; filename="test-export.csv"',
      }),
      blob: async () => mockBlob,
    } as never);

    const createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await downloadCrmExport({ resource: 'companies' });

    expect(createObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    clickSpy.mockRestore();
  });
});
