import { describe, it, expect, beforeEach } from 'vitest';
import { dataSourceRegistry } from '../dataSourceRegistry';
import type { CrmReadModel, DataSource } from '@/types/dataSource';
import { BaselineSnapshotService } from '../baselineSnapshotService';
import { DEFAULT_HISTORICAL_METRICS, mapBaselineToSimulationInput } from '../baselineMapper';

function validModel(): CrmReadModel {
  return {
    companies: [
      {
        id: 'c1',
        name: 'Acme GmbH',
        industry: 'Software',
        city: 'Berlin',
        employeeCount: 120,
      },
    ],
    contacts: [
      {
        id: 'p1',
        companyId: 'c1',
        email: 'kontakt@acme.test',
        firstName: 'Demo',
        lastName: 'Kontakt',
      },
    ],
    deals: [],
    activities: [
      {
        id: 'a1',
        companyId: 'c1',
        type: 'NOTE',
        channel: 'test',
        timestamp: '2026-03-01T10:00:00.000Z',
        description: 'Notiz',
        performedBy: 'system',
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
      dealsLoaded: 0,
      dealsValid: 0,
      dealsErrors: 0,
    },
  };
}

function registerSource(
  id: string,
  model: CrmReadModel,
): { mutate: (fn: (m: CrmReadModel) => void) => void } {
  const holder = { model };
  const source: DataSource = {
    info: { id, kind: 'simulated', label: id, description: 'test', supportsLiveFeed: false },
    fetchSnapshot: async () => holder.model,
  };
  dataSourceRegistry.register(source);
  return { mutate: (fn) => fn(holder.model) };
}

describe('067E G48 baselineMapper', () => {
  beforeEach(() => {
    dataSourceRegistry.reset();
    BaselineSnapshotService.clear();
  });

  it('gleiche Baseline liefert gleichen Hash; andere Inhalte anderen Hash', async () => {
    registerSource('src-a', validModel());
    const first = await BaselineSnapshotService.capture(
      'src-a',
      'v1',
      '2026-01-01',
      '2026-01-01T00:00:00.000Z',
    );
    const second = await BaselineSnapshotService.capture(
      'src-a',
      'v1',
      '2026-01-01',
      '2026-06-01T00:00:00.000Z',
    );
    expect(first.baselineHash).toMatch(/^[a-f0-9]{64}$/);
    // capturedAt ist kein Hash-Bestandteil: gleicher Inhalt, gleicher Hash.
    expect(second.baselineHash).toBe(first.baselineHash);

    const other = validModel();
    other.companies = [
      ...other.companies,
      {
        id: 'c2',
        name: 'Beta AG',
        industry: 'Handel',
        city: 'Hamburg',
        employeeCount: 5,
      },
    ];
    registerSource('src-b', other);
    const third = await BaselineSnapshotService.capture(
      'src-b',
      'v2',
      '2026-01-01',
      '2026-01-01T00:00:00.000Z',
    );
    expect(third.baselineHash).not.toBe(first.baselineHash);
  });

  it('Capture klont vollständig und friert tief ein; späte Mutation wirkt nicht', async () => {
    const handle = registerSource('src-a', validModel());
    const ds = await BaselineSnapshotService.capture(
      'src-a',
      'v1',
      '2026-01-01',
      '2026-01-01T00:00:00.000Z',
    );
    expect(Object.isFrozen(ds)).toBe(true);
    expect(Object.isFrozen(ds.companies)).toBe(true);
    expect(Object.isFrozen(ds.companies[0])).toBe(true);
    expect(Object.isFrozen(ds.audit)).toBe(true);

    handle.mutate((m) => {
      m.companies.push({
        id: 'cX',
        name: 'Spät',
        industry: 'X',
        city: 'Y',
        employeeCount: 1,
      });
    });
    expect(BaselineSnapshotService.get('v1').companies).toHaveLength(1);
    expect(BaselineSnapshotService.get('v1').counts.companies).toBe(1);
  });

  it('Mapper liefert Anker-Metriken, Hash und leere Startkollektionen', async () => {
    registerSource('src-a', validModel());
    const ds = await BaselineSnapshotService.capture(
      'src-a',
      'v1',
      '2026-01-01',
      '2026-01-01T00:00:00.000Z',
    );
    const input = mapBaselineToSimulationInput(ds, { seed: 7, simulatedDate: '2026-01-01' });
    expect(input.baselineId).toBe('v1');
    expect(input.baselineHash).toBe(ds.baselineHash);
    expect(input.historicalMetrics).toEqual(DEFAULT_HISTORICAL_METRICS);
    expect(input.historicalMetrics).toEqual({ baseCustomers: 66, baseMRR: 34320, baseARR: 411840 });
    expect(input.leads).toEqual([]);
    expect(input.initialState.seed).toBe(7);
    expect(input.initialState.metrics?.liveCustomers).toBe(66);
    expect(input.initialState.metrics?.liveARR).toBe(411840);
  });

  it('Baseline-eigene Metriken schlagen den Anker', async () => {
    registerSource('src-a', validModel());
    const ds = await BaselineSnapshotService.capture(
      'src-a',
      'v1',
      '2026-01-01',
      '2026-01-01T00:00:00.000Z',
      { historicalMetrics: { baseCustomers: 10, baseMRR: 1000, baseARR: 12000 } },
    );
    const input = mapBaselineToSimulationInput(ds, { seed: 7, simulatedDate: '2026-01-01' });
    expect(input.historicalMetrics).toEqual({ baseCustomers: 10, baseMRR: 1000, baseARR: 12000 });
    expect(input.initialState.metrics?.liveCustomers).toBe(10);
  });
});
