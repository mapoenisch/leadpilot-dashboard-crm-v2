-- ====================================================================
-- LeadPilot Enterprise Dashboard — Live KPI Schreibpipeline (Gate G18)
-- Migration: 20260906_live_kpi_pipeline.sql
-- ====================================================================

-- 1. MINIMAL PRIVILEGED ROLE FOR N8N INGEST
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'n8n_ingest') THEN
    CREATE ROLE n8n_ingest WITH LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
END
$$;


-- 2. LIVE KPI EVENTS TABLE (Ebene C: Live-Ist)
CREATE TABLE IF NOT EXISTS public.live_kpi_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  contract_version TEXT NOT NULL DEFAULT '1.0',
  event_id TEXT NOT NULL,
  kpi_id TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  source_system TEXT NOT NULL,
  source_reference TEXT,
  quality_status TEXT NOT NULL CHECK (quality_status IN ('valid', 'degraded')),
  correlation_id TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  provenance TEXT NOT NULL DEFAULT 'live' CHECK (provenance = 'live'),
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indizes für schnelle Abfragen und Idempotenz
CREATE INDEX IF NOT EXISTS idx_live_kpi_events_kpi_occurred ON public.live_kpi_events(kpi_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_kpi_events_correlation ON public.live_kpi_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_live_kpi_events_idempotency ON public.live_kpi_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_live_kpi_events_source ON public.live_kpi_events(source_system, event_id);


-- 3. LIVE KPI REJECTIONS AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.live_kpi_rejections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rejected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  correlation_id TEXT,
  source_system TEXT,
  event_id TEXT,
  sanitized_context JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_live_kpi_rejections_rejected_at ON public.live_kpi_rejections(rejected_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_kpi_rejections_correlation ON public.live_kpi_rejections(correlation_id);


-- 4. ROW LEVEL SECURITY & LEAST PRIVILEGE PERMISSIONS
ALTER TABLE public.live_kpi_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_kpi_rejections ENABLE ROW LEVEL SECURITY;

-- Weder anon, authenticated, PUBLIC noch n8n_ingest erhalten direkte Tabellengrants
REVOKE ALL ON TABLE public.live_kpi_events FROM anon, authenticated, PUBLIC, n8n_ingest;
REVOKE ALL ON TABLE public.live_kpi_rejections FROM anon, authenticated, PUBLIC, n8n_ingest;

-- In G18 gibt es KEINE Policies für anon/authenticated (Read-Adapter folgt erst in G19)
-- n8n_ingest benötigt USAGE auf public, um die Ingest-RPC aufrufen zu können
GRANT USAGE ON SCHEMA public TO n8n_ingest;


-- 5. SECURE INGEST RPC (SECURITY DEFINER, pg_catalog search_path, Raw JSONB Payload)
CREATE OR REPLACE FUNCTION public.ingest_live_kpi_event(
  p_event JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_idempotency_key TEXT;
  v_occurred_at TIMESTAMPTZ;
  v_num_value NUMERIC;
  v_source_system TEXT;
  v_event_id TEXT;
  v_correlation_id TEXT;
  v_raw_ctx JSONB;
  v_sanitized_ctx JSONB;
  v_event_record public.live_kpi_events%ROWTYPE;
  v_error_code TEXT := NULL;
  v_error_message TEXT := NULL;
BEGIN
  -- 0. Basis-Validierung: Muss ein nicht-leeres JSON-Objekt sein
  IF p_event IS NULL OR jsonb_typeof(p_event) <> 'object' THEN
    v_error_code := 'PAYLOAD_MALFORMED';
    v_error_message := 'Payload must be a non-null JSON object';
  END IF;

  -- Sichere Kontext- und Metadaten-Extraktion für Rejections (ohne Typfehler)
  IF v_error_code IS NULL THEN
    v_source_system := CASE WHEN jsonb_typeof(p_event->'sourceSystem') = 'string' THEN p_event->>'sourceSystem' ELSE NULL END;
    v_event_id := CASE WHEN jsonb_typeof(p_event->'eventId') = 'string' THEN p_event->>'eventId' ELSE NULL END;
    v_correlation_id := CASE WHEN jsonb_typeof(p_event->'correlationId') = 'string' THEN p_event->>'correlationId' ELSE NULL END;

    v_raw_ctx := CASE
      WHEN (p_event ? 'context') AND jsonb_typeof(p_event->'context') = 'object'
      THEN p_event->'context'
      ELSE NULL
    END;

    -- Bei Rejections wird bewusst kein frei strukturierter Kontext persistiert (deterministisch '{}'::jsonb),
    -- um jegliches Secret- oder Daten-Leakage (auch verschachtelt oder beliebig benannt) auszuschließen.
    v_sanitized_ctx := '{}'::jsonb;
  ELSE
    v_source_system := NULL;
    v_event_id := NULL;
    v_correlation_id := NULL;
    v_sanitized_ctx := '{}'::jsonb;
  END IF;

  -- 1. Validierung: Contract Version (muss existieren, String sein und exakt "1.0")
  IF v_error_code IS NOT NULL THEN
    NULL;
  ELSIF NOT (p_event ? 'contractVersion') OR jsonb_typeof(p_event->'contractVersion') <> 'string' OR (p_event->>'contractVersion') <> '1.0' THEN
    v_error_code := 'INVALID_CONTRACT_VERSION';
    v_error_message := 'contractVersion must be exactly "1.0"';

  -- 2. Validierung: Provenance (muss existieren, String sein und exakt "live")
  ELSIF NOT (p_event ? 'provenance') OR jsonb_typeof(p_event->'provenance') <> 'string' OR (p_event->>'provenance') <> 'live' THEN
    v_error_code := 'INVALID_PROVENANCE';
    v_error_message := 'provenance must be exactly "live"';

  -- 3. Validierung: Quality Status (muss existieren, String sein und in ('valid', 'degraded'))
  ELSIF NOT (p_event ? 'qualityStatus') OR jsonb_typeof(p_event->'qualityStatus') <> 'string' OR (p_event->>'qualityStatus') NOT IN ('valid', 'degraded') THEN
    v_error_code := 'INVALID_QUALITY_STATUS';
    v_error_message := 'qualityStatus must be either "valid" or "degraded"';

  -- 4. Validierung: Identifiers (sourceSystem, eventId, kpiId)
  ELSIF NOT (p_event ? 'sourceSystem') OR jsonb_typeof(p_event->'sourceSystem') <> 'string' OR (p_event->>'sourceSystem') !~ '^[a-zA-Z0-9._-]{1,128}$' THEN
    v_error_code := 'INVALID_SOURCE_SYSTEM';
    v_error_message := 'sourceSystem must match ^[a-zA-Z0-9._-]{1,128}$';
  ELSIF NOT (p_event ? 'eventId') OR jsonb_typeof(p_event->'eventId') <> 'string' OR (p_event->>'eventId') !~ '^[a-zA-Z0-9._-]{1,128}$' THEN
    v_error_code := 'INVALID_EVENT_ID';
    v_error_message := 'eventId must match ^[a-zA-Z0-9._-]{1,128}$';
  ELSIF NOT (p_event ? 'kpiId') OR jsonb_typeof(p_event->'kpiId') <> 'string' OR (p_event->>'kpiId') !~ '^[a-zA-Z0-9._-]{1,128}$' THEN
    v_error_code := 'INVALID_KPI_ID';
    v_error_message := 'kpiId must match ^[a-zA-Z0-9._-]{1,128}$';

  -- 5. Validierung: Value (muss existieren und echter JSON-Typ 'number' sein, keine Strings wie "123", endlich)
  ELSIF NOT (p_event ? 'value') OR jsonb_typeof(p_event->'value') <> 'number' THEN
    v_error_code := 'INVALID_VALUE';
    v_error_message := 'value must be a finite numeric value (not null, not string, not NaN, not Infinity)';
  ELSE
    v_num_value := (p_event->>'value')::numeric;
    IF v_num_value = 'NaN'::numeric OR v_num_value = 'Infinity'::numeric OR v_num_value = '-Infinity'::numeric THEN
      v_error_code := 'INVALID_VALUE';
      v_error_message := 'value must be a finite numeric value (not null, not NaN, not Infinity)';
    END IF;
  END IF;

  -- 6. Validierung: Unit & Correlation ID
  IF v_error_code IS NOT NULL THEN
    NULL;
  ELSIF NOT (p_event ? 'unit') OR jsonb_typeof(p_event->'unit') <> 'string' OR length(btrim(p_event->>'unit')) = 0 THEN
    v_error_code := 'INVALID_UNIT';
    v_error_message := 'unit must be a non-empty string';
  ELSIF NOT (p_event ? 'correlationId') OR jsonb_typeof(p_event->'correlationId') <> 'string' OR length(btrim(p_event->>'correlationId')) = 0 THEN
    v_error_code := 'INVALID_CORRELATION_ID';
    v_error_message := 'correlationId must be a non-empty string';

  -- 7. Validierung: Occurred At (ISO-8601 mit zwingender Zeitzone Z oder +/-HH:MM)
  ELSIF NOT (p_event ? 'occurredAt') OR jsonb_typeof(p_event->'occurredAt') <> 'string' OR (p_event->>'occurredAt') !~ '^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(\.[0-9]+)?(Z|([+-][0-9]{2}:[0-9]{2}))$' THEN
    v_error_code := 'INVALID_TIMESTAMP';
    v_error_message := 'occurredAt must be a valid ISO-8601 timestamp string with mandatory timezone';
  ELSE
    BEGIN
      v_occurred_at := (p_event->>'occurredAt')::timestamptz;
    EXCEPTION WHEN OTHERS THEN
      v_error_code := 'INVALID_TIMESTAMP';
      v_error_message := 'occurredAt must represent a valid calendar timestamp';
    END;
  END IF;

  -- 8. Validierung: Context (optional, muss JSON-Objekt sein falls vorhanden)
  IF v_error_code IS NOT NULL THEN
    NULL;
  ELSIF (p_event ? 'context') AND (p_event->'context') IS NOT NULL AND jsonb_typeof(p_event->'context') <> 'null' AND jsonb_typeof(p_event->'context') <> 'object' THEN
    v_error_code := 'INVALID_CONTEXT';
    v_error_message := 'context must be a valid JSON object if provided';
  END IF;

  -- Bei Validierungsfehler: In Rejections protokollieren und ablehnen
  IF v_error_code IS NOT NULL THEN
    INSERT INTO public.live_kpi_rejections (
      error_code,
      error_message,
      correlation_id,
      source_system,
      event_id,
      sanitized_context
    ) VALUES (
      v_error_code,
      v_error_message,
      v_correlation_id,
      v_source_system,
      v_event_id,
      '{}'::jsonb
    );

    RETURN jsonb_build_object(
      'status', 'rejected',
      'error_code', v_error_code,
      'error_message', v_error_message
    );
  END IF;

  -- Kanonischer Idempotenzschlüssel: ${sourceSystem}:${eventId}
  v_idempotency_key := concat(v_source_system, ':', v_event_id);

  -- Idempotenter Insert
  INSERT INTO public.live_kpi_events (
    idempotency_key,
    contract_version,
    event_id,
    kpi_id,
    value,
    unit,
    occurred_at,
    source_system,
    source_reference,
    quality_status,
    correlation_id,
    context,
    provenance
  ) VALUES (
    v_idempotency_key,
    p_event->>'contractVersion',
    v_event_id,
    p_event->>'kpiId',
    v_num_value,
    btrim(p_event->>'unit'),
    v_occurred_at,
    v_source_system,
    CASE WHEN jsonb_typeof(p_event->'sourceReference') = 'string' THEN p_event->>'sourceReference' ELSE NULL END,
    p_event->>'qualityStatus',
    btrim(v_correlation_id),
    COALESCE(v_raw_ctx, '{}'::jsonb),
    p_event->>'provenance'
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING * INTO v_event_record;

  -- Falls neu eingefügt: accepted
  IF v_event_record.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'accepted',
      'idempotency_key', v_event_record.idempotency_key,
      'event_id', v_event_record.event_id,
      'ingested_at', to_char(v_event_record.ingested_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );
  END IF;

  -- Falls bereits vorhanden: duplicate (ohne zweiten Datensatz)
  SELECT * INTO v_event_record
  FROM public.live_kpi_events
  WHERE idempotency_key = v_idempotency_key;

  RETURN jsonb_build_object(
    'status', 'duplicate',
    'idempotency_key', v_event_record.idempotency_key,
    'event_id', v_event_record.event_id,
    'ingested_at', to_char(v_event_record.ingested_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
END;
$$;

-- 6. RPC RECHTE EINSCHRÄNKEN (Least Privilege: Nur n8n_ingest darf ausführen)
REVOKE EXECUTE ON FUNCTION public.ingest_live_kpi_event(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_live_kpi_event(JSONB) TO n8n_ingest;
