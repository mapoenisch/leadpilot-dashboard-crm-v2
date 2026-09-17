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
    public code:
      | 'UNKNOWN_SOURCE'
      | 'FETCH_FAILED'
      | 'INTEGRITY'
      | 'MIXED_SOURCE'
      | 'INVALID_RUNTIME'
      | 'SYNTHETIC_NOT_ALLOWED'
      | 'INVALID_ORG',
    message: string,
  ) {
    super(message);
    this.name = 'DataSourceError';
  }
}

/**
 * 067D / G47 — CRM-Quellenwahrheit (Design §6).
 * Alle CRM-Abfragen liefern genau einen solchen Envelope aus genau einer Quelle.
 * Leer ist `empty`, Fehler ist `unavailable` — ein Fehler schaltet niemals
 * still auf Demodaten. `degraded` markiert vorhandene Daten mit Audit-Fehlern.
 */
export type CrmSourceKind = 'synthetic' | 'supabase' | 'hubspot';

export type CrmSourceHealth = 'healthy' | 'empty' | 'degraded' | 'unavailable';

export interface CrmReadModelEnvelope {
  organizationId: string;
  sourceId: string;
  sourceKind: CrmSourceKind;
  status: CrmSourceHealth;
  /** ISO-8601 des Envelope-Abrufs. */
  fetchedAt: string;
  /** Deterministischer Inhalts-Hash (067D: stabiler v0-Hash; kanonischer SHA-256 folgt in 067E). */
  contentHash: string;
  /** Bei `unavailable` ein leeres Modell — niemals synthetische Ersatzdaten. */
  data: CrmReadModel;
  /** Maschinenlesbarer Fehlergrund, nur bei `unavailable`. */
  errorCode?: string;
}
