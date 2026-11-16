-- Migration: 20261119_dashboard_time_series.sql
-- Auftrag 160 (P10b-1): Server-Zeitreihen, Historienbeginn und Datenlücken
--
-- 1. Neuer Index deal_stage_events_org_stage_time_idx für performante Phasen-Zeitreihen
-- 2. Neue RPC public.dashboard_time_series(...)
--    - Mandantenbindung über public.current_organization_id() und is_active_member()
--    - Quellen: 'deal_stage_events' (Flussgrößen: Phaseneintritte) und 'live_kpi' (letzter Messwert je Abschnitt)
--    - Auflösungen: stunde, tag, woche, monat in Zeitzone Europe/Berlin
--    - Höchstens 400 Punkte (Fehlercode zu_viele_punkte bei Überschreitung)
--    - Klare Unterscheidung: belegt, luecke, vor_historienbeginn; CRM-Flüsse ab Historienbeginn 0
-- 3. Rechtevergabe (REVOKE ALL von PUBLIC, anon; GRANT an authenticated, service_role)
-- 4. Berechtigung für public.normalize_deal_stage(TEXT) an authenticated, service_role

-- ----------------------------------------------------------------------------
-- 1. Index für Phasen-Zeitreihen
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS deal_stage_events_org_stage_time_idx
  ON public.deal_stage_events (organization_id, to_stage, occurred_at DESC);

-- ----------------------------------------------------------------------------
-- 2. RPC public.dashboard_time_series
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_time_series(
  p_source     TEXT,
  p_metric     TEXT,
  p_resolution TEXT,
  p_from       TIMESTAMPTZ,
  p_to         TIMESTAMPTZ,
  p_pipeline   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
SET timezone = 'Europe/Berlin'
AS $$
DECLARE
  v_org_id UUID;
  v_trunc_unit TEXT;
  v_step INTERVAL;
  v_from_aligned TIMESTAMPTZ;
  v_until TIMESTAMPTZ;
  v_bucket_count INT := 0;
  v_history_start TIMESTAMPTZ;
  v_normalized_metric TEXT;
  v_pipeline TEXT;
  v_points JSONB := '[]'::jsonb;
  v_res JSONB;
BEGIN
  -- 1. Aktive Mitgliedschaft prüfen (Mandantenbindung wie dashboard_crm_pipeline_overview)
  v_org_id := public.current_organization_id();
  IF v_org_id IS NULL OR NOT public.is_active_member() THEN
    RAISE EXCEPTION 'LP_NOT_MEMBER' USING ERRCODE = '42501';
  END IF;

  -- 2. Eingabeprüfung mit festen Fehlercodes (ERRCODE 22023)
  IF p_source IS NULL OR p_source NOT IN ('deal_stage_events', 'live_kpi') THEN
    RAISE EXCEPTION 'unbekannte Quelle' USING ERRCODE = '22023';
  END IF;

  IF p_resolution IS NULL OR p_resolution NOT IN ('stunde', 'tag', 'woche', 'monat') THEN
    RAISE EXCEPTION 'unbekannte Auflösung' USING ERRCODE = '22023';
  END IF;

  IF p_metric IS NULL OR trim(p_metric) = '' THEN
    RAISE EXCEPTION 'p_metric leer' USING ERRCODE = '22023';
  END IF;

  IF p_source = 'live_kpi' AND NULLIF(trim(p_pipeline), '') IS NOT NULL THEN
    RAISE EXCEPTION 'p_pipeline bei Live gesetzt' USING ERRCODE = '22023';
  END IF;

  IF p_from IS NULL OR p_to IS NULL OR p_from >= p_to THEN
    RAISE EXCEPTION 'p_from >= p_to' USING ERRCODE = '22023';
  END IF;

  IF p_to > (clock_timestamp() + interval '60 seconds') THEN
    RAISE EXCEPTION 'p_to in der Zukunft' USING ERRCODE = '22023';
  END IF;

  -- 3. Zeitabschnitt-Parameter bestimmen
  CASE p_resolution
    WHEN 'stunde' THEN
      v_trunc_unit := 'hour';
      v_step := interval '1 hour';
    WHEN 'tag' THEN
      v_trunc_unit := 'day';
      v_step := interval '1 day';
    WHEN 'woche' THEN
      v_trunc_unit := 'week';
      v_step := interval '1 week';
    WHEN 'monat' THEN
      v_trunc_unit := 'month';
      v_step := interval '1 month';
  END CASE;

  v_from_aligned := date_trunc(v_trunc_unit, p_from);
  v_until := p_to - interval '1 microsecond';

  IF v_until < v_from_aligned THEN
    v_bucket_count := 0;
  ELSE
    -- Schnelle DoS-Vorprüfung gegen extrem weite Bereiche
    CASE p_resolution
      WHEN 'stunde' THEN
        IF (EXTRACT(EPOCH FROM (p_to - v_from_aligned)) / 3600.0) > 450.0 THEN
          RAISE EXCEPTION 'zu_viele_punkte' USING ERRCODE = '22023';
        END IF;
      WHEN 'tag' THEN
        IF (EXTRACT(EPOCH FROM (p_to - v_from_aligned)) / 86400.0) > 450.0 THEN
          RAISE EXCEPTION 'zu_viele_punkte' USING ERRCODE = '22023';
        END IF;
      WHEN 'woche' THEN
        IF (EXTRACT(EPOCH FROM (p_to - v_from_aligned)) / (7.0 * 86400.0)) > 450.0 THEN
          RAISE EXCEPTION 'zu_viele_punkte' USING ERRCODE = '22023';
        END IF;
      WHEN 'monat' THEN
        IF ((EXTRACT(YEAR FROM p_to) - EXTRACT(YEAR FROM v_from_aligned)) * 12 + EXTRACT(MONTH FROM p_to) - EXTRACT(MONTH FROM v_from_aligned)) > 450 THEN
          RAISE EXCEPTION 'zu_viele_punkte' USING ERRCODE = '22023';
        END IF;
    END CASE;

    SELECT count(*) INTO v_bucket_count
    FROM generate_series(v_from_aligned, v_until, v_step);

    IF v_bucket_count > 400 THEN
      RAISE EXCEPTION 'zu_viele_punkte' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- 4. Historienbeginn ermitteln
  IF p_source = 'deal_stage_events' THEN
    SELECT min(occurred_at)
    INTO v_history_start
    FROM public.deal_stage_events
    WHERE organization_id = v_org_id;
  ELSE
    SELECT min(occurred_at)
    INTO v_history_start
    FROM public.live_kpi_public_feed
    WHERE organization_id = v_org_id
      AND kpi_id = trim(p_metric);
  END IF;

  -- 5. Abschnitte und Werte aggregieren
  IF p_source = 'deal_stage_events' THEN
    v_normalized_metric := CASE WHEN trim(p_metric) = '*' THEN '*' ELSE public.normalize_deal_stage(trim(p_metric)) END;
    v_pipeline := NULLIF(trim(p_pipeline), '');

    WITH buckets AS (
      SELECT b AS bucket_start
      FROM generate_series(v_from_aligned, v_until, v_step) AS b
    ),
    event_counts AS (
      SELECT
        date_trunc(v_trunc_unit, e.occurred_at) AS bucket_start,
        count(*)::INT AS cnt
      FROM public.deal_stage_events e
      WHERE e.organization_id = v_org_id
        AND e.occurred_at >= p_from
        AND e.occurred_at < p_to
        AND (v_normalized_metric = '*' OR public.normalize_deal_stage(e.to_stage) = v_normalized_metric)
        AND (
          v_pipeline IS NULL
          OR EXISTS (
            SELECT 1 FROM public.imported_funnel_deals d
            WHERE d.id = e.deal_id
              AND d.organization_id = v_org_id
              AND d.pipeline = v_pipeline
          )
        )
      GROUP BY date_trunc(v_trunc_unit, e.occurred_at)
    )
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'bucketStart', to_jsonb(b.bucket_start),
          'value', CASE
            WHEN v_history_start IS NULL OR b.bucket_start < date_trunc(v_trunc_unit, v_history_start) THEN NULL
            ELSE COALESCE(ec.cnt, 0)
          END,
          'status', CASE
            WHEN v_history_start IS NULL OR b.bucket_start < date_trunc(v_trunc_unit, v_history_start) THEN 'vor_historienbeginn'
            ELSE 'belegt'
          END,
          'measuredAt', NULL
        )
        ORDER BY b.bucket_start ASC
      ),
      '[]'::jsonb
    )
    INTO v_points
    FROM buckets b
    LEFT JOIN event_counts ec ON ec.bucket_start = b.bucket_start;

  ELSE
    -- live_kpi: letzter Messwert je Zeitabschnitt (nach occurred_at DESC, ingested_at DESC)
    WITH buckets AS (
      SELECT b AS bucket_start
      FROM generate_series(v_from_aligned, v_until, v_step) AS b
    ),
    ranked_feed AS (
      SELECT
        date_trunc(v_trunc_unit, f.occurred_at) AS bucket_start,
        f.value,
        f.occurred_at,
        ROW_NUMBER() OVER (
          PARTITION BY date_trunc(v_trunc_unit, f.occurred_at)
          ORDER BY f.occurred_at DESC, f.ingested_at DESC
        ) AS rn
      FROM public.live_kpi_public_feed f
      WHERE f.organization_id = v_org_id
        AND f.kpi_id = trim(p_metric)
        AND f.occurred_at >= p_from
        AND f.occurred_at < p_to
    ),
    latest_feed AS (
      SELECT bucket_start, value, occurred_at AS measured_at
      FROM ranked_feed
      WHERE rn = 1
    )
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'bucketStart', to_jsonb(b.bucket_start),
          'value', lf.value,
          'status', CASE
            WHEN v_history_start IS NULL OR b.bucket_start < date_trunc(v_trunc_unit, v_history_start) THEN 'vor_historienbeginn'
            WHEN lf.bucket_start IS NOT NULL THEN 'belegt'
            ELSE 'luecke'
          END,
          'measuredAt', to_jsonb(lf.measured_at)
        )
        ORDER BY b.bucket_start ASC
      ),
      '[]'::jsonb
    )
    INTO v_points
    FROM buckets b
    LEFT JOIN latest_feed lf ON lf.bucket_start = b.bucket_start;
  END IF;

  -- 6. Gesamtergebnis bauen
  v_res := jsonb_build_object(
    'source', p_source,
    'metric', CASE
      WHEN p_source = 'deal_stage_events' AND trim(p_metric) <> '*' THEN public.normalize_deal_stage(trim(p_metric))
      ELSE trim(p_metric)
    END,
    'resolution', p_resolution,
    'from', to_jsonb(p_from),
    'to', to_jsonb(p_to),
    'historyStartAt', to_jsonb(v_history_start),
    'generatedAt', to_jsonb(clock_timestamp()),
    'points', v_points
  );

  IF p_source = 'deal_stage_events' THEN
    v_res := v_res || jsonb_build_object('pipelineBasis', 'aktuelle_pipeline_des_deals');
  END IF;

  RETURN v_res;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Rechtevergabe
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.dashboard_time_series(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_time_series(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.normalize_deal_stage(TEXT) TO authenticated, service_role;
