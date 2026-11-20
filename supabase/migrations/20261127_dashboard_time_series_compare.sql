-- Migration: 20261127_dashboard_time_series_compare.sql
-- Auftrag 170 (P14b): Vergleichszeitraum, zeitbezogene Verknüpfung, Heatmap, Erwartungsbänder
--
-- 1. Neue RPC public.dashboard_time_series_compare(...)
--    Liefert Basis- und Vergleichsfenster (Vorperiode / Vorjahr) in einem Aufruf, inklusive
--    datenstand_ab (frühester belegter Zeitpunkt) und Hinweis auf unvollständigen Vergleich.
--    Beide Fenster kommen aus der unveränderten RPC public.dashboard_time_series: gleiche
--    Rechte, gleiche Lückenregeln, gleiche Größenbegrenzung (höchstens 400 Punkte je Fenster).
-- 2. Neue RPC public.dashboard_time_series_phases(...)
--    Phaseneintritte je Phase und Zeitabschnitt für die Heatmap „Phase × Woche“.
--    Ebenfalls über public.dashboard_time_series, ein Aufruf je Phase.
-- 3. Aktualisierung public.dashboard_config_v2_invalid_reason (Fassung aus 20261126 plus
--    query.compare, query.join, query.bands).
-- 4. Aktualisierung public.check_dashboard_alarm_transformations: Vergleich, Join und Heatmap
--    liefern keinen Einzelwert, aktive Alarmregeln werden mit kennzahl_nicht_alarmfaehig pausiert.
--
-- public.dashboard_time_series bleibt unverändert.

-- ----------------------------------------------------------------------------
-- 1. RPC public.dashboard_time_series_compare
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_time_series_compare(
  p_source     TEXT,
  p_metric     TEXT,
  p_resolution TEXT,
  p_from       TIMESTAMPTZ,
  p_to         TIMESTAMPTZ,
  p_compare    TEXT,
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
  v_base JSONB;
  v_compare JSONB;
  v_bucket_count INT;
  v_step INTERVAL;
  v_compare_from TIMESTAMPTZ;
  v_compare_to TIMESTAMPTZ;
  v_history_start TIMESTAMPTZ;
  v_missing INT;
  v_is_partial BOOLEAN;
BEGIN
  IF public.current_organization_id() IS NULL OR NOT public.is_active_member() THEN
    RAISE EXCEPTION 'LP_NOT_MEMBER' USING ERRCODE = '42501';
  END IF;

  IF p_compare IS NULL OR p_compare NOT IN ('vorperiode', 'vorjahr') THEN
    RAISE EXCEPTION 'unbekannter Vergleichszeitraum' USING ERRCODE = '22023';
  END IF;

  -- Basisfenster: prüft Quelle, Auflösung, Fenster, Zukunft und Größenbegrenzung.
  v_base := public.dashboard_time_series(p_source, p_metric, p_resolution, p_from, p_to, p_pipeline);
  v_bucket_count := jsonb_array_length(v_base->'points');

  v_step := CASE p_resolution
    WHEN 'stunde' THEN interval '1 hour'
    WHEN 'tag' THEN interval '1 day'
    WHEN 'woche' THEN interval '1 week'
    ELSE interval '1 month'
  END;

  IF p_compare = 'vorperiode' THEN
    -- Gleiche Anzahl Zeitabschnitte direkt vor dem Basisfenster (kalendergenau in Europe/Berlin).
    v_compare_to := (v_base->>'from')::timestamptz;
    v_compare_from := v_compare_to - (v_step * v_bucket_count);
  ELSIF p_resolution = 'woche' THEN
    -- Vorjahr bei Wochen: auf den Montag der Kalenderwoche ausrichten und dieselbe Anzahl ganzer
    -- Wochen liefern. Ein Kalenderjahr zurück kann auf einen anderen Wochentag fallen; ohne
    -- Ausrichtung enthielte der Vergleich zwei angeschnittene Wochen.
    v_compare_from := date_trunc('week', p_from - interval '1 year');
    v_compare_to := v_compare_from + (v_step * v_bucket_count);
  ELSE
    v_compare_from := p_from - interval '1 year';
    v_compare_to := p_to - interval '1 year';
  END IF;

  v_compare := public.dashboard_time_series(
    p_source, p_metric, p_resolution, v_compare_from, v_compare_to, p_pipeline
  );

  v_history_start := NULLIF(v_base->>'historyStartAt', '')::timestamptz;

  SELECT count(*) INTO v_missing
  FROM jsonb_array_elements(v_compare->'points') AS pt
  WHERE pt->>'status' = 'vor_historienbeginn';

  v_is_partial := v_missing > 0;

  RETURN v_base || jsonb_build_object(
    'compare', p_compare,
    'compareFrom', v_compare->'from',
    'compareTo', v_compare->'to',
    'comparePoints', v_compare->'points',
    'datenstand_ab', to_jsonb(v_history_start),
    'is_partial', v_is_partial,
    'partial_reason', CASE
      WHEN NOT v_is_partial THEN NULL
      WHEN v_history_start IS NULL THEN 'Vergleich unvollständig: keine Historie vorhanden'
      ELSE 'Vergleich unvollständig: Daten ab ' || to_char(v_history_start, 'DD.MM.YYYY')
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_time_series_compare(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_time_series_compare(TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. RPC public.dashboard_time_series_phases (Heatmap „Phase × Woche“)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_time_series_phases(
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
  v_phase TEXT;
  v_series JSONB;
  v_first JSONB := NULL;
  v_phases JSONB := '[]'::jsonb;
BEGIN
  IF public.current_organization_id() IS NULL OR NOT public.is_active_member() THEN
    RAISE EXCEPTION 'LP_NOT_MEMBER' USING ERRCODE = '42501';
  END IF;

  FOREACH v_phase IN ARRAY ARRAY[
    'Lead eingegangen', 'Erstgespräch geführt', 'Bedarfsanalyse', 'Angebot erstellt',
    'Verhandlung', 'Deal gewonnen', 'Deal verloren'
  ] LOOP
    v_series := public.dashboard_time_series(
      'deal_stage_events', v_phase, p_resolution, p_from, p_to, p_pipeline
    );
    IF v_first IS NULL THEN
      v_first := v_series;
    END IF;
    v_phases := v_phases || jsonb_build_array(
      jsonb_build_object('phase', v_phase, 'points', v_series->'points')
    );
  END LOOP;

  RETURN jsonb_build_object(
    'source', 'deal_stage_events',
    'resolution', p_resolution,
    'from', v_first->'from',
    'to', v_first->'to',
    'historyStartAt', v_first->'historyStartAt',
    'generatedAt', to_jsonb(clock_timestamp()),
    'pipelineBasis', 'aktuelle_pipeline_des_deals',
    'phases', v_phases
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_time_series_phases(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_time_series_phases(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. Aktualisierung: public.dashboard_config_v2_invalid_reason
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_config_v2_invalid_reason(p_config JSONB)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tile JSONB; v_tiles JSONB; v_layouts JSONB;
  v_desk JSONB; v_tab JSONB; v_mob JSONB;
  v_x INTEGER; v_y INTEGER; v_w INTEGER; v_h INTEGER;
  v_query JSONB;
  v_transformations JSONB; v_trans JSONB; v_art TEXT; v_name TEXT;
  v_all_tile_ids TEXT[] := ARRAY[]::TEXT[];
  v_sections JSONB; v_section JSONB; v_sec_id TEXT; v_sec_tids JSONB;
  v_elem JSONB; v_tid TEXT;
  v_section_ids TEXT[] := ARRAY[]::TEXT[];
  v_assigned_tile_ids TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF p_config IS NULL OR jsonb_typeof(p_config) <> 'object' THEN
    RETURN 'kein Objekt';
  END IF;

  IF octet_length(p_config::text) > 65536 THEN
    RETURN 'Konfiguration überschreitet Maximalgröße von 64 KiB';
  END IF;

  IF p_config->'version' IS DISTINCT FROM '2'::jsonb THEN
    RETURN 'ungültige oder fehlende Schema-Version (erwartet: 2)';
  END IF;

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

  IF jsonb_array_length(v_tiles) > 24 THEN
    RETURN 'maximal 24 Kacheln zulässig';
  END IF;

  IF (SELECT count(DISTINCT t->>'id') FROM jsonb_array_elements(v_tiles) AS t) <> jsonb_array_length(v_tiles) THEN
    RETURN 'Kachel-IDs im Array müssen eindeutig sein';
  END IF;

  FOR v_tile IN SELECT value FROM jsonb_array_elements(v_tiles) LOOP
    IF jsonb_typeof(v_tile) <> 'object' THEN
      RETURN 'Kachel-Eintrag ist kein Objekt';
    END IF;

    IF EXISTS (
      SELECT 1 FROM jsonb_object_keys(v_tile) AS k
      WHERE k NOT IN (
        'id', 'catalogId', 'title', 'presentation', 'layouts',
        'displayOptions', 'query', 'threshold', 'thresholdRules',
        'timeframeOverride', 'pipelineOverride', 'aggregationOverride', 'drilldownUrl', 'alarm'
      )
    ) THEN
      RETURN 'unbekanntes Kachel-Feld im JSON';
    END IF;

    IF jsonb_typeof(v_tile->'id') IS DISTINCT FROM 'string' OR char_length(v_tile->>'id') < 1 THEN
      RETURN 'Kachel-ID fehlt oder ist ungültig';
    END IF;

    v_all_tile_ids := array_append(v_all_tile_ids, v_tile->>'id');

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

    IF jsonb_typeof(v_desk->'x') <> 'number' OR jsonb_typeof(v_desk->'y') <> 'number'
       OR jsonb_typeof(v_desk->'w') <> 'number' OR jsonb_typeof(v_desk->'h') <> 'number' THEN
      RETURN 'desktop-Layout-Koordinaten müssen Zahlen sein';
    END IF;

    v_x := (v_desk->>'x')::INTEGER;
    v_y := (v_desk->>'y')::INTEGER;
    v_w := (v_desk->>'w')::INTEGER;
    v_h := (v_desk->>'h')::INTEGER;

    IF v_x < 0 OR v_y < 0 OR v_w < 1 OR v_h < 1 THEN
      RETURN 'desktop-Layout-Koordinaten müssen positiv sein';
    END IF;
    IF v_w > 12 OR (v_x + v_w) > 12 THEN
      RETURN 'desktop-Layout überschreitet 12 Spalten';
    END IF;
    IF v_h > 24 THEN
      RETURN 'desktop-Layout maximale Zeilenhöhe ist 24';
    END IF;

    IF v_layouts ? 'tablet' THEN
      v_tab := v_layouts->'tablet';
      IF jsonb_typeof(v_tab) <> 'object' THEN
        RETURN 'tablet-Layout ist kein Objekt';
      END IF;
      IF jsonb_typeof(v_tab->'x') <> 'number' OR jsonb_typeof(v_tab->'y') <> 'number'
         OR jsonb_typeof(v_tab->'w') <> 'number' OR jsonb_typeof(v_tab->'h') <> 'number' THEN
        RETURN 'tablet-Layout-Koordinaten müssen Zahlen sein';
      END IF;

      v_x := (v_tab->>'x')::INTEGER;
      v_y := (v_tab->>'y')::INTEGER;
      v_w := (v_tab->>'w')::INTEGER;
      v_h := (v_tab->>'h')::INTEGER;

      IF v_x < 0 OR v_y < 0 OR v_w < 1 OR v_h < 1 THEN
        RETURN 'tablet-Layout-Koordinaten müssen positiv sein';
      END IF;
      IF v_w > 6 OR (v_x + v_w) > 6 THEN
        RETURN 'tablet-Layout überschreitet 6 Spalten';
      END IF;
    END IF;

    IF v_layouts ? 'mobile' THEN
      v_mob := v_layouts->'mobile';
      IF jsonb_typeof(v_mob) <> 'object' THEN
        RETURN 'mobile-Layout ist kein Objekt';
      END IF;
      IF jsonb_typeof(v_mob->'x') <> 'number' OR jsonb_typeof(v_mob->'y') <> 'number'
         OR jsonb_typeof(v_mob->'w') <> 'number' OR jsonb_typeof(v_mob->'h') <> 'number' THEN
        RETURN 'mobile-Layout-Koordinaten müssen Zahlen sein';
      END IF;

      v_x := (v_mob->>'x')::INTEGER;
      v_y := (v_mob->>'y')::INTEGER;
      v_w := (v_mob->>'w')::INTEGER;
      v_h := (v_mob->>'h')::INTEGER;

      IF v_x <> 0 OR v_w <> 1 OR v_y < 0 OR v_h < 1 THEN
        RETURN 'mobile-Layout muss 1 Spalte (x=0, w=1) haben';
      END IF;
    END IF;

    IF v_tile ? 'query' AND jsonb_typeof(v_tile->'query') <> 'null' THEN
      v_query := v_tile->'query';
      IF jsonb_typeof(v_query) <> 'object' THEN
        RETURN 'Kachel-query ist kein Objekt';
      END IF;

      IF EXISTS (
        SELECT 1 FROM jsonb_object_keys(v_query) AS qk
        WHERE qk NOT IN (
          'metricId', 'pipelineId', 'timeframe', 'aggregation', 'groupBy',
          'filters', 'window', 'transformations', 'compare', 'join', 'bands'
        )
      ) THEN
        RETURN 'unbekanntes Feld in Kachel-query';
      END IF;

      IF jsonb_typeof(v_query->'metricId') IS DISTINCT FROM 'string'
         OR char_length(trim(v_query->>'metricId')) < 1
         OR char_length(v_query->>'metricId') > 64 THEN
        RETURN 'query.metricId muss ein nicht-leerer String (max. 64 Zeichen) sein';
      END IF;

      IF (v_query->>'metricId') <> (v_tile->>'catalogId') THEN
        RETURN 'query.metricId stimmt nicht mit catalogId überein';
      END IF;

      IF v_query ? 'pipelineId' AND jsonb_typeof(v_query->'pipelineId') NOT IN ('string', 'null') THEN
        RETURN 'query.pipelineId muss ein String oder null sein';
      END IF;
      IF jsonb_typeof(v_query->'pipelineId') = 'string' AND char_length(v_query->>'pipelineId') > 120 THEN
        RETURN 'query.pipelineId darf maximal 120 Zeichen lang sein';
      END IF;

      IF v_query ? 'timeframe' AND (
        jsonb_typeof(v_query->'timeframe') IS DISTINCT FROM 'string'
        OR char_length(v_query->>'timeframe') > 64
      ) THEN
        RETURN 'query.timeframe muss ein String (max. 64 Zeichen) sein';
      END IF;

      IF v_query ? 'aggregation' AND (
        jsonb_typeof(v_query->'aggregation') IS DISTINCT FROM 'string'
        OR char_length(v_query->>'aggregation') > 64
      ) THEN
        RETURN 'query.aggregation muss ein String (max. 64 Zeichen) sein';
      END IF;

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

      IF v_query ? 'filters' THEN
        IF jsonb_typeof(v_query->'filters') IS DISTINCT FROM 'object' THEN
          RETURN 'query.filters muss ein Objekt sein';
        END IF;
        IF (v_query->'filters') <> '{}'::jsonb THEN
          RETURN 'query.filters muss ein leeres Objekt sein';
        END IF;
      END IF;

      IF v_query ? 'window' THEN
        IF jsonb_typeof(v_query->'window') IS DISTINCT FROM 'object' THEN
          RETURN 'query.window muss ein Objekt sein';
        END IF;

        IF EXISTS (
          SELECT 1 FROM jsonb_object_keys(v_query->'window') AS wk
          WHERE wk NOT IN ('count', 'resolution')
        ) OR NOT (v_query->'window' ? 'count' AND v_query->'window' ? 'resolution') THEN
          RETURN 'query.window muss genau die Schlüssel count und resolution enthalten';
        END IF;

        IF jsonb_typeof(v_query->'window'->'count') IS DISTINCT FROM 'number' THEN
          RETURN 'query.window.count muss eine Zahl sein';
        END IF;

        IF (v_query->'window'->>'count')::NUMERIC % 1 <> 0 OR (v_query->'window'->>'count')::NUMERIC < 1 THEN
          RETURN 'query.window.count muss eine positive ganze Zahl (mindestens 1) sein';
        END IF;

        IF jsonb_typeof(v_query->'window'->'resolution') IS DISTINCT FROM 'string'
           OR (v_query->'window'->>'resolution') NOT IN ('stunde', 'tag', 'woche', 'monat') THEN
          RETURN 'query.window.resolution muss ''stunde'', ''tag'', ''woche'' oder ''monat'' sein';
        END IF;

        IF (v_query->'window'->>'resolution') = 'stunde' AND (v_query->'window'->>'count')::NUMERIC > 168 THEN
          RETURN 'query.window.count überschreitet Maximalwert für stunde (168)';
        END IF;
        IF (v_query->'window'->>'resolution') = 'tag' AND (v_query->'window'->>'count')::NUMERIC > 366 THEN
          RETURN 'query.window.count überschreitet Maximalwert für tag (366)';
        END IF;
        IF (v_query->'window'->>'resolution') = 'woche' AND (v_query->'window'->>'count')::NUMERIC > 260 THEN
          RETURN 'query.window.count überschreitet Maximalwert für woche (260)';
        END IF;
        IF (v_query->'window'->>'resolution') = 'monat' AND (v_query->'window'->>'count')::NUMERIC > 120 THEN
          RETURN 'query.window.count überschreitet Maximalwert für monat (120)';
        END IF;
      END IF;

      -- Auftrag 170: query.compare ('vorperiode' | 'vorjahr')
      IF v_query ? 'compare' AND (
        jsonb_typeof(v_query->'compare') IS DISTINCT FROM 'string'
        OR (v_query->>'compare') NOT IN ('vorperiode', 'vorjahr')
      ) THEN
        RETURN 'query.compare muss vorperiode oder vorjahr sein';
      END IF;

      -- Auftrag 170: query.join ({ metricId, typ: 'inner' | 'links' })
      IF v_query ? 'join' THEN
        IF jsonb_typeof(v_query->'join') IS DISTINCT FROM 'object' THEN
          RETURN 'query.join muss ein Objekt sein';
        END IF;
        IF EXISTS (
          SELECT 1 FROM jsonb_object_keys(v_query->'join') AS jk WHERE jk NOT IN ('metricId', 'typ')
        ) THEN
          RETURN 'query.join enthält unbekannte Felder';
        END IF;
        IF jsonb_typeof(v_query->'join'->'metricId') IS DISTINCT FROM 'string'
           OR char_length(trim(v_query->'join'->>'metricId')) < 1
           OR char_length(v_query->'join'->>'metricId') > 120 THEN
          RETURN 'query.join.metricId fehlt oder ist ungültig';
        END IF;
        IF jsonb_typeof(v_query->'join'->'typ') IS DISTINCT FROM 'string'
           OR (v_query->'join'->>'typ') NOT IN ('inner', 'links') THEN
          RETURN 'query.join.typ muss inner oder links sein';
        END IF;
      END IF;

      -- Auftrag 170: query.bands ({ type: 'percentile_10_90', periodCount: 8 })
      IF v_query ? 'bands' THEN
        IF jsonb_typeof(v_query->'bands') IS DISTINCT FROM 'object' THEN
          RETURN 'query.bands muss ein Objekt sein';
        END IF;
        IF EXISTS (
          SELECT 1 FROM jsonb_object_keys(v_query->'bands') AS bk WHERE bk NOT IN ('type', 'periodCount')
        ) THEN
          RETURN 'query.bands enthält unbekannte Felder';
        END IF;
        IF (v_query->'bands'->>'type') IS DISTINCT FROM 'percentile_10_90' THEN
          RETURN 'query.bands.type muss percentile_10_90 sein';
        END IF;
        IF jsonb_typeof(v_query->'bands'->'periodCount') IS DISTINCT FROM 'number'
           OR (v_query->'bands'->>'periodCount')::NUMERIC <> 8 THEN
          RETURN 'query.bands.periodCount muss 8 sein';
        END IF;
      END IF;

      -- Auftrag 170: Vergleich, Join und Band zeichnet nur die Linien-/Flächendarstellung
      IF (v_query ? 'compare' OR v_query ? 'join' OR v_query ? 'bands')
         AND (v_tile->>'presentation') NOT IN ('linie', 'flaeche') THEN
        RETURN 'query.compare, query.join und query.bands sind nur für Linie oder Fläche zulässig';
      END IF;

      -- Auftrag 170: Vergleich, Join und Band nicht mit wertverändernden Transformationen
      IF (v_query ? 'compare' OR v_query ? 'join' OR v_query ? 'bands')
         AND jsonb_typeof(v_query->'transformations') = 'array'
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements(v_query->'transformations') AS tr
           WHERE tr->>'art' IS DISTINCT FROM 'umbenennen'
         ) THEN
        RETURN 'query.compare, query.join und query.bands sind nicht mit Umrechnung oder gleitendem Durchschnitt kombinierbar';
      END IF;

      -- Auftrag 169: Validierung von query.transformations
      IF v_query ? 'transformations' THEN
        v_transformations := v_query->'transformations';
        IF jsonb_typeof(v_transformations) IS DISTINCT FROM 'array' THEN
          RETURN 'query.transformations muss ein Array sein';
        END IF;
        IF jsonb_array_length(v_transformations) > 3 THEN
          RETURN 'maximal 3 Transformationen je Kachel zulässig';
        END IF;

        FOR v_trans IN SELECT value FROM jsonb_array_elements(v_transformations) LOOP
          IF jsonb_typeof(v_trans) <> 'object' THEN
            RETURN 'Transformation-Eintrag ist kein Objekt';
          END IF;

          IF NOT (v_trans ? 'art') THEN
            RETURN 'Transformation-Pflichtfeld art fehlt';
          END IF;

          v_art := v_trans->>'art';
          IF v_art NOT IN ('umbenennen', 'einheit_umrechnen', 'gleitender_durchschnitt') THEN
            RETURN 'unzulässige Transformationsart';
          END IF;

          IF v_art = 'umbenennen' THEN
            IF EXISTS (
              SELECT 1 FROM jsonb_object_keys(v_trans) AS tk
              WHERE tk NOT IN ('art', 'name')
            ) THEN
              RETURN 'unbekanntes Feld in umbenennen-Transformation';
            END IF;
            IF NOT (v_trans ? 'name') OR jsonb_typeof(v_trans->'name') IS DISTINCT FROM 'string' THEN
              RETURN 'name muss ein String sein';
            END IF;
            v_name := btrim(v_trans->>'name');
            IF char_length(v_name) < 1 OR char_length(v_name) > 60 THEN
              RETURN 'name muss nach dem Trimmen zwischen 1 und 60 Zeichen lang sein';
            END IF;
          ELSIF v_art = 'einheit_umrechnen' THEN
            IF EXISTS (
              SELECT 1 FROM jsonb_object_keys(v_trans) AS tk
              WHERE tk NOT IN ('art', 'von', 'zu')
            ) THEN
              RETURN 'unbekanntes Feld in einheit_umrechnen-Transformation';
            END IF;
            IF NOT (v_trans ? 'von') OR jsonb_typeof(v_trans->'von') IS DISTINCT FROM 'string'
               OR NOT (v_trans ? 'zu') OR jsonb_typeof(v_trans->'zu') IS DISTINCT FROM 'string' THEN
              RETURN 'von und zu müssen Strings sein';
            END IF;
            IF NOT EXISTS (
              SELECT 1 FROM public.dashboard_unit_conversions
              WHERE von = (v_trans->>'von') AND zu = (v_trans->>'zu')
            ) THEN
              RETURN 'Umrechnung nicht in Positivliste';
            END IF;
          ELSIF v_art = 'gleitender_durchschnitt' THEN
            IF EXISTS (
              SELECT 1 FROM jsonb_object_keys(v_trans) AS tk
              WHERE tk NOT IN ('art', 'fenster')
            ) THEN
              RETURN 'unbekanntes Feld in gleitender_durchschnitt-Transformation';
            END IF;
            IF NOT (v_trans ? 'fenster') OR jsonb_typeof(v_trans->'fenster') IS DISTINCT FROM 'number' THEN
              RETURN 'fenster muss eine Zahl sein';
            END IF;
            IF (v_trans->>'fenster')::NUMERIC % 1 <> 0
               OR (v_trans->>'fenster')::INTEGER < 2
               OR (v_trans->>'fenster')::INTEGER > 30 THEN
              RETURN 'fenster muss eine ganze Zahl zwischen 2 und 30 sein';
            END IF;
          END IF;
        END LOOP;
      END IF;
    END IF;
  END LOOP;

  IF p_config ? 'sections' THEN
    v_sections := p_config->'sections';
    IF jsonb_typeof(v_sections) IS DISTINCT FROM 'array' THEN
      RETURN 'sections muss ein Array sein';
    END IF;
    IF jsonb_array_length(v_sections) > 12 THEN
      RETURN 'maximal 12 Sektionen zulässig';
    END IF;

    FOR v_section IN SELECT value FROM jsonb_array_elements(v_sections) LOOP
      IF jsonb_typeof(v_section) <> 'object' THEN
        RETURN 'Sektion-Eintrag ist kein Objekt';
      END IF;

      IF EXISTS (
        SELECT 1 FROM jsonb_object_keys(v_section) AS sk
        WHERE sk NOT IN ('id', 'title', 'collapsed', 'tileIds')
      ) THEN
        RETURN 'unbekanntes Sektions-Feld im JSON';
      END IF;

      IF NOT (v_section ? 'id' AND v_section ? 'title' AND v_section ? 'collapsed' AND v_section ? 'tileIds') THEN
        RETURN 'Sektion-Pflichtfeld fehlt (erwartet: id, title, collapsed, tileIds)';
      END IF;

      IF jsonb_typeof(v_section->'id') IS DISTINCT FROM 'string'
         OR char_length(trim(v_section->>'id')) < 1
         OR char_length(v_section->>'id') > 64 THEN
        RETURN 'Sektion-ID muss ein nicht-leerer String (max. 64 Zeichen) sein';
      END IF;

      v_sec_id := v_section->>'id';
      IF v_sec_id = ANY(v_section_ids) THEN
        RETURN 'Sektion-IDs müssen eindeutig sein';
      END IF;
      v_section_ids := array_append(v_section_ids, v_sec_id);

      IF jsonb_typeof(v_section->'title') IS DISTINCT FROM 'string'
         OR char_length(trim(v_section->>'title')) < 1
         OR char_length(trim(v_section->>'title')) > 80 THEN
        RETURN 'Sektion-Titel muss nach dem Trimmen zwischen 1 und 80 Zeichen lang sein';
      END IF;

      IF jsonb_typeof(v_section->'collapsed') IS DISTINCT FROM 'boolean' THEN
        RETURN 'Sektion-collapsed muss ein boolescher Wert sein';
      END IF;

      v_sec_tids := v_section->'tileIds';
      IF jsonb_typeof(v_sec_tids) IS DISTINCT FROM 'array' THEN
        RETURN 'Sektion-tileIds muss ein Array sein';
      END IF;

      FOR v_elem IN SELECT value FROM jsonb_array_elements(v_sec_tids) LOOP
        IF jsonb_typeof(v_elem) IS DISTINCT FROM 'string' OR char_length(trim(v_elem #>> '{}')) < 1 THEN
          RETURN 'Kachel-ID in Sektion muss ein String sein';
        END IF;

        v_tid := v_elem #>> '{}';
        IF NOT (v_tid = ANY(v_all_tile_ids)) THEN
          RETURN 'Kachel-ID in Sektion existiert nicht in tiles';
        END IF;

        IF v_tid = ANY(v_assigned_tile_ids) THEN
          RETURN 'Kachel-ID ist mehr als einer Sektion zugeordnet';
        END IF;

        v_assigned_tile_ids := array_append(v_assigned_tile_ids, v_tid);
      END LOOP;
    END LOOP;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_config_v2_invalid_reason(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_config_v2_invalid_reason(JSONB) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4. Aktualisierung: public.check_dashboard_alarm_transformations
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_dashboard_alarm_transformations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rule RECORD;
  v_tile JSONB;
  v_permitted BOOLEAN;
BEGIN
  IF NEW.config IS NULL OR NEW.config->'tiles' IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_rule IN
    SELECT r.id, r.tile_id
    FROM public.dashboard_alarm_rules r
    WHERE r.dashboard_id = NEW.id AND r.status = 'aktiv'
  LOOP
    SELECT t INTO v_tile
    FROM jsonb_array_elements(NEW.config->'tiles') t
    WHERE t->>'id' = v_rule.tile_id;

    -- Auftrag 170: Heatmap, Vergleich und Join liefern keinen Einzelwert.
    v_permitted := NULL;
    IF v_tile IS NOT NULL AND (
      v_tile->>'presentation' = 'heatmap'
      OR (v_tile ? 'query' AND v_tile->'query' ? 'compare')
      OR (v_tile ? 'query' AND v_tile->'query' ? 'join')
    ) THEN
      v_permitted := FALSE;
    ELSIF v_tile IS NOT NULL AND (v_tile ? 'query') AND (v_tile->'query' ? 'transformations') THEN
      v_permitted := public.alarm_is_transformation_chain_alarm_permitted(v_tile->'query'->'transformations');
    END IF;
    IF v_tile IS NOT NULL THEN
      IF v_permitted IS FALSE THEN
        UPDATE public.dashboard_alarm_rules
        SET status = 'pausiert',
            pause_grund = 'kennzahl_nicht_alarmfaehig',
            updated_at = now()
        WHERE id = v_rule.id;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

