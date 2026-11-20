-- Migration: 20261126_dashboard_transformations.sql
-- Auftrag 169 (P14a): Dashboard-Editor: Transformationen je Kachel mit Alarmfähigkeit
-- 1. Tabelle public.dashboard_unit_conversions (Positivliste der Einheitenumrechnungen)
-- 2. Erweiterung von public.dashboard_config_v2_invalid_reason um query.transformations
-- 3. Funktion public.alarm_is_transformation_chain_alarm_permitted
-- 4. Funktion public.alarm_apply_transformations
-- 5. Trigger public.check_dashboard_alarm_transformations zum Pausieren aktiver Regeln bei nicht alarmfähigen Transformationen
-- 6. Aktualisierung von public.evaluate_dashboard_alarms (kachelspezifische Auswertung & Transformation)

-- ============================================================================
-- 1. Tabelle public.dashboard_unit_conversions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dashboard_unit_conversions (
  id TEXT PRIMARY KEY,
  von TEXT NOT NULL,
  zu TEXT NOT NULL,
  faktor NUMERIC NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('divide', 'multiply')),
  operand NUMERIC NOT NULL,
  ziel_format TEXT NOT NULL,
  begruendung TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (von, zu)
);

ALTER TABLE public.dashboard_unit_conversions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.dashboard_unit_conversions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.dashboard_unit_conversions TO authenticated, service_role;

DROP POLICY IF EXISTS unit_conversions_authenticated_select ON public.dashboard_unit_conversions;
CREATE POLICY unit_conversions_authenticated_select ON public.dashboard_unit_conversions
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Auftrag 169 §2.1 Nr. 5: pause_grund Spalte für dashboard_alarm_rules
ALTER TABLE public.dashboard_alarm_rules
  ADD COLUMN IF NOT EXISTS pause_grund TEXT;

-- BEGIN GENERATED UNIT CONVERSIONS
-- Erzeugt durch: npx tsx scripts/generateUnitConversionsSql.ts
TRUNCATE TABLE public.dashboard_unit_conversions;
INSERT INTO public.dashboard_unit_conversions (id, von, zu, faktor, operation, operand, ziel_format, begruendung)
VALUES
  ('eur_in_tsdeur', 'EUR', 'Tsd. EUR', 0.001, 'divide', 1000, 'eur_tsd', 'Übersichtlichere Darstellung hoher Euro-Beträge in Tausend Euro.'),
  ('eur_in_mioeur', 'EUR', 'Mio. EUR', 0.000001, 'divide', 1000000, 'eur_mio', 'Übersichtlichere Darstellung großer Euro-Beträge in Millionen Euro.'),
  ('anzahl_in_tsd', 'Anzahl', 'Tsd.', 0.001, 'divide', 1000, 'anzahl_tsd', 'Kompakte Darstellung großer Stückzahlen in Tausend.'),
  ('anteil_in_prozent', 'Anteil 0–1', '%', 100, 'multiply', 100, 'prozent', 'Umrechnung von Dezimalanteilen (0.0 bis 1.0) in lesbare Prozentwerte.');
-- END GENERATED UNIT CONVERSIONS

-- ============================================================================
-- 2. Aktualisierung: public.dashboard_config_v2_invalid_reason
-- ============================================================================

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
        WHERE qk NOT IN ('metricId', 'pipelineId', 'timeframe', 'aggregation', 'groupBy', 'filters', 'window', 'transformations')
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

-- ============================================================================
-- 3. Funktion: public.alarm_is_transformation_chain_alarm_permitted
-- ============================================================================

CREATE OR REPLACE FUNCTION public.alarm_is_transformation_chain_alarm_permitted(p_transformations JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_trans JSONB;
  v_art TEXT;
BEGIN
  IF p_transformations IS NULL OR jsonb_array_length(p_transformations) = 0 THEN
    RETURN TRUE;
  END IF;

  FOR v_trans IN SELECT value FROM jsonb_array_elements(p_transformations) LOOP
    v_art := v_trans->>'art';
    IF v_art NOT IN ('umbenennen', 'einheit_umrechnen') THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.alarm_is_transformation_chain_alarm_permitted(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.alarm_is_transformation_chain_alarm_permitted(JSONB) TO authenticated, service_role;

-- ============================================================================
-- 4. Funktion: public.alarm_apply_transformations
-- ============================================================================

CREATE OR REPLACE FUNCTION public.alarm_apply_transformations(
  p_kpi_result JSONB,
  p_transformations JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_wert NUMERIC := (p_kpi_result->>'wert')::NUMERIC;
  v_einheit TEXT := p_kpi_result->>'einheit';
  v_zustand TEXT := p_kpi_result->>'zustand';
  v_trans JSONB;
  v_art TEXT;
  v_conv RECORD;
BEGIN
  IF p_transformations IS NULL OR jsonb_typeof(p_transformations) IS DISTINCT FROM 'array' OR jsonb_array_length(p_transformations) = 0 THEN
    RETURN jsonb_build_object(
      'wert', v_wert,
      'einheit', v_einheit,
      'zustand', v_zustand,
      'alarmfaehig', true
    );
  END IF;

  FOR v_trans IN SELECT value FROM jsonb_array_elements(p_transformations) LOOP
    v_art := v_trans->>'art';

    IF v_art = 'umbenennen' THEN
      -- Umbenennen ändert weder Wert noch Einheit
      CONTINUE;
    ELSIF v_art = 'einheit_umrechnen' THEN
      SELECT * INTO v_conv
      FROM public.dashboard_unit_conversions
      WHERE von = (v_trans->>'von') AND zu = (v_trans->>'zu');

      IF NOT FOUND THEN
        RETURN jsonb_build_object(
          'wert', v_wert,
          'einheit', v_einheit,
          'zustand', v_zustand,
          'alarmfaehig', false,
          'pause_grund', 'kennzahl_nicht_alarmfaehig'
        );
      END IF;

      IF v_wert IS NOT NULL THEN
        IF v_conv.operation = 'divide' THEN
          v_wert := v_wert / v_conv.operand;
        ELSE
          v_wert := v_wert * v_conv.operand;
        END IF;
      END IF;
      v_einheit := v_conv.zu;

    ELSE
      -- gleitender_durchschnitt oder unbekannte Art -> nicht alarmfähig
      RETURN jsonb_build_object(
        'wert', v_wert,
        'einheit', v_einheit,
        'zustand', v_zustand,
        'alarmfaehig', false,
        'pause_grund', 'kennzahl_nicht_alarmfaehig'
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'wert', v_wert,
    'einheit', v_einheit,
    'zustand', v_zustand,
    'alarmfaehig', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.alarm_apply_transformations(JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.alarm_apply_transformations(JSONB, JSONB) TO authenticated, service_role;

-- ============================================================================
-- 5. Trigger: Pausieren aktiver Alarme bei nicht alarmfähigen Transformationen
-- ============================================================================

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

    IF v_tile IS NOT NULL AND (v_tile ? 'query') AND (v_tile->'query' ? 'transformations') THEN
      v_permitted := public.alarm_is_transformation_chain_alarm_permitted(v_tile->'query'->'transformations');
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

DROP TRIGGER IF EXISTS trg_dashboard_alarm_transformations ON public.dashboards;
CREATE TRIGGER trg_dashboard_alarm_transformations
  AFTER INSERT OR UPDATE OF config ON public.dashboards
  FOR EACH ROW
  EXECUTE FUNCTION public.check_dashboard_alarm_transformations();

-- ============================================================================
-- 6. Aktualisierung Worker-Engine (evaluate_dashboard_alarms)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.evaluate_dashboard_alarms(
  p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_active BOOLEAN;
  v_run_id UUID;
  v_regeln_gesamt INT := 0;
  v_regeln_ausgewertet INT := 0;
  v_ereignisse_erzeugt INT := 0;
  v_fehler_anzahl INT := 0;
  v_r RECORD;
  v_dash RECORD;
  v_tile JSONB;
  v_resp_valid BOOLEAN;
  v_kpi_res JSONB;
  v_eval_res JSONB;
  v_wert NUMERIC;
  v_einheit TEXT;
  v_zustand TEXT;
  v_stufe TEXT;
  v_grenze NUMERIC;
  v_text TEXT;
  v_state RECORD;
  v_start_time TIMESTAMPTZ := clock_timestamp();
  v_cooldown_ok BOOLEAN;
  v_laeufe_neu INT;
BEGIN
  -- 1. Not-Aus prüfen
  SELECT auswertung_aktiv INTO v_active FROM public.alarm_settings WHERE id = 1;
  IF v_active IS FALSE THEN
    INSERT INTO public.alarm_worker_runs (gestartet_am, beendet_am, dauer_ms, status, fehler_text)
    VALUES (p_now, clock_timestamp(), 0, 'pausiert', 'Not-Aus aktiv: auswertung_aktiv = false');
    RETURN jsonb_build_object('status', 'pausiert', 'grund', 'Not-Aus aktiv');
  END IF;

  -- 2. Worker Run anlegen
  INSERT INTO public.alarm_worker_runs (gestartet_am, status)
  VALUES (p_now, 'in_arbeit')
  RETURNING id INTO v_run_id;

  -- 3. Alle aktiven Regeln durchlaufen
  FOR v_r IN
    SELECT *
    FROM public.dashboard_alarm_rules
    WHERE status = 'aktiv'
    ORDER BY created_at ASC
  LOOP
    v_regeln_gesamt := v_regeln_gesamt + 1;

    BEGIN
      -- A. Existiert Dashboard und Kachel?
      SELECT id, config INTO v_dash FROM public.dashboards WHERE id = v_r.dashboard_id;
      IF NOT FOUND THEN
        UPDATE public.dashboard_alarm_rules SET status = 'kachel_entfernt', updated_at = p_now WHERE id = v_r.id;
        CONTINUE;
      END IF;

      -- Kachel im Config suchen
      SELECT t INTO v_tile
      FROM jsonb_array_elements(v_dash.config->'tiles') t
      WHERE t->>'id' = v_r.tile_id;

      IF v_tile IS NULL THEN
        UPDATE public.dashboard_alarm_rules SET status = 'kachel_entfernt', updated_at = p_now WHERE id = v_r.id;
        CONTINUE;
      END IF;

      -- B. Verantwortlicher noch mit Rechten?
      SELECT EXISTS (
        SELECT 1
        FROM public.organization_members m
        WHERE m.organization_id = v_r.organization_id
          AND m.user_id = v_r.responsible_user_id
          AND m.status = 'active'
          AND m.role IN ('admin', 'manager')
      ) INTO v_resp_valid;

      IF NOT v_resp_valid THEN
        UPDATE public.dashboard_alarm_rules SET status = 'verantwortlicher_ohne_rechte', updated_at = p_now WHERE id = v_r.id;
        CONTINUE;
      END IF;

      -- C. Rohwert holen
      v_kpi_res := public.alarm_kpi_value(v_r.organization_id, v_r.catalog_id, v_r.pipeline);

      -- Kachelspezifische Transformationen anwenden (Auftrag 169)
      IF (v_tile ? 'query') AND (v_tile->'query' ? 'transformations') THEN
        v_kpi_res := public.alarm_apply_transformations(v_kpi_res, v_tile->'query'->'transformations');
      ELSE
        v_kpi_res := jsonb_set(v_kpi_res, '{alarmfaehig}', 'true'::jsonb);
      END IF;

      IF (v_kpi_res->>'alarmfaehig')::BOOLEAN IS FALSE THEN
        UPDATE public.dashboard_alarm_rules
        SET status = 'pausiert',
            pause_grund = COALESCE(v_kpi_res->>'pause_grund', 'kennzahl_nicht_alarmfaehig'),
            updated_at = p_now
        WHERE id = v_r.id;
        CONTINUE;
      END IF;

      v_wert := (v_kpi_res->>'wert')::NUMERIC;
      v_einheit := v_kpi_res->>'einheit';
      v_zustand := v_kpi_res->>'zustand';

      -- D. Schwellenwert auswerten
      v_eval_res := public.alarm_evaluate_threshold(v_r.rule_config, v_wert, v_zustand, v_einheit);
      v_stufe := v_eval_res->>'stufe';
      v_grenze := (v_eval_res->>'grenze')::NUMERIC;
      v_text := COALESCE(v_eval_res->>'text', '');

      -- E. Zustand abgleichen
      SELECT * INTO v_state FROM public.dashboard_alarm_state WHERE rule_id = v_r.id;
      IF NOT FOUND THEN
        -- Initialer Zustand
        INSERT INTO public.dashboard_alarm_state (
          rule_id, organization_id, beobachtete_stufe, beobachtet_seit, beobachtete_laeufe,
          bestaetigte_stufe, bestaetigt_am, letzter_messwert, letzte_einheit, letzte_auswertung
        )
        VALUES (
          v_r.id, v_r.organization_id, v_stufe, p_now, 1,
          v_stufe, p_now, v_wert, v_einheit, p_now
        )
        RETURNING * INTO v_state;
      ELSE
        -- Update Zustand
        IF v_stufe = v_state.beobachtete_stufe THEN
          v_laeufe_neu := v_state.beobachtete_laeufe + 1;
        ELSE
          v_laeufe_neu := 1;
        END IF;

        -- Prüfen ob Mindestdauer erreicht und Stufe geändert
        IF v_laeufe_neu >= v_r.mindestdauer_laeufe AND v_stufe <> v_state.bestaetigte_stufe THEN
          -- Cooldown prüfen:
          -- Eskalation zu kritisch durchbricht Abklingzeit
          v_cooldown_ok := TRUE;
          IF v_stufe <> 'kritisch' AND v_state.letztes_ereignis_am IS NOT NULL AND v_r.abklingzeit_sekunden > 0 THEN
            IF p_now < v_state.letztes_ereignis_am + (v_r.abklingzeit_sekunden * interval '1 second') THEN
              v_cooldown_ok := FALSE;
            END IF;
          END IF;

          IF v_cooldown_ok THEN
            -- Alarm-Ereignis erzeugen
            INSERT INTO public.dashboard_alarm_events (
              organization_id, rule_id, trigger_run_id, alter_zustand, neuer_zustand,
              messwert, einheit, grenze, meldung, created_at
            )
            VALUES (
              v_r.organization_id, v_r.id, v_run_id, v_state.bestaetigte_stufe, v_stufe,
              v_wert, v_einheit, v_grenze, v_text, p_now
            );

            v_ereignisse_erzeugt := v_ereignisse_erzeugt + 1;

            UPDATE public.dashboard_alarm_state
            SET beobachtete_stufe = v_stufe,
                beobachtet_seit = CASE WHEN v_stufe = v_state.beobachtete_stufe THEN v_state.beobachtet_seit ELSE p_now END,
                beobachtete_laeufe = v_laeufe_neu,
                bestaetigte_stufe = v_stufe,
                bestaetigt_am = p_now,
                letzter_messwert = v_wert,
                letzte_einheit = v_einheit,
                letzte_auswertung = p_now,
                letztes_ereignis_am = p_now,
                letzte_ereignis_stufe = v_stufe,
                auswertungsfehler = NULL
            WHERE rule_id = v_r.id;
          ELSE
            -- Cooldown blockiert Ereigniserzeugung
            UPDATE public.dashboard_alarm_state
            SET beobachtete_stufe = v_stufe,
                beobachtet_seit = CASE WHEN v_stufe = v_state.beobachtete_stufe THEN v_state.beobachtet_seit ELSE p_now END,
                beobachtete_laeufe = v_laeufe_neu,
                letzter_messwert = v_wert,
                letzte_einheit = v_einheit,
                letzte_auswertung = p_now,
                auswertungsfehler = NULL
            WHERE rule_id = v_r.id;
          END IF;
        ELSE
          -- Keine Stufenänderung
          UPDATE public.dashboard_alarm_state
          SET beobachtete_stufe = v_stufe,
              beobachtet_seit = CASE WHEN v_stufe = v_state.beobachtete_stufe THEN v_state.beobachtet_seit ELSE p_now END,
              beobachtete_laeufe = v_laeufe_neu,
              letzter_messwert = v_wert,
              letzte_einheit = v_einheit,
              letzte_auswertung = p_now,
              auswertungsfehler = NULL
            WHERE rule_id = v_r.id;
        END IF;
      END IF;

      v_regeln_ausgewertet := v_regeln_ausgewertet + 1;

    EXCEPTION WHEN OTHERS THEN
      v_fehler_anzahl := v_fehler_anzahl + 1;
      UPDATE public.dashboard_alarm_state
      SET auswertungsfehler = SQLERRM,
          letzte_auswertung = p_now
      WHERE rule_id = v_r.id;
    END;
  END LOOP;

  -- 4. Worker Run abschließen
  UPDATE public.alarm_worker_runs
  SET beendet_am = clock_timestamp(),
      dauer_ms = ROUND(EXTRACT(EPOCH FROM (clock_timestamp() - v_start_time)) * 1000)::INT,
      status = CASE WHEN v_fehler_anzahl > 0 THEN 'fehler' ELSE 'erfolg' END,
      regeln_gesamt = v_regeln_gesamt,
      regeln_ausgewertet = v_regeln_ausgewertet,
      ereignisse_erzeugt = v_ereignisse_erzeugt,
      fehler_text = CASE WHEN v_fehler_anzahl > 0 THEN v_fehler_anzahl || ' Fehler bei der Regelauswertung aufgetreten' ELSE NULL END
  WHERE id = v_run_id;

  RETURN jsonb_build_object(
    'status', 'erfolg',
    'run_id', v_run_id,
    'regeln_gesamt', v_regeln_gesamt,
    'regeln_ausgewertet', v_regeln_ausgewertet,
    'ereignisse_erzeugt', v_ereignisse_erzeugt,
    'fehler_anzahl', v_fehler_anzahl
  );
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_dashboard_alarms(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_dashboard_alarms(TIMESTAMPTZ) TO service_role;
