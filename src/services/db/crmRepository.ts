import {
  Company,
  Contact,
  ImportedFunnelDeal,
  ImportAuditSummary,
  Lead,
  LeadStatus,
} from '@/types/crm';
import { supabase, isSupabaseConfigured } from './supabaseClient';
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
import { DataSourceError } from '@/types/dataSource';

// 067R / G64 (PR-SOURCE-04): Kein stiller Demo-Fallback mehr. Ist Supabase
// konfiguriert, ist Supabase die einzige Quelle: Fehler werden zum expliziten
// Quellenfehler `DATA_SOURCE_UNAVAILABLE`, eine leere Tabelle bleibt leer.
// Nur ohne Supabase-Konfiguration (lokale Demo, Integrity-Suiten) wird die
// aktive DataSource ausdrücklich gelesen — dann gibt es keine zweite Quelle,
// die still ersetzt werden könnte.
export function dataSourceUnavailable(entity: string, cause?: unknown): DataSourceError {
  const detail =
    cause instanceof Error
      ? ` (${cause.message})`
      : typeof cause === 'object' && cause !== null && 'message' in cause
        ? ` (${String((cause as { message: unknown }).message)})`
        : '';
  return new DataSourceError(
    'FETCH_FAILED',
    `DATA_SOURCE_UNAVAILABLE: ${entity} konnten nicht aus Supabase geladen werden${detail}.`,
  );
}

/** Ausdrückliche Lesung der aktiven Quelle — nur ohne Supabase-Konfiguration. */
async function activeSnapshot() {
  return dataSourceRegistry.getActive().fetchSnapshot();
}

/** `null` = Supabase nicht konfiguriert; sonst die Zeilen oder ein Quellenfehler. */
async function readSupabaseTable<Row>(
  entity: string,
  table: string,
  orderColumn: string,
  ascending: boolean,
): Promise<Row[] | null> {
  if (!isSupabaseConfigured) return null;
  if (!supabase) throw dataSourceUnavailable(entity);
  let result: { data: unknown[] | null; error: unknown };
  try {
    result = await supabase.from(table).select('*').order(orderColumn, { ascending });
  } catch (e) {
    logger.warn(`Supabase fetch failed for ${entity}.`, e);
    throw dataSourceUnavailable(entity, e);
  }
  if (result.error) throw dataSourceUnavailable(entity, result.error);
  return (result.data ?? []) as Row[];
}

export class CRMRepository {
  /**
   * Companies aus Supabase, ohne Konfiguration aus der aktiven DataSource.
   */
  public static async getCompanies(): Promise<Company[]> {
    const rows = await readSupabaseTable<CompanyDbRow>('Companies', 'companies', 'name', true);
    if (rows === null) return (await activeSnapshot()).companies;
    return rows.map((row) => ({
      id: row.id,
      domain: row.domain,
      name: row.name,
      industry: row.industry,
      city: row.city,
      postalCode: row.postal_code || row.postalCode,
      employeeCount: row.employee_count || row.employeeCount || 0,
    }));
  }

  /**
   * Fetch Company by ID
   */
  public static async getCompanyById(id: string): Promise<Company | null> {
    const companies = await this.getCompanies();
    return companies.find((c) => c.id === id) || null;
  }

  /**
   * Contacts aus Supabase, ohne Konfiguration aus der aktiven DataSource.
   */
  public static async getContacts(): Promise<Contact[]> {
    const rows = await readSupabaseTable<ContactDbRow>('Contacts', 'contacts', 'last_name', true);
    if (rows === null) return (await activeSnapshot()).contacts;
    return rows.map((row) => ({
      id: row.id,
      companyId: row.company_id || row.companyId || '',
      email: row.email,
      firstName: row.first_name || row.firstName || '',
      lastName: row.last_name || row.lastName || '',
      jobTitle: row.job_title || row.jobTitle || '',
    }));
  }

  /**
   * Fetch Contacts belonging to a specific Company ID
   */
  public static async getContactsByCompanyId(companyId: string): Promise<Contact[]> {
    const contacts = await this.getContacts();
    return contacts.filter((ct) => ct.companyId === companyId);
  }

  /**
   * Imported Funnel Deals aus Supabase, ohne Konfiguration aus der aktiven DataSource.
   */
  public static async getImportedFunnelDeals(): Promise<ImportedFunnelDeal[]> {
    const rows = await readSupabaseTable<DealDbRow>(
      'Imported Funnel Deals',
      'imported_funnel_deals',
      'close_date',
      false,
    );
    if (rows === null) return (await activeSnapshot()).deals;
    return rows.map((row) => ({
      id: row.id,
      dealName: row.deal_name || row.dealName || '',
      stage: row.stage,
      amount: parseFloat(String(row.amount)) || 0,
      closeDate: row.close_date || row.closeDate || '',
      pipeline: row.pipeline,
    }));
  }

  /**
   * Import- & Mapping-Audit. Supabase hat dafür keinen Lesepfad; bei
   * konfiguriertem Supabase wäre die aktive (Demo-)Quelle eine stille
   * Quellenmischung — deshalb expliziter Quellenfehler.
   */
  public static async getAuditSummary(): Promise<ImportAuditSummary> {
    if (isSupabaseConfigured) throw dataSourceUnavailable('Import-Audit');
    return (await activeSnapshot()).audit;
  }

  /**
   * G46 (Auftrag 067C): Browser-Seed entfernt (Design §10.3). Synthetische
   * Demo-Daten entstehen über versionierte SQL-Migrationen; diese Methode
   * existiert nur als harter, ehrlicher Fehler für alte Aufrufer.
   */
  public static async seedDatabase(): Promise<never> {
    throw new Error(
      'Browser-Seed wurde in G46 entfernt. Demo-Daten kommen aus versionierten SQL-Migrationen.',
    );
  }

  // --- Operative write/stub methods guarded in Auftrag 016 ---
  public static getLeads(): never {
    throw new Error('Operativer CRM-Schreibpfad ist nicht Teil dieser App (B22 / BUILD_PLAN D1).');
  }
  public static getDeals(): never {
    throw new Error('Operativer CRM-Schreibpfad ist nicht Teil dieser App (B22 / BUILD_PLAN D1).');
  }
  public static getActivities(): never {
    throw new Error('Operativer CRM-Schreibpfad ist nicht Teil dieser App (B22 / BUILD_PLAN D1).');
  }
  public static addLead(_leadData: Omit<Lead, 'id' | 'createdAt'>): never {
    throw new Error('Operativer CRM-Schreibpfad ist nicht Teil dieser App (B22 / BUILD_PLAN D1).');
  }
  public static updateLeadStatus(
    _leadId: string,
    _newStatus: LeadStatus,
    _reason?: string,
    _triggeredBy?: string,
  ): never {
    throw new Error('Operativer CRM-Schreibpfad ist nicht Teil dieser App (B22 / BUILD_PLAN D1).');
  }
}
