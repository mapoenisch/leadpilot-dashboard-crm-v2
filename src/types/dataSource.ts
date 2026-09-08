import { Company, Contact, ImportedFunnelDeal, ImportAuditSummary } from './crm';

export interface HistoricalActivity {
  id: string;
  companyId: string;
  contactId?: string;
  dealId?: string;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'TASK';
  channel: string;
  timestamp: string; // ISO, innerhalb [periodStart, periodStart + 365d]
  description: string;
  performedBy: string;
  status: string;
}

/** Quellen-agnostisches Read-Model, an dem die Dashboard-UI hängt. */
export interface CrmReadModel {
  companies: Company[];
  contacts: Contact[];
  deals: ImportedFunnelDeal[];
  activities: HistoricalActivity[];
  audit: ImportAuditSummary;
}

export interface DataSourceInfo {
  id: string; // 'simulated-crm' | 'baseline-file' | 'supabase' | später 'hubspot'
  kind: 'simulated' | 'file' | 'external';
  label: string;
  description: string;
  supportsLiveFeed: boolean;
}

/** Batch-/Snapshot-Quelle. Grundlage für eine eingefrorene Baseline. */
export interface DataSource {
  readonly info: DataSourceInfo;
  fetchSnapshot(): Promise<CrmReadModel>; // ein konsistenter Point-in-Time-Pull
}

/** Optionaler Echtzeit-Feed (Ebene C). Heute nur simuliert. */
export interface LiveDelta {
  at: string;
  changes: Array<{
    entity: 'company' | 'contact' | 'deal' | 'activity';
    id: string;
    op: 'add' | 'update' | 'remove';
    payload?: unknown;
  }>;
}

export type Unsubscribe = () => void;

export interface LiveFeed {
  readonly sourceId: string;
  subscribe(onDelta: (d: LiveDelta) => void): Unsubscribe;
}

export class DataSourceError extends Error {
  constructor(
    public code: 'UNKNOWN_SOURCE' | 'FETCH_FAILED' | 'INTEGRITY',
    message: string
  ) {
    super(message);
    this.name = 'DataSourceError';
  }
}
