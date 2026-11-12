-- ====================================================================
-- LeadPilot Enterprise Dashboard — Live KPI Mandantenbindung (Auftrag 153)
-- Migration: 20261115_live_kpi_tenant_binding.sql
-- Befund F-01 aus dem externen Audit: Mandantengebundener Live-KPI-Feed
-- ====================================================================

-- 1. ABSENDERREGISTER
CREATE TABLE IF NOT EXISTS public.live_kpi_ingest_senders (
  sender_id TEXT PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT live_kpi_ingest_senders_sender_id_format CHECK (sender_id ~ '^[a-zA-Z0-9._-]{1,128}$')
);

ALTER TABLE public.live_kpi_ingest_senders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.live_kpi_ingest_senders FROM anon, authenticated, PUBLIC, n8n_ingest;

-- 2. ORGANISATIONSSPALTE HINZUFÜGEN
ALTER TABLE public.live_kpi_events
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE public.live_kpi_public_feed
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;

ALTER TABLE public.live_kpi_rejections
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT;

-- 3. BESTANDSDATEN DER DEMO-ORGANISATION ZUORDNEN
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.organizations WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    UPDATE public.live_kpi_events
      SET organization_id = '00000000-0000-0000-0000-000000000001'
      WHERE organization_id IS NULL;

    UPDATE public.live_kpi_public_feed
      SET organization_id = '00000000-0000-0000-0000-000000000001'
      WHERE organization_id IS NULL;

    UPDATE public.live_kpi_rejections
      SET organization_id = '00000000-0000-0000-0000-000000000001'
      WHERE organization_id IS NULL;

    INSERT INTO public.live_kpi_ingest_senders (sender_id, organization_id, active)
    VALUES ('leadpilot-demo', '00000000-0000-0000-0000-000000000001', true)
    ON CONFLICT (sender_id) DO UPDATE
      SET organization_id = EXCLUDED.organization_id, active = EXCLUDED.active;
  END IF;
END $$;

ALTER TABLE public.live_kpi_events
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.live_kpi_public_feed
  ALTER COLUMN organization_id SET NOT NULL;

-- 4. IDEMPOTENZSCHLÜSSEL JE ORGANISATION
ALTER TABLE public.live_kpi_events
  DROP CONSTRAINT IF EXISTS live_kpi_events_idempotency_key_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'live_kpi_events_org_idempotency_key'
  ) THEN
    ALTER TABLE public.live_kpi_events
      ADD CONSTRAINT live_kpi_events_org_idempotency_key
      UNIQUE (organization_id, idempotency_key);
  END IF;
END $$;

-- 5. TRIGGER & PROJEKTION
DROP INDEX IF EXISTS public.idx_live_kpi_public_feed_kpi_occurred;
CREATE INDEX IF NOT EXISTS idx_live_kpi_public_feed_org_kpi_occurred
  ON public.live_kpi_public_feed (organization_id, kpi_id, occurred_at DESC, ingested_at DESC);

CREATE OR REPLACE FUNCTION public.project_live_kpi_to_public_feed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO public.live_kpi_public_feed (
    organization_id,
    kpi_id,
    value,
    unit,
    occurred_at,
    quality_status,
    source_system,
    ingested_at
  ) VALUES (
    NEW.organization_id,
    NEW.kpi_id,
    NEW.value,
    NEW.unit,
    NEW.occurred_at,
    NEW.quality_status,
    NEW.source_system,
    NEW.ingested_at
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.project_live_kpi_to_public_feed() FROM PUBLIC, anon, authenticated, n8n_ingest;

-- 6. INGEST RPC: ALTE SIGNATUR ENTFERNEN, NEUE MIT ABSENDER DEFINIEREN
DROP FUNCTION IF EXISTS public.ingest_live_kpi_event(JSONB);

CREATE OR REPLACE FUNCTION public.ingest_live_kpi_event(
  p_sender_id TEXT,
  p_event JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_organization_id UUID := NULL;
  v_sender_active BOOLEAN := false;
  v_idempotency_key TEXT;
  v_occurred_at TIMESTAMPTZ;
  v_num_value NUMERIC;
  v_source_system TEXT;
  v_event_id TEXT;
  v_correlation_id TEXT;
  v_raw_ctx JSONB;
  v_event_record public.live_kpi_events%ROWTYPE;
  v_error_code TEXT := NULL;
  v_error_message TEXT := NULL;
BEGIN
  -- 0. Absender prüfen
  IF p_sender_id IS NULL OR p_sender_id !~ '^[a-zA-Z0-9._-]{1,128}$' THEN
    v_error_code := 'INGEST_SENDER_UNKNOWN';
    v_error_message := 'Sender is unknown or invalid';
  ELSE
    SELECT organization_id, active INTO v_organization_id, v_sender_active
    FROM public.live_kpi_ingest_senders
    WHERE sender_id = p_sender_id;

    IF v_organization_id IS NULL OR v_sender_active IS NOT TRUE THEN
      v_error_code := 'INGEST_SENDER_UNKNOWN';
      v_error_message := 'Sender is unknown or inactive';
    END IF;
  END IF;

  -- 1. Basis-Validierung: Muss ein nicht-leeres JSON-Objekt sein
  IF v_error_code IS NULL AND (p_event IS NULL OR jsonb_typeof(p_event) <> 'object') THEN
    v_error_code := 'PAYLOAD_MALFORMED';
    v_error_message := 'Payload must be a non-null JSON object';
  END IF;

  -- Sichere Kontext- und Metadaten-Extraktion für Rejections (ohne Typfehler)
  IF p_event IS NOT NULL AND jsonb_typeof(p_event) = 'object' THEN
    v_source_system := CASE WHEN jsonb_typeof(p_event->'sourceSystem') = 'string' THEN p_event->>'sourceSystem' ELSE NULL END;
    v_event_id := CASE WHEN jsonb_typeof(p_event->'eventId') = 'string' THEN p_event->>'eventId' ELSE NULL END;
    v_correlation_id := CASE WHEN jsonb_typeof(p_event->'correlationId') = 'string' THEN p_event->>'correlationId' ELSE NULL END;
    v_raw_ctx := CASE
      WHEN (p_event ? 'context') AND jsonb_typeof(p_event->'context') = 'object'
      THEN p_event->'context'
      ELSE NULL
    END;
  ELSE
    v_source_system := NULL;
    v_event_id := NULL;
    v_correlation_id := NULL;
    v_raw_ctx := NULL;
  END IF;

  -- 2. Organisation darf NIEMALS im Body übergeben werden (Verhinderung falscher Erwartung)
  IF v_error_code IS NULL AND ((p_event ? 'organizationId') OR (p_event ? 'organization_id')) THEN
    v_error_code := 'INGEST_ORGANIZATION_IN_BODY';
    v_error_message := 'Payload must not contain organizationId or organization_id';
  END IF;

  -- 3. Validierung: Contract Version (muss existieren, String sein und exakt "1.0")
  IF v_error_code IS NOT NULL THEN
    NULL;
  ELSIF NOT (p_event ? 'contractVersion') OR jsonb_typeof(p_event->'contractVersion') <> 'string' OR (p_event->>'contractVersion') <> '1.0' THEN
    v_error_code := 'INVALID_CONTRACT_VERSION';
    v_error_message := 'contractVersion must be exactly "1.0"';

  -- 4. Validierung: Provenance (muss existieren, String sein und exakt "live")
  ELSIF NOT (p_event ? 'provenance') OR jsonb_typeof(p_event->'provenance') <> 'string' OR (p_event->>'provenance') <> 'live' THEN
    v_error_code := 'INVALID_PROVENANCE';
    v_error_message := 'provenance must be exactly "live"';

  -- 5. Validierung: Quality Status (muss existieren, String sein und in ('valid', 'degraded'))
  ELSIF NOT (p_event ? 'qualityStatus') OR jsonb_typeof(p_event->'qualityStatus') <> 'string' OR (p_event->>'qualityStatus') NOT IN ('valid', 'degraded') THEN
    v_error_code := 'INVALID_QUALITY_STATUS';
    v_error_message := 'qualityStatus must be either "valid" or "degraded"';

  -- 6. Validierung: Identifiers (sourceSystem, eventId, kpiId)
  ELSIF NOT (p_event ? 'sourceSystem') OR jsonb_typeof(p_event->'sourceSystem') <> 'string' OR (p_event->>'sourceSystem') !~ '^[a-zA-Z0-9._-]{1,128}$' THEN
    v_error_code := 'INVALID_SOURCE_SYSTEM';
    v_error_message := 'sourceSystem must match ^[a-zA-Z0-9._-]{1,128}$';
  ELSIF NOT (p_event ? 'eventId') OR jsonb_typeof(p_event->'eventId') <> 'string' OR (p_event->>'eventId') !~ '^[a-zA-Z0-9._-]{1,128}$' THEN
    v_error_code := 'INVALID_EVENT_ID';
    v_error_message := 'eventId must match ^[a-zA-Z0-9._-]{1,128}$';
  ELSIF NOT (p_event ? 'kpiId') OR jsonb_typeof(p_event->'kpiId') <> 'string' OR (p_event->>'kpiId') !~ '^[a-zA-Z0-9._-]{1,128}$' THEN
    v_error_code := 'INVALID_KPI_ID';
    v_error_message := 'kpiId must match ^[a-zA-Z0-9._-]{1,128}$';

  -- 7. Validierung: Value (muss existieren und echter JSON-Typ 'number' sein, keine Strings, endlich)
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

  -- 8. Validierung: Unit & Correlation ID
  IF v_error_code IS NOT NULL THEN
    NULL;
  ELSIF NOT (p_event ? 'unit') OR jsonb_typeof(p_event->'unit') <> 'string' OR length(btrim(p_event->>'unit')) = 0 THEN
    v_error_code := 'INVALID_UNIT';
    v_error_message := 'unit must be a non-empty string';
  ELSIF NOT (p_event ? 'correlationId') OR jsonb_typeof(p_event->'correlationId') <> 'string' OR length(btrim(p_event->>'correlationId')) = 0 THEN
    v_error_code := 'INVALID_CORRELATION_ID';
    v_error_message := 'correlationId must be a non-empty string';

  -- 9. Validierung: Occurred At (ISO-8601 mit zwingender Zeitzone)
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

  -- 10. Validierung: Context (optional, muss JSON-Objekt sein falls vorhanden)
  IF v_error_code IS NOT NULL THEN
    NULL;
  ELSIF (p_event ? 'context') AND (p_event->'context') IS NOT NULL AND jsonb_typeof(p_event->'context') <> 'null' AND jsonb_typeof(p_event->'context') <> 'object' THEN
    v_error_code := 'INVALID_CONTEXT';
    v_error_message := 'context must be a valid JSON object if provided';
  END IF;

  -- Bei Validierungsfehler: In Rejections protokollieren und ablehnen
  IF v_error_code IS NOT NULL THEN
    INSERT INTO public.live_kpi_rejections (
      organization_id,
      error_code,
      error_message,
      correlation_id,
      source_system,
      event_id,
      sanitized_context
    ) VALUES (
      v_organization_id,
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

  -- Kanonischer Idempotenzschlüssel je Organisation: ${organizationId}:${sourceSystem}:${eventId}
  v_idempotency_key := concat(v_organization_id::text, ':', v_source_system, ':', v_event_id);

  -- Idempotenter Insert
  INSERT INTO public.live_kpi_events (
    organization_id,
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
    v_organization_id,
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
  ON CONFLICT (organization_id, idempotency_key) DO NOTHING
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
  WHERE organization_id = v_organization_id AND idempotency_key = v_idempotency_key;

  RETURN jsonb_build_object(
    'status', 'duplicate',
    'idempotency_key', v_event_record.idempotency_key,
    'event_id', v_event_record.event_id,
    'ingested_at', to_char(v_event_record.ingested_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
END;
$$;

-- RPC RECHTE EINSCHRÄNKEN: Nur n8n_ingest und service_role dürfen ausführen
REVOKE ALL ON FUNCTION public.ingest_live_kpi_event(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'n8n_ingest') THEN
    GRANT EXECUTE ON FUNCTION public.ingest_live_kpi_event(TEXT, JSONB) TO n8n_ingest;
  END IF;
END $$;

-- 7. LESERECHTE AUF LIVE_KPI_PUBLIC_FEED ENGEN
REVOKE ALL ON TABLE public.live_kpi_public_feed FROM anon, PUBLIC, n8n_ingest;
GRANT SELECT ON TABLE public.live_kpi_public_feed TO authenticated;

DROP POLICY IF EXISTS allow_anon_authenticated_read ON public.live_kpi_public_feed;
DROP POLICY IF EXISTS tenant_select_live_kpi_public_feed ON public.live_kpi_public_feed;

CREATE POLICY tenant_select_live_kpi_public_feed
  ON public.live_kpi_public_feed
  FOR SELECT
  TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.is_active_member()
    AND EXISTS (
      SELECT 1 FROM public.organization_members AS membership
      WHERE membership.user_id = auth.uid()
        AND membership.organization_id = live_kpi_public_feed.organization_id
        AND membership.status = 'active'
    )
  );

-- 8. SICHERSTELLEN DASS REALTIME-PUBLIKATION WEITERHIN BESTEHT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'live_kpi_public_feed'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_kpi_public_feed;
  END IF;
END $$;
