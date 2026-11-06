/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  parseDealAmount,
  getStoredConvertedDeals,
  getQualifiedLeadIds,
  markLeadAsQualified,
  convertLeadToDeal,
  mergeConvertedDeals,
} from '../leadConversionService';

describe('leadConversionService', () => {
  const testOrg = 'test-org-123';

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
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
    it('erstellt einen neuen Deal und markiert den Lead als qualifiziert', async () => {
      const deal = await convertLeadToDeal(
        {
          dealName: 'Acme – Enterprise Deal',
          stage: 'Erstgespräch geführt',
          amount: 45000,
          closeDate: '2026-12-31',
          companyName: 'Acme Cloud',
          leadId: 'lead-42',
          leadName: 'Max Mustermann',
        },
        testOrg,
      );

      expect(deal.id).toMatch(/^d-conv-lead-42-/);
      expect(deal.amount).toBe(45000);
      expect(deal.dealName).toBe('Acme – Enterprise Deal');

      const stored = getStoredConvertedDeals(testOrg);
      expect(stored.length).toBe(1);
      expect(stored[0]!.id).toBe(deal.id);
      expect(getQualifiedLeadIds(testOrg).has('lead-42')).toBe(true);
    });

    it('lehnt unzulässige Beträge mit aussagekräftigem Fehler ab', async () => {
      await expect(
        convertLeadToDeal(
          {
            dealName: 'Ungültig',
            stage: 'Erstgespräch geführt',
            amount: 0,
            closeDate: '2026-12-31',
            companyName: 'Acme',
            leadId: 'lead-x',
            leadName: 'Test',
          },
          testOrg,
        ),
      ).rejects.toThrow(/positive Zahl/);
    });
  });

  describe('mergeConvertedDeals', () => {
    it('führt gespeicherte Konvertierungen mit serverseitigen Deals zusammen', async () => {
      await convertLeadToDeal(
        {
          dealName: 'Neuer Deal',
          stage: 'Bedarfsanalyse',
          amount: 50000,
          closeDate: '2026-11-30',
          companyName: 'Muster AG',
          leadId: 'lead-99',
          leadName: 'Erika Muster',
        },
        testOrg,
      );

      const serverDeals = [{ id: 'server-1', dealName: 'Alter Deal', amount: 10000 }];
      const result = mergeConvertedDeals(serverDeals, testOrg);

      expect(result.items.length).toBe(2);
      expect(result.totalBonus).toBe(1);
      expect(result.items[0]!.dealName).toBe('Neuer Deal');
      expect(result.items[1]!.dealName).toBe('Alter Deal');
    });
  });
});
