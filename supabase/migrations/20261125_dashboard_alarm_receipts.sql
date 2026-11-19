-- Migration: 20261125_dashboard_alarm_receipts.sql
-- Auftrag 168 (P13c): Alarme in der App, Lesebestätigung und Quittierung, Admin-Übernahme, Ausfallhinweis

-- ============================================================================
-- 1. Tabelle dashboard_alarm_receipts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dashboard_alarm_receipts (
  event_id UUID NOT NULL REFERENCES public.dashboard_alarm_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  gelesen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  quittiert_at TIMESTAMPTZ,
  kommentar TEXT CHECK (kommentar IS NULL OR length(kommentar) <= 280),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_alarm_receipts_user_org ON public.dashboard_alarm_receipts(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_alarm_receipts_event ON public.dashboard_alarm_receipts(event_id);

ALTER TABLE public.dashboard_alarm_receipts ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.dashboard_alarm_receipts TO authenticated;

DROP POLICY IF EXISTS tenant_select_alarm_receipts ON public.dashboard_alarm_receipts;
CREATE POLICY tenant_select_alarm_receipts ON public.dashboard_alarm_receipts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.dashboard_alarm_events ev
      JOIN public.dashboard_alarm_rules r ON r.id = ev.rule_id
      JOIN public.dashboards d ON d.id = r.dashboard_id
      JOIN public.organization_members m ON m.organization_id = dashboard_alarm_receipts.organization_id
      WHERE ev.id = dashboard_alarm_receipts.event_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND (
          (d.scope = 'personal' AND d.user_id = auth.uid())
          OR (d.scope = 'team' AND public.dashboard_team_can_read(d.team_id))
        )
    )
  );


-- ============================================================================
-- 2. RPCs für Lesebestätigung & Quittierung
-- ============================================================================

-- Lesebestätigung für eine Liste von Ereignis-IDs (max. 500)
CREATE OR REPLACE FUNCTION public.mark_dashboard_alarm_events_read(p_event_ids UUID[])
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF p_event_ids IS NULL OR array_length(p_event_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  IF array_length(p_event_ids, 1) > 500 THEN
    RAISE EXCEPTION 'LP_ALARM_BATCH_TOO_LARGE' USING ERRCODE = '22000';
  END IF;

  WITH inserted AS (
    INSERT INTO public.dashboard_alarm_receipts (event_id, user_id, organization_id, gelesen_at)
    SELECT e.id, v_user_id, e.organization_id, now()
    FROM public.dashboard_alarm_events e
    JOIN public.dashboard_alarm_rules r ON r.id = e.rule_id
    JOIN public.dashboards d ON d.id = r.dashboard_id
    JOIN public.organization_members m ON m.organization_id = e.organization_id AND m.user_id = v_user_id AND m.status = 'active'
    WHERE e.id = ANY(p_event_ids)
      AND (
        (d.scope = 'personal' AND d.user_id = v_user_id)
        OR (d.scope = 'team' AND public.dashboard_team_can_read(d.team_id))
      )
    ON CONFLICT (event_id, user_id)
    DO UPDATE SET gelesen_at = COALESCE(dashboard_alarm_receipts.gelesen_at, now())
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM inserted;

  RETURN v_count;
END;
$$;

-- Alle Ereignisse als gelesen markieren (optional gefiltert nach Dashboard und Dringlichkeit)
CREATE OR REPLACE FUNCTION public.mark_all_dashboard_alarm_events_read(
  p_dashboard_id UUID DEFAULT NULL,
  p_nur_warnung_kritisch BOOLEAN DEFAULT FALSE
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  WITH inserted AS (
    INSERT INTO public.dashboard_alarm_receipts (event_id, user_id, organization_id, gelesen_at)
    SELECT e.id, v_user_id, e.organization_id, now()
    FROM public.dashboard_alarm_events e
    JOIN public.dashboard_alarm_rules r ON r.id = e.rule_id
    JOIN public.dashboards d ON d.id = r.dashboard_id
    JOIN public.organization_members m ON m.organization_id = e.organization_id AND m.user_id = v_user_id AND m.status = 'active'
    WHERE (p_dashboard_id IS NULL OR r.dashboard_id = p_dashboard_id)
      AND (NOT p_nur_warnung_kritisch OR e.neuer_zustand IN ('warnung', 'kritisch'))
      AND (
        (d.scope = 'personal' AND d.user_id = v_user_id)
        OR (d.scope = 'team' AND public.dashboard_team_can_read(d.team_id))
      )
    ON CONFLICT (event_id, user_id)
    DO UPDATE SET gelesen_at = COALESCE(dashboard_alarm_receipts.gelesen_at, now())
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM inserted;

  RETURN v_count;
END;
$$;

-- Ereignis quittieren (nur bei warnung oder kritisch, Kommentar <= 280 Zeichen)
CREATE OR REPLACE FUNCTION public.acknowledge_dashboard_alarm_event(
  p_event_id UUID,
  p_kommentar TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_event RECORD;
  v_is_member BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF p_kommentar IS NOT NULL AND length(p_kommentar) > 280 THEN
    RAISE EXCEPTION 'LP_ALARM_COMMENT_TOO_LONG' USING ERRCODE = '22001';
  END IF;

  SELECT e.*, d.scope AS dashboard_scope, d.user_id AS dashboard_user_id, d.team_id AS dashboard_team_id
  INTO v_event
  FROM public.dashboard_alarm_events e
  JOIN public.dashboard_alarm_rules r ON r.id = e.rule_id
  JOIN public.dashboards d ON d.id = r.dashboard_id
  WHERE e.id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_ALARM_EVENT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = v_event.organization_id AND user_id = v_user_id AND status = 'active'
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'LP_AUTH_INSUFFICIENT_PERMISSIONS' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    (v_event.dashboard_scope = 'personal' AND v_event.dashboard_user_id = v_user_id)
    OR (v_event.dashboard_scope = 'team' AND public.dashboard_team_can_read(v_event.dashboard_team_id))
  ) THEN
    RAISE EXCEPTION 'LP_AUTH_INSUFFICIENT_PERMISSIONS' USING ERRCODE = '42501';
  END IF;

  IF v_event.neuer_zustand NOT IN ('warnung', 'kritisch') THEN
    RAISE EXCEPTION 'LP_ALARM_CANNOT_ACKNOWLEDGE_NORMAL' USING ERRCODE = '22000';
  END IF;

  INSERT INTO public.dashboard_alarm_receipts (
    event_id, user_id, organization_id, gelesen_at, quittiert_at, kommentar
  ) VALUES (
    p_event_id, v_user_id, v_event.organization_id, now(), now(), p_kommentar
  )
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET
    gelesen_at = COALESCE(dashboard_alarm_receipts.gelesen_at, now()),
    quittiert_at = now(),
    kommentar = p_kommentar;
END;
$$;

-- Ungelesene Alarmereignisse zählen (nur warnung/kritisch auf lesbaren Dashboards)
CREATE OR REPLACE FUNCTION public.count_unread_dashboard_alarm_events()
RETURNS INT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_count INT := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT count(*)::INT INTO v_count
  FROM public.dashboard_alarm_events e
  JOIN public.dashboard_alarm_rules r ON r.id = e.rule_id
  JOIN public.dashboards d ON d.id = r.dashboard_id
  JOIN public.organization_members m ON m.organization_id = e.organization_id AND m.user_id = v_user_id AND m.status = 'active'
  WHERE e.neuer_zustand IN ('warnung', 'kritisch')
    AND (
      (d.scope = 'personal' AND d.user_id = v_user_id)
      OR (d.scope = 'team' AND public.dashboard_team_can_read(d.team_id))
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.dashboard_alarm_receipts rec
      WHERE rec.event_id = e.id AND rec.user_id = v_user_id AND rec.gelesen_at IS NOT NULL
    );

  RETURN v_count;
END;
$$;

-- Ereignisliste V2 mit Gelesen-Status und Quittierungs-Array
CREATE OR REPLACE FUNCTION public.list_dashboard_alarm_events_v2(
  p_dashboard_id UUID DEFAULT NULL,
  p_nur_ungelesen BOOLEAN DEFAULT FALSE,
  p_nur_warnung_kritisch BOOLEAN DEFAULT FALSE,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  rule_id UUID,
  dashboard_id UUID,
  dashboard_title TEXT,
  tile_id TEXT,
  catalog_id TEXT,
  alter_zustand TEXT,
  neuer_zustand TEXT,
  messwert NUMERIC,
  einheit TEXT,
  grenze NUMERIC,
  meldung TEXT,
  created_at TIMESTAMPTZ,
  gelesen BOOLEAN,
  quittiert_von JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.rule_id,
    r.dashboard_id,
    d.title AS dashboard_title,
    r.tile_id,
    r.catalog_id,
    e.alter_zustand,
    e.neuer_zustand,
    e.messwert,
    e.einheit,
    e.grenze,
    e.meldung,
    e.created_at,
    COALESCE(my_receipt.gelesen_at IS NOT NULL, FALSE) AS gelesen,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'user_id', rec.user_id,
          'email', u.email,
          'quittiert_at', rec.quittiert_at,
          'kommentar', rec.kommentar
        ) ORDER BY rec.quittiert_at ASC
      )
      FROM public.dashboard_alarm_receipts rec
      JOIN auth.users u ON u.id = rec.user_id
      WHERE rec.event_id = e.id AND rec.quittiert_at IS NOT NULL
    ), '[]'::jsonb) AS quittiert_von
  FROM public.dashboard_alarm_events e
  JOIN public.dashboard_alarm_rules r ON r.id = e.rule_id
  JOIN public.dashboards d ON d.id = r.dashboard_id
  JOIN public.organization_members m ON m.organization_id = e.organization_id AND m.user_id = v_user_id AND m.status = 'active'
  LEFT JOIN public.dashboard_alarm_receipts my_receipt
    ON my_receipt.event_id = e.id AND my_receipt.user_id = v_user_id
  WHERE (p_dashboard_id IS NULL OR r.dashboard_id = p_dashboard_id)
    AND (
      (d.scope = 'personal' AND d.user_id = v_user_id)
      OR (d.scope = 'team' AND public.dashboard_team_can_read(d.team_id))
    )
    AND (NOT p_nur_ungelesen OR my_receipt.gelesen_at IS NULL)
    AND (NOT p_nur_warnung_kritisch OR e.neuer_zustand IN ('warnung', 'kritisch'))
  ORDER BY e.created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 50), 200)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

-- ============================================================================
-- 3. Admin-Übernahme & Organisationsweite Alarmregeln (nur Admin)
-- ============================================================================

-- Admin-Übernahme einer Alarmregel
CREATE OR REPLACE FUNCTION public.takeover_dashboard_alarm_rule(p_rule_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_r RECORD;
  v_role TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_r FROM public.dashboard_alarm_rules WHERE id = p_rule_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_ALARM_RULE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT role INTO v_role
  FROM public.organization_members
  WHERE organization_id = v_r.organization_id AND user_id = v_user_id AND status = 'active';

  -- Streng nur Admin
  IF v_role IS NULL OR v_role != 'admin' THEN
    RAISE EXCEPTION 'LP_AUTH_INSUFFICIENT_PERMISSIONS' USING ERRCODE = '42501';
  END IF;

  UPDATE public.dashboard_alarm_rules
  SET responsible_user_id = v_user_id,
      status = 'aktiv',
      updated_at = now()
  WHERE id = p_rule_id;

  -- Audit-Log Eintrag
  INSERT INTO public.audit_log (organization_id, actor_id, action, details)
  VALUES (
    v_r.organization_id,
    v_user_id,
    'dashboard_alarm_rules.takeover',
    jsonb_build_object('rule_id', p_rule_id, 'previous_responsible', v_r.responsible_user_id)
  );

  -- Ereignis 'fortgesetzt'
  INSERT INTO public.dashboard_alarm_events (
    organization_id,
    rule_id,
    alter_zustand,
    neuer_zustand,
    messwert,
    einheit,
    grenze,
    meldung
  ) VALUES (
    v_r.organization_id,
    p_rule_id,
    v_r.status,
    'fortgesetzt',
    NULL,
    NULL,
    NULL,
    'Verantwortung durch Admin übernommen und Regel fortgesetzt'
  );
END;
$$;

-- Organisationsweite Alarmregeln listen (nur Admin)
CREATE OR REPLACE FUNCTION public.list_organization_alarm_rules()
RETURNS TABLE (
  id UUID,
  dashboard_id UUID,
  dashboard_title TEXT,
  tile_id TEXT,
  catalog_id TEXT,
  rule_config JSONB,
  mindestdauer_laeufe INT,
  abklingzeit_sekunden INT,
  status TEXT,
  responsible_user_id UUID,
  responsible_email TEXT,
  beobachtete_stufe TEXT,
  bestaetigte_stufe TEXT,
  letzter_messwert NUMERIC,
  letzte_auswertung TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id UUID;
  v_role TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT organization_id, role INTO v_org_id, v_role
  FROM public.organization_members
  WHERE user_id = v_user_id AND status = 'active'
  LIMIT 1;

  IF v_role IS NULL OR v_role != 'admin' THEN
    RAISE EXCEPTION 'LP_AUTH_INSUFFICIENT_PERMISSIONS' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.dashboard_id,
    d.title AS dashboard_title,
    r.tile_id,
    r.catalog_id,
    r.rule_config,
    r.mindestdauer_laeufe,
    r.abklingzeit_sekunden,
    r.status,
    r.responsible_user_id,
    u.email AS responsible_email,
    s.beobachtete_stufe,
    s.bestaetigte_stufe,
    s.letzter_messwert,
    s.letzte_auswertung,
    r.created_at,
    r.updated_at
  FROM public.dashboard_alarm_rules r
  JOIN public.dashboards d ON d.id = r.dashboard_id
  JOIN auth.users u ON u.id = r.responsible_user_id
  LEFT JOIN public.dashboard_alarm_state s ON s.rule_id = r.id
  WHERE r.organization_id = v_org_id
  ORDER BY
    CASE WHEN r.status = 'verantwortlicher_ohne_rechte' THEN 0 ELSE 1 END,
    r.created_at DESC;
END;
$$;

-- ============================================================================
-- 4. Revisions-Aufbewahrungs-Info & Audit-Verknüpfung
-- ============================================================================

-- Audit-Logging in cleanup_dashboard_revisions ergänzen
CREATE OR REPLACE FUNCTION public.cleanup_dashboard_revisions()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INT := 0;
BEGIN
  -- Löscht alte Revisionen, die:
  -- 1. Nicht Revision 1 sind
  -- 2. Älter als 12 Monate sind
  -- 3. Nicht als restore_source_revision dienen
  -- 4. Über die letzten 100 Revisionen des jeweiligen Dashboards hinausgehen
  WITH ranked AS (
    SELECT
      r.id,
      r.dashboard_id,
      r.organization_id,
      r.revision,
      r.created_at,
      ROW_NUMBER() OVER (PARTITION BY r.dashboard_id ORDER BY r.revision DESC) AS rn
    FROM public.dashboard_revisions r
  ),
  to_delete AS (
    SELECT r.id, r.dashboard_id, r.organization_id
    FROM ranked r
    WHERE r.revision > 1
      AND r.created_at < now() - interval '12 months'
      AND r.rn > 100
      AND NOT EXISTS (
        SELECT 1 FROM public.dashboard_revisions sub
        WHERE sub.dashboard_id = r.dashboard_id
          AND substring(sub.change_summary from '^Wiederherstellung von Revision ([0-9]+)$')::INT = r.revision
      )
  ),
  deleted_items AS (
    DELETE FROM public.dashboard_revisions
    WHERE id IN (SELECT id FROM to_delete)
    RETURNING id, dashboard_id, organization_id
  ),
  logged AS (
    INSERT INTO public.audit_log (organization_id, actor_id, action, details)
    SELECT
      d.organization_id,
      NULL,
      'dashboard_revisions.retention_cleanup',
      jsonb_build_object('dashboard_id', d.dashboard_id, 'deleted_count', count(*))
    FROM deleted_items d
    GROUP BY d.organization_id, d.dashboard_id
  )
  SELECT count(*) INTO v_deleted_count FROM deleted_items;

  RETURN v_deleted_count;
END;
$$;

-- Prüft, ob für ein Dashboard ältere Versionen entfernt wurden
CREATE OR REPLACE FUNCTION public.dashboard_revision_retention_info(p_dashboard_id UUID)
RETURNS TABLE (
  entfernt BOOLEAN,
  letzte_bereinigung TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_has_access BOOLEAN;
  v_entfernt BOOLEAN := FALSE;
  v_letzte TIMESTAMPTZ := NULL;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.dashboards d
    JOIN public.organization_members m ON m.organization_id = d.organization_id AND m.user_id = v_user_id AND m.status = 'active'
    WHERE d.id = p_dashboard_id
      AND (
        (d.scope = 'personal' AND d.user_id = v_user_id)
        OR (d.scope = 'team' AND public.dashboard_team_can_read(d.team_id))
      )
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'LP_AUTH_INSUFFICIENT_PERMISSIONS' USING ERRCODE = '42501';
  END IF;

  SELECT
    EXISTS(
      SELECT 1 FROM public.audit_log a
      WHERE a.action = 'dashboard_revisions.retention_cleanup'
        AND (a.details->>'dashboard_id')::UUID = p_dashboard_id
    ),
    (
      SELECT max(a.created_at) FROM public.audit_log a
      WHERE a.action = 'dashboard_revisions.retention_cleanup'
        AND (a.details->>'dashboard_id')::UUID = p_dashboard_id
    )
  INTO v_entfernt, v_letzte;

  RETURN QUERY SELECT COALESCE(v_entfernt, FALSE), v_letzte;
END;
$$;

-- Berechtigungen für alle neuen RPCs an authenticated
GRANT EXECUTE ON FUNCTION public.mark_dashboard_alarm_events_read(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_dashboard_alarm_events_read(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.acknowledge_dashboard_alarm_event(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_unread_dashboard_alarm_events() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_dashboard_alarm_events_v2(UUID, BOOLEAN, BOOLEAN, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.takeover_dashboard_alarm_rule(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_organization_alarm_rules() TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_revision_retention_info(UUID) TO authenticated;

-- ============================================================================
-- 5. Korrektur für list_dashboard_alarm_rules (Ambiguität von id behoben)
-- ============================================================================

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
DECLARE
  v_user_id UUID := auth.uid();
  v_dash_org UUID;
  v_is_member BOOLEAN;
BEGIN
  SELECT d.organization_id INTO v_dash_org FROM public.dashboards d WHERE d.id = p_dashboard_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = v_dash_org AND m.user_id = v_user_id AND m.status = 'active'
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'LP_AUTH_INSUFFICIENT_PERMISSIONS' USING ERRCODE = '42501';
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

GRANT EXECUTE ON FUNCTION public.list_dashboard_alarm_rules(UUID) TO authenticated;

-- ============================================================================
-- 6. Paritaets- und Einheiten-Abstimmung (crm.pipeline_deals 'Deals' / 'Stück')
-- ============================================================================

CREATE OR REPLACE FUNCTION public.alarm_kpi_value(
  p_org UUID,
  p_catalog_id TEXT,
  p_pipeline TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_res JSONB;
  v_crm JSONB;
  v_feed RECORD;
  v_live_id TEXT;
  v_max_stunden INT := 24;
  v_diff_hours NUMERIC;
BEGIN
  -- Max Stunden aus Settings
  SELECT datenalter_max_stunden INTO v_max_stunden FROM public.alarm_settings WHERE id = 1;
  IF v_max_stunden IS NULL THEN v_max_stunden := 24; END IF;

  -- 1. CRM Kennzahlen
  IF p_catalog_id LIKE 'crm.pipeline_%' THEN
    BEGIN
      v_crm := public.dashboard_crm_pipeline_overview_for_org(p_org, p_pipeline);
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('wert', NULL, 'einheit', '', 'zustand', 'fehler', 'fehler', SQLERRM);
    END;

    IF p_catalog_id = 'crm.pipeline_deals' THEN
      RETURN jsonb_build_object('wert', (v_crm->>'totalDeals')::NUMERIC, 'einheit', 'Deals', 'zustand', 'ok');
    ELSIF p_catalog_id = 'crm.pipeline_volumen' THEN
      RETURN jsonb_build_object('wert', (v_crm->>'totalVolume')::NUMERIC, 'einheit', 'EUR', 'zustand', 'ok');
    ELSIF p_catalog_id = 'crm.pipeline_gewonnen' THEN
      RETURN jsonb_build_object('wert', (v_crm->>'wonVolume')::NUMERIC, 'einheit', 'EUR', 'zustand', 'ok');
    ELSIF p_catalog_id = 'crm.pipeline_offen' THEN
      RETURN jsonb_build_object('wert', (v_crm->>'openVolume')::NUMERIC, 'einheit', 'EUR', 'zustand', 'ok');
    ELSE
      RETURN jsonb_build_object('wert', NULL, 'einheit', '', 'zustand', 'regel_ungueltig');
    END IF;

  -- 2. Live Kennzahlen
  ELSIF p_catalog_id LIKE 'live.%' THEN
    v_live_id := substring(p_catalog_id from '^live\.(.*)$');

    SELECT
      f.value,
      f.unit,
      f.occurred_at,
      f.quality_status
    INTO v_feed
    FROM public.live_kpi_public_feed f
    WHERE f.organization_id = p_org
      AND (f.kpi_id = v_live_id OR f.kpi_id = p_catalog_id)
    ORDER BY f.occurred_at DESC, f.ingested_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('wert', NULL, 'einheit', '', 'zustand', 'keine_daten');
    END IF;

    -- Alter prüfen
    v_diff_hours := EXTRACT(EPOCH FROM (now() - v_feed.occurred_at)) / 3600.0;
    IF v_diff_hours > v_max_stunden THEN
      RETURN jsonb_build_object(
        'wert', v_feed.value,
        'einheit', COALESCE(v_feed.unit, ''),
        'zustand', 'veraltet'
      );
    END IF;

    IF v_feed.value IS NULL THEN
      RETURN jsonb_build_object('wert', NULL, 'einheit', COALESCE(v_feed.unit, ''), 'zustand', 'keine_daten');
    END IF;

    RETURN jsonb_build_object(
      'wert', v_feed.value,
      'einheit', COALESCE(v_feed.unit, ''),
      'zustand', 'ok'
    );

  ELSE
    RETURN jsonb_build_object('wert', NULL, 'einheit', '', 'zustand', 'regel_ungueltig');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.alarm_kpi_value(UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.alarm_evaluate_threshold(
  p_rule JSONB,
  p_wert NUMERIC,
  p_zustand TEXT,
  p_einheit TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_art TEXT;
  v_einheit TEXT;
  v_warnung NUMERIC;
  v_kritisch NUMERIC;
  v_unten_warnung NUMERIC;
  v_oben_warnung NUMERIC;
  v_unten_kritisch NUMERIC;
  v_oben_kritisch NUMERIC;
  v_op TEXT;
BEGIN
  IF p_rule IS NULL THEN
    RETURN jsonb_build_object('stufe', 'nicht_bewertet', 'text', 'Inaktiv');
  END IF;

  -- Legacy V1 Regel Normalisierung
  IF NOT (p_rule ? 'formatVersion') THEN
    v_op := p_rule->>'operator';
    IF v_op IS NULL THEN
      RETURN jsonb_build_object('stufe', 'nicht_bewertet', 'text', 'Inaktiv');
    END IF;

    IF v_op IN ('eq', 'between') THEN
      RETURN jsonb_build_object('stufe', 'regel_ungueltig', 'text', 'Legacy Operator nicht unterstuetzt');
    ELSIF v_op IN ('gt', 'gte', 'lt', 'lte') THEN
      IF (p_rule->>'warningValue') IS NULL THEN
        RETURN jsonb_build_object('stufe', 'regel_ungueltig', 'text', 'Legacy warningValue fehlt');
      END IF;
      v_warnung := (p_rule->>'warningValue')::NUMERIC;
      v_kritisch := (p_rule->>'criticalValue')::NUMERIC;

      IF v_op IN ('gt', 'gte') THEN
        IF v_kritisch IS NOT NULL AND v_kritisch <= v_warnung THEN
          RETURN jsonb_build_object('stufe', 'regel_ungueltig', 'text', 'Legacy Reihenfolge ungueltig');
        END IF;
        p_rule := jsonb_build_object(
          'formatVersion', 2,
          'enabled', COALESCE((p_rule->>'enabled')::BOOLEAN, false),
          'art', 'hoch_ist_schlecht',
          'einheit', COALESCE(p_einheit, ''),
          'warnung', v_warnung,
          'kritisch', v_kritisch
        );
      ELSE
        IF v_kritisch IS NOT NULL AND v_kritisch >= v_warnung THEN
          RETURN jsonb_build_object('stufe', 'regel_ungueltig', 'text', 'Legacy Reihenfolge ungueltig');
        END IF;
        p_rule := jsonb_build_object(
          'formatVersion', 2,
          'enabled', COALESCE((p_rule->>'enabled')::BOOLEAN, false),
          'art', 'niedrig_ist_schlecht',
          'einheit', COALESCE(p_einheit, ''),
          'warnung', v_warnung,
          'kritisch', v_kritisch
        );
      END IF;
    ELSE
      RETURN jsonb_build_object('stufe', 'regel_ungueltig', 'text', 'Unbekannter Operator');
    END IF;
  END IF;

  v_enabled := COALESCE((p_rule->>'enabled')::BOOLEAN, false);
  IF NOT v_enabled THEN
    RETURN jsonb_build_object('stufe', 'nicht_bewertet', 'text', 'Inaktiv');
  END IF;

  v_einheit := COALESCE(p_rule->>'einheit', '');
  IF p_einheit IS NOT NULL AND v_einheit <> '' AND v_einheit <> p_einheit THEN
    -- Deals und Stück sind kompatibel für Deals-Zähler
    IF NOT ((v_einheit = 'Deals' AND p_einheit = 'Stück') OR (v_einheit = 'Stück' AND p_einheit = 'Deals')) THEN
      RETURN jsonb_build_object(
        'stufe', 'regel_ungueltig',
        'text', format('Einheit der Kachel hat sich von %s auf %s geändert.', v_einheit, p_einheit)
      );
    END IF;
  END IF;

  IF p_zustand IN ('fehler', 'veraltet', 'offline') THEN
    RETURN jsonb_build_object('stufe', 'nicht_bewertet', 'text', 'Kachelzustand nicht bewertet');
  END IF;

  IF p_wert IS NULL THEN
    RETURN jsonb_build_object('stufe', 'keine_daten', 'text', 'Keine Daten vorhanden');
  END IF;

  v_art := p_rule->>'art';

  IF v_art = 'hoch_ist_schlecht' THEN
    v_warnung := (p_rule->>'warnung')::NUMERIC;
    v_kritisch := (p_rule->>'kritisch')::NUMERIC;

    IF v_kritisch IS NOT NULL AND p_wert >= v_kritisch THEN
      RETURN jsonb_build_object('stufe', 'kritisch', 'grenze', v_kritisch, 'text', 'Kritisch');
    END IF;
    IF v_warnung IS NOT NULL AND p_wert >= v_warnung THEN
      RETURN jsonb_build_object('stufe', 'warnung', 'grenze', v_warnung, 'text', 'Warnung');
    END IF;
    RETURN jsonb_build_object('stufe', 'normal', 'text', 'Normal');

  ELSIF v_art = 'niedrig_ist_schlecht' THEN
    v_warnung := (p_rule->>'warnung')::NUMERIC;
    v_kritisch := (p_rule->>'kritisch')::NUMERIC;

    IF v_kritisch IS NOT NULL AND p_wert <= v_kritisch THEN
      RETURN jsonb_build_object('stufe', 'kritisch', 'grenze', v_kritisch, 'text', 'Kritisch');
    END IF;
    IF v_warnung IS NOT NULL AND p_wert <= v_warnung THEN
      RETURN jsonb_build_object('stufe', 'warnung', 'grenze', v_warnung, 'text', 'Warnung');
    END IF;
    RETURN jsonb_build_object('stufe', 'normal', 'text', 'Normal');

  ELSIF v_art = 'zielbereich' THEN
    v_unten_warnung := (p_rule->>'untenWarnung')::NUMERIC;
    v_oben_warnung := (p_rule->>'obenWarnung')::NUMERIC;
    v_unten_kritisch := (p_rule->>'untenKritisch')::NUMERIC;
    v_oben_kritisch := (p_rule->>'obenKritisch')::NUMERIC;

    IF v_unten_kritisch IS NOT NULL AND p_wert <= v_unten_kritisch THEN
      RETURN jsonb_build_object('stufe', 'kritisch', 'grenze', v_unten_kritisch, 'text', 'Kritisch');
    END IF;
    IF v_oben_kritisch IS NOT NULL AND p_wert >= v_oben_kritisch THEN
      RETURN jsonb_build_object('stufe', 'kritisch', 'grenze', v_oben_kritisch, 'text', 'Kritisch');
    END IF;
    IF v_unten_warnung IS NOT NULL AND p_wert < v_unten_warnung THEN
      RETURN jsonb_build_object('stufe', 'warnung', 'grenze', v_unten_warnung, 'text', 'Warnung');
    END IF;
    IF v_oben_warnung IS NOT NULL AND p_wert > v_oben_warnung THEN
      RETURN jsonb_build_object('stufe', 'warnung', 'grenze', v_oben_warnung, 'text', 'Warnung');
    END IF;
    RETURN jsonb_build_object('stufe', 'normal', 'text', 'Normal');

  ELSE
    RETURN jsonb_build_object('stufe', 'regel_ungueltig', 'text', 'Unbekannte Regelart');
  END IF;
END;
$$;

