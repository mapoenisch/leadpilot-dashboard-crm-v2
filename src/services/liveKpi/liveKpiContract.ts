/**
 * Live KPI Contract V1 Validation & Idempotency Service
 *
 * Reine TypeScript-Implementierung ohne Browser-, DOM- oder Supabase-Abhängigkeiten.
 * Wortgleiche Parität zu der PostgreSQL-Ingest-RPC in supabase/migrations/20260906_live_kpi_pipeline.sql.
 */

import {
  LIVE_KPI_CONTRACT_VERSION,
  LIVE_KPI_PROVENANCE,
  LiveKpiErrorCode,
  LiveKpiEvent,
  LiveKpiQualityStatus,
} from '@/types/liveKpi';

/**
 * Striktes Format für technische Bezeichner (sourceSystem, eventId, kpiId)
 * Erlaubt Buchstaben, Ziffern, Punkte, Binde- und Unterstriche (1 bis 128 Zeichen).
 */
export const IDENTIFIER_REGEX = /^[a-zA-Z0-9._-]{1,128}$/;

/**
 * Striktes Format für ISO-8601-Zeitstempel (z. B. 2026-09-06T12:00:00Z oder 2026-09-06T12:00:00.000+02:00)
 * Zeitzonenangabe (Z oder expliziter Offset +/-HH:MM) ist zwingend erforderlich.
 */
export const ISO_8601_REGEX =
  /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(\.[0-9]+)?(Z|([+-][0-9]{2}:[0-9]{2}))$/;

export type LiveKpiValidationSuccess = {
  valid: true;
  event: LiveKpiEvent;
  idempotencyKey: string;
};

export type LiveKpiValidationFailure = {
  valid: false;
  errorCode: LiveKpiErrorCode;
  errorMessage: string;
};

export type LiveKpiValidationResult = LiveKpiValidationSuccess | LiveKpiValidationFailure;

/**
 * Bildet den kanonischen Idempotenzschlüssel nach strikter Validierung beider Bestandteile.
 * Formel: `${sourceSystem}:${eventId}`
 */
export function buildIdempotencyKey(sourceSystem: string, eventId: string): string {
  if (!IDENTIFIER_REGEX.test(sourceSystem)) {
    throw new Error(`Invalid sourceSystem format for idempotencyKey: "${sourceSystem}"`);
  }
  if (!IDENTIFIER_REGEX.test(eventId)) {
    throw new Error(`Invalid eventId format for idempotencyKey: "${eventId}"`);
  }
  return `${sourceSystem}:${eventId}`;
}

/**
 * Validiert ein beliebiges Eingabeobjekt gegen den Contract live-kpi-event/v1.
 */
export function validateLiveKpiEvent(input: unknown): LiveKpiValidationResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      valid: false,
      errorCode: 'PAYLOAD_MALFORMED',
      errorMessage: 'Payload must be a non-null object',
    };
  }

  const raw = input as Record<string, unknown>;

  // 1. Contract Version
  if (raw.contractVersion !== LIVE_KPI_CONTRACT_VERSION) {
    return {
      valid: false,
      errorCode: 'INVALID_CONTRACT_VERSION',
      errorMessage: `contractVersion must be exactly "${LIVE_KPI_CONTRACT_VERSION}", got "${String(raw.contractVersion)}"`,
    };
  }

  // 2. Provenance
  if (raw.provenance !== LIVE_KPI_PROVENANCE) {
    return {
      valid: false,
      errorCode: 'INVALID_PROVENANCE',
      errorMessage: `provenance must be exactly "${LIVE_KPI_PROVENANCE}", got "${String(raw.provenance)}"`,
    };
  }

  // 3. Source System
  if (typeof raw.sourceSystem !== 'string' || !IDENTIFIER_REGEX.test(raw.sourceSystem)) {
    return {
      valid: false,
      errorCode: 'INVALID_SOURCE_SYSTEM',
      errorMessage: 'sourceSystem must be a non-empty string matching ^[a-zA-Z0-9._-]{1,128}$',
    };
  }

  // 4. Event ID
  if (typeof raw.eventId !== 'string' || !IDENTIFIER_REGEX.test(raw.eventId)) {
    return {
      valid: false,
      errorCode: 'INVALID_EVENT_ID',
      errorMessage: 'eventId must be a non-empty string matching ^[a-zA-Z0-9._-]{1,128}$',
    };
  }

  // 5. KPI ID
  if (typeof raw.kpiId !== 'string' || !IDENTIFIER_REGEX.test(raw.kpiId)) {
    return {
      valid: false,
      errorCode: 'INVALID_KPI_ID',
      errorMessage: 'kpiId must be a non-empty string matching ^[a-zA-Z0-9._-]{1,128}$',
    };
  }

  // 6. Value (Must be finite number, not null, not NaN, not +/-Infinity)
  if (typeof raw.value !== 'number' || Number.isNaN(raw.value) || !Number.isFinite(raw.value)) {
    return {
      valid: false,
      errorCode: 'INVALID_VALUE',
      errorMessage: 'value must be a finite numeric value (not null, not NaN, not Infinity)',
    };
  }

  // 7. Unit
  if (typeof raw.unit !== 'string' || raw.unit.trim().length === 0) {
    return {
      valid: false,
      errorCode: 'INVALID_UNIT',
      errorMessage: 'unit must be a non-empty string',
    };
  }

  // 8. Timestamp (Occurred At)
  if (typeof raw.occurredAt !== 'string' || !ISO_8601_REGEX.test(raw.occurredAt)) {
    return {
      valid: false,
      errorCode: 'INVALID_TIMESTAMP',
      errorMessage: 'occurredAt must be a valid ISO-8601 timestamp string',
    };
  }
  const parsedTime = Date.parse(raw.occurredAt);
  if (Number.isNaN(parsedTime)) {
    return {
      valid: false,
      errorCode: 'INVALID_TIMESTAMP',
      errorMessage: 'occurredAt must represent a valid calendar timestamp',
    };
  }

  // 9. Quality Status
  if (raw.qualityStatus !== 'valid' && raw.qualityStatus !== 'degraded') {
    return {
      valid: false,
      errorCode: 'INVALID_QUALITY_STATUS',
      errorMessage: 'qualityStatus must be either "valid" or "degraded"',
    };
  }

  // 10. Correlation ID
  if (typeof raw.correlationId !== 'string' || raw.correlationId.trim().length === 0) {
    return {
      valid: false,
      errorCode: 'INVALID_CORRELATION_ID',
      errorMessage: 'correlationId must be a non-empty string',
    };
  }

  // 11. Context (optional, must be JSON object if provided)
  if (raw.context !== undefined && raw.context !== null) {
    if (typeof raw.context !== 'object' || Array.isArray(raw.context)) {
      return {
        valid: false,
        errorCode: 'INVALID_CONTEXT',
        errorMessage: 'context must be a valid JSON object if provided',
      };
    }
  }

  const event: LiveKpiEvent = {
    contractVersion: LIVE_KPI_CONTRACT_VERSION,
    eventId: raw.eventId,
    kpiId: raw.kpiId,
    value: raw.value,
    unit: raw.unit.trim(),
    occurredAt: raw.occurredAt,
    sourceSystem: raw.sourceSystem,
    sourceReference: typeof raw.sourceReference === 'string' ? raw.sourceReference : undefined,
    qualityStatus: raw.qualityStatus as LiveKpiQualityStatus,
    correlationId: raw.correlationId.trim(),
    context: raw.context as Record<string, unknown> | undefined,
    provenance: LIVE_KPI_PROVENANCE,
  };

  const idempotencyKey = buildIdempotencyKey(event.sourceSystem, event.eventId);

  return {
    valid: true,
    event,
    idempotencyKey,
  };
}
