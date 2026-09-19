// Branch2-Tests: crmImporter Restkanten jenseits von crmImporter.vitest.ts
// (parseCsv-Basis, Standard-Import, Firmen-/Kontakt-/Deal-Fehlerpfade, leere
// CSVs, Integrity-Happy-Path + Counts + Referenzen + Pflichtfeld/Zeitraum) und
// crmImporter.branch.vitest.ts (CRLF/Whitespace, Header-only, Delim-Wechsel,
// Case-Insensitivität, Email ohne @, Amount-Fallbacks, Integrity-Typprüfungen,
// companyId-Optionen, periodStart-NaN, Activity-Grenzen, Mehrfach-Verstöße).
// Hier nur dort fehlende Szenarien: Case-Duplikat-Domains, Semikolon-Fluss im
// Import, Header-only-Firmen mit Kontakt-Daten, Deal-Amount '0', fehlende
// Activities im Result sowie Integrity-Restfälle (companyId null,
// Company-Name nicht-string, Contact-id leer, Activity exakt am Periodenende,
// zweiter Activity-Verstoß nach gültiger erster). IO nur via RAW_CSV-Getter.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { importCrmData, parseCsv, assertHubSpotImportIntegrity } from '../crmImporter';
import * as rawCsvDataModule from '@/services/import/rawCsvData';

function mockCsv(companies: string, contacts: string, deals: string): void {
  vi.spyOn(rawCsvDataModule, 'RAW_COMPANIES_CSV', 'get').mockReturnValue(
    companies as unknown as typeof rawCsvDataModule.RAW_COMPANIES_CSV,
  );
  vi.spyOn(rawCsvDataModule, 'RAW_CONTACTS_CSV', 'get').mockReturnValue(
    contacts as unknown as typeof rawCsvDataModule.RAW_CONTACTS_CSV,
  );
  vi.spyOn(rawCsvDataModule, 'RAW_DEALS_CSV', 'get').mockReturnValue(
    deals as unknown as typeof rawCsvDataModule.RAW_DEALS_CSV,
  );
}

const EMPTY_COMPANIES = 'Domain,Name,Industry,City,Postal,Employees';
const EMPTY_CONTACTS = 'Email,FirstName,LastName,JobTitle';
const EMPTY_DEALS = 'DealName,Stage,Amount,CloseDate,Pipeline';

describe('crmImporter.branch2: importCrmData-Restkanten', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Domain-Duplikat in anderer Schreibweise zählt als Firmen-Fehler', () => {
    mockCsv(
      'Domain,Name,Industry,City,Postal,Employees\nACME.de,Acme GmbH,SaaS,Berlin,10115,10\nacme.DE,Acme Kopie,SaaS,Berlin,10115,10',
      EMPTY_CONTACTS,
      EMPTY_DEALS,
    );
    const res = importCrmData();
    expect(res.audit.companiesLoaded).toBe(2);
    expect(res.audit.companiesValid).toBe(1);
    expect(res.audit.companiesErrors).toBe(1);
    expect(res.companies).toHaveLength(1);
  });

  it('Semikolon-CSVs fließen valide durch den Import', () => {
    mockCsv(
      'Domain;Name;Industry;City;Postal;Employees\nsemi.de;Semi GmbH;SaaS;Berlin;10115;7',
      'Email;FirstName;LastName;JobTitle\nsam@semi.de;Sam;Sample;CEO',
      'DealName;Stage;Amount;CloseDate;Pipeline\nSemi-Deal;Won;5000;2026-05-01;Enterprise',
    );
    const res = importCrmData();
    expect(res.audit.companiesValid).toBe(1);
    expect(res.audit.contactsValid).toBe(1);
    expect(res.audit.contactsMatched).toBe(1);
    expect(res.audit.dealsValid).toBe(1);
    expect(res.contacts[0]?.companyId).toBe(res.companies[0]?.id);
  });

  it('Kontakte ohne Firmen-Stamm werden alle als Fehler gezählt', () => {
    mockCsv(
      EMPTY_COMPANIES,
      'Email,FirstName,LastName,JobTitle\nsolo@nirgendwo.test,Solo,Artist,CEO',
      EMPTY_DEALS,
    );
    const res = importCrmData();
    expect(res.audit.contactsLoaded).toBe(1);
    expect(res.audit.contactsValid).toBe(0);
    expect(res.audit.contactsMatched).toBe(0);
    expect(res.audit.contactsErrors).toBe(1);
    expect(res.contacts).toHaveLength(0);
  });

  it("Deal-Amount '0' bleibt valide mit amount 0", () => {
    mockCsv(
      EMPTY_COMPANIES,
      EMPTY_CONTACTS,
      'DealName,Stage,Amount,CloseDate,Pipeline\nNull-Deal,Won,0,2026-06-01,Enterprise',
    );
    const res = importCrmData();
    expect(res.audit.dealsValid).toBe(1);
    expect(res.audit.dealsErrors).toBe(0);
    expect(res.importedFunnelDeals[0]?.amount).toBe(0);
  });

  it('Result trägt companyMap je Firma und kein activities-Feld', () => {
    mockCsv(
      'Domain,Name,Industry,City,Postal,Employees\na.de,A GmbH,SaaS,Berlin,10115,3\nb.de,B GmbH,IT,Hamburg,20095,4',
      EMPTY_CONTACTS,
      EMPTY_DEALS,
    );
    const res = importCrmData();
    expect(Object.keys(res.companyMap)).toHaveLength(2);
    expect(res.companyMap['comp-1']?.domain).toBe('a.de');
    expect(res.companyMap['comp-2']?.domain).toBe('b.de');
    expect(res.activities).toBeUndefined();
  });

  it('parseCsv mit nur Trennzeichen liefert leere Zellen', () => {
    expect(parseCsv(';')).toEqual([['', '']]);
    expect(parseCsv(',')).toEqual([['', '']]);
  });
});

describe('crmImporter.branch2: assertHubSpotImportIntegrity-Restkanten', () => {
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

  it('Company mit nicht-string Namen wird abgelehnt', () => {
    expect(() =>
      assertHubSpotImportIntegrity({ ...validBatch(), companies: [{ id: 'c1', name: 42 }] }),
    ).toThrow(/Company ohne id\/name/);
  });

  it('Contact mit leerer id wird abgelehnt', () => {
    expect(() =>
      assertHubSpotImportIntegrity({
        ...validBatch(),
        contacts: [{ id: '', companyId: 'c1', email: 'a@acme.test' }],
      }),
    ).toThrow(/Contact ohne id\/email/);
  });

  it('Deal mit companyId null wird abgelehnt', () => {
    expect(() =>
      assertHubSpotImportIntegrity({
        ...validBatch(),
        deals: [{ ...validBatch().deals[0]!, companyId: null }],
      }),
    ).toThrow(/Deal d1 ohne gültige Company/);
  });

  it('Activity exakt am Periodenende (Start + 365 Tage) ist zulässig', () => {
    expect(() =>
      assertHubSpotImportIntegrity({
        ...validBatch(),
        activities: [{ id: 'a1', timestamp: '2027-01-01T00:00:00.000Z' }],
      }),
    ).not.toThrow();
  });

  it('zweite Activity außerhalb nach gültiger erster meldet genau einen Verstoß', () => {
    try {
      assertHubSpotImportIntegrity({
        ...validBatch(),
        activities: [
          { id: 'a1', timestamp: '2026-06-01T00:00:00.000Z' },
          { id: 'a2', timestamp: '2028-01-01T00:00:00.000Z' },
        ],
      });
      throw new Error('kein Wurf');
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toMatch(/Activity außerhalb des Zeitraums/);
      expect(msg.match(/Activity außerhalb des Zeitraums/g)).toHaveLength(1);
    }
  });

  it('leerer Deal-Name bei sonst gültigem Deal wird abgelehnt', () => {
    expect(() =>
      assertHubSpotImportIntegrity({
        ...validBatch(),
        deals: [{ ...validBatch().deals[0]!, dealName: '' }],
      }),
    ).toThrow(/Pflichtfelder/);
  });
});
