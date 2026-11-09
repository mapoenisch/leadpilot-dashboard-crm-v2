import type { CrmResource } from './index.ts';

export interface ResourceCfg {
  table: string;
  columns: string;
  allowedSort: string[];
  defaultSort: string;
  defaultOrder: 'asc' | 'desc';
  allowedFilters: string[];
  searchFields: string[];
  csvColumns: [header: string, dbKey: string, itemKey: string][];
}

const parseCols = (s: string) => s.split(',').map((p) => p.split(':') as [string, string, string]);
const splitS = (s: string) => s.split(',');

export const RESOURCE_CONFIG: Record<CrmResource, ResourceCfg> = {
  companies: {
    table: 'companies',
    columns: 'id,organization_id,name,domain,industry,city,postal_code,employee_count,created_at',
    allowedSort: splitS('name,domain,industry,city,postal_code,employee_count,created_at,id'),
    defaultSort: 'name',
    defaultOrder: 'asc',
    allowedFilters: splitS('industry,city'),
    searchFields: splitS('name,domain,city'),
    csvColumns: parseCols(
      'ID:id:id,Unternehmensname:name:name,Domain:domain:domain,Branche:industry:industry,Stadt:city:city,PLZ:postal_code:postalCode,Mitarbeiter:employee_count:employeeCount',
    ),
  },
  contacts: {
    table: 'contacts',
    columns: 'id,organization_id,company_id,email,first_name,last_name,job_title,created_at',
    allowedSort: splitS('first_name,last_name,email,job_title,created_at,id'),
    defaultSort: 'last_name',
    defaultOrder: 'asc',
    allowedFilters: splitS('job_title,company_id'),
    searchFields: splitS('first_name,last_name,email,job_title'),
    csvColumns: parseCols(
      'ID:id:id,Company ID:company_id:companyId,E-Mail:email:email,Vorname:first_name:firstName,Nachname:last_name:lastName,Jobbezeichnung:job_title:jobTitle',
    ),
  },
  deals: {
    table: 'imported_funnel_deals',
    columns:
      'id,organization_id,deal_name,stage,amount,close_date,pipeline,created_at,stage_entered_at,source_contact_id',
    allowedSort: splitS('deal_name,stage,amount,close_date,created_at,id'),
    defaultSort: 'close_date',
    defaultOrder: 'desc',
    allowedFilters: splitS('stage,pipeline'),
    searchFields: splitS('deal_name,stage,pipeline'),
    csvColumns: parseCols(
      'ID:id:id,Deal Name:deal_name:dealName,Stage:stage:stage,Betrag:amount:amount,Abschlussdatum:close_date:closeDate,Pipeline:pipeline:pipeline',
    ),
  },
};

export const FIELD_MAPPINGS: Record<CrmResource, string> = {
  companies:
    'name:name,domain:domain,industry:industry,city:city,postalCode:postal_code,employeeCount:employee_count',
  contacts:
    'companyId:company_id,email:email,firstName:first_name,lastName:last_name,jobTitle:job_title',
  deals:
    'dealName:deal_name,stage:stage,closeDate:close_date,pipeline:pipeline,stageEnteredAt:stage_entered_at,sourceContactId:source_contact_id',
};
