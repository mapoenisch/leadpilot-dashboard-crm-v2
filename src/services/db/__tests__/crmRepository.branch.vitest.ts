// Branch-Tests: CRMRepository – Restzweige jenseits von crmRepository.vitest.ts.
// Dort abgedeckt: Supabase-Erfolg (snake_case) + Throw-Fallback für Companies/
// Deals, Unconfigured-Fallback, getCompanyById, Kontakte-Basis, Audit-Summary,
// Schreibpfad-Guards. Hier nur die offenen Kanten: Fehlerobjekt- und
// Leer-Daten-Fallbacks, konfiguriert-aber-null-Client, camelCase-Mappings,
// Amount-/CloseDate-/DealName-Fallbacks, leere Company-Filter, seedDatabase-
// Fehlermeldung. Kein echtes Supabase/Netz: IO nur via Getter-Spion auf
// supabaseClient, Fallback läuft über die reale In-Memory-DataSource.
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

  it('getCompanies: Fehlerobjekt im Ergebnis fällt auf Snapshot zurück', async () => {
    mockSupabase(() => Promise.resolve({ data: [{ id: 'x' }], error: { message: 'denied' } }));
    const companies = await CRMRepository.getCompanies();
    expect(companies.length).toBeGreaterThan(0);
    expect(companies[0]?.id).not.toBe('x');
  });

  it('getCompanies: leeres Daten-Array fällt auf Snapshot zurück', async () => {
    mockSupabase(() => Promise.resolve({ data: [], error: null }));
    const companies = await CRMRepository.getCompanies();
    expect(companies.length).toBeGreaterThan(0);
  });

  it('getCompanies: konfiguriert aber Client null fällt auf Snapshot zurück', async () => {
    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
    vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(
      null as unknown as typeof supabaseClientModule.supabase,
    );
    const companies = await CRMRepository.getCompanies();
    expect(companies.length).toBeGreaterThan(0);
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

  it('getContacts: Fehlerobjekt und Throw fallen auf Snapshot zurück', async () => {
    mockSupabase(() => Promise.resolve({ data: [{ id: 'x' }], error: { message: 'denied' } }));
    const viaError = await CRMRepository.getContacts();
    expect(viaError.length).toBeGreaterThan(0);

    vi.restoreAllMocks();
    mockSupabase(() => Promise.reject(new Error('contacts down')));
    const viaThrow = await CRMRepository.getContacts();
    expect(viaThrow.length).toBeGreaterThan(0);
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

  it('getImportedFunnelDeals: Fehlerobjekt fällt auf Snapshot zurück', async () => {
    mockSupabase(() => Promise.resolve({ data: [{ id: 'x' }], error: { message: 'denied' } }));
    const deals = await CRMRepository.getImportedFunnelDeals();
    expect(deals.length).toBeGreaterThan(0);
    expect(deals[0]?.id).not.toBe('x');
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
