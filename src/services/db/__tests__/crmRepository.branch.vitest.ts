// Branch-Tests: CRMRepository – Restzweige jenseits von crmRepository.vitest.ts.
// Dort abgedeckt: Supabase-Erfolg (snake_case), Throw → DATA_SOURCE_UNAVAILABLE
// für Companies/Deals, unkonfigurierte Lesung der aktiven Quelle,
// getCompanyById, Kontakte-Basis, Audit-Summary, Schreibpfad-Guards. Hier die
// offenen Kanten: Fehlerobjekt, leere Tabelle, konfiguriert-aber-null-Client
// (067R / PR-SOURCE-04: jeweils kein stiller Demo-Ersatz), camelCase-Mappings,
// Amount-/CloseDate-/DealName-Fallbacks, leere Company-Filter, seedDatabase-
// Fehlermeldung. Kein echtes Supabase/Netz: IO nur via Getter-Spion auf
// supabaseClient; unkonfiguriert liest die reale In-Memory-DataSource.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CRMRepository } from '../crmRepository';
import * as supabaseClientModule from '../supabaseClient';

function mockSupabase(orderImpl: () => unknown): void {
  const mockSelect = vi.fn().mockReturnValue({ order: vi.fn().mockImplementation(orderImpl) });
  const mockSupabase = { from: vi.fn().mockReturnValue({ select: mockSelect }) };
  vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
  vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(
    mockSupabase as unknown as typeof supabaseClientModule.supabase,
  );
}

function mockUnconfigured(): void {
  vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(false);
  vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(
    null as unknown as typeof supabaseClientModule.supabase,
  );
}

describe('crmRepository.branch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getCompanies: Fehlerobjekt im Ergebnis wird zum Quellenfehler', async () => {
    mockSupabase(() => Promise.resolve({ data: [{ id: 'x' }], error: { message: 'denied' } }));
    await expect(CRMRepository.getCompanies()).rejects.toThrow(
      /DATA_SOURCE_UNAVAILABLE: Companies .*\(denied\)/,
    );
  });

  it('getCompanies: leere Tabelle bleibt leer (kein Demo-Ersatz)', async () => {
    mockSupabase(() => Promise.resolve({ data: [], error: null }));
    await expect(CRMRepository.getCompanies()).resolves.toEqual([]);
  });

  it('getCompanies: data null ohne Fehler bleibt leer', async () => {
    mockSupabase(() => Promise.resolve({ data: null, error: null }));
    await expect(CRMRepository.getCompanies()).resolves.toEqual([]);
  });

  it('getCompanies: konfiguriert aber Client null ist ein Quellenfehler', async () => {
    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
    vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(
      null as unknown as typeof supabaseClientModule.supabase,
    );
    await expect(CRMRepository.getCompanies()).rejects.toMatchObject({
      name: 'DataSourceError',
      code: 'FETCH_FAILED',
    });
  });

  it('getCompanies: camelCase-Zeilen werden gemappt', async () => {
    mockSupabase(() =>
      Promise.resolve({
        data: [
          {
            id: 'camel-1',
            domain: 'camel.de',
            name: 'Camel GmbH',
            industry: 'SaaS',
            city: 'Berlin',
            postalCode: '10115',
            employeeCount: 42,
          },
        ],
        error: null,
      }),
    );
    const companies = await CRMRepository.getCompanies();
    expect(companies).toHaveLength(1);
    expect(companies[0]).toMatchObject({
      id: 'camel-1',
      domain: 'camel.de',
      postalCode: '10115',
      employeeCount: 42,
    });
  });

  it('getCompanies: fehlende optionale Felder fallen auf undefined/0 zurück', async () => {
    mockSupabase(() =>
      Promise.resolve({
        data: [{ id: 'sparse-1', name: 'Sparse', industry: 'IT', city: 'HH' }],
        error: null,
      }),
    );
    const companies = await CRMRepository.getCompanies();
    expect(companies[0]).toMatchObject({ id: 'sparse-1', employeeCount: 0 });
    expect(companies[0]?.postalCode).toBeUndefined();
  });

  it('getContacts: Fehlerobjekt und Throw werden zum Quellenfehler', async () => {
    mockSupabase(() => Promise.resolve({ data: [{ id: 'x' }], error: { message: 'denied' } }));
    await expect(CRMRepository.getContacts()).rejects.toThrow(/DATA_SOURCE_UNAVAILABLE/);

    vi.restoreAllMocks();
    mockSupabase(() => Promise.reject(new Error('contacts down')));
    await expect(CRMRepository.getContacts()).rejects.toThrow(
      /DATA_SOURCE_UNAVAILABLE: Contacts .*\(contacts down\)/,
    );
  });

  it('getContacts: camelCase-Zeilen werden gemappt, Lücken zu Leerstrings', async () => {
    mockSupabase(() =>
      Promise.resolve({
        data: [
          {
            id: 'ct-camel',
            companyId: 'comp-1',
            email: 'a@camel.de',
            firstName: 'Ada',
            lastName: 'Lovelace',
            jobTitle: 'CEO',
          },
          { id: 'ct-sparse', email: 'b@camel.de' },
        ],
        error: null,
      }),
    );
    const contacts = await CRMRepository.getContacts();
    expect(contacts).toHaveLength(2);
    expect(contacts[0]).toMatchObject({
      id: 'ct-camel',
      companyId: 'comp-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      jobTitle: 'CEO',
    });
    expect(contacts[1]).toMatchObject({ id: 'ct-sparse', companyId: '', firstName: '' });
  });

  it('getContactsByCompanyId: unbekannte ID liefert leeres Array', async () => {
    mockUnconfigured();
    await expect(CRMRepository.getContactsByCompanyId('gibts-nicht-xyz')).resolves.toEqual([]);
  });

  it('getImportedFunnelDeals: unkonfiguriert liefert Snapshot-Deals', async () => {
    mockUnconfigured();
    const deals = await CRMRepository.getImportedFunnelDeals();
    expect(deals.length).toBeGreaterThan(0);
    expect(deals[0]).toHaveProperty('dealName');
  });

  it('getImportedFunnelDeals: Fehlerobjekt wird zum Quellenfehler', async () => {
    mockSupabase(() => Promise.resolve({ data: [{ id: 'x' }], error: { message: 'denied' } }));
    await expect(CRMRepository.getImportedFunnelDeals()).rejects.toThrow(/DATA_SOURCE_UNAVAILABLE/);
  });

  it('getImportedFunnelDeals: camelCase-Mapping mit Amount-/CloseDate-Fallbacks', async () => {
    mockSupabase(() =>
      Promise.resolve({
        data: [
          {
            id: 'deal-camel',
            dealName: 'Camel Deal',
            stage: 'Won',
            amount: 5000,
            closeDate: '2026-05-01',
            pipeline: 'Enterprise',
          },
          {
            id: 'deal-broken',
            stage: 'Open',
            amount: 'kein-betrag',
            pipeline: 'SMB',
          },
        ],
        error: null,
      }),
    );
    const deals = await CRMRepository.getImportedFunnelDeals();
    expect(deals).toHaveLength(2);
    expect(deals[0]).toMatchObject({
      id: 'deal-camel',
      dealName: 'Camel Deal',
      amount: 5000,
      closeDate: '2026-05-01',
    });
    expect(deals[1]).toMatchObject({ id: 'deal-broken', dealName: '', amount: 0, closeDate: '' });
  });

  it('seedDatabase wirft den ehrlichen G46-Fehler statt zu seeden', async () => {
    await expect(CRMRepository.seedDatabase()).rejects.toThrow(/G46 entfernt/);
  });
});
