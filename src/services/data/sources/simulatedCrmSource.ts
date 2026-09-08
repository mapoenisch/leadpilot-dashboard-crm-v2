import { DataSource, CrmReadModel } from '../../../types/dataSource';
import { importCrmData } from '../../import/crmImporter';

export const simulatedCrmSource: DataSource = {
  info: {
    id: 'simulated-crm',
    kind: 'simulated',
    label: 'Simuliertes CRM',
    description: 'Der validierte V1.0-Ausgangsdatensatz.',
    supportsLiveFeed: true,
  },
  async fetchSnapshot(): Promise<CrmReadModel> {
    const d = importCrmData();
    return {
      companies: d.companies,
      contacts: d.contacts,
      deals: d.importedFunnelDeals,
      activities: (d as any).activities ?? [],
      audit: d.audit,
    };
  },
};
