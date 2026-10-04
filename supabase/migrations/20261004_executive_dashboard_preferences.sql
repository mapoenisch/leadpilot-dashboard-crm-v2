-- Auftrag 072 (Executive Dashboard, Teilauftrag 3): persönliche Dashboard-Konfiguration.
-- Eine Zeile je Benutzer und Organisation. Lesen nur die eigene Zeile (RLS), Schreiben
-- ausschließlich über save_dashboard_preferences mit erwarteter Revision. Organisation und
-- Benutzer stammen nur aus der Sitzung. Auch Viewer dürfen ihr Layout speichern (Plan §6);
-- die Funktion berührt keine CRM- oder Organisationsdaten.

CREATE TABLE IF NOT EXISTS public.executive_dashboard_preferences (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config JSONB NOT NULL,
  schema_version INTEGER NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

ALTER TABLE public.executive_dashboard_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dashboard_preferences_select_own" ON public.executive_dashboard_preferences;
CREATE POLICY "dashboard_preferences_select_own" ON public.executive_dashboard_preferences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND organization_id = public.current_organization_id());

REVOKE ALL ON public.executive_dashboard_preferences FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.executive_dashboard_preferences FROM authenticated;
GRANT SELECT ON public.executive_dashboard_preferences TO authenticated;

-- Serverseitige Formprüfung (Plan §6): erlaubte Schlüssel und Typen auf allen Ebenen, damit
-- keine Kennzahlenwerte, SQL-Fragmente oder Formeln im JSON landen. Die fachliche Prüfung
-- (Katalog, Darstellung, Größe) übernimmt der Client mit validateDashboardConfig.
-- Liefert NULL, wenn die Form passt, sonst einen kurzen Grund.
CREATE OR REPLACE FUNCTION public.dashboard_preferences_period_invalid(p_period JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_typeof(p_period) IS DISTINCT FROM 'object'
    OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_period) AS k WHERE k NOT IN ('from', 'to'))
    OR jsonb_typeof(p_period->'from') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_period->'to') IS DISTINCT FROM 'string'
$$;

CREATE OR REPLACE FUNCTION public.dashboard_preferences_invalid_reason(p_config JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  tile JSONB;
  filters JSONB := p_config->'filters';
BEGIN
  IF p_config IS NULL OR jsonb_typeof(p_config) <> 'object' THEN
    RETURN 'kein Objekt';
  END IF;
  IF octet_length(p_config::text) > 32768 THEN
    RETURN 'zu groß';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_config) AS k WHERE k NOT IN ('version', 'filters', 'tiles')
  ) THEN
    RETURN 'unbekanntes Feld';
  END IF;
  IF p_config->'version' IS DISTINCT FROM '1'::jsonb THEN
    RETURN 'unbekannte Version';
  END IF;
  IF filters IS NOT NULL THEN
    IF jsonb_typeof(filters) <> 'object'
      OR EXISTS (SELECT 1 FROM jsonb_object_keys(filters) AS k WHERE k NOT IN ('period', 'pipeline'))
      OR (filters ? 'period' AND public.dashboard_preferences_period_invalid(filters->'period'))
      OR (filters ? 'pipeline' AND jsonb_typeof(filters->'pipeline') <> 'string') THEN
      RETURN 'filters ungültig';
    END IF;
  END IF;
  IF jsonb_typeof(p_config->'tiles') IS DISTINCT FROM 'array' THEN
    RETURN 'tiles ist kein Array';
  END IF;
  IF jsonb_array_length(p_config->'tiles') > 24 THEN
    RETURN 'zu viele Kacheln';
  END IF;
  FOR tile IN SELECT value FROM jsonb_array_elements(p_config->'tiles') LOOP
    IF jsonb_typeof(tile) <> 'object'
      OR EXISTS (
        SELECT 1 FROM jsonb_object_keys(tile) AS k
        WHERE k NOT IN ('tileId', 'catalogId', 'view', 'size', 'title', 'filterMode', 'period', 'pipeline')
      )
      OR jsonb_typeof(tile->'tileId') IS DISTINCT FROM 'string'
      OR jsonb_typeof(tile->'catalogId') IS DISTINCT FROM 'string'
      OR jsonb_typeof(tile->'view') IS DISTINCT FROM 'string'
      OR jsonb_typeof(tile->'size') IS DISTINCT FROM 'string'
      OR jsonb_typeof(tile->'filterMode') IS DISTINCT FROM 'string'
      OR (tile ? 'title' AND jsonb_typeof(tile->'title') <> 'string')
      OR (tile ? 'pipeline' AND jsonb_typeof(tile->'pipeline') <> 'string')
      OR (tile ? 'period' AND public.dashboard_preferences_period_invalid(tile->'period')) THEN
      RETURN 'Kachel ungültig';
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_preferences_period_invalid(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dashboard_preferences_invalid_reason(JSONB) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_dashboard_preferences(
  p_config JSONB,
  p_expected_revision INTEGER
)
RETURNS TABLE (revision INTEGER, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_org UUID := public.current_organization_id();
  v_reason TEXT;
  v_revision INTEGER;
  v_updated TIMESTAMPTZ;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NO_MEMBERSHIP' USING ERRCODE = '42501';
  END IF;

  v_reason := public.dashboard_preferences_invalid_reason(p_config);
  IF v_reason IS NOT NULL THEN
    RAISE EXCEPTION 'LP_DASHBOARD_INVALID' USING ERRCODE = '22023', DETAIL = v_reason;
  END IF;

  IF p_expected_revision IS NULL OR p_expected_revision < 0 THEN
    RAISE EXCEPTION 'LP_DASHBOARD_INVALID' USING ERRCODE = '22023', DETAIL = 'Revision fehlt';
  END IF;

  IF p_expected_revision = 0 THEN
    BEGIN
      INSERT INTO public.executive_dashboard_preferences AS p
        (organization_id, user_id, config, schema_version, revision)
      VALUES (v_org, v_user, p_config, 1, 1)
      RETURNING p.revision, p.updated_at INTO v_revision, v_updated;
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'LP_DASHBOARD_CONFLICT' USING ERRCODE = 'P0001';
    END;
  ELSE
    UPDATE public.executive_dashboard_preferences AS p
    SET config = p_config,
        schema_version = 1,
        revision = p.revision + 1,
        updated_at = now()
    WHERE p.organization_id = v_org
      AND p.user_id = v_user
      AND p.revision = p_expected_revision
    RETURNING p.revision, p.updated_at INTO v_revision, v_updated;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'LP_DASHBOARD_CONFLICT' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN QUERY SELECT v_revision, v_updated;
END;
$$;

REVOKE ALL ON FUNCTION public.save_dashboard_preferences(JSONB, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_dashboard_preferences(JSONB, INTEGER) TO authenticated;
