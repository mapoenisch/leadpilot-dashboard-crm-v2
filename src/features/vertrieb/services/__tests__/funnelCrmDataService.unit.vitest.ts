import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as crmListService from '@/services/crm/crmListService';
import { crmKeys } from '@/services/query/queryKeys';
import {
  fetchAllCrmEntities,
  getFunnelAllCrmQueryKey,
  CRM_QUERY_MAX_PAGE_SIZE,
} from '../funnelCrmDataService';

vi.mock('@/services/crm/crmListService', async () => {
  const actual = await vi.importActual<typeof import('@/services/crm/crmListService')>(
    '@/services/crm/crmListService',
  );
  return {
    ...actual,
    fetchCrmList: vi.fn(),
  };
});

describe('funnelCrmDataService (fetchAllCrmEntities)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lädt eine einzelne Seite vollständig, wenn total <= 100', async () => {
    const mockItems = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
    ];
    vi.mocked(crmListService.fetchCrmList).mockResolvedValueOnce({
      items: mockItems,
      total: 2,
      page: 1,
      pageSize: CRM_QUERY_MAX_PAGE_SIZE,
      resource: 'deals',
    });

    const result = await fetchAllCrmEntities('deals');
    expect(result).toEqual(mockItems);
    expect(crmListService.fetchCrmList).toHaveBeenCalledTimes(1);
    expect(crmListService.fetchCrmList).toHaveBeenCalledWith({
      resource: 'deals',
      page: 1,
      pageSize: 100,
    });
  });

  it('paginiert über mehrere Seiten, wenn total > 100', async () => {
    const page1Items = Array.from({ length: 100 }, (_, i) => ({ id: `p1-${i}` }));
    const page2Items = Array.from({ length: 50 }, (_, i) => ({ id: `p2-${i}` }));

    vi.mocked(crmListService.fetchCrmList)
      .mockResolvedValueOnce({
        items: page1Items,
        total: 150,
        page: 1,
        pageSize: 100,
        resource: 'deals',
      })
      .mockResolvedValueOnce({
        items: page2Items,
        total: 150,
        page: 2,
        pageSize: 100,
        resource: 'deals',
      });

    const result = await fetchAllCrmEntities('deals');
    expect(result).toHaveLength(150);
    expect(crmListService.fetchCrmList).toHaveBeenCalledTimes(2);
    expect(crmListService.fetchCrmList).toHaveBeenNthCalledWith(1, {
      resource: 'deals',
      page: 1,
      pageSize: 100,
    });
    expect(crmListService.fetchCrmList).toHaveBeenNthCalledWith(2, {
      resource: 'deals',
      page: 2,
      pageSize: 100,
    });
  });

  it('wirft einen Fehler weiter, wenn der Backend-Aufruf fehlschlägt', async () => {
    vi.mocked(crmListService.fetchCrmList).mockRejectedValueOnce(new Error('Netzwerkfehler'));

    await expect(fetchAllCrmEntities('contacts')).rejects.toThrow('Netzwerkfehler');
  });

  it('nutzt einen an crmKeys.listsOf angebundenen Query-Key für automatische Invalidierung', () => {
    const key = getFunnelAllCrmQueryKey('deals', 'org-123');
    // Prefix muss mit crmKeys.listsOf('deals') übereinstimmen: ['crm', 'list', 'deals']
    expect(key.slice(0, 3)).toEqual(crmKeys.listsOf('deals'));
    expect(key).toEqual(crmKeys.list('deals', { scope: 'all', orgId: 'org-123' }));
  });
});
