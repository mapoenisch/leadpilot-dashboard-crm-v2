-- Migration: 20261117_dashboard_sections.sql
-- Auftrag 157 (P09a): Dashboard-Editor: Sektionen und einklappbare Gruppen
--
-- 1. Erweiterung von public.dashboard_config_v2_invalid_reason um Validierung von sections
-- 2. Rechtevergabe (REVOKE von PUBLIC/anon, GRANT an authenticated, service_role)

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
  v_all_tile_ids TEXT[] := ARRAY[]::TEXT[];
  v_sections JSONB;
  v_section JSONB;
  v_sec_id TEXT;
  v_sec_tids JSONB;
  v_elem JSONB;
  v_tid TEXT;
  v_section_ids TEXT[] := ARRAY[]::TEXT[];
  v_assigned_tile_ids TEXT[] := ARRAY[]::TEXT[];
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

    -- Tablet (optional)
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

    -- Mobile (optional)
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

    -- Abfrage (query) strukturell validieren (Auftrag 154 §2.3 Nr. 10)
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

      -- timeframe: String (<= 64 Zeichen)
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

  -- Sektionen validieren (Auftrag 157 / P09a)
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

      -- Erlaubte Schlüssel
      IF EXISTS (
        SELECT 1 FROM jsonb_object_keys(v_section) AS sk
        WHERE sk NOT IN ('id', 'title', 'collapsed', 'tileIds')
      ) THEN
        RETURN 'unbekanntes Sektions-Feld im JSON';
      END IF;

      -- Pflichtfelder
      IF NOT (v_section ? 'id' AND v_section ? 'title' AND v_section ? 'collapsed' AND v_section ? 'tileIds') THEN
        RETURN 'Sektion-Pflichtfeld fehlt (erwartet: id, title, collapsed, tileIds)';
      END IF;

      -- id
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

      -- title
      IF jsonb_typeof(v_section->'title') IS DISTINCT FROM 'string'
         OR char_length(trim(v_section->>'title')) < 1
         OR char_length(trim(v_section->>'title')) > 80 THEN
        RETURN 'Sektion-Titel muss nach dem Trimmen zwischen 1 und 80 Zeichen lang sein';
      END IF;

      -- collapsed
      IF jsonb_typeof(v_section->'collapsed') IS DISTINCT FROM 'boolean' THEN
        RETURN 'Sektion-collapsed muss ein boolescher Wert sein';
      END IF;

      -- tileIds
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
