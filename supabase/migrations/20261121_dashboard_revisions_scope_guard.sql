-- Sicherheitskorrektur (Auftrag FIX_DASHBOARD_REVISIONS_SCOPE, 17.11.2026)
--
-- get_dashboard_v2_revisions (20261113) prüfte nur
--   d.scope = 'team' OR d.user_id = auth.uid()
-- und gab damit Revisionen (Titel, Autor, Änderungsnotiz) von Team-Dashboards
-- an jedes aktive Mitglied der Organisation heraus. Team-Dashboards lassen sich
-- bis P11 über RPCs nicht anlegen, die Lücke war daher latent.
--
-- Bis P11 (Auftrag 162) gilt: Lesbar sind ausschließlich eigene persönliche
-- Dashboards. Auftrag 162 ersetzt die Prüfung durch die vollständige
-- Team-Rechteprüfung. Sonst unverändert gegenüber 20261113.

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
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.dashboards AS d
    WHERE d.id = p_dashboard_id
      AND d.organization_id = v_org
      AND d.scope = 'personal'
      AND d.user_id = v_user
  ) THEN
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

REVOKE ALL ON FUNCTION public.get_dashboard_v2_revisions(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_v2_revisions(UUID) TO authenticated;
