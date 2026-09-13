import { describe, it, expect, beforeEach } from 'vitest';
import { BaselineSnapshotService } from '../baselineSnapshotService';
import { dataSourceRegistry } from '../dataSourceRegistry';
import { CrmReadModel, DataSource, DataSourceError } from '@/types/dataSource';

function createValidModel(): CrmReadModel {
  return {
    companies: [
      {
        id: 'c1',
        name: 'Company 1',
        domain: 'c1.de',
        industry: 'Tech',
        city: 'Berlin',
        employeeCount: 10,
      },
    ],
    contacts: [
      {
        id: 'ct1',
        companyId: 'c1',
        email: 'a@c1.de',
        firstName: 'Anna',
        lastName: 'A',
        jobTitle: 'Lead',
      },
    ],
    deals: [
      {
        id: 'd1',
        dealName: 'Deal 1',
        stage: 'Won',
        amount: 50000,
        closeDate: '2026-06-01',
        pipeline: 'Standard',
      },
    ],
    activities: [
      {
        id: 'act1',
        companyId: 'c1',
        type: 'CALL',
        channel: 'phone',
        timestamp: '2026-03-01T10:00:00Z',
        description: 'Call 1',
        performedBy: 'user1',
        status: 'completed',
      },
    ],
    audit: {
      companiesLoaded: 1,
      companiesValid: 1,
      companiesErrors: 0,
      contactsLoaded: 1,
      contactsValid: 1,
      contactsMatched: 1,
      contactsErrors: 0,
      dealsLoaded: 1,
      dealsValid: 1,
      dealsErrors: 0,
    },
  };
}

describe('BaselineSnapshotService', () => {
  beforeEach(() => {
    BaselineSnapshotService.clear();
    dataSourceRegistry.reset();
  });

  it('erfasst, validiert und friert ein Baseline-Dataset ein', async () => {
    const validModel = createValidModel();
    const source: DataSource = {
      info: {
        id: 'source-test',
        kind: 'simulated',
        label: 'Test Source',
        description: 'Test Source',
        supportsLiveFeed: false,
      },
      fetchSnapshot: async () => validModel,
    };
    dataSourceRegistry.register(source);

    const ds = await BaselineSnapshotService.capture(
      'source-test',
      'baseline-test-v1',
      '2026-01-01',
      '2026-09-01T12:00:00Z',
    );

    expect(ds.version).toBe('baseline-test-v1');
    expect(ds.counts.companies).toBe(1);
    expect(ds.counts.contacts).toBe(1);
    expect(ds.counts.deals).toBe(1);
    expect(ds.counts.activities).toBe(1);

    expect(BaselineSnapshotService.has('baseline-test-v1')).toBe(true);
    expect(BaselineSnapshotService.has('non-existent')).toBe(false);
    expect(BaselineSnapshotService.listFrozen()).toEqual(['baseline-test-v1']);

    const retrieved = BaselineSnapshotService.get('baseline-test-v1');
    expect(retrieved.version).toBe('baseline-test-v1');
  });

  it('wirft DataSourceError wenn unbekannte Version abgerufen wird', () => {
    expect(() => BaselineSnapshotService.get('unknown-version')).toThrow(DataSourceError);
  });

  it('validiert Integrität: Fehler bei Kontakt mit unbekannter Company', async () => {
    const invalidModel = createValidModel();
    invalidModel.contacts[0] = {
      id: 'ct-invalid',
      companyId: 'unknown-company-id',
      email: 'bad@bad.de',
      firstName: 'Bad',
      lastName: 'Contact',
      jobTitle: 'Bad',
    };

    const source: DataSource = {
      info: {
        id: 'source-invalid',
        kind: 'simulated',
        label: 'Invalid',
        description: 'Invalid',
        supportsLiveFeed: false,
      },
      fetchSnapshot: async () => invalidModel,
    };
    dataSourceRegistry.register(source);

    await expect(
      BaselineSnapshotService.capture('source-invalid', 'v-err-ct', '2026-01-01', '2026-09-01'),
    ).rejects.toThrow('unbekannte Company');
  });

  it('validiert Integrität: Fehler bei Deal mit unbekannter Company', async () => {
    const invalidModel = createValidModel();
    invalidModel.deals[0] = Object.assign({}, invalidModel.deals[0], {
      companyId: 'unknown-company-id',
    });

    const source: DataSource = {
      info: {
        id: 'source-invalid-deal',
        kind: 'simulated',
        label: 'Invalid',
        description: 'Invalid',
        supportsLiveFeed: false,
      },
      fetchSnapshot: async () => invalidModel,
    };
    dataSourceRegistry.register(source);

    await expect(
      BaselineSnapshotService.capture(
        'source-invalid-deal',
        'v-err-deal',
        '2026-01-01',
        '2026-09-01',
      ),
    ).rejects.toThrow('Deal d1 → unbekannte Company');
  });

  it('validiert Integrität: Fehler bei Aktivitäten außerhalb der Periode', async () => {
    const invalidModel = createValidModel();
    invalidModel.activities[0] = {
      id: 'act-out-of-bounds',
      companyId: 'c1',
      type: 'EMAIL',
      channel: 'email',
      timestamp: '2024-01-01T00:00:00Z', // vor periodStart 2026-01-01
      description: 'Too early',
      performedBy: 'user',
      status: 'completed',
    };

    const source: DataSource = {
      info: {
        id: 'source-invalid-act',
        kind: 'simulated',
        label: 'Invalid',
        description: 'Invalid',
        supportsLiveFeed: false,
      },
      fetchSnapshot: async () => invalidModel,
    };
    dataSourceRegistry.register(source);

    await expect(
      BaselineSnapshotService.capture(
        'source-invalid-act',
        'v-err-act',
        '2026-01-01',
        '2026-09-01',
      ),
    ).rejects.toThrow('außerhalb der Periode');
  });
});
