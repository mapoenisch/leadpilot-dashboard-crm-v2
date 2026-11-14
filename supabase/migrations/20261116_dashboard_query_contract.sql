-- Migration: 20261116_dashboard_query_contract.sql
-- Auftrag 154 (P08a): Dashboard-Editor: Abfragevertrag und Vollbestandsaggregation
--
-- 1. Erweiterung von public.dashboard_config_v2_invalid_reason um strukturelle Validierung von tile.query
-- 2. Neue RPC public.dashboard_crm_pipeline_overview(p_pipeline TEXT DEFAULT NULL) für Vollbestandsaggregation
-- 3. Rechtevergabe (REVOKE von PUBLIC/anon, GRANT an authenticated)

-- ============================================================================
-- 1. Aktualisierung: public.dashboard_config_v2_invalid_reason
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dashboard_config_v2_invalid_reason(p_config JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tile JSONB;
  v_tiles JSONB;
  v_layouts JSONB;
  v_desk JSONB;
  v_tab JSONB;
  v_mob JSONB;
  v_x INTEGER;
  v_y INTEGER;
  v_w INTEGER;
  v_h INTEGER;
  v_query JSONB;
BEGIN
  IF p_config IS NULL OR jsonb_typeof(p_config) <> 'object' THEN
    RETURN 'kein Objekt';
  END IF;

  -- Größenbegrenzung: Maximal 64 KiB
  IF octet_length(p_config::text) > 65536 THEN
    RETURN 'Konfiguration überschreitet Maximalgröße von 64 KiB';
  END IF;

  -- Version muss 2 sein
  IF p_config->'version' IS DISTINCT FROM '2'::jsonb THEN
    RETURN 'ungültige oder fehlende Schema-Version (erwartet: 2)';
  END IF;

  -- Erlaubte Top-Level-Felder
  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_config) AS k
    WHERE k NOT IN (
      'version', 'id', 'title', 'scope', 'teamId', 'ownerUserId',
      'organizationId', 'globalTimeframe', 'globalPipeline',
      'tiles', 'sections', 'metadata', 'variables', 'createdAt', 'updatedAt'
    )
  ) THEN
    RETURN 'unbekanntes Top-Level-Feld im JSON';
  END IF;

  -- Top-Level-Pflichtfelder
  IF jsonb_typeof(p_config->'title') IS DISTINCT FROM 'string'
     OR char_length(trim(p_config->>'title')) < 1
     OR char_length(p_config->>'title') > 120 THEN
    RETURN 'title muss ein nicht-leerer String (max. 120 Zeichen) sein';
  END IF;

  IF jsonb_typeof(p_config->'scope') IS DISTINCT FROM 'string'
     OR (p_config->>'scope') NOT IN ('personal', 'team') THEN
    RETURN 'scope muss ''personal'' oder ''team'' sein';
  END IF;

  IF (p_config->>'scope') = 'team' AND (
    jsonb_typeof(p_config->'teamId') IS DISTINCT FROM 'string'
    OR char_length(trim(p_config->>'teamId')) < 1
  ) THEN
    RETURN 'teamId ist Pflichtfeld bei scope = ''team''';
  END IF;

  IF jsonb_typeof(p_config->'ownerUserId') IS DISTINCT FROM 'string'
     OR char_length(trim(p_config->>'ownerUserId')) < 1 THEN
    RETURN 'ownerUserId muss ein String sein';
  END IF;

  IF jsonb_typeof(p_config->'organizationId') IS DISTINCT FROM 'string'
     OR char_length(trim(p_config->>'organizationId')) < 1 THEN
    RETURN 'organizationId muss ein String sein';
  END IF;

  IF jsonb_typeof(p_config->'globalTimeframe') IS DISTINCT FROM 'string'
     OR char_length(trim(p_config->>'globalTimeframe')) < 1 THEN
    RETURN 'globalTimeframe muss ein String sein';
  END IF;

  IF p_config ? 'id' AND (
    jsonb_typeof(p_config->'id') IS DISTINCT FROM 'string'
    OR char_length(trim(p_config->>'id')) < 1
  ) THEN
    RETURN 'id muss ein nicht-leerer String sein';
  END IF;

  v_tiles := p_config->'tiles';
  IF v_tiles IS NULL OR jsonb_typeof(v_tiles) IS DISTINCT FROM 'array' THEN
    RETURN 'tiles muss ein Array sein';
  END IF;

  -- Maximal 24 Kacheln
  IF jsonb_array_length(v_tiles) > 24 THEN
    RETURN 'maximal 24 Kacheln zulässig';
  END IF;

  -- Eindeutigkeit der Kachel-IDs
  IF (SELECT count(DISTINCT t->>'id') FROM jsonb_array_elements(v_tiles) AS t) <> jsonb_array_length(v_tiles) THEN
    RETURN 'Kachel-IDs im Array müssen eindeutig sein';
  END IF;

  -- Kacheln validieren
  FOR v_tile IN SELECT value FROM jsonb_array_elements(v_tiles) LOOP
    IF jsonb_typeof(v_tile) <> 'object' THEN
      RETURN 'Kachel-Eintrag ist kein Objekt';
    END IF;

    IF EXISTS (
      SELECT 1 FROM jsonb_object_keys(v_tile) AS k
      WHERE k NOT IN (
        'id', 'catalogId', 'title', 'presentation', 'layouts',
        'displayOptions', 'query', 'threshold', 'thresholdRules',
        'timeframeOverride', 'pipelineOverride', 'aggregationOverride', 'drilldownUrl'
      )
    ) THEN
      RETURN 'unbekanntes Kachel-Feld im JSON';
    END IF;

    IF jsonb_typeof(v_tile->'id') IS DISTINCT FROM 'string' OR char_length(v_tile->>'id') < 1 THEN
      RETURN 'Kachel-ID fehlt oder ist ungültig';
    END IF;

    IF jsonb_typeof(v_tile->'catalogId') IS DISTINCT FROM 'string' OR char_length(v_tile->>'catalogId') < 1 THEN
      RETURN 'catalogId fehlt oder ist ungültig';
    END IF;

    IF jsonb_typeof(v_tile->'presentation') IS DISTINCT FROM 'string' OR char_length(v_tile->>'presentation') < 1 THEN
      RETURN 'presentation fehlt oder ist ungültig';
    END IF;

    v_layouts := v_tile->'layouts';
    IF v_layouts IS NULL OR jsonb_typeof(v_layouts) <> 'object' THEN
      RETURN 'Kachel-layouts-Objekt fehlt';
    END IF;

    v_desk := v_layouts->'desktop';
    IF v_desk IS NULL OR jsonb_typeof(v_desk) <> 'object' THEN
      RETURN 'desktop-Layout fehlt in Kachel';
    END IF;

    IF jsonb_typeof(v_desk->'x') IS DISTINCT FROM 'number'
      OR jsonb_typeof(v_desk->'y') IS DISTINCT FROM 'number'
      OR jsonb_typeof(v_desk->'w') IS DISTINCT FROM 'number'
      OR jsonb_typeof(v_desk->'h') IS DISTINCT FROM 'number' THEN
      RETURN 'desktop-Koordinaten müssen Zahlen sein';
    END IF;

    v_x := (v_desk->>'x')::INTEGER;
    v_y := (v_desk->>'y')::INTEGER;
    v_w := (v_desk->>'w')::INTEGER;
    v_h := (v_desk->>'h')::INTEGER;

    IF v_x < 0 OR v_y < 0 OR v_w < 1 OR v_w > 12 OR (v_x + v_w) > 12 OR v_h < 1 OR v_h > 24 THEN
      RETURN 'desktop-Rasterkoordinaten ungültig (12 Spalten, x+w <= 12)';
    END IF;

    IF v_layouts ? 'tablet' AND jsonb_typeof(v_layouts->'tablet') <> 'null' THEN
      v_tab := v_layouts->'tablet';
      IF jsonb_typeof(v_tab) <> 'object'
        OR jsonb_typeof(v_tab->'x') IS DISTINCT FROM 'number'
        OR jsonb_typeof(v_tab->'y') IS DISTINCT FROM 'number'
        OR jsonb_typeof(v_tab->'w') IS DISTINCT FROM 'number'
        OR jsonb_typeof(v_tab->'h') IS DISTINCT FROM 'number' THEN
        RETURN 'tablet-Koordinaten müssen Zahlen sein';
      END IF;
      v_x := (v_tab->>'x')::INTEGER;
      v_y := (v_tab->>'y')::INTEGER;
      v_w := (v_tab->>'w')::INTEGER;
      v_h := (v_tab->>'h')::INTEGER;
      IF v_x < 0 OR v_y < 0 OR v_w < 1 OR v_w > 6 OR (v_x + v_w) > 6 OR v_h < 1 THEN
        RETURN 'tablet-Rasterkoordinaten ungültig (6 Spalten, x+w <= 6)';
      END IF;
    END IF;

    IF v_layouts ? 'mobile' AND jsonb_typeof(v_layouts->'mobile') <> 'null' THEN
      v_mob := v_layouts->'mobile';
      IF jsonb_typeof(v_mob) <> 'object'
        OR jsonb_typeof(v_mob->'x') IS DISTINCT FROM 'number'
        OR jsonb_typeof(v_mob->'y') IS DISTINCT FROM 'number'
        OR jsonb_typeof(v_mob->'w') IS DISTINCT FROM 'number'
        OR jsonb_typeof(v_mob->'h') IS DISTINCT FROM 'number' THEN
        RETURN 'mobile-Koordinaten müssen Zahlen sein';
      END IF;
      v_x := (v_mob->>'x')::INTEGER;
      v_y := (v_mob->>'y')::INTEGER;
      v_w := (v_mob->>'w')::INTEGER;
      v_h := (v_mob->>'h')::INTEGER;
      IF v_x <> 0 OR v_y < 0 OR v_w <> 1 OR v_h < 1 THEN
        RETURN 'mobile-Rasterkoordinaten ungültig (1 Spalte, x=0, w=1)';
      END IF;
    END IF;

    -- Abfrage (query) strukturell validieren (Auftrag 154 §2.3 Nr. 10)
    -- Hinweis: query ist optional (P07-Revisionskompatibilität bleibt gewahrt).
    IF v_tile ? 'query' AND jsonb_typeof(v_tile->'query') <> 'null' THEN
      v_query := v_tile->'query';
      IF jsonb_typeof(v_query) <> 'object' THEN
        RETURN 'Kachel-query ist kein Objekt';
      END IF;

      -- Erlaubte Schlüssel
      IF EXISTS (
        SELECT 1 FROM jsonb_object_keys(v_query) AS qk
        WHERE qk NOT IN ('metricId', 'pipelineId', 'timeframe', 'aggregation', 'groupBy', 'filters')
      ) THEN
        RETURN 'unbekanntes Feld in Kachel-query';
      END IF;

      -- metricId ist String, <= 64 Zeichen und identisch mit catalogId
      IF jsonb_typeof(v_query->'metricId') IS DISTINCT FROM 'string'
         OR char_length(trim(v_query->>'metricId')) < 1
         OR char_length(v_query->>'metricId') > 64 THEN
        RETURN 'query.metricId muss ein nicht-leerer String (max. 64 Zeichen) sein';
      END IF;

      IF (v_query->>'metricId') <> (v_tile->>'catalogId') THEN
        RETURN 'query.metricId stimmt nicht mit catalogId überein';
      END IF;

      -- pipelineId: String (<= 120 Zeichen) oder null
      IF v_query ? 'pipelineId' AND jsonb_typeof(v_query->'pipelineId') NOT IN ('string', 'null') THEN
        RETURN 'query.pipelineId muss ein String oder null sein';
      END IF;

      IF jsonb_typeof(v_query->'pipelineId') = 'string' AND char_length(v_query->>'pipelineId') > 120 THEN
        RETURN 'query.pipelineId darf maximal 120 Zeichen lang sein';
      END IF;

      -- timeframe: String (<= 64 Zeichen, Legacy-Werte aus P07 zugelassen)
      IF v_query ? 'timeframe' AND (
        jsonb_typeof(v_query->'timeframe') IS DISTINCT FROM 'string'
        OR char_length(v_query->>'timeframe') > 64
      ) THEN
        RETURN 'query.timeframe muss ein String (max. 64 Zeichen) sein';
      END IF;

      -- aggregation: String (<= 64 Zeichen)
      IF v_query ? 'aggregation' AND (
        jsonb_typeof(v_query->'aggregation') IS DISTINCT FROM 'string'
        OR char_length(v_query->>'aggregation') > 64
      ) THEN
        RETURN 'query.aggregation muss ein String (max. 64 Zeichen) sein';
      END IF;

      -- groupBy: Array mit höchstens einem Element 'stage'
      IF v_query ? 'groupBy' THEN
        IF jsonb_typeof(v_query->'groupBy') IS DISTINCT FROM 'array' THEN
          RETURN 'query.groupBy muss ein Array sein';
        END IF;
        IF jsonb_array_length(v_query->'groupBy') > 1 THEN
          RETURN 'query.groupBy darf maximal ein Element enthalten';
        END IF;
        IF jsonb_array_length(v_query->'groupBy') = 1 AND (v_query->'groupBy'->>0) <> 'stage' THEN
          RETURN 'query.groupBy darf nur ''stage'' enthalten';
        END IF;
      END IF;

      -- filters: leeres Objekt
      IF v_query ? 'filters' THEN
        IF jsonb_typeof(v_query->'filters') IS DISTINCT FROM 'object' THEN
          RETURN 'query.filters muss ein Objekt sein';
        END IF;
        IF (v_query->'filters') <> '{}'::jsonb THEN
          RETURN 'query.filters muss ein leeres Objekt sein';
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_config_v2_invalid_reason(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_config_v2_invalid_reason(JSONB) TO authenticated, service_role;

-- ============================================================================
-- 2. Vollbestands-RPC: public.dashboard_crm_pipeline_overview
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dashboard_crm_pipeline_overview(p_pipeline TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org_id UUID;
  v_total_deals INT := 0;
  v_total_volume NUMERIC(12,2) := 0;
  v_won_volume NUMERIC(12,2) := 0;
  v_open_volume NUMERIC(12,2) := 0;
  v_stages JSONB := '[]'::jsonb;
  v_as_of TIMESTAMPTZ := clock_timestamp();
  v_has_invalid_deals BOOLEAN := FALSE;
  v_target_pipeline TEXT;
BEGIN
  -- 1. Aktive Mitgliedschaft prüfen (Auftrag 154 §2.4 Nr. 13)
  v_org_id := public.current_organization_id();
  IF v_org_id IS NULL OR NOT public.is_active_member() THEN
    RAISE EXCEPTION 'LP_NOT_MEMBER' USING ERRCODE = '42501';
  END IF;

  v_target_pipeline := NULLIF(trim(p_pipeline), '');

  -- 2. Ungültige Deals prüfen (negativer Betrag oder leere Stufe)
  -- Wirft ERRCODE 22023 mit Meldung LP_CRM_INVALID_DEAL
  SELECT EXISTS (
    SELECT 1
    FROM public.imported_funnel_deals d
    WHERE d.organization_id = v_org_id
      AND (v_target_pipeline IS NULL OR d.pipeline = v_target_pipeline)
      AND (
        d.amount < 0
        OR d.stage IS NULL
        OR trim(d.stage) = ''
      )
  ) INTO v_has_invalid_deals;

  IF v_has_invalid_deals THEN
    RAISE EXCEPTION 'LP_CRM_INVALID_DEAL' USING ERRCODE = '22023';
  END IF;

  -- 3. Gesamtkennzahlen berechnen
  SELECT
    count(*),
    COALESCE(sum(COALESCE(d.amount, 0)), 0),
    COALESCE(sum(CASE WHEN lower(btrim(d.stage)) LIKE '%gewonnen%' THEN COALESCE(d.amount, 0) ELSE 0 END), 0),
    COALESCE(sum(CASE WHEN lower(btrim(d.stage)) NOT LIKE '%gewonnen%' AND lower(btrim(d.stage)) NOT LIKE '%verloren%' THEN COALESCE(d.amount, 0) ELSE 0 END), 0)
  INTO
    v_total_deals,
    v_total_volume,
    v_won_volume,
    v_open_volume
  FROM public.imported_funnel_deals d
  WHERE d.organization_id = v_org_id
    AND (v_target_pipeline IS NULL OR d.pipeline = v_target_pipeline);

  -- 4. Stufen aggregieren und deterministisch sortieren:
  -- Sortierung: volume DESC, count DESC, stage COLLATE "C" ASC
  WITH stage_aggs AS (
    SELECT
      btrim(d.stage) AS stage_name,
      count(*)::INT AS stage_count,
      COALESCE(sum(COALESCE(d.amount, 0)), 0)::NUMERIC(12,2) AS stage_vol
    FROM public.imported_funnel_deals d
    WHERE d.organization_id = v_org_id
      AND (v_target_pipeline IS NULL OR d.pipeline = v_target_pipeline)
    GROUP BY btrim(d.stage)
  ),
  sorted_stages AS (
    SELECT
      stage_name,
      stage_count,
      stage_vol,
      CASE
        WHEN v_total_volume > 0 THEN round((stage_vol / v_total_volume) * 100)::INT
        ELSE 0
      END AS stage_share
    FROM stage_aggs
    ORDER BY stage_vol DESC, stage_count DESC, stage_name COLLATE "C" ASC
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'stage', stage_name,
        'count', stage_count,
        'volume', stage_vol,
        'sharePercent', stage_share
      )
    ),
    '[]'::jsonb
  )
  INTO v_stages
  FROM sorted_stages;

  -- 5. JSONB-Ergebnis zurückgeben
  RETURN jsonb_build_object(
    'totalDeals', v_total_deals,
    'totalVolume', v_total_volume,
    'wonVolume', v_won_volume,
    'openVolume', v_open_volume,
    'stages', v_stages,
    'evaluatedDeals', v_total_deals,
    'pipeline', p_pipeline,
    'asOf', to_jsonb(v_as_of)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_crm_pipeline_overview(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_crm_pipeline_overview(TEXT) TO authenticated, service_role;
