/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { crmKeys } from '@/services/query/queryKeys';
import {
  parseDealAmount,
  getQualifiedLeadIds,
  markLeadAsQualified,
  convertLeadToDeal,
  type ConvertedDealPayload,
} from '../leadConversionService';

const dbMock = vi.hoisted(() => ({
  configured: true,
  insert: vi.fn(),
}));

vi.mock('@/services/db/supabaseClient', () => ({
  get isSupabaseConfigured() {
    return dbMock.configured;
  },
  get supabase() {
    return dbMock.configured ? { from: () => ({ insert: dbMock.insert }) } : null;
  },
}));

const PAYLOAD: ConvertedDealPayload = {
  dealName: 'Acme – Enterprise Deal',
  stage: 'Erstgespräch geführt',
  amount: 45000,
  closeDate: '2026-12-31',
  companyName: 'Acme Cloud',
  leadId: 'lead-42',
  leadName: 'Max Mustermann',
};

describe('leadConversionService', () => {
  const testOrg = 'test-org-123';

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    dbMock.configured = true;
    dbMock.insert.mockReset();
    dbMock.insert.mockResolvedValue({ error: null });
  });

  describe('parseDealAmount', () => {
    it('parst Ganzzahlen und Float-Werte korrekt', () => {
      expect(parseDealAmount(25000)).toBe(25000);
      expect(parseDealAmount('35000')).toBe(35000);
      expect(parseDealAmount('1250.50')).toBe(1250.5);
      expect(parseDealAmount('1250,50')).toBe(1250.5);
      expect(parseDealAmount('1e4')).toBe(10000);
    });

    it('behandelt ungültige oder negative Eingaben als 0', () => {
      expect(parseDealAmount('-500')).toBe(0);
      expect(parseDealAmount('ungültig')).toBe(0);
      expect(parseDealAmount(NaN)).toBe(0);
      expect(parseDealAmount(Infinity)).toBe(0);
    });
  });

  describe('markLeadAsQualified & getQualifiedLeadIds', () => {
    it('speichert und liest qualifizierte Leads pro Mandant', () => {
      expect(getQualifiedLeadIds(testOrg).has('lead-1')).toBe(false);
      markLeadAsQualified('lead-1', testOrg);
      expect(getQualifiedLeadIds(testOrg).has('lead-1')).toBe(true);
      expect(getQualifiedLeadIds('other-org').has('lead-1')).toBe(false);
    });
  });

  describe('convertLeadToDeal', () => {
    it('speichert den Deal mandantengebunden und markiert den Lead als qualifiziert', async () => {
      const deal = await convertLeadToDeal(PAYLOAD, testOrg);

      expect(deal.id).toMatch(/^d-conv-lead-42-/);
      expect(deal.amount).toBe(45000);
      expect(dbMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: deal.id,
          deal_name: 'Acme – Enterprise Deal',
          organization_id: testOrg,
        }),
      );
      expect(getQualifiedLeadIds(testOrg).has('lead-42')).toBe(true);
    });

    it('legt keine lokale Deal-Kopie an, die die Serverliste überlagern könnte', async () => {
      await convertLeadToDeal(PAYLOAD, testOrg);

      const keys = [...Object.keys(sessionStorage), ...Object.keys(localStorage)];
      expect(keys.filter((k) => k.includes('converted_deals'))).toEqual([]);
    });

    it('meldet einen Fehler der Datenbank und markiert den Lead dann nicht', async () => {
      dbMock.insert.mockResolvedValue({ error: { message: 'kaputt' } });

      await expect(convertLeadToDeal(PAYLOAD, testOrg)).rejects.toThrow(/kaputt/);
      expect(getQualifiedLeadIds(testOrg).has('lead-42')).toBe(false);
    });

    it('meldet ohne Datenbank keinen Erfolg', async () => {
      dbMock.configured = false;

      await expect(convertLeadToDeal(PAYLOAD, testOrg)).rejects.toThrow(/nicht gespeichert/);
      expect(getQualifiedLeadIds(testOrg).has('lead-42')).toBe(false);
    });

    it('lehnt unzulässige Beträge mit aussagekräftigem Fehler ab', async () => {
      await expect(convertLeadToDeal({ ...PAYLOAD, amount: 0 }, testOrg)).rejects.toThrow(
        /positive Zahl/,
      );
      expect(dbMock.insert).not.toHaveBeenCalled();
    });

    it('invalidiert die parametrisierten Listen und die Pipeline-Übersicht', async () => {
      const queryClient = new QueryClient();
      const seed = (key: readonly unknown[]) => {
        queryClient.setQueryData(key, { items: [] });
        return () => queryClient.getQueryState(key)?.isInvalidated;
      };
      const dealsList = seed(crmKeys.list('deals', { resource: 'deals', page: 2 }));
      const contactsList = seed(crmKeys.list('contacts', { resource: 'contacts' }));
      const companiesList = seed(crmKeys.list('companies', { resource: 'companies' }));
      const pipeline = seed(crmKeys.pipelineOverview());

      await convertLeadToDeal(PAYLOAD, testOrg, queryClient);

      expect(dealsList()).toBe(true);
      expect(contactsList()).toBe(true);
      expect(pipeline()).toBe(true);
      expect(companiesList()).toBe(false);
    });
  });
});
