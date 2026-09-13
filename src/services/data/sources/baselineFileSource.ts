import { DataSource, CrmReadModel, HistoricalActivity, DataSourceError } from '../../../types/dataSource';

interface BaselineFileJson {
  version?: string;
  companies: CrmReadModel['companies'];
  contacts: CrmReadModel['contacts'];
  importedFunnelDeals: CrmReadModel['deals'];
  activities?: Array<{
    id: string;
    companyId: string;
    contactId?: string;
    dealId?: string;
    type: string;
    channel: string;
    timestamp: string;
    description: string;
    performedBy: string;
    status: string;
  }>;
  audit: CrmReadModel['audit'];
}

const FILES: Record<string, () => Promise<{ default: BaselineFileJson }>> = {
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
      const ds = (await loader()).default;
      return {
        companies: ds.companies,
        contacts: ds.contacts,
        deals: ds.importedFunnelDeals,
        activities: (ds.activities ?? []).map((a) => ({
          ...a,
          type: a.type as HistoricalActivity['type'],
        })),
        audit: ds.audit,
      };
    },
  };
}

export function listBaselineFileVersions(): string[] {
  return Object.keys(FILES);
}
