-- Auftrag 173 (Dashboard-Editor, Paket P16a): Abgleich V1 <-> V2 vor der Umstellung.
-- Spezifiziert in docs/auftraege/ANTIGRAVITY_AUFTRAG_173_GESAMTABNAHME_ABGLEICH.md §2.1.
--
-- Grundsätze:
--   * Die V1-Tabelle executive_dashboard_preferences wird ausschließlich gelesen.
--   * Ohne ausdrückliche Admin-Entscheidung ändert sich nichts (keine stille Übernahme).
--   * Eine Übernahme erzeugt immer eine neue V2-Revision, nie ein Überschreiben.
--   * Jede Entscheidung bindet die geprüften Revisionsstände; weicht vor der Umstellung (174)
--     eine Revision ab, gilt die Entscheidung als verfallen.
--   * Der Rollout-Schalter bleibt unverändert (Änderung erst in 174).
--
-- Die "V2-Kopie" eines Nutzers ist sein ältestes persönliches V2-Dashboard mit
-- metadata.migrated_from_v1 = true (get_or_create_personal_dashboard_v2 legt es beim ersten
-- Öffnen an; Vorlagen und Duplikate entstehen erst danach). Als "bearbeitet" gilt die Kopie,
-- wenn ihre Revision über der zuletzt durch Kopie oder Übernahme erzeugten Revision liegt
-- (metadata.migrated_v2_revision, Standard 1 = Erstkopie).

-- 1. Entscheidungstabelle (eine aktuelle Entscheidung je Nutzer und Organisation;
--    die Historie steht im Audit-Log).
CREATE TABLE IF NOT EXISTS public.dashboard_rollout_decisions (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ergebnis_klasse TEXT NOT NULL CHECK (
    ergebnis_klasse IN ('gleich', 'v1_geaendert', 'beide_geaendert', 'keine_kopie', 'nur_v2')
  ),
  entscheidung TEXT NOT NULL CHECK (
    entscheidung IN ('v1_uebernehmen', 'v2_behalten', 'spaeter')
  ),
  v1_revision INTEGER CHECK (v1_revision IS NULL OR v1_revision >= 1),
  v2_revision INTEGER CHECK (v2_revision IS NULL OR v2_revision >= 1),
  dashboard_id UUID REFERENCES public.dashboards(id) ON DELETE SET NULL,
  entschieden_von_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entschieden_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

ALTER TABLE public.dashboard_rollout_decisions ENABLE ROW LEVEL SECURITY;
-- Kein direkter Client-Zugriff: Lesen und Schreiben ausschließlich über die Admin-RPCs.
REVOKE ALL ON public.dashboard_rollout_decisions FROM PUBLIC, anon, authenticated;

-- 2. Reine Klassifizierung (ohne Tabellenzugriff, damit pgTAP sie direkt prüfen kann).
CREATE OR REPLACE FUNCTION public.dashboard_rollout_classify(
  p_has_v1 BOOLEAN,
  p_v1_revision INTEGER,
  p_has_v2 BOOLEAN,
  p_last_migrated_revision INTEGER,
  p_v2_revision INTEGER,
  p_v2_base_revision INTEGER
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN NOT p_has_v1 AND p_has_v2 THEN 'nur_v2'
    WHEN p_has_v1 AND NOT p_has_v2 THEN 'keine_kopie'
    WHEN NOT p_has_v1 AND NOT p_has_v2 THEN NULL
    -- Fehlt die Quellrevision (alte Kopie oder Kopie vom Standard), gilt V1 als geändert:
    -- lieber ein Fall zu viel zur Entscheidung als eine unbemerkt veraltete Kopie.
    WHEN p_v1_revision <= COALESCE(p_last_migrated_revision, 0) THEN 'gleich'
    WHEN p_v2_revision <= COALESCE(p_v2_base_revision, 1) THEN 'v1_geaendert'
    ELSE 'beide_geaendert'
  END
$$;

-- 3. Admin-Prüfung für die eigene Organisation.
CREATE OR REPLACE FUNCTION public.dashboard_rollout_require_admin()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org UUID := public.current_organization_id();
BEGIN
  IF auth.uid() IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members AS m
    WHERE m.user_id = auth.uid()
      AND m.organization_id = v_org
      AND m.status = 'active'
      AND m.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'LP_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  RETURN v_org;
END;
$$;

-- 4. V2-Kopie eines Nutzers (älteste migrierte persönliche Kopie).
CREATE OR REPLACE FUNCTION public.dashboard_rollout_copy_id(p_org UUID, p_user UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT d.id
  FROM public.dashboards AS d
  WHERE d.organization_id = p_org
    AND d.user_id = p_user
    AND d.scope = 'personal'
    AND (d.config->'metadata'->>'migrated_from_v1') = 'true'
  ORDER BY d.created_at ASC, d.id ASC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.dashboard_rollout_int(p_value JSONB)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  -- Nur ganze Zahlen im INTEGER-Bereich; alles andere gilt als fehlende Herkunft (NULL),
  -- damit ein einzelner manipulierter Wert den Abgleich nicht abbricht (Codex PR #219).
  SELECT CASE
    WHEN jsonb_typeof(p_value) = 'number'
      AND (p_value #>> '{}')::NUMERIC BETWEEN 0 AND 2147483647
      AND (p_value #>> '{}')::NUMERIC = trunc((p_value #>> '{}')::NUMERIC)
    THEN (p_value #>> '{}')::NUMERIC::INTEGER
  END
$$;

-- 5. Abgleich je Nutzer der eigenen Organisation (nur Admin).
CREATE OR REPLACE FUNCTION public.dashboard_v1_v2_reconciliation()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  org_role TEXT,
  org_status TEXT,
  v1_revision INTEGER,
  v1_updated_at TIMESTAMPTZ,
  v1_config JSONB,
  v2_dashboard_id UUID,
  v2_revision INTEGER,
  v2_updated_at TIMESTAMPTZ,
  v2_config JSONB,
  last_migrated_revision INTEGER,
  v2_base_revision INTEGER,
  ergebnis_klasse TEXT,
  entscheidung TEXT,
  entscheidung_v1_revision INTEGER,
  entscheidung_v2_revision INTEGER,
  entschieden_at TIMESTAMPTZ,
  entschieden_von_email TEXT,
  entscheidung_gueltig BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_variable
DECLARE
  v_org UUID := public.dashboard_rollout_require_admin();
BEGIN
  RETURN QUERY
  WITH people AS (
    SELECT p.user_id FROM public.executive_dashboard_preferences AS p
    WHERE p.organization_id = v_org
    UNION
    SELECT d.user_id FROM public.dashboards AS d
    WHERE d.organization_id = v_org
      AND d.scope = 'personal'
      AND (d.config->'metadata'->>'migrated_from_v1') = 'true'
  ),
  rows AS (
    SELECT
      pe.user_id,
      p.revision AS v1_rev,
      p.updated_at AS v1_at,
      p.config AS v1_cfg,
      d.id AS v2_id,
      d.revision AS v2_rev,
      d.updated_at AS v2_at,
      d.config AS v2_cfg,
      public.dashboard_rollout_int(d.config->'metadata'->'last_migrated_revision') AS last_rev,
      COALESCE(public.dashboard_rollout_int(d.config->'metadata'->'migrated_v2_revision'), 1) AS base_rev
    FROM people AS pe
    LEFT JOIN public.executive_dashboard_preferences AS p
      ON p.organization_id = v_org AND p.user_id = pe.user_id
    LEFT JOIN public.dashboards AS d
      ON d.id = public.dashboard_rollout_copy_id(v_org, pe.user_id)
  )
  SELECT
    r.user_id,
    u.email::TEXT,
    om.role::TEXT,
    om.status::TEXT,
    r.v1_rev,
    r.v1_at,
    r.v1_cfg,
    r.v2_id,
    r.v2_rev,
    r.v2_at,
    r.v2_cfg,
    r.last_rev,
    r.base_rev,
    public.dashboard_rollout_classify(
      r.v1_rev IS NOT NULL, r.v1_rev, r.v2_id IS NOT NULL, r.last_rev, r.v2_rev, r.base_rev
    ),
    dec.entscheidung,
    dec.v1_revision,
    dec.v2_revision,
    dec.entschieden_at,
    du.email::TEXT,
    CASE
      WHEN dec.entscheidung IS NULL THEN NULL
      ELSE dec.v1_revision IS NOT DISTINCT FROM r.v1_rev
        AND dec.v2_revision IS NOT DISTINCT FROM r.v2_rev
        AND dec.dashboard_id IS NOT DISTINCT FROM r.v2_id
    END
  FROM rows AS r
  LEFT JOIN auth.users AS u ON u.id = r.user_id
  LEFT JOIN public.organization_members AS om
    ON om.user_id = r.user_id AND om.organization_id = v_org
  LEFT JOIN public.dashboard_rollout_decisions AS dec
    ON dec.organization_id = v_org AND dec.user_id = r.user_id
  LEFT JOIN auth.users AS du ON du.id = dec.entschieden_von_user_id
  ORDER BY u.email NULLS LAST, r.user_id;
END;
$$;

-- 6. Entscheidung "V2-Pilot behalten" oder "später entscheiden" (nur Admin).
--    Erwartete Revisionen und erwartete Pilotkopie (Dashboard-ID) müssen dem aktuellen Stand
--    entsprechen, sonst LP_ROLLOUT_STALE (ein Austausch der Kopie bleibt nicht unbemerkt).
CREATE OR REPLACE FUNCTION public.dashboard_rollout_decide(
  p_user_id UUID,
  p_entscheidung TEXT,
  p_expected_v1_revision INTEGER,
  p_expected_v2_revision INTEGER,
  p_expected_dashboard_id UUID
)
RETURNS TABLE (ergebnis_klasse TEXT, entscheidung TEXT, entschieden_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_variable
DECLARE
  v_org UUID := public.dashboard_rollout_require_admin();
  v_v1_rev INTEGER;
  v_copy UUID;
  v_v2_rev INTEGER;
  v_last INTEGER;
  v_base INTEGER;
  v_class TEXT;
  v_at TIMESTAMPTZ := now();
BEGIN
  IF p_entscheidung NOT IN ('v2_behalten', 'spaeter') THEN
    RAISE EXCEPTION 'LP_ROLLOUT_INVALID: Entscheidung nicht erlaubt' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('dashboard_rollout:' || v_org::text || ':' || p_user_id::text));

  SELECT p.revision INTO v_v1_rev
  FROM public.executive_dashboard_preferences AS p
  WHERE p.organization_id = v_org AND p.user_id = p_user_id;

  v_copy := public.dashboard_rollout_copy_id(v_org, p_user_id);
  IF v_copy IS NOT NULL THEN
    SELECT d.revision,
           public.dashboard_rollout_int(d.config->'metadata'->'last_migrated_revision'),
           COALESCE(public.dashboard_rollout_int(d.config->'metadata'->'migrated_v2_revision'), 1)
    INTO v_v2_rev, v_last, v_base
    FROM public.dashboards AS d WHERE d.id = v_copy;
  END IF;

  IF v_v1_rev IS NULL AND v_copy IS NULL THEN
    RAISE EXCEPTION 'LP_ROLLOUT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_v1_rev IS DISTINCT FROM p_expected_v1_revision
     OR v_v2_rev IS DISTINCT FROM p_expected_v2_revision
     OR v_copy IS DISTINCT FROM p_expected_dashboard_id THEN
    RAISE EXCEPTION 'LP_ROLLOUT_STALE' USING ERRCODE = 'P0001';
  END IF;

  v_class := public.dashboard_rollout_classify(
    v_v1_rev IS NOT NULL, v_v1_rev, v_copy IS NOT NULL, v_last, v_v2_rev, v_base
  );

  INSERT INTO public.dashboard_rollout_decisions AS dec (
    organization_id, user_id, ergebnis_klasse, entscheidung, v1_revision, v2_revision,
    dashboard_id, entschieden_von_user_id, entschieden_at
  )
  VALUES (v_org, p_user_id, v_class, p_entscheidung, v_v1_rev, v_v2_rev, v_copy, auth.uid(), v_at)
  ON CONFLICT (organization_id, user_id) DO UPDATE
  SET ergebnis_klasse = EXCLUDED.ergebnis_klasse,
      entscheidung = EXCLUDED.entscheidung,
      v1_revision = EXCLUDED.v1_revision,
      v2_revision = EXCLUDED.v2_revision,
      dashboard_id = EXCLUDED.dashboard_id,
      entschieden_von_user_id = EXCLUDED.entschieden_von_user_id,
      entschieden_at = EXCLUDED.entschieden_at;

  INSERT INTO public.audit_log (organization_id, actor_id, action, target_type, target_id, details)
  VALUES (
    v_org, auth.uid(), 'dashboard.rollout_decided', 'user', p_user_id::text,
    jsonb_build_object(
      'entscheidung', p_entscheidung, 'ergebnis_klasse', v_class,
      'v1_revision', v_v1_rev, 'v2_revision', v_v2_rev
    )
  );

  RETURN QUERY SELECT v_class, p_entscheidung, v_at;
END;
$$;

-- 7. Übernahme des aktuellen V1-Stands als neue V2-Revision (nur Admin).
--    Die App übersetzt die V1-Konfiguration mit migrateV1ToV2 und übergibt das Ergebnis.
--    Der Server bindet Identität und Herkunft, validiert das Schema und schreibt eine neue
--    Revision; die bisherige V2-Fassung bleibt in dashboard_revisions erhalten.
CREATE OR REPLACE FUNCTION public.dashboard_rollout_adopt_v1(
  p_user_id UUID,
  p_expected_v1_revision INTEGER,
  p_expected_v2_revision INTEGER,
  p_expected_dashboard_id UUID,
  p_config JSONB
)
RETURNS TABLE (dashboard_id UUID, revision INTEGER, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_variable
DECLARE
  v_org UUID := public.dashboard_rollout_require_admin();
  v_v1_rev INTEGER;
  v_copy UUID;
  v_v2_rev INTEGER;
  v_title TEXT;
  v_cfg JSONB;
  v_reason TEXT;
  v_new_rev INTEGER;
  v_updated TIMESTAMPTZ;
  v_summary TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('dashboard_rollout:' || v_org::text || ':' || p_user_id::text));

  SELECT p.revision INTO v_v1_rev
  FROM public.executive_dashboard_preferences AS p
  WHERE p.organization_id = v_org AND p.user_id = p_user_id;
  IF v_v1_rev IS NULL THEN
    RAISE EXCEPTION 'LP_ROLLOUT_NOT_FOUND: keine V1-Konfiguration' USING ERRCODE = 'P0002';
  END IF;

  v_copy := public.dashboard_rollout_copy_id(v_org, p_user_id);
  IF v_copy IS NULL THEN
    RAISE EXCEPTION 'LP_ROLLOUT_NO_COPY' USING ERRCODE = 'P0002';
  END IF;

  SELECT d.revision, d.title INTO v_v2_rev, v_title
  FROM public.dashboards AS d WHERE d.id = v_copy FOR UPDATE;

  IF v_v1_rev IS DISTINCT FROM p_expected_v1_revision
     OR v_v2_rev IS DISTINCT FROM p_expected_v2_revision
     OR v_copy IS DISTINCT FROM p_expected_dashboard_id THEN
    RAISE EXCEPTION 'LP_ROLLOUT_STALE' USING ERRCODE = 'P0001';
  END IF;

  IF p_config IS NULL OR jsonb_typeof(p_config) <> 'object' THEN
    RAISE EXCEPTION 'LP_DASHBOARD_INVALID: kein Objekt' USING ERRCODE = '22023';
  END IF;

  v_new_rev := v_v2_rev + 1;
  v_cfg := p_config
    || jsonb_build_object(
      'id', v_copy::text,
      'title', v_title,
      'scope', 'personal',
      'ownerUserId', p_user_id::text,
      'organizationId', v_org::text
    );
  v_cfg := v_cfg - 'teamId';
  v_cfg := jsonb_set(
    v_cfg, '{metadata}',
    COALESCE(CASE WHEN jsonb_typeof(p_config->'metadata') = 'object' THEN p_config->'metadata' END, '{}'::jsonb)
      || jsonb_build_object(
        'migrated_from_v1', true,
        'migrated_at', to_jsonb(now()),
        'last_migrated_revision', v_v1_rev,
        'migrated_v2_revision', v_new_rev,
        'user_edited', false,
        'adopted_by_admin', true
      ),
    true
  );

  v_reason := public.dashboard_config_v2_invalid_reason(v_cfg);
  IF v_reason IS NOT NULL THEN
    RAISE EXCEPTION 'LP_DASHBOARD_INVALID: %', v_reason USING ERRCODE = '22023';
  END IF;

  UPDATE public.dashboards AS d
  SET config = v_cfg, revision = v_new_rev, updated_at = now()
  WHERE d.id = v_copy AND d.revision = v_v2_rev
  RETURNING d.updated_at INTO v_updated;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_ROLLOUT_STALE' USING ERRCODE = 'P0001';
  END IF;

  v_summary := 'Übernahme aus altem Editor (V1-Revision ' || v_v1_rev || ')';
  INSERT INTO public.dashboard_revisions (
    dashboard_id, organization_id, revision, title, config, created_by_user_id, change_summary
  )
  VALUES (v_copy, v_org, v_new_rev, v_title, v_cfg, auth.uid(), v_summary);

  INSERT INTO public.dashboard_rollout_decisions AS dec (
    organization_id, user_id, ergebnis_klasse, entscheidung, v1_revision, v2_revision,
    dashboard_id, entschieden_von_user_id, entschieden_at
  )
  VALUES (v_org, p_user_id, 'gleich', 'v1_uebernehmen', v_v1_rev, v_new_rev, v_copy, auth.uid(), now())
  ON CONFLICT (organization_id, user_id) DO UPDATE
  SET ergebnis_klasse = EXCLUDED.ergebnis_klasse,
      entscheidung = EXCLUDED.entscheidung,
      v1_revision = EXCLUDED.v1_revision,
      v2_revision = EXCLUDED.v2_revision,
      dashboard_id = EXCLUDED.dashboard_id,
      entschieden_von_user_id = EXCLUDED.entschieden_von_user_id,
      entschieden_at = EXCLUDED.entschieden_at;

  INSERT INTO public.audit_log (organization_id, actor_id, action, target_type, target_id, details)
  VALUES (
    v_org, auth.uid(), 'dashboard.rollout_v1_adopted', 'dashboard', v_copy::text,
    jsonb_build_object(
      'user_id', p_user_id, 'v1_revision', v_v1_rev,
      'previous_v2_revision', v_v2_rev, 'new_v2_revision', v_new_rev
    )
  );

  RETURN QUERY SELECT v_copy, v_new_rev, v_updated;
END;
$$;

-- Rechte: Hilfsfunktionen nicht öffentlich, Admin-RPCs nur für angemeldete Nutzer
-- (die Admin-Prüfung erfolgt in der Funktion).
REVOKE ALL ON FUNCTION public.dashboard_rollout_require_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dashboard_rollout_copy_id(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dashboard_rollout_int(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dashboard_rollout_classify(BOOLEAN, INTEGER, BOOLEAN, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_rollout_classify(BOOLEAN, INTEGER, BOOLEAN, INTEGER, INTEGER, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.dashboard_v1_v2_reconciliation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_v1_v2_reconciliation() TO authenticated;
REVOKE ALL ON FUNCTION public.dashboard_rollout_decide(UUID, TEXT, INTEGER, INTEGER, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_rollout_decide(UUID, TEXT, INTEGER, INTEGER, UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.dashboard_rollout_adopt_v1(UUID, INTEGER, INTEGER, UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_rollout_adopt_v1(UUID, INTEGER, INTEGER, UUID, JSONB) TO authenticated;
