import { describe, it, expect, beforeEach } from 'vitest';
import { dataSourceRegistry } from '../dataSourceRegistry';
import { DataSource, DataSourceError } from '@/types/dataSource';

function createDummySource(id: string): DataSource {
  return {
    info: {
      id,
      kind: 'simulated',
      label: `Dummy ${id}`,
      description: 'Test dummy source',
      supportsLiveFeed: false,
    },
    fetchSnapshot: async () => ({
      companies: [],
      contacts: [],
      deals: [],
      activities: [],
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
    }),
  };
}

describe('dataSourceRegistry', () => {
  beforeEach(() => {
    dataSourceRegistry.reset();
  });

  it('wirft DataSourceError wenn keine aktive Quelle konfiguriert ist', () => {
    expect(() => dataSourceRegistry.getActive()).toThrow(DataSourceError);
  });

  it('registriert Quellen und setzt erste Quelle als aktiv', () => {
    const s1 = createDummySource('source-1');
    const s2 = createDummySource('source-2');

    dataSourceRegistry.register(s1);
    expect(dataSourceRegistry.getActive().info.id).toBe('source-1');

    dataSourceRegistry.register(s2);
    expect(dataSourceRegistry.getActive().info.id).toBe('source-1');

    const list = dataSourceRegistry.list();
    expect(list).toHaveLength(2);
    expect(list.map((i) => i.id)).toEqual(['source-1', 'source-2']);
  });

  it('liefert registrierte Quelle per get() oder wirft DataSourceError', () => {
    const s1 = createDummySource('source-1');
    dataSourceRegistry.register(s1);

    expect(dataSourceRegistry.get('source-1').info.id).toBe('source-1');
    expect(() => dataSourceRegistry.get('unknown-source')).toThrow(DataSourceError);
  });

  it('erlaubt das Umschalten der aktiven Quelle via setActive()', () => {
    const s1 = createDummySource('source-1');
    const s2 = createDummySource('source-2');

    dataSourceRegistry.register(s1);
    dataSourceRegistry.register(s2);

    dataSourceRegistry.setActive('source-2');
    expect(dataSourceRegistry.getActive().info.id).toBe('source-2');

    expect(() => dataSourceRegistry.setActive('invalid-id')).toThrow(DataSourceError);
  });

  it('löscht alle Quellen und die aktive ID bei reset()', () => {
    dataSourceRegistry.register(createDummySource('s1'));
    expect(dataSourceRegistry.list()).toHaveLength(1);

    dataSourceRegistry.reset();
    expect(dataSourceRegistry.list()).toHaveLength(0);
    expect(() => dataSourceRegistry.getActive()).toThrow(DataSourceError);
  });
});
