import { describe, it, expect, beforeEach } from 'vitest';
import { dataSourceRegistry } from '../dataSourceRegistry';
import type { CrmReadModel, DataSource } from '@/types/dataSource';
import { loadCrmReadModel, DEMO_ORGANIZATION_ID } from '../crmReadModelService';
import { assertSingleSourceEnvelope } from '../crmEnvelopeGuard';

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
    deals: [
      {
        id: 'd1',
        dealName: 'Demo-Deal',
        stage: 'PROPOSAL',
        amount: 50000,
        closeDate: '2026-09-30',
        pipeline: 'default',
      },
    ],
    activities: [
      {
        id: 'a1',
        companyId: 'c1',
        type: 'NOTE',
        channel: 'test',
        timestamp: '2026-09-01T10:00:00.000Z',
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
      dealsLoaded: 1,
      dealsValid: 1,
      dealsErrors: 0,
    },
  };
}

function emptyModel(): CrmReadModel {
  return {
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
  };
}

function registerSource(
  id: string,
  kind: DataSource['info']['kind'],
  model: CrmReadModel | Error,
): void {
  dataSourceRegistry.register({
    info: { id, kind, label: id, description: 'test', supportsLiveFeed: false },
    fetchSnapshot: async () => {
      if (model instanceof Error) throw model;
      return model;
    },
  });
}

describe('067D G47 crmReadModelService', () => {
  beforeEach(() => {
    dataSourceRegistry.reset();
  });

  it('leere Tabellen liefern Status empty ohne Ersatzdaten', async () => {
    registerSource('supabase', 'simulated', emptyModel());
    const envelope = await loadCrmReadModel('org-real-1', 'supabase', {
      allowSynthetic: true,
    });
    expect(envelope.status).toBe('empty');
    expect(envelope.data.companies).toEqual([]);
    expect(envelope.organizationId).toBe('org-real-1');
    expect(envelope.sourceId).toBe('supabase');
    expect(envelope.fetchedAt).toBeTruthy();
    expect(envelope.contentHash).toBeTruthy();
  });

  it('Netzwerkfehler liefern unavailable und schieben keine Demodaten unter', async () => {
    registerSource('supabase', 'simulated', new Error('boom'));
    const envelope = await loadCrmReadModel('org-real-1', 'supabase', {
      allowSynthetic: true,
    });
    expect(envelope.status).toBe('unavailable');
    expect(envelope.data.companies).toEqual([]);
    expect(envelope.data.contacts).toEqual([]);
    expect(envelope.data.deals).toEqual([]);
  });

  it('partieller Quellenmix wird abgewiesen statt still gemischt', async () => {
    registerSource('quelle-a', 'simulated', validModel());
    registerSource('quelle-b', 'simulated', validModel());
    const envelopeA = await loadCrmReadModel(DEMO_ORGANIZATION_ID, 'quelle-a', {
      allowSynthetic: true,
    });
    expect(envelopeA.status).toBe('healthy');
    const deal0 = envelopeA.data.deals[0];
    if (!deal0) throw new Error('Test-Setup: Deal fehlt.');
    expect(() =>
      assertSingleSourceEnvelope(
        {
          ...envelopeA,
          data: {
            ...envelopeA.data,
            // Deals aus anderer Quelle unterschieben → Provenienz verletzt.
            deals: [{ ...deal0, id: 'fremd-deal' }],
          },
        },
        'quelle-b',
      ),
    ).toThrow();
  });

  it('ungültige Runtime-Daten liefern unavailable statt stiller Demo', async () => {
    const broken = validModel() as unknown as Record<string, unknown>;
    broken.companies = [{ id: 123, name: null }];
    registerSource('supabase', 'simulated', broken as unknown as CrmReadModel);
    const envelope = await loadCrmReadModel('org-real-1', 'supabase', {
      allowSynthetic: true,
    });
    expect(envelope.status).toBe('unavailable');
    expect(envelope.data.companies).toEqual([]);
  });

  it('bewusste Demo-Auswahl ist erlaubt, stiller Synthetic-Fallback nicht', async () => {
    registerSource('simulated-crm', 'simulated', validModel());
    const demo = await loadCrmReadModel(DEMO_ORGANIZATION_ID, 'simulated-crm', {
      allowSynthetic: true,
    });
    expect(demo.status).toBe('healthy');
    expect(demo.sourceKind).toBe('synthetic');

    const blocked = await loadCrmReadModel('org-real-1', 'simulated-crm');
    expect(blocked.status).toBe('unavailable');
    expect(blocked.data.companies).toEqual([]);
  });

  it('Audit-Fehler markieren degraded statt healthy', async () => {
    const model = validModel();
    model.audit = { ...model.audit, dealsErrors: 2 };
    registerSource('supabase', 'simulated', model);
    const envelope = await loadCrmReadModel('org-real-1', 'supabase', {
      allowSynthetic: true,
    });
    expect(envelope.status).toBe('degraded');
    expect(envelope.data.deals).toHaveLength(1);
  });
});
