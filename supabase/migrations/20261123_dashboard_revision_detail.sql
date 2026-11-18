-- Auftrag 165 (P12): Dashboard-Revision-Detail und Paging
-- Ergaenzt list_dashboard_v2_revisions_page und get_dashboard_v2_revision_detail.
-- Unveraendert: get_dashboard_v2_revisions und restore_dashboard_revision_v2.

CREATE OR REPLACE FUNCTION public.list_dashboard_v2_revisions_page(
  p_dashboard_id UUID,
  p_before_revision INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  revision INTEGER,
  title TEXT,
  created_by_user_id UUID,
  created_by_is_self BOOLEAN,
  created_by_name TEXT,
  created_by_active BOOLEAN,
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

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'LP_DASHBOARD_INVALID: Limit muss zwischen 1 und 100 liegen' USING ERRCODE = '22023';
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
  SELECT
    r.revision,
    r.title,
    r.created_by_user_id,
    (r.created_by_user_id = v_user) AS created_by_is_self,
    u.email::TEXT AS created_by_name,
    COALESCE(m.status = 'active', FALSE) AS created_by_active,
    r.created_at,
    r.change_summary
  FROM public.dashboard_revisions AS r
  LEFT JOIN auth.users AS u ON u.id = r.created_by_user_id
  LEFT JOIN public.organization_members AS m
    ON m.user_id = r.created_by_user_id AND m.organization_id = v_org
  WHERE r.dashboard_id = p_dashboard_id
    AND r.organization_id = v_org
    AND (p_before_revision IS NULL OR r.revision < p_before_revision)
  ORDER BY r.revision DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.list_dashboard_v2_revisions_page(UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_dashboard_v2_revisions_page(UUID, INTEGER, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_dashboard_v2_revision_detail(
  p_dashboard_id UUID,
  p_revision INTEGER
)
RETURNS TABLE (
  revision INTEGER,
  title TEXT,
  config JSONB,
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

  IF NOT EXISTS (
    SELECT 1 FROM public.dashboard_revisions AS r
    WHERE r.dashboard_id = p_dashboard_id
      AND r.organization_id = v_org
      AND r.revision = p_revision
  ) THEN
    RAISE EXCEPTION 'LP_REVISION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT r.revision, r.title, r.config, r.created_by_user_id, r.created_at, r.change_summary
  FROM public.dashboard_revisions AS r
  WHERE r.dashboard_id = p_dashboard_id
    AND r.organization_id = v_org
    AND r.revision = p_revision;
END;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_v2_revision_detail(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_v2_revision_detail(UUID, INTEGER) TO authenticated;
