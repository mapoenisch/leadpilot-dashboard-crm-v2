-- Migration: 20261122_dashboard_team_sharing.sql
-- Auftrag 162 (P11a): Team-Freigaben im Server – Teams, Rechte, Team-Dashboards, Kopieren
--
-- 1. Hilfsfunktionen fuer dynamische Rechtepruefung:
--    - dashboard_team_is_active_member(UUID)
--    - dashboard_team_can_read(UUID)
--    - dashboard_team_can_write(UUID)
-- 2. RLS-Policies fuer Team-Dashboards, Revisionen, Teams und Mitglieder.
-- 3. Ersetzte RPCs (Bestehende Logik um Team-Scope erweitert, persoenlicher Pfad unveraendert):
--    - create_dashboard_v2
--    - save_dashboard_v2
--    - restore_dashboard_revision_v2
--    - get_dashboard_v2_revisions
-- 4. Neue RPCs:
--    - list_dashboard_teams_v2()
--    - create_dashboard_team_v2(TEXT, TEXT)
--    - update_dashboard_team_v2(UUID, TEXT, TEXT)
--    - delete_dashboard_team_v2(UUID)
--    - list_dashboard_team_members_v2(UUID)
--    - add_dashboard_team_member_v2(UUID, UUID)
--    - remove_dashboard_team_member_v2(UUID, UUID)
--    - list_accessible_dashboards_v2()
--    - load_dashboard_v2(UUID)
--    - delete_team_dashboard_v2(UUID, INTEGER)
--    - copy_dashboard_v2(UUID, TEXT, UUID, TEXT)
-- 5. Berechtigungen (REVOKE von PUBLIC/anon, GRANT EXECUTE an authenticated).

-- ============================================================================
-- 1. Hilfsfunktionen
-- ============================================================================

CREATE OR REPLACE FUNCTION public.dashboard_team_is_active_member(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.dashboard_team_members tm
    JOIN public.dashboard_teams t ON t.id = tm.team_id
    JOIN public.organization_members om ON om.user_id = tm.user_id AND om.organization_id = t.organization_id
    JOIN public.organizations o ON o.id = t.organization_id
    WHERE tm.team_id = p_team_id
      AND tm.user_id = auth.uid()
      AND om.status = 'active'
      AND o.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.dashboard_team_can_read(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.dashboard_teams t
    WHERE t.id = p_team_id
      AND t.organization_id = public.current_organization_id()
      AND (
        public.has_org_role(ARRAY['admin'])
        OR public.dashboard_team_is_active_member(p_team_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.dashboard_team_can_write(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.dashboard_teams t
    WHERE t.id = p_team_id
      AND t.organization_id = public.current_organization_id()
      AND (
        public.has_org_role(ARRAY['admin'])
        OR (
          public.has_org_role(ARRAY['manager'])
          AND public.dashboard_team_is_active_member(p_team_id)
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.dashboard_team_is_active_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_team_is_active_member(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.dashboard_team_can_read(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_team_can_read(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.dashboard_team_can_write(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_team_can_write(UUID) TO authenticated;

-- ============================================================================
-- 2. RLS-Policies
-- ============================================================================

-- Team-Dashboards lesbar fuer Berechtigte (Admin der Org oder aktives Teammitglied)
DROP POLICY IF EXISTS "dashboards_select_team_readable" ON public.dashboards;
CREATE POLICY "dashboards_select_team_readable" ON public.dashboards
  FOR SELECT TO authenticated
  USING (
    scope = 'team'
    AND organization_id = public.current_organization_id()
    AND public.dashboard_team_can_read(team_id)
  );

-- Revisionen von Team-Dashboards lesbar fuer Leseberechtigte des Dashboards
DROP POLICY IF EXISTS "dashboard_revisions_select_team_readable" ON public.dashboard_revisions;
CREATE POLICY "dashboard_revisions_select_team_readable" ON public.dashboard_revisions
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.dashboards AS d
      WHERE d.id = dashboard_revisions.dashboard_id
        AND d.organization_id = public.current_organization_id()
        AND d.scope = 'team'
        AND public.dashboard_team_can_read(d.team_id)
    )
  );

-- Teams lesbar fuer Admin (alle Teams der Org) und aktive Mitglieder (eigene Teams)
DROP POLICY IF EXISTS "dashboard_teams_select_readable" ON public.dashboard_teams;
CREATE POLICY "dashboard_teams_select_readable" ON public.dashboard_teams
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND public.dashboard_team_can_read(id)
  );

-- Team-Mitglieder lesbar fuer Admin (alle) und fuer den eigenen User
DROP POLICY IF EXISTS "dashboard_team_members_select" ON public.dashboard_team_members;
CREATE POLICY "dashboard_team_members_select" ON public.dashboard_team_members
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND (
      public.has_org_role(ARRAY['admin'])
      OR user_id = auth.uid()
    )
  );

-- ============================================================================
-- 3. Ersetzte RPCs
-- ============================================================================

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
  v_team_org UUID;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  v_trimmed_title := btrim(p_title);
  IF length(v_trimmed_title) < 1 OR length(v_trimmed_title) > 80 THEN
    RAISE EXCEPTION 'LP_DASHBOARD_INVALID: title must be 1-80 characters' USING ERRCODE = '22023';
  END IF;

  IF p_scope = 'personal' THEN
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
    p_config := jsonb_set(p_config, '{scope}', to_jsonb('personal'::text), true);
    p_config := p_config - 'teamId';
    p_config := jsonb_set(p_config, '{ownerUserId}', to_jsonb(COALESCE(p_config->>'ownerUserId', v_user::text)), true);
    p_config := jsonb_set(p_config, '{organizationId}', to_jsonb(v_org::text), true);

    v_reason := public.dashboard_config_v2_invalid_reason(p_config);
    IF v_reason IS NOT NULL THEN
      RAISE EXCEPTION 'LP_DASHBOARD_INVALID: %', v_reason USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.dashboards AS d (
      id, organization_id, scope, user_id, team_id, title, description, created_by_user_id, revision, config
    ) VALUES (
      v_dashboard_id, v_org, 'personal', v_user, NULL, v_trimmed_title, p_description, v_user, 1, p_config
    )
    RETURNING d.created_at INTO v_created_at;

    INSERT INTO public.dashboard_revisions (
      dashboard_id, organization_id, revision, title, config, created_by_user_id, created_at, change_summary
    ) VALUES (
      v_dashboard_id, v_org, 1, v_trimmed_title, p_config, v_user, v_created_at, 'Dashboard initial erstellt'
    );

    RETURN QUERY SELECT v_dashboard_id, 1, v_created_at;
    RETURN;

  ELSIF p_scope = 'team' THEN
    IF p_team_id IS NULL THEN
      RAISE EXCEPTION 'LP_TEAM_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    SELECT t.organization_id INTO v_team_org
    FROM public.dashboard_teams t
    WHERE t.id = p_team_id;

    IF NOT FOUND OR v_team_org <> v_org OR NOT public.dashboard_team_can_read(p_team_id) THEN
      RAISE EXCEPTION 'LP_TEAM_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    IF NOT public.dashboard_team_can_write(p_team_id) THEN
      RAISE EXCEPTION 'LP_TEAM_ACCESS_REVOKED' USING ERRCODE = '42501';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('team_dashboard:' || v_org::text || ':' || p_team_id::text));

    SELECT count(*) INTO v_count
    FROM public.dashboards AS d
    WHERE d.organization_id = v_org
      AND d.team_id = p_team_id
      AND d.scope = 'team';

    IF v_count >= 50 THEN
      RAISE EXCEPTION 'LP_TEAM_DASHBOARD_LIMIT' USING ERRCODE = '22023';
    END IF;

    v_dashboard_id := gen_random_uuid();
    p_config := jsonb_set(p_config, '{id}', to_jsonb(v_dashboard_id::text), true);
    p_config := jsonb_set(p_config, '{title}', to_jsonb(v_trimmed_title), true);
    p_config := jsonb_set(p_config, '{scope}', to_jsonb('team'::text), true);
    p_config := jsonb_set(p_config, '{teamId}', to_jsonb(p_team_id::text), true);
    p_config := jsonb_set(p_config, '{ownerUserId}', to_jsonb(COALESCE(p_config->>'ownerUserId', v_user::text)), true);
    p_config := jsonb_set(p_config, '{organizationId}', to_jsonb(v_org::text), true);

    v_reason := public.dashboard_config_v2_invalid_reason(p_config);
    IF v_reason IS NOT NULL THEN
      RAISE EXCEPTION 'LP_DASHBOARD_INVALID: %', v_reason USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.dashboards AS d (
      id, organization_id, scope, user_id, team_id, title, description, created_by_user_id, revision, config
    ) VALUES (
      v_dashboard_id, v_org, 'team', NULL, p_team_id, v_trimmed_title, p_description, v_user, 1, p_config
    )
    RETURNING d.created_at INTO v_created_at;

    INSERT INTO public.dashboard_revisions (
      dashboard_id, organization_id, revision, title, config, created_by_user_id, created_at, change_summary
    ) VALUES (
      v_dashboard_id, v_org, 1, v_trimmed_title, p_config, v_user, v_created_at, 'Dashboard initial erstellt'
    );

    RETURN QUERY SELECT v_dashboard_id, 1, v_created_at;
    RETURN;

  ELSE
    RAISE EXCEPTION 'LP_INVALID_SCOPE' USING ERRCODE = '22023';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_dashboard_v2(
  p_dashboard_id UUID,
  p_expected_revision INTEGER,
  p_title TEXT,
  p_config JSONB,
  p_change_summary TEXT DEFAULT NULL
)
RETURNS TABLE (
  dashboard_id UUID,
  revision INTEGER,
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
  v_current_scope TEXT;
  v_owner_user_id UUID;
  v_team_id UUID;
  v_current_revision INTEGER;
  v_new_revision INTEGER;
  v_updated_at TIMESTAMPTZ;
  v_trimmed_title TEXT;
  v_reason TEXT;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF p_dashboard_id IS NULL THEN
    RETURN QUERY
    SELECT c.dashboard_id, c.revision, c.created_at AS updated_at
    FROM public.create_dashboard_v2(p_title, p_config, 'personal', NULL, NULL) AS c;
    RETURN;
  END IF;

  SELECT d.scope, d.user_id, d.team_id, d.revision
  INTO v_current_scope, v_owner_user_id, v_team_id, v_current_revision
  FROM public.dashboards AS d
  WHERE d.id = p_dashboard_id AND d.organization_id = v_org;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- 1. Leserecht pruefen (Nicht-Berechtigte sehen LP_DASHBOARD_NOT_FOUND)
  IF v_current_scope = 'personal' THEN
    IF v_owner_user_id <> v_user THEN
      RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
  ELSIF v_current_scope = 'team' THEN
    IF NOT public.dashboard_team_can_read(v_team_id) THEN
      RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    -- 2. Schreibrecht pruefen (Viewer erhaelt LP_TEAM_ACCESS_REVOKED vor Konflikt)
    IF NOT public.dashboard_team_can_write(v_team_id) THEN
      RAISE EXCEPTION 'LP_TEAM_ACCESS_REVOKED' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Revisionspruefung (Konflikt nur fuer Schreibberechtigte)
  IF v_current_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'LP_DASHBOARD_CONFLICT' USING ERRCODE = 'P0001',
      DETAIL = 'Aktuelle Revision (' || v_current_revision || ') weicht von erwarteter Revision (' || p_expected_revision || ') ab.';
  END IF;

  v_trimmed_title := btrim(p_title);
  IF length(v_trimmed_title) < 1 OR length(v_trimmed_title) > 80 THEN
    RAISE EXCEPTION 'LP_DASHBOARD_INVALID: title must be 1-80 characters' USING ERRCODE = '22023';
  END IF;

  p_config := jsonb_set(p_config, '{id}', to_jsonb(p_dashboard_id::text), true);
  p_config := jsonb_set(p_config, '{title}', to_jsonb(v_trimmed_title), true);
  p_config := jsonb_set(p_config, '{scope}', to_jsonb(v_current_scope), true);
  IF v_current_scope = 'team' THEN
    p_config := jsonb_set(p_config, '{teamId}', to_jsonb(v_team_id::text), true);
  ELSE
    p_config := p_config - 'teamId';
  END IF;
  p_config := jsonb_set(p_config, '{organizationId}', to_jsonb(v_org::text), true);

  v_reason := public.dashboard_config_v2_invalid_reason(p_config);
  IF v_reason IS NOT NULL THEN
    RAISE EXCEPTION 'LP_DASHBOARD_INVALID: %', v_reason USING ERRCODE = '22023';
  END IF;

  UPDATE public.dashboards AS d
  SET title = v_trimmed_title,
      config = p_config,
      revision = d.revision + 1,
      updated_at = now()
  WHERE d.id = p_dashboard_id
    AND d.organization_id = v_org
    AND d.revision = p_expected_revision
  RETURNING d.revision, d.updated_at INTO v_new_revision, v_updated_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_DASHBOARD_CONFLICT' USING ERRCODE = 'P0001';
  END IF;

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
    p_dashboard_id,
    v_org,
    v_new_revision,
    v_trimmed_title,
    p_config,
    v_user,
    v_updated_at,
    p_change_summary
  );

  RETURN QUERY SELECT p_dashboard_id, v_new_revision, v_updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_dashboard_revision_v2(
  p_dashboard_id UUID,
  p_target_revision INTEGER,
  p_expected_revision INTEGER
)
RETURNS TABLE (
  dashboard_id UUID,
  new_revision INTEGER,
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
  v_current_scope TEXT;
  v_owner_user_id UUID;
  v_team_id UUID;
  v_current_revision INTEGER;
  v_new_revision INTEGER;
  v_target_title TEXT;
  v_target_config JSONB;
  v_updated_at TIMESTAMPTZ;
  v_reason TEXT;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT d.scope, d.user_id, d.team_id, d.revision
  INTO v_current_scope, v_owner_user_id, v_team_id, v_current_revision
  FROM public.dashboards AS d
  WHERE d.id = p_dashboard_id AND d.organization_id = v_org;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- 1. Leserecht pruefen
  IF v_current_scope = 'personal' THEN
    IF v_owner_user_id <> v_user THEN
      RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
  ELSIF v_current_scope = 'team' THEN
    IF NOT public.dashboard_team_can_read(v_team_id) THEN
      RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    -- 2. Schreibrecht pruefen
    IF NOT public.dashboard_team_can_write(v_team_id) THEN
      RAISE EXCEPTION 'LP_TEAM_ACCESS_REVOKED' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Revisionspruefung
  IF v_current_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'LP_DASHBOARD_CONFLICT' USING ERRCODE = 'P0001',
      DETAIL = 'Aktuelle Revision (' || v_current_revision || ') weicht von erwarteter Revision (' || p_expected_revision || ') ab.';
  END IF;

  SELECT r.title, r.config INTO v_target_title, v_target_config
  FROM public.dashboard_revisions AS r
  WHERE r.dashboard_id = p_dashboard_id
    AND r.organization_id = v_org
    AND r.revision = p_target_revision;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_REVISION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  v_target_config := jsonb_set(v_target_config, '{id}', to_jsonb(p_dashboard_id::text), true);
  v_target_config := jsonb_set(v_target_config, '{title}', to_jsonb(v_target_title), true);
  v_target_config := jsonb_set(v_target_config, '{scope}', to_jsonb(v_current_scope), true);
  IF v_current_scope = 'team' THEN
    v_target_config := jsonb_set(v_target_config, '{teamId}', to_jsonb(v_team_id::text), true);
  ELSE
    v_target_config := v_target_config - 'teamId';
  END IF;
  v_target_config := jsonb_set(v_target_config, '{organizationId}', to_jsonb(v_org::text), true);

  v_reason := public.dashboard_config_v2_invalid_reason(v_target_config);
  IF v_reason IS NOT NULL THEN
    RAISE EXCEPTION 'LP_DASHBOARD_INVALID: %', v_reason USING ERRCODE = '22023';
  END IF;

  UPDATE public.dashboards AS d
  SET title = v_target_title,
      config = v_target_config,
      revision = d.revision + 1,
      updated_at = now()
  WHERE d.id = p_dashboard_id
    AND d.organization_id = v_org
    AND d.revision = p_expected_revision
  RETURNING d.revision, d.updated_at INTO v_new_revision, v_updated_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_DASHBOARD_CONFLICT' USING ERRCODE = 'P0001';
  END IF;

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
    p_dashboard_id,
    v_org,
    v_new_revision,
    v_target_title,
    v_target_config,
    v_user,
    v_updated_at,
    'Wiederherstellung von Revision ' || p_target_revision::text
  );

  RETURN QUERY SELECT p_dashboard_id, v_new_revision, v_updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_dashboard_v2_revisions(p_dashboard_id UUID)
RETURNS TABLE (
  revision INTEGER,
  title TEXT,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ,
  change_summary TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_variable
DECLARE
  v_user UUID := auth.uid();
  v_org UUID := public.current_organization_id();
  v_scope TEXT;
  v_owner_user_id UUID;
  v_team_id UUID;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT d.scope, d.user_id, d.team_id INTO v_scope, v_owner_user_id, v_team_id
  FROM public.dashboards AS d
  WHERE d.id = p_dashboard_id AND d.organization_id = v_org;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_scope = 'personal' THEN
    IF v_owner_user_id <> v_user THEN
      RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
  ELSIF v_scope = 'team' THEN
    IF NOT public.dashboard_team_can_read(v_team_id) THEN
      RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
  ELSE
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT r.revision, r.title, r.created_by_user_id, r.created_at, r.change_summary
  FROM public.dashboard_revisions AS r
  WHERE r.dashboard_id = p_dashboard_id
    AND r.organization_id = v_org
  ORDER BY r.revision DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.create_dashboard_v2(TEXT, JSONB, TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_dashboard_v2(TEXT, JSONB, TEXT, UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.save_dashboard_v2(UUID, INTEGER, TEXT, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_dashboard_v2(UUID, INTEGER, TEXT, JSONB, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.restore_dashboard_revision_v2(UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_dashboard_revision_v2(UUID, INTEGER, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.get_dashboard_v2_revisions(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_v2_revisions(UUID) TO authenticated;

-- ============================================================================
-- 4. Neue RPCs
-- ============================================================================

-- RPC: list_dashboard_teams_v2
CREATE OR REPLACE FUNCTION public.list_dashboard_teams_v2()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  member_count BIGINT,
  dashboard_count BIGINT,
  can_write BOOLEAN,
  is_member BOOLEAN
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
    t.id,
    t.name,
    t.description,
    (
      SELECT count(*)
      FROM public.dashboard_team_members tm
      WHERE tm.team_id = t.id
    ) AS member_count,
    (
      SELECT count(*)
      FROM public.dashboards d
      WHERE d.team_id = t.id
        AND d.scope = 'team'
        AND d.organization_id = v_org
    ) AS dashboard_count,
    public.dashboard_team_can_write(t.id) AS can_write,
    public.dashboard_team_is_active_member(t.id) AS is_member
  FROM public.dashboard_teams t
  WHERE t.organization_id = v_org
    AND public.dashboard_team_can_read(t.id)
  ORDER BY t.name ASC, t.id ASC;
END;
$$;

-- RPC: create_dashboard_team_v2
CREATE OR REPLACE FUNCTION public.create_dashboard_team_v2(
  p_name TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
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
  v_trimmed_name TEXT;
  v_count INTEGER;
  v_team_id UUID;
  v_created_at TIMESTAMPTZ;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_org_role(ARRAY['admin']) THEN
    RAISE EXCEPTION 'LP_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  v_trimmed_name := btrim(p_name);
  IF length(v_trimmed_name) < 1 OR length(v_trimmed_name) > 100 THEN
    RAISE EXCEPTION 'LP_TEAM_INVALID: name must be 1-100 characters' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('org_teams:' || v_org::text));

  IF EXISTS (
    SELECT 1 FROM public.dashboard_teams t
    WHERE t.organization_id = v_org
      AND lower(t.name) = lower(v_trimmed_name)
  ) THEN
    RAISE EXCEPTION 'LP_TEAM_NAME_TAKEN' USING ERRCODE = '23505';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.dashboard_teams t
  WHERE t.organization_id = v_org;

  IF v_count >= 50 THEN
    RAISE EXCEPTION 'LP_TEAM_LIMIT' USING ERRCODE = '22023';
  END IF;

  v_team_id := gen_random_uuid();
  INSERT INTO public.dashboard_teams (
    id, organization_id, name, description
  ) VALUES (
    v_team_id, v_org, v_trimmed_name, p_description
  )
  RETURNING dashboard_teams.created_at INTO v_created_at;

  INSERT INTO public.audit_log (
    organization_id, actor_id, action, target_type, target_id, details
  ) VALUES (
    v_org, v_user, 'dashboard.team.created', 'team', v_team_id::text,
    jsonb_build_object('name', v_trimmed_name, 'description', p_description)
  );

  RETURN QUERY SELECT v_team_id, v_trimmed_name, p_description, v_created_at;
END;
$$;

-- RPC: update_dashboard_team_v2
CREATE OR REPLACE FUNCTION public.update_dashboard_team_v2(
  p_team_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
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
  v_trimmed_name TEXT;
  v_updated_at TIMESTAMPTZ;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_org_role(ARRAY['admin']) THEN
    RAISE EXCEPTION 'LP_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.dashboard_teams t
    WHERE t.id = p_team_id AND t.organization_id = v_org
  ) THEN
    RAISE EXCEPTION 'LP_TEAM_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  v_trimmed_name := btrim(p_name);
  IF length(v_trimmed_name) < 1 OR length(v_trimmed_name) > 100 THEN
    RAISE EXCEPTION 'LP_TEAM_INVALID: name must be 1-100 characters' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('org_teams:' || v_org::text));

  IF EXISTS (
    SELECT 1 FROM public.dashboard_teams t
    WHERE t.organization_id = v_org
      AND lower(t.name) = lower(v_trimmed_name)
      AND t.id <> p_team_id
  ) THEN
    RAISE EXCEPTION 'LP_TEAM_NAME_TAKEN' USING ERRCODE = '23505';
  END IF;

  UPDATE public.dashboard_teams AS t
  SET name = v_trimmed_name,
      description = p_description,
      updated_at = now()
  WHERE t.id = p_team_id
    AND t.organization_id = v_org
  RETURNING t.updated_at INTO v_updated_at;

  INSERT INTO public.audit_log (
    organization_id, actor_id, action, target_type, target_id, details
  ) VALUES (
    v_org, v_user, 'dashboard.team.updated', 'team', p_team_id::text,
    jsonb_build_object('name', v_trimmed_name, 'description', p_description)
  );

  RETURN QUERY SELECT p_team_id, v_trimmed_name, p_description, v_updated_at;
END;
$$;

-- RPC: delete_dashboard_team_v2
CREATE OR REPLACE FUNCTION public.delete_dashboard_team_v2(
  p_team_id UUID
)
RETURNS BOOLEAN
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

  IF NOT public.has_org_role(ARRAY['admin']) THEN
    RAISE EXCEPTION 'LP_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  -- Serialisierung gegen paralleles Anlegen/Kopieren von Dashboards in dieses Team
  PERFORM pg_advisory_xact_lock(hashtext('team_dashboard:' || v_org::text || ':' || p_team_id::text));

  -- Zeilensperre auf das Team
  PERFORM 1 FROM public.dashboard_teams t
  WHERE t.id = p_team_id AND t.organization_id = v_org
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_TEAM_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.dashboards d
    WHERE d.team_id = p_team_id AND d.organization_id = v_org
  ) THEN
    RAISE EXCEPTION 'LP_TEAM_HAS_DASHBOARDS' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.dashboard_team_members tm
  WHERE tm.team_id = p_team_id AND tm.organization_id = v_org;

  DELETE FROM public.dashboard_teams t
  WHERE t.id = p_team_id AND t.organization_id = v_org;

  INSERT INTO public.audit_log (
    organization_id, actor_id, action, target_type, target_id, details
  ) VALUES (
    v_org, v_user, 'dashboard.team.deleted', 'team', p_team_id::text,
    jsonb_build_object('team_id', p_team_id)
  );

  RETURN TRUE;
END;
$$;

-- RPC: list_dashboard_team_members_v2
CREATE OR REPLACE FUNCTION public.list_dashboard_team_members_v2(p_team_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  org_role TEXT,
  org_status TEXT,
  team_role TEXT,
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
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_org_role(ARRAY['admin']) THEN
    RAISE EXCEPTION 'LP_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.dashboard_teams t
    WHERE t.id = p_team_id AND t.organization_id = v_org
  ) THEN
    RAISE EXCEPTION 'LP_TEAM_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT
    tm.user_id,
    u.email::TEXT,
    om.role::TEXT AS org_role,
    om.status::TEXT AS org_status,
    tm.role::TEXT AS team_role,
    tm.created_at
  FROM public.dashboard_team_members tm
  JOIN public.organization_members om ON om.user_id = tm.user_id AND om.organization_id = v_org
  JOIN auth.users u ON u.id = tm.user_id
  WHERE tm.team_id = p_team_id
    AND tm.organization_id = v_org
  ORDER BY tm.created_at ASC, tm.user_id ASC;
END;
$$;

-- RPC: add_dashboard_team_member_v2
CREATE OR REPLACE FUNCTION public.add_dashboard_team_member_v2(
  p_team_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_variable
DECLARE
  v_user UUID := auth.uid();
  v_org UUID := public.current_organization_id();
  v_count INTEGER;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_org_role(ARRAY['admin']) THEN
    RAISE EXCEPTION 'LP_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.dashboard_teams t
    WHERE t.id = p_team_id AND t.organization_id = v_org
  ) THEN
    RAISE EXCEPTION 'LP_TEAM_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = p_user_id
      AND om.organization_id = v_org
      AND om.status = 'active'
  ) THEN
    RAISE EXCEPTION 'LP_MEMBER_NOT_IN_ORG' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.dashboard_team_members tm
    WHERE tm.team_id = p_team_id AND tm.user_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('team_members:' || p_team_id::text));

  SELECT count(*) INTO v_count
  FROM public.dashboard_team_members tm
  WHERE tm.team_id = p_team_id;

  IF v_count >= 200 THEN
    RAISE EXCEPTION 'LP_TEAM_MEMBER_LIMIT' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.dashboard_team_members (
    team_id, user_id, organization_id, role
  ) VALUES (
    p_team_id, p_user_id, v_org, 'member'
  );

  INSERT INTO public.audit_log (
    organization_id, actor_id, action, target_type, target_id, details
  ) VALUES (
    v_org, v_user, 'dashboard.team.member_added', 'team', p_team_id::text,
    jsonb_build_object('user_id', p_user_id)
  );

  RETURN TRUE;
END;
$$;

-- RPC: remove_dashboard_team_member_v2
CREATE OR REPLACE FUNCTION public.remove_dashboard_team_member_v2(
  p_team_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
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

  IF NOT public.has_org_role(ARRAY['admin']) THEN
    RAISE EXCEPTION 'LP_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.dashboard_teams t
    WHERE t.id = p_team_id AND t.organization_id = v_org
  ) THEN
    RAISE EXCEPTION 'LP_TEAM_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.dashboard_team_members tm
  WHERE tm.team_id = p_team_id
    AND tm.user_id = p_user_id
    AND tm.organization_id = v_org;

  INSERT INTO public.audit_log (
    organization_id, actor_id, action, target_type, target_id, details
  ) VALUES (
    v_org, v_user, 'dashboard.team.member_removed', 'team', p_team_id::text,
    jsonb_build_object('user_id', p_user_id)
  );

  RETURN TRUE;
END;
$$;

-- RPC: list_accessible_dashboards_v2
CREATE OR REPLACE FUNCTION public.list_accessible_dashboards_v2()
RETURNS TABLE (
  id UUID,
  title TEXT,
  scope TEXT,
  revision INTEGER,
  tile_count INTEGER,
  section_count INTEGER,
  updated_at TIMESTAMPTZ,
  team_id UUID,
  team_name TEXT,
  can_write BOOLEAN
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
    d.updated_at,
    d.team_id,
    t.name AS team_name,
    CASE
      WHEN d.scope = 'personal' THEN TRUE
      WHEN d.scope = 'team' THEN public.dashboard_team_can_write(d.team_id)
      ELSE FALSE
    END AS can_write
  FROM public.dashboards AS d
  LEFT JOIN public.dashboard_teams AS t ON t.id = d.team_id
  WHERE d.organization_id = v_org
    AND (
      (d.scope = 'personal' AND d.user_id = v_user)
      OR
      (d.scope = 'team' AND public.dashboard_team_can_read(d.team_id))
    )
  ORDER BY d.updated_at DESC, d.id ASC;
END;
$$;

-- RPC: load_dashboard_v2
CREATE OR REPLACE FUNCTION public.load_dashboard_v2(p_dashboard_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  scope TEXT,
  team_id UUID,
  revision INTEGER,
  config JSONB,
  updated_at TIMESTAMPTZ,
  can_write BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_variable
DECLARE
  v_user UUID := auth.uid();
  v_org UUID := public.current_organization_id();
  v_row RECORD;
  v_can_write BOOLEAN;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT d.id, d.title, d.scope, d.team_id, d.revision, d.config, d.updated_at, d.user_id
  INTO v_row
  FROM public.dashboards AS d
  WHERE d.id = p_dashboard_id AND d.organization_id = v_org;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_row.scope = 'personal' THEN
    IF v_row.user_id <> v_user THEN
      RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
    v_can_write := TRUE;
  ELSIF v_row.scope = 'team' THEN
    IF NOT public.dashboard_team_can_read(v_row.team_id) THEN
      RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
    v_can_write := public.dashboard_team_can_write(v_row.team_id);
  ELSE
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT v_row.id, v_row.title, v_row.scope, v_row.team_id, v_row.revision, v_row.config, v_row.updated_at, v_can_write;
END;
$$;

-- RPC: delete_team_dashboard_v2
CREATE OR REPLACE FUNCTION public.delete_team_dashboard_v2(
  p_dashboard_id UUID,
  p_expected_revision INTEGER
)
RETURNS TABLE (
  deleted_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_variable
DECLARE
  v_user UUID := auth.uid();
  v_org UUID := public.current_organization_id();
  v_scope TEXT;
  v_team_id UUID;
  v_current_revision INTEGER;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF p_dashboard_id IS NULL THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT d.scope, d.team_id, d.revision
  INTO v_scope, v_team_id, v_current_revision
  FROM public.dashboards AS d
  WHERE d.id = p_dashboard_id AND d.organization_id = v_org
  FOR UPDATE;

  IF NOT FOUND OR v_scope <> 'team' THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.dashboard_team_can_read(v_team_id) THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.dashboard_team_can_write(v_team_id) THEN
    RAISE EXCEPTION 'LP_TEAM_ACCESS_REVOKED' USING ERRCODE = '42501';
  END IF;

  IF p_expected_revision IS NOT NULL AND v_current_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'LP_DASHBOARD_CONFLICT' USING ERRCODE = 'P0001',
      DETAIL = 'Aktuelle Revision (' || v_current_revision || ') weicht von erwarteter Revision (' || p_expected_revision || ') ab.';
  END IF;

  DELETE FROM public.dashboard_revisions r
  WHERE r.dashboard_id = p_dashboard_id AND r.organization_id = v_org;

  DELETE FROM public.dashboards d
  WHERE d.id = p_dashboard_id
    AND d.organization_id = v_org
    AND (p_expected_revision IS NULL OR d.revision = p_expected_revision);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_DASHBOARD_CONFLICT' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.audit_log (
    organization_id, actor_id, action, target_type, target_id, details
  ) VALUES (
    v_org, v_user, 'dashboard.team_dashboard.deleted', 'dashboard', p_dashboard_id::text,
    jsonb_build_object('team_id', v_team_id)
  );

  RETURN QUERY SELECT p_dashboard_id;
END;
$$;

-- RPC: copy_dashboard_v2
CREATE OR REPLACE FUNCTION public.copy_dashboard_v2(
  p_source_id UUID,
  p_target_scope TEXT,
  p_target_team_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT NULL
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
  v_source_description TEXT;
  v_source_scope TEXT;
  v_source_user_id UUID;
  v_source_team_id UUID;
  v_trimmed_title TEXT;
  v_count INTEGER;
  v_new_id UUID;
  v_new_config JSONB;
  v_reason TEXT;
  v_created_at TIMESTAMPTZ;
  v_team_org UUID;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF p_source_id IS NULL THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT d.title, d.config, d.description, d.scope, d.user_id, d.team_id
  INTO v_source_title, v_source_config, v_source_description, v_source_scope, v_source_user_id, v_source_team_id
  FROM public.dashboards AS d
  WHERE d.id = p_source_id AND d.organization_id = v_org;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_source_scope = 'personal' THEN
    IF v_source_user_id <> v_user THEN
      RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
  ELSIF v_source_scope = 'team' THEN
    IF NOT public.dashboard_team_can_read(v_source_team_id) THEN
      RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;
  ELSE
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  v_trimmed_title := btrim(COALESCE(p_title, ''));
  IF length(v_trimmed_title) < 1 OR length(v_trimmed_title) > 80 THEN
    RAISE EXCEPTION 'LP_DASHBOARD_INVALID: title must be 1-80 characters' USING ERRCODE = '22023';
  END IF;

  v_new_id := gen_random_uuid();
  v_new_config := v_source_config;
  v_new_config := jsonb_set(v_new_config, '{id}', to_jsonb(v_new_id::text), true);
  v_new_config := jsonb_set(v_new_config, '{title}', to_jsonb(v_trimmed_title), true);
  v_new_config := jsonb_set(v_new_config, '{scope}', to_jsonb(p_target_scope), true);
  v_new_config := jsonb_set(v_new_config, '{ownerUserId}', to_jsonb(v_user::text), true);
  v_new_config := jsonb_set(v_new_config, '{organizationId}', to_jsonb(v_org::text), true);

  IF p_target_scope = 'personal' THEN
    PERFORM pg_advisory_xact_lock(hashtext('personal_dashboard:' || v_org::text || ':' || v_user::text));

    SELECT count(*) INTO v_count
    FROM public.dashboards AS d
    WHERE d.organization_id = v_org
      AND d.user_id = v_user
      AND d.scope = 'personal';

    IF v_count >= 20 THEN
      RAISE EXCEPTION 'LP_DASHBOARD_LIMIT' USING ERRCODE = '22023';
    END IF;

    v_new_config := v_new_config - 'teamId';

    v_reason := public.dashboard_config_v2_invalid_reason(v_new_config);
    IF v_reason IS NOT NULL THEN
      RAISE EXCEPTION 'LP_DASHBOARD_INVALID: %', v_reason USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.dashboards AS d (
      id, organization_id, scope, user_id, team_id, title, description, created_by_user_id, revision, config
    ) VALUES (
      v_new_id, v_org, 'personal', v_user, NULL, v_trimmed_title, v_source_description, v_user, 1, v_new_config
    )
    RETURNING d.created_at INTO v_created_at;

    INSERT INTO public.dashboard_revisions (
      dashboard_id, organization_id, revision, title, config, created_by_user_id, created_at, change_summary
    ) VALUES (
      v_new_id, v_org, 1, v_trimmed_title, v_new_config, v_user, v_created_at, 'Kopie von ' || v_source_title
    );

    INSERT INTO public.audit_log (
      organization_id, actor_id, action, target_type, target_id, details
    ) VALUES (
      v_org, v_user, 'dashboard.copied', 'dashboard', v_new_id::text,
      jsonb_build_object(
        'source_id', p_source_id,
        'source_scope', v_source_scope,
        'target_scope', 'personal',
        'target_team_id', NULL
      )
    );

    RETURN QUERY SELECT v_new_id, 1, v_created_at;
    RETURN;

  ELSIF p_target_scope = 'team' THEN
    IF p_target_team_id IS NULL THEN
      RAISE EXCEPTION 'LP_TEAM_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    SELECT t.organization_id INTO v_team_org
    FROM public.dashboard_teams t
    WHERE t.id = p_target_team_id;

    IF NOT FOUND OR v_team_org <> v_org OR NOT public.dashboard_team_can_read(p_target_team_id) THEN
      RAISE EXCEPTION 'LP_TEAM_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    IF NOT public.dashboard_team_can_write(p_target_team_id) THEN
      RAISE EXCEPTION 'LP_TEAM_ACCESS_REVOKED' USING ERRCODE = '42501';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('team_dashboard:' || v_org::text || ':' || p_target_team_id::text));

    SELECT count(*) INTO v_count
    FROM public.dashboards AS d
    WHERE d.organization_id = v_org
      AND d.team_id = p_target_team_id
      AND d.scope = 'team';

    IF v_count >= 50 THEN
      RAISE EXCEPTION 'LP_TEAM_DASHBOARD_LIMIT' USING ERRCODE = '22023';
    END IF;

    v_new_config := jsonb_set(v_new_config, '{teamId}', to_jsonb(p_target_team_id::text), true);

    v_reason := public.dashboard_config_v2_invalid_reason(v_new_config);
    IF v_reason IS NOT NULL THEN
      RAISE EXCEPTION 'LP_DASHBOARD_INVALID: %', v_reason USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.dashboards AS d (
      id, organization_id, scope, user_id, team_id, title, description, created_by_user_id, revision, config
    ) VALUES (
      v_new_id, v_org, 'team', NULL, p_target_team_id, v_trimmed_title, v_source_description, v_user, 1, v_new_config
    )
    RETURNING d.created_at INTO v_created_at;

    INSERT INTO public.dashboard_revisions (
      dashboard_id, organization_id, revision, title, config, created_by_user_id, created_at, change_summary
    ) VALUES (
      v_new_id, v_org, 1, v_trimmed_title, v_new_config, v_user, v_created_at, 'Kopie von ' || v_source_title
    );

    INSERT INTO public.audit_log (
      organization_id, actor_id, action, target_type, target_id, details
    ) VALUES (
      v_org, v_user, 'dashboard.copied', 'dashboard', v_new_id::text,
      jsonb_build_object(
        'source_id', p_source_id,
        'source_scope', v_source_scope,
        'target_scope', 'team',
        'target_team_id', p_target_team_id
      )
    );

    RETURN QUERY SELECT v_new_id, 1, v_created_at;
    RETURN;

  ELSE
    RAISE EXCEPTION 'LP_INVALID_SCOPE' USING ERRCODE = '22023';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.list_dashboard_teams_v2() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_dashboard_teams_v2() TO authenticated;

REVOKE ALL ON FUNCTION public.create_dashboard_team_v2(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_dashboard_team_v2(TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.update_dashboard_team_v2(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_dashboard_team_v2(UUID, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_dashboard_team_v2(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_dashboard_team_v2(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.list_dashboard_team_members_v2(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_dashboard_team_members_v2(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.add_dashboard_team_member_v2(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_dashboard_team_member_v2(UUID, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.remove_dashboard_team_member_v2(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_dashboard_team_member_v2(UUID, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.list_accessible_dashboards_v2() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_accessible_dashboards_v2() TO authenticated;

REVOKE ALL ON FUNCTION public.load_dashboard_v2(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.load_dashboard_v2(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_team_dashboard_v2(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_team_dashboard_v2(UUID, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.copy_dashboard_v2(UUID, TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.copy_dashboard_v2(UUID, TEXT, UUID, TEXT) TO authenticated;
