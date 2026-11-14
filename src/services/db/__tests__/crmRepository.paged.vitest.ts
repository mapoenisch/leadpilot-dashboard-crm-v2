import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CRMRepository } from '../crmRepository';
import * as supabaseClientModule from '../supabaseClient';

describe('CRMRepository - Paginierung und Vollbestandsabruf (Auftrag 156)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Erzeugt einen Mock-Supabase-Client, der die reale Begrenzung simuliert:
   * Ohne .range() oder bei unbegrenzter Anfrage liefert Supabase maximal 1.000 Zeilen (config.toml max_rows).
   * Bei .range(from, to) liefert er maximal Math.min(to - from + 1, 1000) Zeilen.
   */
  function createPostgrestMock(totalRows: number, companyIdForLateContacts = 'comp_target') {
    const companies = Array.from({ length: totalRows }, (_, i) => ({
      id: `comp_${i + 1}`,
      name: `Company ${String(i + 1).padStart(5, '0')}`,
      industry: 'Software',
      city: 'Berlin',
      postal_code: '10115',
      employee_count: 10 + (i % 50),
      domain: `comp${i + 1}.de`,
    }));

    const contacts = Array.from({ length: totalRows }, (_, i) => ({
      id: `ct_${i + 1}`,
      // Die ersten 1.000 Kontakte gehören zu comp_other, ab 1.200 zu comp_target
      company_id: i >= 1200 ? companyIdForLateContacts : 'comp_other',
      email: `contact_${i + 1}@example.com`,
      first_name: `First${i + 1}`,
      last_name: `Last${String(i + 1).padStart(5, '0')}`,
      job_title: 'Manager',
    }));

    const deals = Array.from({ length: totalRows }, (_, i) => ({
      id: `deal_${i + 1}`,
      deal_name: `Deal ${i + 1}`,
      stage: i % 2 === 0 ? 'Closed Won' : 'Qualified',
      amount: 1000 + i,
      close_date: '2026-06-01',
      pipeline: 'Standard',
    }));

    const tableMap: Record<string, Record<string, unknown>[]> = {
      companies,
      contacts,
      imported_funnel_deals: deals,
    };

    const fromMock = vi.fn((table: string) => {
      let filtered = [...(tableMap[table] ?? [])];
      let rangeBounds: { from: number; to: number } | null = null;

      const builder: {
        select: (cols: string) => typeof builder;
        order: (col: string, opts?: { ascending?: boolean }) => typeof builder;
        eq: (col: string, val: unknown) => typeof builder;
        range: (from: number, to: number) => typeof builder;
        then: (resolve: (val: { data: unknown[]; error: null }) => void) => Promise<void>;
      } = {
        select: vi.fn(() => builder),
        order: vi.fn(() => builder),
        eq: vi.fn((col: string, val: unknown) => {
          filtered = filtered.filter(
            (row: Record<string, unknown>) =>
              row[col] === val || row[col.replace(/_([a-z])/g, (_, l) => l.toUpperCase())] === val,
          );
          return builder;
        }),
        range: vi.fn((from: number, to: number) => {
          rangeBounds = { from, to };
          return builder;
        }),
        then: async (resolve) => {
          if (rangeBounds) {
            const chunk = filtered.slice(rangeBounds.from, rangeBounds.to + 1);
            // Auch range darf niemals mehr als 1.000 Zeilen liefern
            resolve({ data: chunk.slice(0, 1000), error: null });
          } else {
            // PostgREST max_rows = 1000 Limitierung ohne .range()
            resolve({ data: filtered.slice(0, 1000), error: null });
          }
        },
      };

      return builder;
    });

    return {
      from: fromMock,
    };
  }

  it('ROT-NACHWEIS: getCompanies lädt bei 1.500 Einträgen den vollständigen Bestand', async () => {
    const mock = createPostgrestMock(1500);
    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
    vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(
      mock as unknown as typeof supabaseClientModule.supabase,
    );

    const companies = await CRMRepository.getCompanies();
    expect(companies).toHaveLength(1500);
    expect(companies[0]?.id).toBe('comp_1');
    expect(companies[1499]?.id).toBe('comp_1500');
  });

  it('ROT-NACHWEIS: getContacts lädt bei 1.500 Einträgen den vollständigen Bestand', async () => {
    const mock = createPostgrestMock(1500);
    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
    vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(
      mock as unknown as typeof supabaseClientModule.supabase,
    );

    const contacts = await CRMRepository.getContacts();
    expect(contacts).toHaveLength(1500);
    expect(contacts[0]?.id).toBe('ct_1');
    expect(contacts[1499]?.id).toBe('ct_1500');
  });

  it('ROT-NACHWEIS: getImportedFunnelDeals lädt bei 1.500 Einträgen den vollständigen Bestand', async () => {
    const mock = createPostgrestMock(1500);
    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
    vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(
      mock as unknown as typeof supabaseClientModule.supabase,
    );

    const deals = await CRMRepository.getImportedFunnelDeals();
    expect(deals).toHaveLength(1500);
    expect(deals[0]?.id).toBe('deal_1');
    expect(deals[1499]?.id).toBe('deal_1500');
  });

  it('ROT-NACHWEIS: getContactsByCompanyId findet Kontakte die jenseits von Zeile 1.000 liegen', async () => {
    const mock = createPostgrestMock(1500, 'comp_target');
    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
    vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(
      mock as unknown as typeof supabaseClientModule.supabase,
    );

    const contacts = await CRMRepository.getContactsByCompanyId('comp_target');
    // Ab Zeile 1.200 gehören 300 Kontakte zu comp_target
    expect(contacts).toHaveLength(300);
  });
});
