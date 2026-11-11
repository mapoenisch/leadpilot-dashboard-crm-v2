-- Auftrag 150 (Dashboard-Editor, Paket P07): Ziel-Speicherstruktur, RLS, dauerhafte Revisionen und V1->V2-Kopiermigration.
-- Spezifiziert in docs/dashboard/GRID_VERGLEICH_ZIELMODELL_146.md und docs/dashboard/DASHBOARD_EDITOR_MASTERPLAN.md.
-- Trennung von Dashboards (Metadaten & aktueller Stand) und Revisionshistorie (unveränderliche Schnappschüsse).
-- Bereitet Teams und Team-Mitgliedschaften relational vor; scope = 'team' bleibt bis P11 serverseitig gesperrt.

-- 1. Freigabegruppen (Teams innerhalb einer Organisation)
CREATE TABLE IF NOT EXISTS public.dashboard_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_dashboard_teams_org_name UNIQUE (organization_id, name)
);

-- 2. Team-Mitgliedschaften
CREATE TABLE IF NOT EXISTS public.dashboard_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.dashboard_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'lead')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_dashboard_team_members_team_user UNIQUE (team_id, user_id)
);

-- 3. Haupt-Dashboards (Metadaten & aktueller Stand)
CREATE TABLE IF NOT EXISTS public.dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('personal', 'team')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.dashboard_teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 120),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  config JSONB NOT NULL,
  CONSTRAINT chk_dashboard_scope_owner CHECK (
    (scope = 'personal' AND user_id IS NOT NULL AND team_id IS NULL) OR
    (scope = 'team' AND team_id IS NOT NULL AND user_id IS NULL)
  )
);

-- 4. Revisionshistorie (Unveränderliche Schnappschüsse)
CREATE TABLE IF NOT EXISTS public.dashboard_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  title TEXT NOT NULL,
  config JSONB NOT NULL,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_summary TEXT CHECK (change_summary IS NULL OR char_length(change_summary) <= 250),
  CONSTRAINT uq_dashboard_revisions_dash_rev UNIQUE (dashboard_id, revision)
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_dashboards_org_scope_user
  ON public.dashboards (organization_id, scope, user_id);

CREATE INDEX IF NOT EXISTS idx_dashboards_org_team
  ON public.dashboards (organization_id, team_id)
  WHERE scope = 'team';

CREATE INDEX IF NOT EXISTS idx_dashboard_revisions_lookup
  ON public.dashboard_revisions (dashboard_id, revision DESC);

CREATE INDEX IF NOT EXISTS idx_dashboard_teams_org
  ON public.dashboard_teams (organization_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_team_members_user
  ON public.dashboard_team_members (user_id, organization_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_team_members_team
  ON public.dashboard_team_members (team_id);

-- Row-Level-Security aktivieren
ALTER TABLE public.dashboard_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_revisions ENABLE ROW LEVEL SECURITY;

-- Direktmutationen für alle Clients sperren (Schreibzugriff nur über RPCs)
REVOKE ALL ON public.dashboard_teams FROM anon;
REVOKE ALL ON public.dashboard_team_members FROM anon;
REVOKE ALL ON public.dashboards FROM anon;
REVOKE ALL ON public.dashboard_revisions FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.dashboard_teams FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.dashboard_team_members FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.dashboards FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.dashboard_revisions FROM authenticated;

-- Lesezugriff (SELECT) über RLS-Policies steuern
GRANT SELECT ON public.dashboard_teams TO authenticated;
GRANT SELECT ON public.dashboard_team_members TO authenticated;
GRANT SELECT ON public.dashboards TO authenticated;
GRANT SELECT ON public.dashboard_revisions TO authenticated;

-- Phase 1 RLS-Policies: Nur persönliche Dashboards des eigenen Benutzers im Mandanten
DROP POLICY IF EXISTS "dashboards_select_personal_own" ON public.dashboards;
CREATE POLICY "dashboards_select_personal_own" ON public.dashboards
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND scope = 'personal'
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "dashboard_revisions_select_personal_own" ON public.dashboard_revisions;
CREATE POLICY "dashboard_revisions_select_personal_own" ON public.dashboard_revisions
  FOR SELECT TO authenticated
  USING (
    organization_id = public.current_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.dashboards AS d
      WHERE d.id = dashboard_revisions.dashboard_id
        AND d.organization_id = public.current_organization_id()
        AND d.scope = 'personal'
        AND d.user_id = auth.uid()
    )
  );

-- Serverseitige Schema- und Sicherheitsvalidierung
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
  END LOOP;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_config_v2_invalid_reason(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_config_v2_invalid_reason(JSONB) TO authenticated;

-- RPC: create_dashboard_v2
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
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
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

  v_dashboard_id := gen_random_uuid();
  p_config := jsonb_set(p_config, '{id}', to_jsonb(v_dashboard_id::text), true);

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
    p_title,
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
    p_title,
    p_config,
    v_user,
    v_created_at,
    'Dashboard initial erstellt'
  );

  RETURN QUERY SELECT v_dashboard_id, 1, v_created_at;
END;
$$;

-- RPC: save_dashboard_v2
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
  v_reason TEXT;
  v_new_revision INTEGER;
  v_updated_at TIMESTAMPTZ;
  v_current_scope TEXT;
  v_owner_user_id UUID;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  v_reason := public.dashboard_config_v2_invalid_reason(p_config);
  IF v_reason IS NOT NULL THEN
    RAISE EXCEPTION 'LP_DASHBOARD_INVALID: %', v_reason USING ERRCODE = '22023';
  END IF;

  IF p_expected_revision = 0 OR p_dashboard_id IS NULL THEN
    RETURN QUERY
    SELECT c.dashboard_id, c.revision, c.created_at AS updated_at
    FROM public.create_dashboard_v2(p_title, p_config, 'personal', NULL, NULL) AS c;
    RETURN;
  END IF;

  SELECT d.scope, d.user_id, d.revision INTO v_current_scope, v_owner_user_id, v_new_revision
  FROM public.dashboards AS d
  WHERE d.id = p_dashboard_id AND d.organization_id = v_org;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_current_scope = 'team' THEN
    RAISE EXCEPTION 'LP_TEAM_DASHBOARDS_LOCKED_UNTIL_P11' USING ERRCODE = '42501';
  END IF;

  IF v_current_scope = 'personal' AND v_owner_user_id <> v_user THEN
    RAISE EXCEPTION 'LP_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF v_new_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'LP_DASHBOARD_CONFLICT' USING ERRCODE = 'P0001',
      DETAIL = 'Aktuelle Revision (' || v_new_revision || ') weicht von erwarteter Revision (' || p_expected_revision || ') ab.';
  END IF;

  p_config := jsonb_set(p_config, '{id}', to_jsonb(p_dashboard_id::text), true);

  UPDATE public.dashboards AS d
  SET title = p_title,
      config = p_config,
      revision = d.revision + 1,
      updated_at = now()
  WHERE d.id = p_dashboard_id
    AND d.organization_id = v_org
    AND d.revision = p_expected_revision
    AND (d.scope = 'team' OR d.user_id = v_user)
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
    p_title,
    p_config,
    v_user,
    v_updated_at,
    p_change_summary
  );

  RETURN QUERY SELECT p_dashboard_id, v_new_revision, v_updated_at;
END;
$$;

-- RPC: restore_dashboard_revision_v2
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
  v_scope TEXT;
  v_owner_user_id UUID;
  v_target_title TEXT;
  v_target_config JSONB;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT d.scope, d.user_id INTO v_scope, v_owner_user_id
  FROM public.dashboards AS d
  WHERE d.id = p_dashboard_id AND d.organization_id = v_org;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_scope = 'team' THEN
    RAISE EXCEPTION 'LP_TEAM_DASHBOARDS_LOCKED_UNTIL_P11' USING ERRCODE = '42501';
  END IF;

  IF v_scope = 'personal' AND v_owner_user_id <> v_user THEN
    RAISE EXCEPTION 'LP_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  SELECT r.title, r.config INTO v_target_title, v_target_config
  FROM public.dashboard_revisions AS r
  WHERE r.dashboard_id = p_dashboard_id
    AND r.organization_id = v_org
    AND r.revision = p_target_revision;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_REVISION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT s.dashboard_id, s.revision AS new_revision, s.updated_at
  FROM public.save_dashboard_v2(
    p_dashboard_id,
    p_expected_revision,
    v_target_title,
    v_target_config,
    'Wiederhergestellt von Revision ' || p_target_revision
  ) AS s;
END;
$$;

-- RPC: load_personal_dashboard_v2
CREATE OR REPLACE FUNCTION public.load_personal_dashboard_v2()
RETURNS TABLE (
  id UUID,
  title TEXT,
  scope TEXT,
  revision INTEGER,
  config JSONB,
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
  SELECT d.id, d.title, d.scope, d.revision, d.config, d.updated_at
  FROM public.dashboards AS d
  WHERE d.organization_id = v_org
    AND d.user_id = v_user
    AND d.scope = 'personal'
  ORDER BY d.created_at ASC
  LIMIT 1;
END;
$$;

-- RPC: get_or_create_personal_dashboard_v2
-- Sichert die initiale Kopiermigration atomar gegen parallele Browser-Tabs/Rennen ab.
CREATE OR REPLACE FUNCTION public.get_or_create_personal_dashboard_v2(
  p_initial_config JSONB,
  p_title TEXT DEFAULT 'Executive Dashboard'
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  scope TEXT,
  revision INTEGER,
  config JSONB,
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
  v_existing_id UUID;
  v_created_id UUID;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  -- Transaktions-Advisory-Lock sichert atomaren Check-and-Create pro Nutzer & Mandant ab
  PERFORM pg_advisory_xact_lock(hashtext('personal_dashboard:' || v_org::text || ':' || v_user::text));

  -- Prüfen ob bereits ein persönliches Dashboard existiert
  SELECT d.id INTO v_existing_id
  FROM public.dashboards AS d
  WHERE d.organization_id = v_org
    AND d.user_id = v_user
    AND d.scope = 'personal'
  ORDER BY d.created_at ASC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN QUERY
    SELECT d.id, d.title, d.scope, d.revision, d.config, d.updated_at
    FROM public.dashboards AS d
    WHERE d.id = v_existing_id;
    RETURN;
  END IF;

  -- Andernfalls atomar initial erstellen
  SELECT c.dashboard_id
  INTO v_created_id
  FROM public.create_dashboard_v2(p_title, p_initial_config, 'personal', NULL, NULL) AS c;

  RETURN QUERY
  SELECT d.id, d.title, d.scope, d.revision, d.config, d.updated_at
  FROM public.dashboards AS d
  WHERE d.id = v_created_id;
END;
$$;

-- RPC: get_dashboard_v2_revisions
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
      AND (d.scope = 'team' OR d.user_id = v_user)
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

-- Berechtigungen für RPCs erteilen
REVOKE ALL ON FUNCTION public.create_dashboard_v2(TEXT, JSONB, TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_dashboard_v2(TEXT, JSONB, TEXT, UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.save_dashboard_v2(UUID, INTEGER, TEXT, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_dashboard_v2(UUID, INTEGER, TEXT, JSONB, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.restore_dashboard_revision_v2(UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_dashboard_revision_v2(UUID, INTEGER, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.load_personal_dashboard_v2() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.load_personal_dashboard_v2() TO authenticated;

REVOKE ALL ON FUNCTION public.get_or_create_personal_dashboard_v2(JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_personal_dashboard_v2(JSONB, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.get_dashboard_v2_revisions(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_v2_revisions(UUID) TO authenticated;
