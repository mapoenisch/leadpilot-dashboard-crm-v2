import { DataSource, CrmReadModel, HistoricalActivity } from '../../../types/dataSource';
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
    const activities: HistoricalActivity[] = (d.activities ?? []).map((a) => ({
      id: a.id,
      companyId: a.entityType === 'Company' ? (a.entityId ?? '') : '',
      type: (a.type as HistoricalActivity['type']) || 'NOTE',
      channel: 'simulated',
      timestamp: a.timestamp,
      description: a.description,
      performedBy: a.author ?? 'system',
      status: 'completed',
    }));
    return {
      companies: d.companies,
      contacts: d.contacts,
      deals: d.importedFunnelDeals,
      activities,
      audit: d.audit,
    };
  },
};
