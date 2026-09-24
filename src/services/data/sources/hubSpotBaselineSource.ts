import { DataSource, CrmReadModel, DataSourceError } from '../../../types/dataSource';
import { mapDealStage } from '../../import/hubSpotStageMapper';
import { assertHubSpotImportIntegrity } from '../../import/crmImporter';
import { BASELINE_PERIOD_START } from '../../../simulation/constants';

interface HubSpotBaselineContent {
  sourceSystem?: string;
  periodStart?: string;
  companies: CrmReadModel['companies'];
  contacts: CrmReadModel['contacts'];
  importedFunnelDeals: CrmReadModel['deals'];
  activities?: CrmReadModel['activities'];
  audit: CrmReadModel['audit'];
}

interface HubSpotBaselineModule {
  default: HubSpotBaselineContent;
}

const FILES: Record<string, () => Promise<HubSpotBaselineModule>> = {
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
      const ds = (await loader()).default;
      if (ds.sourceSystem !== 'hubspot') {
        throw new DataSourceError('INTEGRITY', `Envelope ${version} ist keine HubSpot-Quelle.`);
      }
      // 067H / G51: Unbekannte Stages landen in Quarantäne statt LOST; der
      // Audit-Fehlerzähler markiert sie sichtbar (degraded-tauglich).
      let quarantined = 0;
      const deals = ds.importedFunnelDeals.map((deal) => {
        const mapped = mapDealStage(deal.stage);
        if (mapped.kind === 'known') return { ...deal, stage: mapped.stage };
        quarantined += 1;
        return { ...deal, stage: 'QUARANTINED' };
      });
      const audit = {
        ...ds.audit,
        dealsLoaded: ds.audit.dealsLoaded,
        dealsErrors: ds.audit.dealsErrors + quarantined,
      };
      const model: CrmReadModel = {
        companies: ds.companies,
        contacts: ds.contacts,
        deals,
        activities: ds.activities ?? [],
        audit,
      };
      // Importfreigabe: Counts, Referenzen, Pflichtfelder, Zeitraum.
      assertHubSpotImportIntegrity({
        ...model,
        periodStart: ds.periodStart ?? BASELINE_PERIOD_START,
      });
      return model;
    },
  };
}

export function listHubSpotBaselineVersions(): string[] {
  return Object.keys(FILES);
}
