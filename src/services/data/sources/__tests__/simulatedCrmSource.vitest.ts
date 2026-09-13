import { describe, it, expect, vi, beforeEach } from 'vitest';
import { simulatedCrmSource } from '../simulatedCrmSource';
import * as crmImporterModule from '@/services/import/crmImporter';

describe('simulatedCrmSource', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('besitzt korrekte Metadaten', () => {
    expect(simulatedCrmSource.info.id).toBe('simulated-crm');
    expect(simulatedCrmSource.info.kind).toBe('simulated');
    expect(simulatedCrmSource.info.supportsLiveFeed).toBe(true);
  });

  it('lädt Standard-Snapshot ohne Aktivitäten', async () => {
    const snapshot = await simulatedCrmSource.fetchSnapshot();
    expect(snapshot.companies).toHaveLength(20);
    expect(snapshot.contacts).toHaveLength(100);
    expect(snapshot.deals).toHaveLength(40);
    expect(snapshot.activities).toEqual([]);
    expect(snapshot.audit).toBeDefined();
  });

  it('mappt Aktivitäten mit Company-, Fallback- und Non-Company-Referenzen', async () => {
    const mockImport = {
      companies: [],
      contacts: [],
      importedFunnelDeals: [],
      companyMap: {},
      audit: {
        companiesLoaded: 0,
        companiesValid: 0,
        companiesErrors: 0,
        contactsLoaded: 0,
        contactsValid: 0,
        contactsMatched: 0,
        contactsErrors: 0,
        dealsLoaded: 0,
        dealsValid: 0,
        dealsErrors: 0,
      },
      activities: [
        {
          id: 'act-1',
          entityType: 'Company',
          entityId: 'comp-10',
          type: 'MEETING',
          timestamp: '2026-03-01T10:00:00Z',
          description: 'Meeting desc',
          author: 'Alice',
        },
        {
          id: 'act-2',
          entityType: 'Contact',
          entityId: 'cont-5',
          type: undefined,
          timestamp: '2026-03-02T10:00:00Z',
          description: 'Note desc',
          author: undefined,
        },
      ],
    };

    vi.spyOn(crmImporterModule, 'importCrmData').mockReturnValue(
      mockImport as unknown as crmImporterModule.CrmImportResult,
    );

    const snapshot = await simulatedCrmSource.fetchSnapshot();
    expect(snapshot.activities).toHaveLength(2);

    const first = snapshot.activities[0];
    expect(first?.id).toBe('act-1');
    expect(first?.companyId).toBe('comp-10');
    expect(first?.type).toBe('MEETING');
    expect(first?.performedBy).toBe('Alice');
    expect(first?.channel).toBe('simulated');
    expect(first?.status).toBe('completed');

    const second = snapshot.activities[1];
    expect(second?.id).toBe('act-2');
    expect(second?.companyId).toBe('');
    expect(second?.type).toBe('NOTE');
    expect(second?.performedBy).toBe('system');
  });
});
