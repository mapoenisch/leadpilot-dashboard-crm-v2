-- Auftrag 173a (Zwischenauftrag vor 174): Alarm-Rechte an das Dashboard-Recht binden.
-- Befund B-1 aus der Gesamtabnahme (docs/dashboard/GESAMTABNAHME_P16.md §5): Die Alarm-RPCs aus
-- 167 prüften nur „Admin/Manager der Organisation“, nicht das Recht am Dashboard. Befund B-4:
-- alarm_worker_status zählte Regeln aller Organisationen.
--
-- Regeln:
--   * Verwalten (anlegen, ändern, pausieren, fortsetzen) = Rolle Admin/Manager UND Schreibrecht am
--     Dashboard (persönlich: Besitz; Team: dashboard_team_can_write).
--   * Pausieren und Löschen darf zusätzlich der Admin der Organisation (Admin-Ansicht „Alarme“).
--   * Lesen (Regel- und alte Ereignisliste) = Leserecht am Dashboard.
--   * Ohne Leserecht: LP_DASHBOARD_NOT_FOUND (wie beim Laden); mit Lese-, ohne Schreibrecht:
--     LP_AUTH_INSUFFICIENT_PERMISSIONS.
--   * Anlegen auf belegter Kachel übernimmt keine Verantwortung (nur takeover, Admin-only seit 168).
--   * Alle Prüfungen in der aktuellen Organisation der Sitzung.
-- Keine Tabellen- oder Datenänderung.

-- 1. Zugriff des Aufrufers auf ein Dashboard: 'schreiben' | 'lesen' | 'keins'
CREATE OR REPLACE FUNCTION public.dashboard_alarm_dashboard_access(p_dashboard_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org UUID := public.current_organization_id();
  v_d RECORD;
BEGIN
  IF auth.uid() IS NULL OR v_org IS NULL THEN
    RETURN 'keins';
  END IF;
  SELECT d.scope, d.user_id, d.team_id INTO v_d
  FROM public.dashboards AS d
  WHERE d.id = p_dashboard_id AND d.organization_id = v_org;
  IF NOT FOUND THEN
    RETURN 'keins';
  END IF;
  IF v_d.scope = 'personal' THEN
    RETURN CASE WHEN v_d.user_id = auth.uid() THEN 'schreiben' ELSE 'keins' END;
  END IF;
  IF v_d.scope = 'team' THEN
    IF public.dashboard_team_can_write(v_d.team_id) THEN RETURN 'schreiben'; END IF;
    IF public.dashboard_team_can_read(v_d.team_id) THEN RETURN 'lesen'; END IF;
  END IF;
  RETURN 'keins';
END;
$$;

-- 2. Rolle des Aufrufers in der aktuellen Organisation (NULL ohne aktive Mitgliedschaft)
CREATE OR REPLACE FUNCTION public.dashboard_alarm_caller_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT m.role
  FROM public.organization_members AS m
  WHERE m.organization_id = public.current_organization_id()
    AND m.user_id = auth.uid()
    AND m.status = 'active'
  LIMIT 1
$$;

-- 3. Prüft Verwalten einer Regel bzw. eines Dashboards; p_admin_override erlaubt dem Admin
--    der Organisation den Zugriff ohne Dashboard-Recht (Pausieren, Löschen).
CREATE OR REPLACE FUNCTION public.dashboard_alarm_require_manage(
  p_dashboard_id UUID,
  p_admin_override BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
  v_access TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;
  v_role := public.dashboard_alarm_caller_role();
  IF v_role IS NULL OR v_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'LP_AUTH_INSUFFICIENT_PERMISSIONS' USING ERRCODE = '42501';
  END IF;
  IF p_admin_override AND v_role = 'admin' AND EXISTS (
    SELECT 1 FROM public.dashboards AS d
    WHERE d.id = p_dashboard_id AND d.organization_id = public.current_organization_id()
  ) THEN
    RETURN;
  END IF;
  v_access := public.dashboard_alarm_dashboard_access(p_dashboard_id);
  IF v_access = 'keins' THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_access <> 'schreiben' THEN
    RAISE EXCEPTION 'LP_AUTH_INSUFFICIENT_PERMISSIONS' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- Regel in der aktuellen Organisation laden (fremde Organisation = nicht gefunden)
CREATE OR REPLACE FUNCTION public.dashboard_alarm_rule_dashboard(p_rule_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_dashboard UUID;
BEGIN
  SELECT r.dashboard_id INTO v_dashboard
  FROM public.dashboard_alarm_rules AS r
  WHERE r.id = p_rule_id AND r.organization_id = public.current_organization_id();
  IF v_dashboard IS NULL THEN
    RAISE EXCEPTION 'LP_ALARM_RULE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_dashboard;
END;
$$;

-- 4. Anlegen
CREATE OR REPLACE FUNCTION public.create_dashboard_alarm_rule(
  p_dashboard_id UUID,
  p_tile_id TEXT,
  p_catalog_id TEXT,
  p_pipeline TEXT,
  p_rule_config JSONB,
  p_mindestdauer INT DEFAULT 1,
  p_abklingzeit INT DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org UUID := public.current_organization_id();
  v_rule_id UUID;
BEGIN
  PERFORM public.dashboard_alarm_require_manage(p_dashboard_id, false);

  IF p_catalog_id NOT LIKE 'crm.pipeline_%' AND p_catalog_id NOT LIKE 'live.%' THEN
    RAISE EXCEPTION 'LP_ALARM_KPI_NOT_CAPABLE: %', p_catalog_id USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.dashboard_alarm_rules (
    organization_id, dashboard_id, tile_id, catalog_id, pipeline,
    rule_config, mindestdauer_laeufe, abklingzeit_sekunden, status,
    created_by, responsible_user_id
  )
  VALUES (
    v_org, p_dashboard_id, p_tile_id, p_catalog_id, p_pipeline,
    p_rule_config, COALESCE(p_mindestdauer, 1), COALESCE(p_abklingzeit, 0), 'aktiv',
    v_user_id, v_user_id
  )
  ON CONFLICT (dashboard_id, tile_id) DO UPDATE
  SET catalog_id = EXCLUDED.catalog_id,
      pipeline = EXCLUDED.pipeline,
      rule_config = EXCLUDED.rule_config,
      mindestdauer_laeufe = EXCLUDED.mindestdauer_laeufe,
      abklingzeit_sekunden = EXCLUDED.abklingzeit_sekunden,
      status = 'aktiv',
      updated_at = now()
  RETURNING id INTO v_rule_id;

  RETURN v_rule_id;
END;
$$;

-- 5. Ändern
CREATE OR REPLACE FUNCTION public.update_dashboard_alarm_rule(
  p_rule_id UUID,
  p_rule_config JSONB,
  p_mindestdauer INT DEFAULT 1,
  p_abklingzeit INT DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;
  PERFORM public.dashboard_alarm_require_manage(public.dashboard_alarm_rule_dashboard(p_rule_id), false);

  UPDATE public.dashboard_alarm_rules
  SET rule_config = p_rule_config,
      mindestdauer_laeufe = COALESCE(p_mindestdauer, 1),
      abklingzeit_sekunden = COALESCE(p_abklingzeit, 0),
      updated_at = now()
  WHERE id = p_rule_id;
END;
$$;

-- 6. Pausieren (Schreibrecht oder Admin)
CREATE OR REPLACE FUNCTION public.pause_dashboard_alarm_rule(p_rule_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;
  PERFORM public.dashboard_alarm_require_manage(public.dashboard_alarm_rule_dashboard(p_rule_id), true);
  UPDATE public.dashboard_alarm_rules SET status = 'pausiert', updated_at = now() WHERE id = p_rule_id;
END;
$$;

-- 7. Fortsetzen (Schreibrecht; Verantwortlicher muss weiterhin Rechte haben)
CREATE OR REPLACE FUNCTION public.resume_dashboard_alarm_rule(p_rule_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_r RECORD;
  v_resp_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;
  PERFORM public.dashboard_alarm_require_manage(public.dashboard_alarm_rule_dashboard(p_rule_id), false);

  SELECT * INTO v_r FROM public.dashboard_alarm_rules WHERE id = p_rule_id;
  SELECT role INTO v_resp_role
  FROM public.organization_members
  WHERE organization_id = v_r.organization_id AND user_id = v_r.responsible_user_id AND status = 'active';
  IF v_resp_role IS NULL OR v_resp_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'LP_ALARM_RESPONSIBLE_HAS_NO_RIGHTS' USING ERRCODE = '42501';
  END IF;

  UPDATE public.dashboard_alarm_rules SET status = 'aktiv', updated_at = now() WHERE id = p_rule_id;
END;
$$;

-- 8. Löschen (Schreibrecht oder Admin)
CREATE OR REPLACE FUNCTION public.delete_dashboard_alarm_rule(p_rule_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;
  PERFORM public.dashboard_alarm_require_manage(public.dashboard_alarm_rule_dashboard(p_rule_id), true);
  DELETE FROM public.dashboard_alarm_rules WHERE id = p_rule_id;
END;
$$;

-- 9. Regelliste eines Dashboards (Leserecht)
CREATE OR REPLACE FUNCTION public.list_dashboard_alarm_rules(p_dashboard_id UUID)
RETURNS TABLE (
  id UUID,
  tile_id TEXT,
  catalog_id TEXT,
  pipeline TEXT,
  rule_config JSONB,
  mindestdauer_laeufe INT,
  abklingzeit_sekunden INT,
  status TEXT,
  beobachtete_stufe TEXT,
  bestaetigte_stufe TEXT,
  letzter_messwert NUMERIC,
  letzte_auswertung TIMESTAMPTZ,
  letztes_ereignis_am TIMESTAMPTZ,
  responsible_user_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF public.dashboard_alarm_dashboard_access(p_dashboard_id) = 'keins' THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.tile_id,
    r.catalog_id,
    r.pipeline,
    r.rule_config,
    r.mindestdauer_laeufe,
    r.abklingzeit_sekunden,
    r.status,
    s.beobachtete_stufe,
    s.bestaetigte_stufe,
    s.letzter_messwert,
    s.letzte_auswertung,
    s.letztes_ereignis_am,
    r.responsible_user_id,
    r.created_at
  FROM public.dashboard_alarm_rules r
  LEFT JOIN public.dashboard_alarm_state s ON s.rule_id = r.id
  WHERE r.dashboard_id = p_dashboard_id
  ORDER BY r.created_at ASC;
END;
$$;

-- 10. Alte Ereignisliste aus 167 (vom Client nicht mehr genutzt, aber freigegeben): Leserecht
CREATE OR REPLACE FUNCTION public.list_dashboard_alarm_events(
  p_dashboard_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  rule_id UUID,
  tile_id TEXT,
  catalog_id TEXT,
  alter_zustand TEXT,
  neuer_zustand TEXT,
  messwert NUMERIC,
  einheit TEXT,
  grenze NUMERIC,
  meldung TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;
  IF public.dashboard_alarm_dashboard_access(p_dashboard_id) = 'keins' THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.rule_id,
    r.tile_id,
    r.catalog_id,
    e.alter_zustand,
    e.neuer_zustand,
    e.messwert,
    e.einheit,
    e.grenze,
    e.meldung,
    e.created_at
  FROM public.dashboard_alarm_events e
  JOIN public.dashboard_alarm_rules r ON r.id = e.rule_id
  WHERE r.dashboard_id = p_dashboard_id
  ORDER BY e.created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 50), 200)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

-- 11. Lebenszeichen: aktive Regeln nur der eigenen Organisation zählen (B-4)
CREATE OR REPLACE FUNCTION public.alarm_worker_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_last_run RECORD;
  v_last_success RECORD;
  v_active BOOLEAN;
  v_diff_minutes NUMERIC;
  v_status TEXT := 'ok';
  v_rules_count INT := 0;
BEGIN
  SELECT auswertung_aktiv INTO v_active FROM public.alarm_settings WHERE id = 1;
  IF v_active IS FALSE THEN
    v_status := 'pausiert';
  END IF;

  SELECT * INTO v_last_run FROM public.alarm_worker_runs ORDER BY gestartet_am DESC LIMIT 1;
  SELECT * INTO v_last_success FROM public.alarm_worker_runs WHERE status = 'erfolg' ORDER BY gestartet_am DESC LIMIT 1;

  IF v_status <> 'pausiert' THEN
    IF v_last_success.gestartet_am IS NULL THEN
      v_status := 'ueberfaellig';
    ELSE
      v_diff_minutes := EXTRACT(EPOCH FROM (now() - v_last_success.gestartet_am)) / 60.0;
      IF v_diff_minutes >= 15.0 THEN
        v_status := 'ueberfaellig';
      ELSE
        v_status := 'ok';
      END IF;
    END IF;
  END IF;

  SELECT count(*) INTO v_rules_count
  FROM public.dashboard_alarm_rules
  WHERE status = 'aktiv'
    AND organization_id = public.current_organization_id();

  RETURN jsonb_build_object(
    'status', v_status,
    'letzterLaufAm', v_last_run.gestartet_am,
    'letzterErfolgAm', v_last_success.gestartet_am,
    'auswertungAktiv', v_active,
    'aktiveRegeln', v_rules_count
  );
END;
$$;

-- Rechte: Hilfsfunktionen nicht öffentlich
REVOKE ALL ON FUNCTION public.dashboard_alarm_dashboard_access(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dashboard_alarm_caller_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dashboard_alarm_require_manage(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dashboard_alarm_rule_dashboard(UUID) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.create_dashboard_alarm_rule(UUID, TEXT, TEXT, TEXT, JSONB, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_dashboard_alarm_rule(UUID, TEXT, TEXT, TEXT, JSONB, INT, INT) TO authenticated;
REVOKE ALL ON FUNCTION public.update_dashboard_alarm_rule(UUID, JSONB, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_dashboard_alarm_rule(UUID, JSONB, INT, INT) TO authenticated;
REVOKE ALL ON FUNCTION public.pause_dashboard_alarm_rule(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pause_dashboard_alarm_rule(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.resume_dashboard_alarm_rule(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resume_dashboard_alarm_rule(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.delete_dashboard_alarm_rule(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_dashboard_alarm_rule(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.list_dashboard_alarm_rules(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_dashboard_alarm_rules(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.list_dashboard_alarm_events(UUID, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_dashboard_alarm_events(UUID, INT, INT) TO authenticated;
