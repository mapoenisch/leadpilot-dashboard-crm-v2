import { DataSource, CrmReadModel, DataSourceError } from '../../../types/dataSource';

const FILES: Record<string, () => Promise<any>> = {
  '2026-08-31-v1': () => import('../baselines/baseline-2026-08-31-v1.json'),
  '2026-09-15-v2': () => import('../baselines/baseline-2026-09-15-v2.json'),
};

export function makeBaselineFileSource(version: string): DataSource {
  return {
    info: {
      id: `baseline-file:${version}`,
      kind: 'file',
      label: `Baseline-Datei ${version}`,
      description: 'n8n-generierter, eingefrorener Datensatz.',
      supportsLiveFeed: false,
    },
    async fetchSnapshot(): Promise<CrmReadModel> {
      const loader = FILES[version];
      if (!loader) {
        throw new DataSourceError('UNKNOWN_SOURCE', `Baseline-Datei "${version}" fehlt.`);
      }
      const mod = await loader();
      const ds = mod.default ?? mod;
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

export function listBaselineFileVersions(): string[] {
  return Object.keys(FILES);
}
