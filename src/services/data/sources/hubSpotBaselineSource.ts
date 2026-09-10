import { DataSource, CrmReadModel, DataSourceError } from '../../../types/dataSource';

const FILES: Record<string, () => Promise<any>> = {
  fixture: () => import('../../../simulation/__tests__/fixtures/baseline-hubspot-fixture.json'),
  '2026-09-01': () => import('../baselines/baseline-hubspot-2026-09-01.json'),
};

export function makeHubSpotBaselineSource(version: string): DataSource {
  return {
    info: {
      id: `hubspot-baseline:${version}`,
      kind: 'external',
      label: `HubSpot-Baseline ${version}`,
      description: 'Offline per n8n gezogener, eingefrorener HubSpot-Snapshot. Kein Live-Zugriff.',
      supportsLiveFeed: false,
    },
    async fetchSnapshot(): Promise<CrmReadModel> {
      const loader = FILES[version];
      if (!loader) {
        throw new DataSourceError('UNKNOWN_SOURCE', `HubSpot-Baseline "${version}" fehlt.`);
      }
      const mod = await loader();
      const ds = mod.default ?? mod;
      if (ds.sourceSystem !== 'hubspot') {
        throw new DataSourceError('INTEGRITY', `Envelope ${version} ist keine HubSpot-Quelle.`);
      }
      return {
        companies: ds.companies,
        contacts: ds.contacts,
        deals: ds.importedFunnelDeals,
        activities: ds.activities ?? [],
        audit: ds.audit,
      };
    },
  };
}

export function listHubSpotBaselineVersions(): string[] {
  return Object.keys(FILES);
}
