import { Activity, Company, Contact, ImportedFunnelDeal, ImportAuditSummary } from '@/types/crm';
import { RAW_COMPANIES_CSV, RAW_CONTACTS_CSV, RAW_DEALS_CSV } from '@/services/import/rawCsvData';

export interface CrmImportResult {
  companies: Company[];
  contacts: Contact[];
  importedFunnelDeals: ImportedFunnelDeal[];
  activities?: Activity[];
  audit: ImportAuditSummary;
  companyMap: Record<string, Company>; // id -> Company
}

function parseCsv(csvText: string): string[][] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const firstLine = lines[0];
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
      const domain = row[0].toLowerCase();
      const name = row[1];
      const industry = row[2];
      const city = row[3];
      const postalCode = row[4];
      const employeeCount = parseInt(row[5], 10) || 0;

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
      const email = row[0].toLowerCase();
      const firstName = row[1];
      const lastName = row[2];
      const jobTitle = row[3];

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

      const dealName = row[0];
      const stage = row[1];
      const amount = parseFloat(row[2].replace(',', '.')) || 0;
      const closeDate = row[3];
      const pipeline = row[4];

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
