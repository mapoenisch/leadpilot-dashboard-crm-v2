-- Migration: 20261118_dashboard_selection.sql
-- Auftrag 158 (P09b): V2-Vorlagen und Dashboard-Auswahl
--
-- 1. Ersetzung von create_dashboard_v2 (Obergrenze 20 persönliche Dashboards, Titel 1-80 Zeichen nach Trimmen)
-- 2. Neue RPC: list_personal_dashboards_v2()
-- 3. Neue RPC: delete_personal_dashboard_v2(UUID, INTEGER)
-- 4. Neue RPC: duplicate_personal_dashboard_v2(UUID, TEXT)
-- 5. Rechtevergabe (REVOKE ALL von PUBLIC, anon; GRANT EXECUTE an authenticated)

-- 1. create_dashboard_v2 (ersetzt mit Obergrenze 20 und Titelregel 1-80 Zeichen)
CREATE OR REPLACE FUNCTION public.create_dashboard_v2(
  p_title TEXT,
  p_config JSONB,
  p_scope TEXT DEFAULT 'personal',
  p_team_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  dashboard_id UUID,
  revision INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_variable
DECLARE
  v_user UUID := auth.uid();
  v_org UUID := public.current_organization_id();
  v_reason TEXT;
  v_dashboard_id UUID;
  v_created_at TIMESTAMPTZ;
  v_trimmed_title TEXT;
  v_count INTEGER;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  v_trimmed_title := btrim(p_title);
  IF length(v_trimmed_title) < 1 OR length(v_trimmed_title) > 80 THEN
    RAISE EXCEPTION 'LP_DASHBOARD_INVALID: title must be 1-80 characters' USING ERRCODE = '22023';
  END IF;

  v_reason := public.dashboard_config_v2_invalid_reason(p_config);
  IF v_reason IS NOT NULL THEN
    RAISE EXCEPTION 'LP_DASHBOARD_INVALID: %', v_reason USING ERRCODE = '22023';
  END IF;

  IF p_scope = 'team' THEN
    RAISE EXCEPTION 'LP_TEAM_DASHBOARDS_LOCKED_UNTIL_P11' USING ERRCODE = '42501';
  END IF;

  IF p_scope IS DISTINCT FROM 'personal' THEN
    RAISE EXCEPTION 'LP_INVALID_SCOPE' USING ERRCODE = '22023';
  END IF;

  -- Transaktions-Advisory-Lock und Obergrenze 20 für persönliche Dashboards
  PERFORM pg_advisory_xact_lock(hashtext('personal_dashboard:' || v_org::text || ':' || v_user::text));

  SELECT count(*) INTO v_count
  FROM public.dashboards AS d
  WHERE d.organization_id = v_org
    AND d.user_id = v_user
    AND d.scope = 'personal';

  IF v_count >= 20 THEN
    RAISE EXCEPTION 'LP_DASHBOARD_LIMIT' USING ERRCODE = '22023';
  END IF;

  v_dashboard_id := gen_random_uuid();
  p_config := jsonb_set(p_config, '{id}', to_jsonb(v_dashboard_id::text), true);
  p_config := jsonb_set(p_config, '{title}', to_jsonb(v_trimmed_title), true);

  -- Erneute Prüfung nach Einsetzen von id und title
  v_reason := public.dashboard_config_v2_invalid_reason(p_config);
  IF v_reason IS NOT NULL THEN
    RAISE EXCEPTION 'LP_DASHBOARD_INVALID: %', v_reason USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.dashboards AS d (
    id,
    organization_id,
    scope,
    user_id,
    team_id,
    title,
    description,
    created_by_user_id,
    revision,
    config
  ) VALUES (
    v_dashboard_id,
    v_org,
    'personal',
    v_user,
    NULL,
    v_trimmed_title,
    p_description,
    v_user,
    1,
    p_config
  )
  RETURNING d.created_at INTO v_created_at;

  INSERT INTO public.dashboard_revisions (
    dashboard_id,
    organization_id,
    revision,
    title,
    config,
    created_by_user_id,
    created_at,
    change_summary
  ) VALUES (
    v_dashboard_id,
    v_org,
    1,
    v_trimmed_title,
    p_config,
    v_user,
    v_created_at,
    'Dashboard initial erstellt'
  );

  RETURN QUERY SELECT v_dashboard_id, 1, v_created_at;
END;
$$;

-- 2. list_personal_dashboards_v2
CREATE OR REPLACE FUNCTION public.list_personal_dashboards_v2()
RETURNS TABLE (
  id UUID,
  title TEXT,
  scope TEXT,
  revision INTEGER,
  tile_count INTEGER,
  section_count INTEGER,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_variable
DECLARE
  v_user UUID := auth.uid();
  v_org UUID := public.current_organization_id();
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.scope,
    d.revision,
    COALESCE(
      CASE
        WHEN jsonb_typeof(d.config->'tiles') = 'array' THEN jsonb_array_length(d.config->'tiles')
        ELSE 0
      END,
      0
    )::INTEGER AS tile_count,
    COALESCE(
      CASE
        WHEN jsonb_typeof(d.config->'sections') = 'array' THEN jsonb_array_length(d.config->'sections')
        ELSE 0
      END,
      0
    )::INTEGER AS section_count,
    d.updated_at
  FROM public.dashboards AS d
  WHERE d.organization_id = v_org
    AND d.user_id = v_user
    AND d.scope = 'personal'
  ORDER BY d.updated_at DESC, d.id;
END;
$$;

-- 3. delete_personal_dashboard_v2
CREATE OR REPLACE FUNCTION public.delete_personal_dashboard_v2(
  p_dashboard_id UUID,
  p_expected_revision INTEGER
)
RETURNS TABLE (
  deleted_id UUID,
  next_dashboard_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_variable
DECLARE
  v_user UUID := auth.uid();
  v_org UUID := public.current_organization_id();
  v_current_revision INTEGER;
  v_count INTEGER;
  v_next_id UUID;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF p_dashboard_id IS NULL THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- 1. Transaktions-Advisory-Lock sichert atomaren Check und Delete ab
  PERFORM pg_advisory_xact_lock(hashtext('personal_dashboard:' || v_org::text || ':' || v_user::text));

  -- Prüfen ob Dashboard existiert und dem Nutzer gehört
  SELECT d.revision INTO v_current_revision
  FROM public.dashboards AS d
  WHERE d.id = p_dashboard_id
    AND d.organization_id = v_org
    AND d.user_id = v_user
    AND d.scope = 'personal';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Revisionsprüfung
  IF p_expected_revision IS NOT NULL AND v_current_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'LP_DASHBOARD_CONFLICT: expected revision %, found %', p_expected_revision, v_current_revision USING ERRCODE = '40900';
  END IF;

  -- Letztes Dashboard Schutz
  SELECT count(*) INTO v_count
  FROM public.dashboards AS d
  WHERE d.organization_id = v_org
    AND d.user_id = v_user
    AND d.scope = 'personal';

  IF v_count <= 1 THEN
    RAISE EXCEPTION 'LP_LAST_DASHBOARD' USING ERRCODE = '22023';
  END IF;

  -- Endgültig löschen (Revisionen cascaden über ON DELETE CASCADE)
  DELETE FROM public.dashboards AS d
  WHERE d.id = p_dashboard_id;

  -- Nächstes Dashboard bestimmen (zuletzt geändertes verbleibendes)
  SELECT d.id INTO v_next_id
  FROM public.dashboards AS d
  WHERE d.organization_id = v_org
    AND d.user_id = v_user
    AND d.scope = 'personal'
  ORDER BY d.updated_at DESC, d.id
  LIMIT 1;

  RETURN QUERY SELECT p_dashboard_id, v_next_id;
END;
$$;

-- 4. duplicate_personal_dashboard_v2
CREATE OR REPLACE FUNCTION public.duplicate_personal_dashboard_v2(
  p_dashboard_id UUID,
  p_title TEXT
)
RETURNS TABLE (
  dashboard_id UUID,
  revision INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_variable
DECLARE
  v_user UUID := auth.uid();
  v_org UUID := public.current_organization_id();
  v_source_title TEXT;
  v_source_config JSONB;
  v_trimmed_title TEXT;
  v_count INTEGER;
  v_new_dashboard_id UUID;
  v_new_config JSONB;
  v_reason TEXT;
  v_created_at TIMESTAMPTZ;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF p_dashboard_id IS NULL THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  v_trimmed_title := btrim(p_title);
  IF length(v_trimmed_title) < 1 OR length(v_trimmed_title) > 80 THEN
    RAISE EXCEPTION 'LP_DASHBOARD_INVALID: title must be 1-80 characters' USING ERRCODE = '22023';
  END IF;

  -- 1. Transaktions-Advisory-Lock
  PERFORM pg_advisory_xact_lock(hashtext('personal_dashboard:' || v_org::text || ':' || v_user::text));

  -- 2. Quelle prüfen und lesen
  SELECT d.title, d.config INTO v_source_title, v_source_config
  FROM public.dashboards AS d
  WHERE d.id = p_dashboard_id
    AND d.organization_id = v_org
    AND d.user_id = v_user
    AND d.scope = 'personal';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Obergrenze 20
  SELECT count(*) INTO v_count
  FROM public.dashboards AS d
  WHERE d.organization_id = v_org
    AND d.user_id = v_user
    AND d.scope = 'personal';

  IF v_count >= 20 THEN
    RAISE EXCEPTION 'LP_DASHBOARD_LIMIT' USING ERRCODE = '22023';
  END IF;

  -- 4. Neue ID und Konfiguration anpassen
  v_new_dashboard_id := gen_random_uuid();
  v_new_config := jsonb_set(
    jsonb_set(v_source_config, '{id}', to_jsonb(v_new_dashboard_id::text), true),
    '{title}',
    to_jsonb(v_trimmed_title),
    true
  );

  v_reason := public.dashboard_config_v2_invalid_reason(v_new_config);
  IF v_reason IS NOT NULL THEN
    RAISE EXCEPTION 'LP_DASHBOARD_INVALID: %', v_reason USING ERRCODE = '22023';
  END IF;

  -- 5. Dashboard und Revision 1 anlegen
  INSERT INTO public.dashboards AS d (
    id,
    organization_id,
    scope,
    user_id,
    team_id,
    title,
    description,
    created_by_user_id,
    revision,
    config
  ) VALUES (
    v_new_dashboard_id,
    v_org,
    'personal',
    v_user,
    NULL,
    v_trimmed_title,
    NULL,
    v_user,
    1,
    v_new_config
  )
  RETURNING d.created_at INTO v_created_at;

  INSERT INTO public.dashboard_revisions (
    dashboard_id,
    organization_id,
    revision,
    title,
    config,
    created_by_user_id,
    created_at,
    change_summary
  ) VALUES (
    v_new_dashboard_id,
    v_org,
    1,
    v_trimmed_title,
    v_new_config,
    v_user,
    v_created_at,
    'Dupliziert aus „' || v_source_title || '“'
  );

  RETURN QUERY SELECT v_new_dashboard_id, 1, v_created_at;
END;
$$;

-- 5. Rechtevergabe
REVOKE ALL ON FUNCTION public.create_dashboard_v2(TEXT, JSONB, TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_dashboard_v2(TEXT, JSONB, TEXT, UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.list_personal_dashboards_v2() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_personal_dashboards_v2() TO authenticated;

REVOKE ALL ON FUNCTION public.delete_personal_dashboard_v2(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_personal_dashboard_v2(UUID, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.duplicate_personal_dashboard_v2(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.duplicate_personal_dashboard_v2(UUID, TEXT) TO authenticated;
