import { Activity, Company, Contact, ImportedFunnelDeal, ImportAuditSummary } from '@/types/crm';
import { RAW_COMPANIES_CSV, RAW_CONTACTS_CSV, RAW_DEALS_CSV } from '@/services/import/rawCsvData';
import { DataSourceError } from '@/types/dataSource';

export interface CrmImportResult {
  companies: Company[];
  contacts: Contact[];
  importedFunnelDeals: ImportedFunnelDeal[];
  activities?: Activity[];
  audit: ImportAuditSummary;
  companyMap: Record<string, Company>; // id -> Company
}

export function parseCsv(csvText: string): string[][] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const firstLine = lines[0];
  if (!firstLine) return [];
  const delim = firstLine.includes(';') ? ';' : ',';

  return lines.map((line) => line.split(delim).map((cell) => cell.trim()));
}

export function importCrmData(): CrmImportResult {
  const audit: ImportAuditSummary = {
    companiesLoaded: 0,
    companiesValid: 0,
    companiesErrors: 0,
    contactsLoaded: 0,
    contactsValid: 0,
    contactsMatched: 0,
    contactsErrors: 0,
    dealsLoaded: 0,
    dealsValid: 0,
    dealsErrors: 0,
  };

  // 1. Import Companies
  const compRows = parseCsv(RAW_COMPANIES_CSV);
  const companies: Company[] = [];
  const domainToCompanyMap: Record<string, Company> = {};
  const companyMap: Record<string, Company> = {};

  if (compRows.length > 1) {
    const dataRows = compRows.slice(1);
    audit.companiesLoaded = dataRows.length;

    dataRows.forEach((row, idx) => {
      if (row.length < 6) {
        audit.companiesErrors++;
        return;
      }
      const domain = (row[0] ?? '').toLowerCase();
      const name = row[1] ?? '';
      const industry = row[2] ?? '';
      const city = row[3] ?? '';
      const postalCode = row[4] ?? '';
      const employeeCount = parseInt(row[5] ?? '0', 10) || 0;

      // Validation
      if (!domain || !name || domainToCompanyMap[domain]) {
        audit.companiesErrors++;
        return;
      }

      const company: Company = {
        id: `comp-${idx + 1}`,
        domain,
        name,
        industry,
        city,
        postalCode,
        employeeCount,
      };

      companies.push(company);
      domainToCompanyMap[domain] = company;
      companyMap[company.id] = company;
      audit.companiesValid++;
    });
  }

  // 2. Import Contacts
  const contRows = parseCsv(RAW_CONTACTS_CSV);
  const contacts: Contact[] = [];

  if (contRows.length > 1) {
    const dataRows = contRows.slice(1);
    audit.contactsLoaded = dataRows.length;

    dataRows.forEach((row, idx) => {
      if (row.length < 4) {
        audit.contactsErrors++;
        return;
      }
      const email = (row[0] ?? '').toLowerCase();
      const firstName = row[1] ?? '';
      const lastName = row[2] ?? '';
      const jobTitle = row[3] ?? '';

      const emailDomain = email.split('@')[1] || '';
      const matchedCompany = domainToCompanyMap[emailDomain];

      // Validation: Email, FirstName, LastName, CompanyId must exist
      if (!email || !firstName || !lastName || !matchedCompany) {
        audit.contactsErrors++;
        return;
      }

      const contact: Contact = {
        id: `cont-${idx + 1}`,
        companyId: matchedCompany.id,
        email,
        firstName,
        lastName,
        jobTitle,
      };

      contacts.push(contact);
      audit.contactsValid++;
      audit.contactsMatched++;
    });
  }

  // 3. Import Funnel Deals (Keine automatische Zuordnung zu Unternehmen)
  const dealRows = parseCsv(RAW_DEALS_CSV);
  const importedFunnelDeals: ImportedFunnelDeal[] = [];

  if (dealRows.length > 1) {
    const dataRows = dealRows.slice(1);
    audit.dealsLoaded = dataRows.length;

    dataRows.forEach((row, idx) => {
      if (row.length < 5) {
        audit.dealsErrors++;
        return;
      }

      const dealName = row[0] ?? '';
      const stage = row[1] ?? '';
      const amount = parseFloat((row[2] ?? '0').replace(',', '.')) || 0;
      const closeDate = row[3] ?? '';
      const pipeline = row[4] ?? '';

      if (!dealName || !stage || !closeDate || !pipeline) {
        audit.dealsErrors++;
        return;
      }

      const importedDeal: ImportedFunnelDeal = {
        id: `fdeal-${idx + 1}`,
        dealName,
        stage,
        amount,
        closeDate,
        pipeline,
      };

      importedFunnelDeals.push(importedDeal);
      audit.dealsValid++;
    });
  }

  return {
    companies,
    contacts,
    importedFunnelDeals,
    audit,
    companyMap,
  };
}

// 067H / G51 — HubSpot-Importfreigabe (Design §10.2): Ein Import ist nur
// erfolgreich, wenn Counts, Referenzen, Pflichtfelder und Zeitraum konsistent
// sind. Verletzt ein Datensatz die Regeln, wirft der Import INTEGRITY statt
// still zu übernehmen. Strukturelle Typen akzeptieren CRM- wie ReadModel-Form.
export interface HubSpotImportBatch {
  companies: Array<{ id: unknown; name: unknown }>;
  contacts: Array<{ id: unknown; companyId: unknown; email: unknown }>;
  deals: Array<{
    id: unknown;
    dealName: unknown;
    stage: unknown;
    amount: unknown;
    closeDate: unknown;
    pipeline: unknown;
    companyId?: unknown;
  }>;
  activities?: Array<{ id: unknown; timestamp: unknown }>;
  periodStart: string;
}

export function assertHubSpotImportIntegrity(batch: HubSpotImportBatch): void {
  const violations: string[] = [];

  if (batch.companies.length === 0) violations.push('keine Companies');
  if (batch.deals.length === 0) violations.push('keine Deals');

  const companyIds = new Set<string>();
  for (const c of batch.companies) {
    if (typeof c.id !== 'string' || !c.id || typeof c.name !== 'string' || !c.name) {
      violations.push('Company ohne id/name');
      continue;
    }
    companyIds.add(c.id);
  }

  for (const ct of batch.contacts) {
    if (typeof ct.id !== 'string' || !ct.id || typeof ct.email !== 'string' || !ct.email) {
      violations.push(`Contact ohne id/email`);
      continue;
    }
    if (typeof ct.companyId !== 'string' || !companyIds.has(ct.companyId)) {
      violations.push(`Contact ${ct.id} ohne gültige Company`);
    }
  }

  for (const d of batch.deals) {
    if (
      typeof d.id !== 'string' ||
      !d.id ||
      typeof d.dealName !== 'string' ||
      !d.dealName ||
      typeof d.stage !== 'string' ||
      !d.stage ||
      typeof d.amount !== 'number' ||
      !Number.isFinite(d.amount) ||
      typeof d.closeDate !== 'string' ||
      !d.closeDate ||
      typeof d.pipeline !== 'string' ||
      !d.pipeline
    ) {
      violations.push(
        'Deal ohne Pflichtfelder (id/dealName/stage/finite amount/closeDate/pipeline)',
      );
      continue;
    }
    if (
      d.companyId !== undefined &&
      d.companyId !== '' &&
      (typeof d.companyId !== 'string' || !companyIds.has(d.companyId))
    ) {
      violations.push(`Deal ${d.id} ohne gültige Company`);
    }
  }

  const start = Date.parse(batch.periodStart);
  const end = Number.isNaN(start) ? Number.NaN : start + 365 * 864e5;
  for (const a of batch.activities ?? []) {
    const t = typeof a.timestamp === 'string' ? Date.parse(a.timestamp) : Number.NaN;
    if (Number.isNaN(t) || Number.isNaN(end) || t < start || t > end) {
      violations.push(`Activity außerhalb des Zeitraums`);
      break;
    }
  }

  if (violations.length > 0) {
    throw new DataSourceError('INTEGRITY', `HubSpot-Import abgelehnt: ${violations.join('; ')}`);
  }
}
