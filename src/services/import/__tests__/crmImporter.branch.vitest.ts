// Branch-Tests: crmImporter – Restzweige jenseits von crmImporter.vitest.ts.
// Dort abgedeckt: parseCsv-Basis, Standard-Import (20/100/40), Firmen-/Kontakt-/
// Deal-Fehlerpfade, leere CSVs, Integrity-Happy-Path + leere Counts + dangling
// Referenzen + ein Pflichtfeld-/Zeitraumfall. Hier nur die offenen Kanten:
// parseCsv-CRLF/Whitespace/Ein-Zeilen-Header, Case-Insensitivität beim Mapping,
// Email ohne '@', Deals mit ungültigem Amount (valide, amount 0) sowie alle
// übrigen assertHubSpotImportIntegrity-Verzweigungen (Typprüfungen,
// companyId ''/undefined/non-string, periodStart-NaN, Activity-Grenzen,
// Mehrfach-Verstöße). Reine Mapping-/Validierungslogik, IO nur via
// RAW_CSV-Getter-Spion an der Modulgrenze.
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

describe('crmImporter.branch: parseCsv-Restkanten', () => {
  it('CRLF-Zeilenenden und umgebende Leerzeichen werden getrimmt, Leerzeilen übersprungen', () => {
    const parsed = parseCsv('  a , b \r\n\r\n  x , y  \r\n   \n');
    expect(parsed).toEqual([
      ['a', 'b'],
      ['x', 'y'],
    ]);
  });

  it('einzelne Headerzeile ohne Daten liefert nur den Header', () => {
    expect(parseCsv('col1,col2')).toEqual([['col1', 'col2']]);
  });

  it('Trennzeichen folgt der Erstzeile (Semikolon), auch bei Kommas in Folgezeilen', () => {
    const parsed = parseCsv('a;b\nx;y');
    expect(parsed).toEqual([
      ['a', 'b'],
      ['x', 'y'],
    ]);
  });
});

describe('crmImporter.branch: importCrmData-Mapping-Restkanten', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Domain-/Email-Matching ist case-insensitiv', () => {
    mockCsv(
      'Domain,Name,Industry,City,Postal,Employees\nACME.DE,Acme GmbH,SaaS,Berlin,10115,10',
      'Email,FirstName,LastName,JobTitle\nJANE@ACME.de,Jane,Doe,CEO',
      EMPTY_DEALS,
    );
    const res = importCrmData();
    expect(res.audit.companiesValid).toBe(1);
    expect(res.audit.contactsValid).toBe(1);
    expect(res.contacts[0]?.companyId).toBe(res.companies[0]?.id);
    expect(res.contacts[0]?.email).toBe('jane@acme.de');
    expect(res.companies[0]?.domain).toBe('acme.de');
  });

  it('Email ohne @ hat keine Domain und zählt als Kontakt-Fehler', () => {
    mockCsv(
      'Domain,Name,Industry,City,Postal,Employees\nalpha.de,Alpha GmbH,SaaS,Berlin,10115,50',
      'Email,FirstName,LastName,JobTitle\nnot-an-email,Max,Muster,CEO',
      EMPTY_DEALS,
    );
    const res = importCrmData();
    expect(res.audit.contactsValid).toBe(0);
    expect(res.audit.contactsErrors).toBe(1);
  });

  it('Deal mit ungültigem Amount bleibt valide mit amount 0', () => {
    mockCsv(
      EMPTY_COMPANIES,
      EMPTY_CONTACTS,
      'DealName,Stage,Amount,CloseDate,Pipeline\nDealX,Won,kein-betrag,2026-06-01,Enterprise',
    );
    const res = importCrmData();
    expect(res.audit.dealsValid).toBe(1);
    expect(res.audit.dealsErrors).toBe(0);
    expect(res.importedFunnelDeals[0]?.amount).toBe(0);
  });

  it('Deal mit leerem Amount-String bleibt valide mit amount 0', () => {
    mockCsv(
      EMPTY_COMPANIES,
      EMPTY_CONTACTS,
      'DealName,Stage,Amount,CloseDate,Pipeline\nDealY,Won,,2026-06-01,Enterprise',
    );
    const res = importCrmData();
    expect(res.audit.dealsValid).toBe(1);
    expect(res.importedFunnelDeals[0]?.amount).toBe(0);
  });
});

describe('crmImporter.branch: assertHubSpotImportIntegrity-Restkanten', () => {
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

  it('Company mit nicht-string id oder leerem Namen wird abgelehnt', () => {
    expect(() =>
      assertHubSpotImportIntegrity({ ...validBatch(), companies: [{ id: 42, name: 'Acme' }] }),
    ).toThrow(/Company ohne id\/name/);
    expect(() =>
      assertHubSpotImportIntegrity({ ...validBatch(), companies: [{ id: 'c1', name: '' }] }),
    ).toThrow(/Company ohne id\/name/);
    expect(() =>
      assertHubSpotImportIntegrity({ ...validBatch(), companies: [{ id: '', name: 'Acme' }] }),
    ).toThrow(/Company ohne id\/name/);
  });

  it('Contact mit nicht-string id oder fehlender Email wird abgelehnt', () => {
    expect(() =>
      assertHubSpotImportIntegrity({
        ...validBatch(),
        contacts: [{ id: 7, companyId: 'c1', email: 'a@acme.test' }],
      }),
    ).toThrow(/Contact ohne id\/email/);
    expect(() =>
      assertHubSpotImportIntegrity({
        ...validBatch(),
        contacts: [{ id: 'p1', companyId: 'c1', email: '' }],
      }),
    ).toThrow(/Contact ohne id\/email/);
    expect(() =>
      assertHubSpotImportIntegrity({
        ...validBatch(),
        contacts: [{ id: 'p1', companyId: 'c1', email: 5 }],
      }),
    ).toThrow(/Contact ohne id\/email/);
  });

  it('Contact ohne companyId oder mit nicht-string companyId wird abgelehnt', () => {
    expect(() =>
      assertHubSpotImportIntegrity({
        ...validBatch(),
        contacts: [{ id: 'p1', companyId: undefined, email: 'a@acme.test' }],
      }),
    ).toThrow(/Contact p1 ohne gültige Company/);
    expect(() =>
      assertHubSpotImportIntegrity({
        ...validBatch(),
        contacts: [{ id: 'p1', companyId: 123, email: 'a@acme.test' }],
      }),
    ).toThrow(/Contact p1 ohne gültige Company/);
  });

  it('Deal-Pflichtfeldvarianten: stage/closeDate/pipeline leer, amount als String oder Infinity', () => {
    const base = validBatch().deals[0]!;
    for (const deal of [
      { ...base, stage: '' },
      { ...base, closeDate: '' },
      { ...base, pipeline: '' },
      { ...base, id: 9 },
      { ...base, amount: '1000' },
      { ...base, amount: Number.POSITIVE_INFINITY },
      { ...base, dealName: 42 },
    ]) {
      expect(() => assertHubSpotImportIntegrity({ ...validBatch(), deals: [deal] })).toThrow(
        /Pflichtfelder/,
      );
    }
  });

  it('Deal ohne companyId oder mit leerer companyId ist zulässig', () => {
    const base = validBatch().deals[0]!;
    const { companyId: _omit, ...withoutCompany } = base;
    expect(() =>
      assertHubSpotImportIntegrity({ ...validBatch(), deals: [withoutCompany] }),
    ).not.toThrow();
    expect(() =>
      assertHubSpotImportIntegrity({ ...validBatch(), deals: [{ ...base, companyId: '' }] }),
    ).not.toThrow();
  });

  it('Deal mit nicht-string companyId wird abgelehnt', () => {
    expect(() =>
      assertHubSpotImportIntegrity({
        ...validBatch(),
        deals: [{ ...validBatch().deals[0]!, companyId: 42 }],
      }),
    ).toThrow(/Deal d1 ohne gültige Company/);
  });

  it('ungültiger periodStart ohne Activities ist zulässig, mit Activity ein Verstoß', () => {
    const { activities: _omit, ...noActivities } = validBatch();
    expect(() =>
      assertHubSpotImportIntegrity({ ...noActivities, periodStart: 'kein-datum' }),
    ).not.toThrow();
    expect(() =>
      assertHubSpotImportIntegrity({ ...validBatch(), periodStart: 'kein-datum' }),
    ).toThrow(/Zeitraums/);
  });

  it('Activity mit nicht-string Timestamp wird abgelehnt', () => {
    expect(() =>
      assertHubSpotImportIntegrity({
        ...validBatch(),
        activities: [{ id: 'a1', timestamp: 1234567890 }],
      }),
    ).toThrow(/Zeitraums/);
  });

  it('Activity exakt am Periodenstart ist zulässig, nach Periodenende nicht', () => {
    expect(() =>
      assertHubSpotImportIntegrity({
        ...validBatch(),
        activities: [{ id: 'a1', timestamp: '2026-01-01T00:00:00.000Z' }],
      }),
    ).not.toThrow();
    expect(() =>
      assertHubSpotImportIntegrity({
        ...validBatch(),
        activities: [{ id: 'a1', timestamp: '2027-06-01T00:00:00.000Z' }],
      }),
    ).toThrow(/Zeitraums/);
  });

  it('fehlende Activities (undefined/leer) sind zulässig', () => {
    const { activities: _omit, ...noActivities } = validBatch();
    expect(() => assertHubSpotImportIntegrity(noActivities)).not.toThrow();
    expect(() => assertHubSpotImportIntegrity({ ...validBatch(), activities: [] })).not.toThrow();
  });

  it('mehrere Verstöße werden mit Semikolon verbunden', () => {
    try {
      assertHubSpotImportIntegrity({
        ...validBatch(),
        companies: [],
        deals: [],
      });
      throw new Error('kein Wurf');
    } catch (e) {
      expect((e as Error).message).toMatch(/keine Companies; keine Deals/);
    }
  });
});
