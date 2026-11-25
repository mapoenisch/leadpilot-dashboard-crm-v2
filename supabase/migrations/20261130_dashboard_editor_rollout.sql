-- Auftrag 174 (Dashboard-Editor, Paket P16b): gestufte Umstellung auf den neuen Editor.
-- Spezifiziert in docs/auftraege/ANTIGRAVITY_AUFTRAG_174_GESTUFTE_UMSTELLUNG.md §2.
--
-- Grundsätze:
--   * Die Stufe je Organisation setzt ausschließlich Marc per SQL (es gibt keine Rolle
--     „Plattform-Admin“; Org-Admins schalten nicht selbst). Kein automatisches Hochstufen.
--   * Stufe 0 = alter Editor (Standard). Stufe 1–3 = neuer Editor für diese Organisation;
--     die Stufennummer dokumentiert die Rollout-Welle (1 Test-Organisation, 2 ausgewählte,
--     3 alle). Ohne Zeile gilt Stufe 0.
--   * Ein Nutzer wird beim Laden nur umgestellt, wenn seine Ergebnisklasse aus 173 das erlaubt
--     bzw. eine gültige Entscheidung vorliegt (Revisionen und Pilotkopie unverändert).
--     Entscheidung Marc 23.11.2026: beide_geaendert ohne Entscheidung -> Pilot behalten.
--   * Nach erfolgreicher Umstellung ist der Übergang fixiert (umgestellt_at); spätere
--     Bearbeitungen führen zu keinem Rückfall. Rückweg nur über die Stufe.
--   * Der Rückweg schreibt nichts zurück: V1 und V2 bleiben unverändert erhalten.
--   * Alarme sind von der Stufe unabhängig (keine Änderung an Alarm-Objekten).

-- 1. Schalter je Organisation.
CREATE TABLE IF NOT EXISTS public.dashboard_editor_rollout (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  stufe INTEGER NOT NULL DEFAULT 0 CHECK (stufe BETWEEN 0 AND 3),
  aktiviert_von TEXT,
  aktiviert_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notiz TEXT
);

ALTER TABLE public.dashboard_editor_rollout ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dashboard_editor_rollout FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.dashboard_editor_rollout TO authenticated;

DROP POLICY IF EXISTS dashboard_editor_rollout_select_own ON public.dashboard_editor_rollout;
CREATE POLICY dashboard_editor_rollout_select_own ON public.dashboard_editor_rollout
  FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());

-- Zeitpunkt jeder Stufenänderung (auch bei Änderung per SQL). Das Protokoll schreibt erst der
-- AFTER-Trigger: Bei INSERT ... ON CONFLICT DO UPDATE läuft der BEFORE-INSERT-Trigger auch für
-- den verworfenen Insert-Versuch (Codex PR #221).
CREATE OR REPLACE FUNCTION public.dashboard_editor_rollout_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.stufe IS DISTINCT FROM OLD.stufe THEN
    NEW.aktiviert_at := now();
    NEW.aktiviert_von := COALESCE(NEW.aktiviert_von, current_user::TEXT);
  ELSE
    NEW.aktiviert_at := OLD.aktiviert_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.dashboard_editor_rollout_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Nur tatsächlich angelegte Zeilen und tatsächliche Stufenwechsel.
  IF TG_OP = 'INSERT' OR NEW.stufe IS DISTINCT FROM OLD.stufe THEN
    INSERT INTO public.audit_log (organization_id, actor_id, action, details)
    VALUES (
      NEW.organization_id, auth.uid(), 'dashboard.editor_rollout_stufe',
      jsonb_build_object(
        'stufe', NEW.stufe,
        'vorher', CASE WHEN TG_OP = 'UPDATE' THEN OLD.stufe END,
        'aktiviert_von', NEW.aktiviert_von,
        'notiz', NEW.notiz
      )
    );
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS dashboard_editor_rollout_touch ON public.dashboard_editor_rollout;
CREATE TRIGGER dashboard_editor_rollout_touch
  BEFORE INSERT OR UPDATE ON public.dashboard_editor_rollout
  FOR EACH ROW EXECUTE FUNCTION public.dashboard_editor_rollout_touch();

DROP TRIGGER IF EXISTS dashboard_editor_rollout_audit ON public.dashboard_editor_rollout;
CREATE TRIGGER dashboard_editor_rollout_audit
  AFTER INSERT OR UPDATE ON public.dashboard_editor_rollout
  FOR EACH ROW EXECUTE FUNCTION public.dashboard_editor_rollout_audit();

-- 2. Vollzogene Umstellungen je Nutzer (fixiert den Übergang).
CREATE TABLE IF NOT EXISTS public.dashboard_editor_switches (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  umgestellt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ergebnis_klasse TEXT,
  v1_revision INTEGER,
  v2_revision INTEGER,
  dashboard_id UUID REFERENCES public.dashboards(id) ON DELETE SET NULL,
  PRIMARY KEY (organization_id, user_id)
);

ALTER TABLE public.dashboard_editor_switches ENABLE ROW LEVEL SECURITY;
-- Kein direkter Client-Zugriff: nur über dashboard_editor_rollout_status().
REVOKE ALL ON public.dashboard_editor_switches FROM PUBLIC, anon, authenticated;

-- 3. Darf ein Nutzer mit dieser Klasse/Entscheidung umgestellt werden?
CREATE OR REPLACE FUNCTION public.dashboard_editor_switch_allowed(
  p_klasse TEXT,
  p_entscheidung TEXT,
  p_gueltig BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  -- Dieselbe Regel wie „offen“ in der Admin-Ansicht (needsDecision, 173), mit Marcs Ausnahme:
  -- beide_geaendert ohne Entscheidung -> Pilot behalten (23.11.2026). Zurückgestellte oder
  -- verfallene Entscheidungen blockieren auch bei „gleich“ (Codex PR #221).
  SELECT CASE
    WHEN p_klasse = 'gleich' THEN
      NOT (p_entscheidung = 'spaeter' OR (p_entscheidung IS NOT NULL AND p_gueltig IS FALSE))
    WHEN p_klasse IN ('v1_geaendert', 'beide_geaendert') THEN
      CASE
        WHEN p_entscheidung IS NULL THEN p_klasse = 'beide_geaendert'
        WHEN p_entscheidung = 'spaeter' THEN false
        ELSE COALESCE(p_gueltig, false)
      END
    -- nur_v2, keine_kopie, ohne Stand: nichts zu entscheiden
    ELSE true
  END
$$;

-- 4. Abgleich-Stand eines einzelnen Nutzers (dieselben Regeln wie 173, ohne Admin-Prüfung;
--    nicht öffentlich, nur aus den RPCs dieses Auftrags aufgerufen).
CREATE OR REPLACE FUNCTION public.dashboard_editor_user_state(p_org UUID, p_user UUID)
RETURNS TABLE (
  ergebnis_klasse TEXT,
  entscheidung TEXT,
  entscheidung_gueltig BOOLEAN,
  v1_revision INTEGER,
  v1_updated_at TIMESTAMPTZ,
  v2_revision INTEGER,
  v2_dashboard_id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH r AS (
    SELECT
      p.revision AS v1_rev,
      p.updated_at AS v1_at,
      d.id AS v2_id,
      d.revision AS v2_rev,
      public.dashboard_rollout_int(d.config->'metadata'->'last_migrated_revision') AS last_rev,
      COALESCE(public.dashboard_rollout_int(d.config->'metadata'->'migrated_v2_revision'), 1) AS base_rev
    FROM (SELECT 1) AS one
    LEFT JOIN public.executive_dashboard_preferences AS p
      ON p.organization_id = p_org AND p.user_id = p_user
    LEFT JOIN public.dashboards AS d
      ON d.id = public.dashboard_rollout_copy_id(p_org, p_user)
  )
  SELECT
    public.dashboard_rollout_classify(
      r.v1_rev IS NOT NULL, r.v1_rev, r.v2_id IS NOT NULL, r.last_rev, r.v2_rev, r.base_rev
    ),
    dec.entscheidung,
    CASE
      WHEN dec.entscheidung IS NULL THEN NULL
      ELSE dec.v1_revision IS NOT DISTINCT FROM r.v1_rev
        AND dec.v2_revision IS NOT DISTINCT FROM r.v2_rev
        AND dec.dashboard_id IS NOT DISTINCT FROM r.v2_id
    END,
    r.v1_rev,
    r.v1_at,
    r.v2_rev,
    r.v2_id
  FROM r
  LEFT JOIN public.dashboard_rollout_decisions AS dec
    ON dec.organization_id = p_org AND dec.user_id = p_user
$$;

-- 5. Editor-Wahl für den angemeldeten Nutzer (beim Laden des Dashboards).
--    grund: stufe_0 | rueckweg | umgestellt | umstellbar | entscheidung_fehlt
--           | entscheidung_verfallen | entscheidung_spaeter
--    p_vollziehen = false: reine Abfrage ohne Umstellung (Beobachtung während einer offenen
--    Bearbeitung; der Wechsel wirkt erst beim nächsten Laden).
CREATE OR REPLACE FUNCTION public.dashboard_editor_rollout_status(p_vollziehen BOOLEAN DEFAULT true)
RETURNS TABLE (
  stufe INTEGER,
  aktiviert_at TIMESTAMPTZ,
  editor TEXT,
  grund TEXT,
  umgestellt_at TIMESTAMPTZ,
  v1_updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_variable
DECLARE
  v_user UUID := auth.uid();
  v_org UUID := public.current_organization_id();
  v_stufe INTEGER := 0;
  v_aktiviert TIMESTAMPTZ;
  v_switched TIMESTAMPTZ;
  s RECORD;
BEGIN
  IF v_user IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT ro.stufe, ro.aktiviert_at INTO v_stufe, v_aktiviert
  FROM public.dashboard_editor_rollout AS ro WHERE ro.organization_id = v_org;
  v_stufe := COALESCE(v_stufe, 0);

  SELECT sw.umgestellt_at INTO v_switched
  FROM public.dashboard_editor_switches AS sw
  WHERE sw.organization_id = v_org AND sw.user_id = v_user;

  IF v_stufe <> 0 AND v_switched IS NULL AND COALESCE(p_vollziehen, true) THEN
    -- Prüfung und Fixierung serialisieren (Codex PR #221): Die geprüften Zeilen (V1-Stand,
    -- Pilotkopie, Entscheidung) sind bis zum Ende der Transaktion gegen Änderungen gesperrt.
    -- Ein gleichzeitiges Speichern wartet und gilt damit als Bearbeitung nach der Umstellung.
    PERFORM 1 FROM public.executive_dashboard_preferences AS p
    WHERE p.organization_id = v_org AND p.user_id = v_user FOR SHARE;
    PERFORM 1 FROM public.dashboards AS d
    WHERE d.id = public.dashboard_rollout_copy_id(v_org, v_user) FOR SHARE;
    PERFORM 1 FROM public.dashboard_rollout_decisions AS dec
    WHERE dec.organization_id = v_org AND dec.user_id = v_user FOR SHARE;
  END IF;

  SELECT * INTO s FROM public.dashboard_editor_user_state(v_org, v_user);

  IF v_stufe = 0 THEN
    RETURN QUERY SELECT
      v_stufe, v_aktiviert, 'v1'::TEXT,
      CASE WHEN v_switched IS NULL THEN 'stufe_0' ELSE 'rueckweg' END,
      v_switched, s.v1_updated_at;
    RETURN;
  END IF;

  IF v_switched IS NOT NULL THEN
    RETURN QUERY SELECT v_stufe, v_aktiviert, 'v2'::TEXT, 'umgestellt'::TEXT, v_switched, s.v1_updated_at;
    RETURN;
  END IF;

  IF NOT public.dashboard_editor_switch_allowed(s.ergebnis_klasse, s.entscheidung, s.entscheidung_gueltig) THEN
    RETURN QUERY SELECT
      v_stufe, v_aktiviert, 'v1'::TEXT,
      CASE
        WHEN s.entscheidung = 'spaeter' THEN 'entscheidung_spaeter'
        WHEN s.entscheidung IS NULL THEN 'entscheidung_fehlt'
        ELSE 'entscheidung_verfallen'
      END,
      NULL::TIMESTAMPTZ, s.v1_updated_at;
    RETURN;
  END IF;

  IF NOT COALESCE(p_vollziehen, true) THEN
    RETURN QUERY SELECT v_stufe, v_aktiviert, 'v2'::TEXT, 'umstellbar'::TEXT, NULL::TIMESTAMPTZ, s.v1_updated_at;
    RETURN;
  END IF;

  INSERT INTO public.dashboard_editor_switches AS sw (
    organization_id, user_id, ergebnis_klasse, v1_revision, v2_revision, dashboard_id
  )
  VALUES (v_org, v_user, s.ergebnis_klasse, s.v1_revision, s.v2_revision, s.v2_dashboard_id)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  SELECT sw.umgestellt_at INTO v_switched
  FROM public.dashboard_editor_switches AS sw
  WHERE sw.organization_id = v_org AND sw.user_id = v_user;

  INSERT INTO public.audit_log (organization_id, actor_id, action, details)
  VALUES (
    v_org, v_user, 'dashboard.editor_switched',
    jsonb_build_object(
      'stufe', v_stufe, 'ergebnis_klasse', s.ergebnis_klasse,
      'v1_revision', s.v1_revision, 'v2_revision', s.v2_revision
    )
  );

  RETURN QUERY SELECT v_stufe, v_aktiviert, 'v2'::TEXT, 'umgestellt'::TEXT, v_switched, s.v1_updated_at;
END;
$$;

-- 6. Beobachtung für Admins der eigenen Organisation.
CREATE OR REPLACE FUNCTION public.dashboard_editor_rollout_overview()
RETURNS TABLE (
  stufe INTEGER,
  aktiviert_at TIMESTAMPTZ,
  notiz TEXT,
  nutzer_aktiv INTEGER,
  nutzer_v2 INTEGER,
  offene_entscheidungen INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_variable
DECLARE
  v_org UUID := public.dashboard_rollout_require_admin();
  v_stufe INTEGER := 0;
  v_aktiviert TIMESTAMPTZ;
  v_notiz TEXT;
BEGIN
  SELECT ro.stufe, ro.aktiviert_at, ro.notiz INTO v_stufe, v_aktiviert, v_notiz
  FROM public.dashboard_editor_rollout AS ro WHERE ro.organization_id = v_org;

  RETURN QUERY
  SELECT
    COALESCE(v_stufe, 0),
    v_aktiviert,
    v_notiz,
    (SELECT count(*)::INTEGER FROM public.organization_members AS m
     WHERE m.organization_id = v_org AND m.status = 'active'),
    -- Auf V2 ist nur, wer umgestellt ist und dessen Organisation aktuell eine Stufe >= 1 hat.
    CASE WHEN COALESCE(v_stufe, 0) = 0 THEN 0 ELSE
      (SELECT count(*)::INTEGER FROM public.dashboard_editor_switches AS sw
       JOIN public.organization_members AS m
         ON m.user_id = sw.user_id AND m.organization_id = v_org AND m.status = 'active'
       WHERE sw.organization_id = v_org)
    END,
    (SELECT count(*)::INTEGER
     FROM public.dashboard_v1_v2_reconciliation() AS r
     WHERE r.org_status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM public.dashboard_editor_switches AS sw
         WHERE sw.organization_id = v_org AND sw.user_id = r.user_id
       )
       AND NOT public.dashboard_editor_switch_allowed(r.ergebnis_klasse, r.entscheidung, r.entscheidung_gueltig));
END;
$$;

-- Rechte: Hilfsfunktionen nicht öffentlich, RPCs nur für angemeldete Nutzer.
REVOKE ALL ON FUNCTION public.dashboard_editor_rollout_touch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dashboard_editor_rollout_audit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dashboard_editor_switch_allowed(TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dashboard_editor_user_state(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dashboard_editor_rollout_status(BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_editor_rollout_status(BOOLEAN) TO authenticated;
REVOKE ALL ON FUNCTION public.dashboard_editor_rollout_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_editor_rollout_overview() TO authenticated;
