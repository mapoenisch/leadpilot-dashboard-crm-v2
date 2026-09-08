/**
 * Live KPI Contract V1 Type Definitions (live-kpi-event/v1)
 *
 * Spezifikation: docs/auftraege/ANTIGRAVITY_AUFTRAG_034_DATENVERTRAG_SCHEMA_SCHREIBPIPELINE.md
 * Ebene C: Reale Integrationen & Live-Ist-Ereignisse (getrennt von Ebene A und Ebene B)
 */

export const LIVE_KPI_CONTRACT_VERSION = '1.0' as const;
export const LIVE_KPI_PROVENANCE = 'live' as const;

export type LiveKpiContractVersion = typeof LIVE_KPI_CONTRACT_VERSION;
export type LiveKpiProvenance = typeof LIVE_KPI_PROVENANCE;
export type LiveKpiQualityStatus = 'valid' | 'degraded';

/**
 * Standardisierte Ablehnungscodes (Server- & Client-Parität)
 */
export type LiveKpiErrorCode =
  | 'INVALID_CONTRACT_VERSION'
  | 'INVALID_EVENT_ID'
  | 'INVALID_KPI_ID'
  | 'INVALID_VALUE'
  | 'INVALID_UNIT'
  | 'INVALID_TIMESTAMP'
  | 'INVALID_SOURCE_SYSTEM'
  | 'INVALID_QUALITY_STATUS'
  | 'INVALID_CORRELATION_ID'
  | 'INVALID_PROVENANCE'
  | 'INVALID_CONTEXT'
  | 'PAYLOAD_MALFORMED';

/**
 * Verbindlicher Datenvertrag V1 für eingehende Live-KPI-Events
 */
export interface LiveKpiEvent {
  contractVersion: LiveKpiContractVersion;
  eventId: string;
  kpiId: string;
  value: number;
  unit: string;
  occurredAt: string; // ISO-8601 UTC timestamp
  sourceSystem: string;
  sourceReference?: string;
  qualityStatus: LiveKpiQualityStatus;
  correlationId: string;
  context?: Record<string, unknown>;
  provenance: LiveKpiProvenance;
}

/**
 * Status der Ingest-Verarbeitung
 */
export type LiveKpiIngestStatus = 'accepted' | 'duplicate' | 'rejected';

/**
 * Antwort der Ingest-RPC
 */
export interface LiveKpiIngestResult {
  status: LiveKpiIngestStatus;
  idempotencyKey?: string;
  eventId?: string;
  ingestedAt?: string;
  rejectedAt?: string;
  errorCode?: LiveKpiErrorCode;
  errorMessage?: string;
}
