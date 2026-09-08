export type LeadStatus = 'New' | 'MQL' | 'SQL' | 'Hot' | 'Won' | 'Lost' | 'Disqualified';

export interface Company {
  id: string;
  domain?: string;
  name: string;
  industry: string;
  city: string;
  postalCode?: string;
  employeeCount: number;
  revenue?: string;
  icpScore?: number;
  createdAt?: string;
}

export interface Contact {
  id: string;
  companyId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  name?: string;
  role?: string;
  phone?: string;
  personaMatch?: string;
  companyName?: string;
}

export interface ImportedFunnelDeal {
  id: string;
  dealName: string;
  stage: string;
  amount: number;
  closeDate: string;
  pipeline: string;
  companyId?: string;
}

// Operative CRM Entitäten (Vorbereitet für spätere Phasen)
export interface Lead {
  id: string;
  contactId?: string;
  companyId?: string;
  name?: string;
  email?: string;
  company?: string;
  status: LeadStatus;
  score: number;
  source: string;
  estimatedValue?: number;
  value?: string;
  owner?: string;
  lastContacted?: string;
  createdAt: string;
}

export interface Opportunity {
  id: string;
  companyId: string;
  title: string;
  stage: string;
  value: number;
  closeDate: string;
}

export interface Deal {
  id: string;
  companyId?: string;
  contactId?: string;
  name?: string;
  companyName?: string;
  contactName?: string;
  stage?: string;
  status?: string;
  amount?: number;
  mrr?: number;
  arr?: number;
  value?: string;
  closeDate?: string;
  closedAt?: string;
  pipeline?: string;
  package?: string;
  owner?: string;
}

export interface Activity {
  id: string;
  entityId?: string;
  entityName?: string;
  entityType?: 'Company' | 'Contact' | 'Lead' | 'Deal';
  type: string;
  description: string;
  timestamp: string;
  author?: string;
  triggeredBy?: string;
}

export interface CRMStatusHistory {
  id: string;
  entityId?: string;
  leadId?: string;
  leadName?: string;
  oldStatus: string;
  newStatus: string;
  reason?: string;
  changedAt: string;
  changedBy?: string;
  triggeredBy?: string;
}

export interface ImportAuditSummary {
  companiesLoaded: number;
  companiesValid: number;
  companiesErrors: number;
  contactsLoaded: number;
  contactsValid: number;
  contactsMatched: number;
  contactsErrors: number;
  dealsLoaded: number;
  dealsValid: number;
  dealsErrors: number;
}
