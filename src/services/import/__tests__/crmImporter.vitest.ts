import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importCrmData, parseCsv, assertHubSpotImportIntegrity } from '../crmImporter';
import * as rawCsvDataModule from '@/services/import/rawCsvData';

describe('crmImporter', () => {
  describe('parseCsv', () => {
    it('gibt leeres Array bei leerem String oder Whitespace zurück', () => {
      expect(parseCsv('')).toEqual([]);
      expect(parseCsv('   \n  \n  ')).toEqual([]);
    });

    it('parsed CSV mit Komma-Trennzeichen', () => {
      const csv = 'col1, col2, col3\nval1, val2, val3';
      const parsed = parseCsv(csv);
      expect(parsed).toEqual([
        ['col1', 'col2', 'col3'],
        ['val1', 'val2', 'val3'],
      ]);
    });

    it('parsed CSV mit Semikolon-Trennzeichen', () => {
      const csv = 'col1; col2; col3\nval1; val2; val3';
      const parsed = parseCsv(csv);
      expect(parsed).toEqual([
        ['col1', 'col2', 'col3'],
        ['val1', 'val2', 'val3'],
      ]);
    });
  });

  describe('importCrmData - Standard-Lauf', () => {
    it('lädt die 20 Standard-Firmen, 100 Kontakte und 40 Funnel-Deals fehlerfrei', () => {
      const res = importCrmData();

      expect(res.companies).toHaveLength(20);
      expect(res.contacts).toHaveLength(100);
      expect(res.importedFunnelDeals).toHaveLength(40);

      expect(res.audit.companiesLoaded).toBe(20);
      expect(res.audit.companiesValid).toBe(20);
      expect(res.audit.companiesErrors).toBe(0);

      expect(res.audit.contactsLoaded).toBe(100);
      expect(res.audit.contactsValid).toBe(100);
      expect(res.audit.contactsMatched).toBe(100);
      expect(res.audit.contactsErrors).toBe(0);

      expect(res.audit.dealsLoaded).toBe(40);
      expect(res.audit.dealsValid).toBe(40);
      expect(res.audit.dealsErrors).toBe(0);

      expect(Object.keys(res.companyMap)).toHaveLength(20);
      expect(res.companyMap['comp-1']).toBeDefined();
    });
  });

  describe('importCrmData - Edge Cases & Validierungsfehler', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('erfasst Fehler bei unvollständigen Firmen-Zeilen und Duplikaten', () => {
      const mockCompanies = `Domain,Name,Industry,City,Postal,Employees
short_row,CompanyA
alpha.de,Alpha GmbH,SaaS,Berlin,10115,50
,MissingDomain,SaaS,Berlin,10115,50
beta.de,,SaaS,Berlin,10115,50
alpha.de,DuplicateAlpha,SaaS,Berlin,10115,50
gamma.de,Gamma Corp,IT,Hamburg,20095,invalid_number`;

      vi.spyOn(rawCsvDataModule, 'RAW_COMPANIES_CSV', 'get').mockReturnValue(
        mockCompanies as unknown as typeof rawCsvDataModule.RAW_COMPANIES_CSV,
      );
      vi.spyOn(rawCsvDataModule, 'RAW_CONTACTS_CSV', 'get').mockReturnValue(
        'Email,First,Last,Title' as unknown as typeof rawCsvDataModule.RAW_CONTACTS_CSV,
      );
      vi.spyOn(rawCsvDataModule, 'RAW_DEALS_CSV', 'get').mockReturnValue(
        'Name,Stage,Amount,Close,Pipeline' as unknown as typeof rawCsvDataModule.RAW_DEALS_CSV,
      );

      const res = importCrmData();
      // dataRows: 6 Zeilen (short_row, alpha.de, no domain, no name, duplicate alpha, gamma)
      expect(res.audit.companiesLoaded).toBe(6);
      expect(res.audit.companiesValid).toBe(2); // alpha.de und gamma.de
      expect(res.audit.companiesErrors).toBe(4);

      const gamma = res.companies.find((c) => c.domain === 'gamma.de');
      expect(gamma?.employeeCount).toBe(0); // fallback zu 0
    });

    it('erfasst Fehler bei Kontakten ohne Match oder fehlende Pflichtfelder', () => {
      const mockCompanies = `Domain,Name,Industry,City,Postal,Employees
alpha.de,Alpha GmbH,SaaS,Berlin,10115,50`;

      const mockContacts = `Email,FirstName,LastName,JobTitle
short_row,First
max@alpha.de,Max,Mustermann,CEO
,MissingEmail,Last,Dev
erik@alpha.de,,NoFirst,Dev
sara@alpha.de,Sara,,Dev
unknown@external.de,Tom,Jones,Manager`;

      vi.spyOn(rawCsvDataModule, 'RAW_COMPANIES_CSV', 'get').mockReturnValue(
        mockCompanies as unknown as typeof rawCsvDataModule.RAW_COMPANIES_CSV,
      );
      vi.spyOn(rawCsvDataModule, 'RAW_CONTACTS_CSV', 'get').mockReturnValue(
        mockContacts as unknown as typeof rawCsvDataModule.RAW_CONTACTS_CSV,
      );
      vi.spyOn(rawCsvDataModule, 'RAW_DEALS_CSV', 'get').mockReturnValue(
        'Name,Stage,Amount,Close,Pipeline' as unknown as typeof rawCsvDataModule.RAW_DEALS_CSV,
      );

      const res = importCrmData();
      expect(res.audit.contactsLoaded).toBe(6);
      expect(res.audit.contactsValid).toBe(1); // max@alpha.de
      expect(res.audit.contactsErrors).toBe(5);
    });

    it('erfasst Fehler bei ungültigen oder unvollständigen Deals', () => {
      const mockCompanies = 'Domain,Name,Industry,City,Postal,Employees';
      const mockContacts = 'Email,FirstName,LastName,JobTitle';
      const mockDeals = `DealName;Stage;Amount;CloseDate;Pipeline
short_deal;Stage1
Deal1;Won;10000;2026-06-01;Enterprise
Deal2;;10000;2026-06-01;Enterprise
Deal3;Won;15000;;Enterprise
Deal4;Won;20000;2026-06-01;
;Won;10000;2026-06-01;Enterprise
DealComma;Won;2500,50;2026-06-01;MidMarket`;

      vi.spyOn(rawCsvDataModule, 'RAW_COMPANIES_CSV', 'get').mockReturnValue(
        mockCompanies as unknown as typeof rawCsvDataModule.RAW_COMPANIES_CSV,
      );
      vi.spyOn(rawCsvDataModule, 'RAW_CONTACTS_CSV', 'get').mockReturnValue(
        mockContacts as unknown as typeof rawCsvDataModule.RAW_CONTACTS_CSV,
      );
      vi.spyOn(rawCsvDataModule, 'RAW_DEALS_CSV', 'get').mockReturnValue(
        mockDeals as unknown as typeof rawCsvDataModule.RAW_DEALS_CSV,
      );

      const res = importCrmData();
      expect(res.audit.dealsLoaded).toBe(7);
      expect(res.audit.dealsValid).toBe(2); // Deal1 und DealComma
      expect(res.audit.dealsErrors).toBe(5);

      const commaDeal = res.importedFunnelDeals.find((d) => d.dealName === 'DealComma');
      expect(commaDeal?.amount).toBe(2500.5);
    });

    it('behandelt leere CSVs ohne Datenzeilen', () => {
      vi.spyOn(rawCsvDataModule, 'RAW_COMPANIES_CSV', 'get').mockReturnValue(
        'Domain,Name' as unknown as typeof rawCsvDataModule.RAW_COMPANIES_CSV,
      );
      vi.spyOn(rawCsvDataModule, 'RAW_CONTACTS_CSV', 'get').mockReturnValue(
        'Email,First' as unknown as typeof rawCsvDataModule.RAW_CONTACTS_CSV,
      );
      vi.spyOn(rawCsvDataModule, 'RAW_DEALS_CSV', 'get').mockReturnValue(
        'DealName,Stage' as unknown as typeof rawCsvDataModule.RAW_DEALS_CSV,
      );

      const res = importCrmData();
      expect(res.companies).toHaveLength(0);
      expect(res.contacts).toHaveLength(0);
      expect(res.importedFunnelDeals).toHaveLength(0);
      expect(res.audit.companiesLoaded).toBe(0);
      expect(res.audit.contactsLoaded).toBe(0);
      expect(res.audit.dealsLoaded).toBe(0);
    });
  });

  describe('assertHubSpotImportIntegrity (067H G51)', () => {
    const validBatch = () => ({
      companies: [{ id: 'c1', name: 'Acme' }],
      contacts: [{ id: 'p1', companyId: 'c1', email: 'a@acme.test' }],
      deals: [
        {
          id: 'd1',
          dealName: 'Deal',
          stage: 'WON',
          amount: 1000,
          closeDate: '2026-03-01',
          pipeline: 'default',
          companyId: 'c1',
        },
      ],
      activities: [{ id: 'a1', timestamp: '2026-06-01T00:00:00.000Z' }],
      periodStart: '2026-01-01',
    });

    it('akzeptiert konsistente Batches', () => {
      expect(() => assertHubSpotImportIntegrity(validBatch())).not.toThrow();
    });

    it('lehnt leere Counts ab', () => {
      expect(() => assertHubSpotImportIntegrity({ ...validBatch(), companies: [] })).toThrow(
        /keine Companies/,
      );
      expect(() => assertHubSpotImportIntegrity({ ...validBatch(), deals: [] })).toThrow(
        /keine Deals/,
      );
    });

    it('lehnt dangling Referenzen ab', () => {
      expect(() =>
        assertHubSpotImportIntegrity({
          ...validBatch(),
          contacts: [{ id: 'p1', companyId: 'fremd', email: 'a@acme.test' }],
        }),
      ).toThrow(/ohne gültige Company/);
      expect(() =>
        assertHubSpotImportIntegrity({
          ...validBatch(),
          deals: [
            {
              id: 'd1',
              dealName: 'Deal',
              stage: 'WON',
              amount: 1000,
              closeDate: '2026-03-01',
              pipeline: 'default',
              companyId: 'fremd',
            },
          ],
        }),
      ).toThrow(/ohne gültige Company/);
    });

    it('lehnt fehlende Pflichtfelder und Zeitraumverletzung ab', () => {
      expect(() =>
        assertHubSpotImportIntegrity({
          ...validBatch(),
          deals: [
            {
              id: 'd1',
              dealName: '',
              stage: 'WON',
              amount: Number.NaN,
              closeDate: '2026-03-01',
              pipeline: 'default',
            },
          ],
        }),
      ).toThrow(/Pflichtfelder/);
      expect(() =>
        assertHubSpotImportIntegrity({
          ...validBatch(),
          activities: [{ id: 'a1', timestamp: '2024-01-01T00:00:00.000Z' }],
        }),
      ).toThrow(/Zeitraums/);
    });
  });
});
