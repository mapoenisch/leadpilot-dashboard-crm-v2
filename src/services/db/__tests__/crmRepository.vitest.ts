import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CRMRepository } from '../crmRepository';
import { dataSourceRegistry } from '../../data';
import * as supabaseClientModule from '../supabaseClient';
import * as crmSeederModule from '../../import/crmSeeder';

vi.mock('../../import/crmSeeder', () => ({
  seedSupabaseDatabase: vi.fn(),
}));

describe('CRMRepository', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCompanies', () => {
    it('lädt Firmen über Supabase wenn konfiguriert und erfolgreich', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'comp_1',
              name: 'Alpha GmbH',
              industry: 'SaaS',
              city: 'Berlin',
              postal_code: '10115',
              employee_count: 50,
              domain: 'alpha.de',
            },
          ],
          error: null,
        }),
      });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
      vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(mockSupabase as any);

      const companies = await CRMRepository.getCompanies();
      expect(companies).toHaveLength(1);
      expect(companies[0]?.id).toBe('comp_1');
      expect(companies[0]?.name).toBe('Alpha GmbH');
      expect(companies[0]?.postalCode).toBe('10115');
      expect(companies[0]?.employeeCount).toBe(50);
    });

    it('fällt auf aktive DataSource zurück wenn Supabase fehlschlägt oder Fehler wirft', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockRejectedValue(new Error('DB Connection Failed')),
      });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
      vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(mockSupabase as any);

      const companies = await CRMRepository.getCompanies();
      expect(companies.length).toBeGreaterThan(0);
    });

    it('fällt auf aktive DataSource zurück wenn Supabase nicht konfiguriert ist', async () => {
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(false);
      vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(null as any);

      const activeSnapshot = await dataSourceRegistry.getActive().fetchSnapshot();
      const companies = await CRMRepository.getCompanies();
      expect(companies).toEqual(activeSnapshot.companies);
    });
  });

  describe('getCompanyById', () => {
    it('liefert Company per ID oder null', async () => {
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(false);

      const all = await CRMRepository.getCompanies();
      const first = all[0];
      if (first) {
        const found = await CRMRepository.getCompanyById(first.id);
        expect(found).toEqual(first);
      }

      const notFound = await CRMRepository.getCompanyById('non_existent_id');
      expect(notFound).toBeNull();
    });
  });

  describe('getContacts', () => {
    it('lädt Kontakte über Supabase wenn konfiguriert und erfolgreich', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'ct_1',
              company_id: 'comp_1',
              email: 'max@alpha.de',
              first_name: 'Max',
              last_name: 'Mustermann',
              job_title: 'CEO',
            },
          ],
          error: null,
        }),
      });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
      vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(mockSupabase as any);

      const contacts = await CRMRepository.getContacts();
      expect(contacts).toHaveLength(1);
      expect(contacts[0]?.firstName).toBe('Max');
      expect(contacts[0]?.lastName).toBe('Mustermann');
      expect(contacts[0]?.companyId).toBe('comp_1');
    });

    it('fällt auf aktive DataSource zurück bei Fehler oder ohne Konfiguration', async () => {
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(false);

      const activeSnapshot = await dataSourceRegistry.getActive().fetchSnapshot();
      const contacts = await CRMRepository.getContacts();
      expect(contacts).toEqual(activeSnapshot.contacts);
    });
  });

  describe('getContactsByCompanyId', () => {
    it('filtert Kontakte nach companyId', async () => {
      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(false);

      const all = await CRMRepository.getContacts();
      const firstWithCompany = all.find((c) => !!c.companyId);
      if (firstWithCompany) {
        const filtered = await CRMRepository.getContactsByCompanyId(firstWithCompany.companyId!);
        expect(filtered.length).toBeGreaterThan(0);
        expect(filtered.every((c) => c.companyId === firstWithCompany.companyId)).toBe(true);
      }
    });
  });

  describe('getImportedFunnelDeals', () => {
    it('lädt Deals über Supabase wenn konfiguriert und erfolgreich', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'deal_1',
              deal_name: 'Enterprise Lizenz',
              stage: 'Closed Won',
              amount: '120000',
              close_date: '2026-06-01',
              pipeline: 'Enterprise',
            },
          ],
          error: null,
        }),
      });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
      vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(mockSupabase as any);

      const deals = await CRMRepository.getImportedFunnelDeals();
      expect(deals).toHaveLength(1);
      expect(deals[0]?.dealName).toBe('Enterprise Lizenz');
      expect(deals[0]?.amount).toBe(120000);
      expect(deals[0]?.stage).toBe('Closed Won');
    });

    it('fällt auf DataSource zurück wenn Supabase fehlschlägt', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockRejectedValue(new Error('Deals DB fail')),
      });

      const mockSupabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      };

      vi.spyOn(supabaseClientModule, 'isSupabaseConfigured', 'get').mockReturnValue(true);
      vi.spyOn(supabaseClientModule, 'supabase', 'get').mockReturnValue(mockSupabase as any);

      const deals = await CRMRepository.getImportedFunnelDeals();
      expect(deals.length).toBeGreaterThan(0);
    });
  });

  describe('getAuditSummary', () => {
    it('liefert Audit-Summary der aktiven Datenquelle', async () => {
      const audit = await CRMRepository.getAuditSummary();
      expect(audit).toBeDefined();
      expect(typeof audit.companiesLoaded).toBe('number');
      expect(typeof audit.dealsLoaded).toBe('number');
    });
  });

  describe('seedDatabase', () => {
    it('ruft seedSupabaseDatabase auf', async () => {
      const mockResult: crmSeederModule.SeedResult = {
        success: true,
        companiesInserted: 20,
        contactsInserted: 100,
        dealsInserted: 40,
        message: 'Database seeded successfully',
      };
      vi.mocked(crmSeederModule.seedSupabaseDatabase).mockResolvedValueOnce(mockResult);

      const res = await CRMRepository.seedDatabase();
      expect(res).toEqual(mockResult);
      expect(crmSeederModule.seedSupabaseDatabase).toHaveBeenCalled();
    });
  });

  describe('operative Schreibpfad-Stubs (Guards B22)', () => {
    it('werfen alle eine konsistente Fehlermeldung', () => {
      const expectedMsg =
        'Operativer CRM-Schreibpfad ist nicht Teil dieser App (B22 / BUILD_PLAN D1).';

      expect(() => CRMRepository.getLeads()).toThrow(expectedMsg);
      expect(() => CRMRepository.getDeals()).toThrow(expectedMsg);
      expect(() => CRMRepository.getActivities()).toThrow(expectedMsg);
      expect(() => CRMRepository.addLead({} as any)).toThrow(expectedMsg);
      expect(() => CRMRepository.updateLeadStatus('1', 'New' as any)).toThrow(expectedMsg);
    });
  });
});
