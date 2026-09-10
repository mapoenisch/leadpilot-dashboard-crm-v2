import { Company, Contact, ImportedFunnelDeal, ImportAuditSummary, Lead, LeadStatus } from '@/types/crm';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { seedSupabaseDatabase, SeedResult } from '../import/crmSeeder';
import { dataSourceRegistry } from '../data';

/** Rohzeilen aus Supabase (`select('*')` ohne Schema-Typen) — snake_case oder camelCase. */
interface CompanyDbRow {
  id: string;
  domain?: string;
  name: string;
  industry: string;
  city: string;
  postal_code?: string;
  postalCode?: string;
  employee_count?: number;
  employeeCount?: number;
}

interface ContactDbRow {
  id: string;
  company_id?: string;
  companyId?: string;
  email: string;
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  job_title?: string;
  jobTitle?: string;
}

interface DealDbRow {
  id: string;
  deal_name?: string;
  dealName?: string;
  stage: string;
  amount: string | number;
  close_date?: string;
  closeDate?: string;
  pipeline: string;
}
import { logger } from '@/services/logger';

export class CRMRepository {
  /**
   * Fetch all 20 Companies from Supabase PostgreSQL (or fallback to active DataSource)
   */
  public static async getCompanies(): Promise<Company[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map((row: CompanyDbRow) => ({
            id: row.id,
            domain: row.domain,
            name: row.name,
            industry: row.industry,
            city: row.city,
            postalCode: row.postal_code || row.postalCode,
            employeeCount: row.employee_count || row.employeeCount || 0,
          }));
        }
      } catch (e) {
        logger.warn('Supabase fetch failed for companies, using fallback repository data.', e);
      }
    }
    const snapshot = await dataSourceRegistry.getActive().fetchSnapshot();
    return snapshot.companies;
  }

  /**
   * Fetch Company by ID
   */
  public static async getCompanyById(id: string): Promise<Company | null> {
    const companies = await this.getCompanies();
    return companies.find((c) => c.id === id) || null;
  }

  /**
   * Fetch all 100 Contacts from Supabase PostgreSQL (or fallback to active DataSource)
   */
  public static async getContacts(): Promise<Contact[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .order('last_name', { ascending: true });

        if (!error && data && data.length > 0) {
          return data.map((row: ContactDbRow) => ({
            id: row.id,
            companyId: row.company_id || row.companyId,
            email: row.email,
            firstName: row.first_name || row.firstName,
            lastName: row.last_name || row.lastName,
            jobTitle: row.job_title || row.jobTitle,
          }));
        }
      } catch (e) {
        logger.warn('Supabase fetch failed for contacts, using fallback repository data.', e);
      }
    }
    const snapshot = await dataSourceRegistry.getActive().fetchSnapshot();
    return snapshot.contacts;
  }

  /**
   * Fetch Contacts belonging to a specific Company ID
   */
  public static async getContactsByCompanyId(companyId: string): Promise<Contact[]> {
    const contacts = await this.getContacts();
    return contacts.filter((ct) => ct.companyId === companyId);
  }

  /**
   * Fetch all 40 Imported Funnel Deals from Supabase PostgreSQL (or fallback to active DataSource)
   */
  public static async getImportedFunnelDeals(): Promise<ImportedFunnelDeal[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('imported_funnel_deals')
          .select('*')
          .order('close_date', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((row: DealDbRow) => ({
            id: row.id,
            dealName: row.deal_name || row.dealName,
            stage: row.stage,
            amount: parseFloat(String(row.amount)) || 0,
            closeDate: row.close_date || row.closeDate,
            pipeline: row.pipeline,
          }));
        }
      } catch (e) {
        logger.warn('Supabase fetch failed for imported funnel deals, using fallback repository data.', e);
      }
    }
    const snapshot = await dataSourceRegistry.getActive().fetchSnapshot();
    return snapshot.deals;
  }

  /**
   * Fetch Import & Mapping Audit Summary
   */
  public static async getAuditSummary(): Promise<ImportAuditSummary> {
    const snapshot = await dataSourceRegistry.getActive().fetchSnapshot();
    return snapshot.audit;
  }

  /**
   * Trigger idempotent database seed to populate Supabase PostgreSQL tables
   */
  public static async seedDatabase(): Promise<SeedResult> {
    return seedSupabaseDatabase();
  }

  // --- Operative write/stub methods guarded in Auftrag 016 ---
  public static getLeads(): never { throw new Error('Operativer CRM-Schreibpfad ist nicht Teil dieser App (B22 / BUILD_PLAN D1).'); }
  public static getDeals(): never { throw new Error('Operativer CRM-Schreibpfad ist nicht Teil dieser App (B22 / BUILD_PLAN D1).'); }
  public static getActivities(): never { throw new Error('Operativer CRM-Schreibpfad ist nicht Teil dieser App (B22 / BUILD_PLAN D1).'); }
  public static addLead(_leadData: Omit<Lead, 'id' | 'createdAt'>): never { throw new Error('Operativer CRM-Schreibpfad ist nicht Teil dieser App (B22 / BUILD_PLAN D1).'); }
  public static updateLeadStatus(_leadId: string, _newStatus: LeadStatus, _reason?: string, _triggeredBy?: string): never { throw new Error('Operativer CRM-Schreibpfad ist nicht Teil dieser App (B22 / BUILD_PLAN D1).'); }
}
