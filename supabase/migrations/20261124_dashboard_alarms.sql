-- Migration: 20261124_dashboard_alarms.sql
-- Auftrag 167 (P13b): Server-Alarme mit pg_cron, Paritätsnachweis, Lebenszeichen, Revisions-Aufbewahrung

DO $setup$
BEGIN
  IF current_database() = 'postgres' THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron konnte nicht aktiviert werden: %', SQLERRM;
END;
$setup$;

-- ============================================================================
-- 1. Tabellen
-- ============================================================================

-- Einstellungen / Not-Aus
CREATE TABLE IF NOT EXISTS public.alarm_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  auswertung_aktiv BOOLEAN NOT NULL DEFAULT true,
  datenalter_max_stunden INT NOT NULL DEFAULT 24,
  aufbewahrung_monate INT NOT NULL DEFAULT 12,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.alarm_settings (id, auswertung_aktiv, datenalter_max_stunden, aufbewahrung_monate)
VALUES (1, true, 24, 12)
ON CONFLICT (id) DO NOTHING;

-- Alarmregeln
CREATE TABLE IF NOT EXISTS public.dashboard_alarm_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  tile_id TEXT NOT NULL,
  catalog_id TEXT NOT NULL,
  pipeline TEXT,
  rule_config JSONB NOT NULL,
  mindestdauer_laeufe INT NOT NULL DEFAULT 1 CHECK (mindestdauer_laeufe >= 1),
  abklingzeit_sekunden INT NOT NULL DEFAULT 0 CHECK (abklingzeit_sekunden >= 0),
  status TEXT NOT NULL DEFAULT 'aktiv' CHECK (status IN ('aktiv', 'pausiert', 'regel_ungueltig', 'verantwortlicher_ohne_rechte', 'kachel_entfernt')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  responsible_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_dashboard_alarm_rule_tile UNIQUE (dashboard_id, tile_id)
);

-- Zustand der Alarmauswertung
CREATE TABLE IF NOT EXISTS public.dashboard_alarm_state (
  rule_id UUID PRIMARY KEY REFERENCES public.dashboard_alarm_rules(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  beobachtete_stufe TEXT NOT NULL DEFAULT 'normal',
  beobachtet_seit TIMESTAMPTZ NOT NULL DEFAULT now(),
  beobachtete_laeufe INT NOT NULL DEFAULT 1,
  bestaetigte_stufe TEXT NOT NULL DEFAULT 'normal',
  bestaetigt_am TIMESTAMPTZ NOT NULL DEFAULT now(),
  letzter_messwert NUMERIC,
  letzte_einheit TEXT,
  letzte_auswertung TIMESTAMPTZ NOT NULL DEFAULT now(),
  letztes_ereignis_am TIMESTAMPTZ,
  letzte_ereignis_stufe TEXT,
  auswertungsfehler TEXT
);

-- Unveränderliches Ereignisprotokoll
CREATE TABLE IF NOT EXISTS public.dashboard_alarm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.dashboard_alarm_rules(id) ON DELETE CASCADE,
  trigger_run_id UUID,
  alter_zustand TEXT NOT NULL,
  neuer_zustand TEXT NOT NULL,
  messwert NUMERIC,
  einheit TEXT,
  grenze NUMERIC,
  meldung TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Worker-Laufprotokoll
CREATE TABLE IF NOT EXISTS public.alarm_worker_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gestartet_am TIMESTAMPTZ NOT NULL DEFAULT now(),
  beendet_am TIMESTAMPTZ,
  dauer_ms INT,
  regeln_gesamt INT NOT NULL DEFAULT 0,
  regeln_ausgewertet INT NOT NULL DEFAULT 0,
  ereignisse_erzeugt INT NOT NULL DEFAULT 0,
  fehler_anzahl INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('in_arbeit', 'erfolg', 'teilweise_fehler', 'fehler', 'pausiert')),
  fehler_text TEXT
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_alarm_rules_org ON public.dashboard_alarm_rules(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_alarm_rules_dash ON public.dashboard_alarm_rules(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_alarm_events_rule_created ON public.dashboard_alarm_events(rule_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alarm_events_org_created ON public.dashboard_alarm_events(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alarm_runs_gestartet ON public.alarm_worker_runs(gestartet_am DESC);

-- ============================================================================
-- 2. RLS & Schutz
-- ============================================================================

ALTER TABLE public.alarm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_alarm_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_alarm_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_alarm_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alarm_worker_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.alarm_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.dashboard_alarm_rules FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.dashboard_alarm_state FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.dashboard_alarm_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.alarm_worker_runs FROM PUBLIC, anon, authenticated;

-- Lesezugriff für authentifizierte Mitglieder auf Regeln, Zustand und Ereignisse
GRANT SELECT ON TABLE public.dashboard_alarm_rules TO authenticated;
GRANT SELECT ON TABLE public.dashboard_alarm_state TO authenticated;
GRANT SELECT ON TABLE public.dashboard_alarm_events TO authenticated;

DROP POLICY IF EXISTS tenant_select_alarm_rules ON public.dashboard_alarm_rules;
CREATE POLICY tenant_select_alarm_rules ON public.dashboard_alarm_rules
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = dashboard_alarm_rules.organization_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS tenant_select_alarm_state ON public.dashboard_alarm_state;
CREATE POLICY tenant_select_alarm_state ON public.dashboard_alarm_state
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = dashboard_alarm_state.organization_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS tenant_select_alarm_events ON public.dashboard_alarm_events;
CREATE POLICY tenant_select_alarm_events ON public.dashboard_alarm_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = dashboard_alarm_events.organization_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

-- ============================================================================
-- 3. CRM-Rechenkern (wiederverwendbar für RPC und Worker)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.dashboard_crm_pipeline_overview_for_org(
  p_org_id UUID,
  p_pipeline TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_deals INT := 0;
  v_total_volume NUMERIC(12,2) := 0;
  v_won_volume NUMERIC(12,2) := 0;
  v_open_volume NUMERIC(12,2) := 0;
  v_stages JSONB := '[]'::jsonb;
  v_as_of TIMESTAMPTZ := clock_timestamp();
  v_has_invalid_deals BOOLEAN := FALSE;
  v_target_pipeline TEXT;
BEGIN
  v_target_pipeline := NULLIF(trim(p_pipeline), '');

  SELECT EXISTS (
    SELECT 1
    FROM public.imported_funnel_deals d
    WHERE d.organization_id = p_org_id
      AND (v_target_pipeline IS NULL OR d.pipeline = v_target_pipeline)
      AND (
        d.amount < 0
        OR d.stage IS NULL
        OR trim(d.stage) = ''
      )
  ) INTO v_has_invalid_deals;

  IF v_has_invalid_deals THEN
    RAISE EXCEPTION 'LP_CRM_INVALID_DEAL' USING ERRCODE = '22023';
  END IF;

  SELECT
    count(*),
    COALESCE(sum(COALESCE(d.amount, 0)), 0),
    COALESCE(sum(CASE WHEN lower(btrim(d.stage)) LIKE '%gewonnen%' THEN COALESCE(d.amount, 0) ELSE 0 END), 0),
    COALESCE(sum(CASE WHEN lower(btrim(d.stage)) NOT LIKE '%gewonnen%' AND lower(btrim(d.stage)) NOT LIKE '%verloren%' THEN COALESCE(d.amount, 0) ELSE 0 END), 0)
  INTO
    v_total_deals,
    v_total_volume,
    v_won_volume,
    v_open_volume
  FROM public.imported_funnel_deals d
  WHERE d.organization_id = p_org_id
    AND (v_target_pipeline IS NULL OR d.pipeline = v_target_pipeline);

  WITH stage_aggs AS (
    SELECT
      btrim(d.stage) AS stage_name,
      count(*)::INT AS stage_count,
      COALESCE(sum(COALESCE(d.amount, 0)), 0)::NUMERIC(12,2) AS stage_vol
    FROM public.imported_funnel_deals d
    WHERE d.organization_id = p_org_id
      AND (v_target_pipeline IS NULL OR d.pipeline = v_target_pipeline)
    GROUP BY btrim(d.stage)
  ),
  sorted_stages AS (
    SELECT
      stage_name,
      stage_count,
      stage_vol,
      CASE
        WHEN v_total_volume > 0 THEN round((stage_vol / v_total_volume) * 100)::INT
        ELSE 0
      END AS stage_share
    FROM stage_aggs
    ORDER BY stage_vol DESC, stage_count DESC, stage_name COLLATE "C" ASC
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'stage', stage_name,
        'count', stage_count,
        'volume', stage_vol,
        'sharePercent', stage_share
      )
    ),
    '[]'::jsonb
  ) INTO v_stages
  FROM sorted_stages;

  RETURN jsonb_build_object(
    'totalDeals', v_total_deals,
    'totalVolume', v_total_volume,
    'wonVolume', v_won_volume,
    'openVolume', v_open_volume,
    'stages', v_stages,
    'evaluatedDeals', v_total_deals,
    'pipeline', p_pipeline,
    'asOf', to_jsonb(v_as_of)
  );
END;
$$;

-- Bestehende RPC anpassen, sodass sie den gemeinsamen Rechenkern aufruft (Signatur & Verhalten unverändert)
CREATE OR REPLACE FUNCTION public.dashboard_crm_pipeline_overview(p_pipeline TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  v_org_id := public.current_organization_id();
  IF v_org_id IS NULL OR NOT public.is_active_member() THEN
    RAISE EXCEPTION 'LP_NOT_MEMBER' USING ERRCODE = '42501';
  END IF;

  RETURN public.dashboard_crm_pipeline_overview_for_org(v_org_id, p_pipeline);
END;
$$;

-- ============================================================================
-- 4. KPI-Wert-Auflösung für Server
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
      RETURN jsonb_build_object('wert', (v_crm->>'totalDeals')::NUMERIC, 'einheit', 'Stück', 'zustand', 'ok');
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

-- ============================================================================
-- 5. Schwellenwert-Evaluator (alarm_evaluate_threshold)
-- ============================================================================

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
    RETURN jsonb_build_object(
      'stufe', 'regel_ungueltig',
      'text', format('Einheit der Kachel hat sich von %s auf %s geändert.', v_einheit, p_einheit)
    );
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

-- Overload für nicht-endliche Werte (z.B. 'NaN', 'Infinity', '-Infinity' als TEXT)
CREATE OR REPLACE FUNCTION public.alarm_evaluate_threshold(
  p_rule JSONB,
  p_wert TEXT,
  p_zustand TEXT,
  p_einheit TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_wert IS NULL THEN
    RETURN public.alarm_evaluate_threshold(p_rule, NULL::NUMERIC, p_zustand, p_einheit);
  END IF;

  IF p_wert IN ('NaN', 'Infinity', '-Infinity') THEN
    RETURN jsonb_build_object('stufe', 'nicht_bewertet', 'text', 'Messwert ist nicht endlich');
  END IF;

  RETURN public.alarm_evaluate_threshold(p_rule, p_wert::NUMERIC, p_zustand, p_einheit);
END;
$$;



-- ============================================================================
-- 6. Worker-Engine (evaluate_dashboard_alarms)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.evaluate_dashboard_alarms(
  p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_active BOOLEAN;
  v_run_id UUID;
  v_regeln_gesamt INT := 0;
  v_regeln_ausgewertet INT := 0;
  v_ereignisse_erzeugt INT := 0;
  v_fehler_anzahl INT := 0;
  v_r RECORD;
  v_dash RECORD;
  v_tile JSONB;
  v_tile_exists BOOLEAN;
  v_resp_valid BOOLEAN;
  v_kpi_res JSONB;
  v_eval_res JSONB;
  v_wert NUMERIC;
  v_einheit TEXT;
  v_zustand TEXT;
  v_stufe TEXT;
  v_grenze NUMERIC;
  v_text TEXT;
  v_state RECORD;
  v_start_time TIMESTAMPTZ := clock_timestamp();
  v_cooldown_ok BOOLEAN;
  v_laeufe_neu INT;
BEGIN
  -- 1. Not-Aus prüfen
  SELECT auswertung_aktiv INTO v_active FROM public.alarm_settings WHERE id = 1;
  IF v_active IS FALSE THEN
    INSERT INTO public.alarm_worker_runs (gestartet_am, beendet_am, dauer_ms, status, fehler_text)
    VALUES (p_now, clock_timestamp(), 0, 'pausiert', 'Not-Aus aktiv: auswertung_aktiv = false');
    RETURN jsonb_build_object('status', 'pausiert', 'grund', 'Not-Aus aktiv');
  END IF;

  -- 2. Worker Run anlegen
  INSERT INTO public.alarm_worker_runs (gestartet_am, status)
  VALUES (p_now, 'in_arbeit')
  RETURNING id INTO v_run_id;

  -- 3. Alle aktiven Regeln durchlaufen
  FOR v_r IN
    SELECT *
    FROM public.dashboard_alarm_rules
    WHERE status = 'aktiv'
    ORDER BY created_at ASC
  LOOP
    v_regeln_gesamt := v_regeln_gesamt + 1;

    BEGIN
      -- A. Existiert Dashboard und Kachel?
      SELECT id, config INTO v_dash FROM public.dashboards WHERE id = v_r.dashboard_id;
      IF NOT FOUND THEN
        UPDATE public.dashboard_alarm_rules SET status = 'kachel_entfernt', updated_at = p_now WHERE id = v_r.id;
        CONTINUE;
      END IF;

      -- Kachel im Config suchen
      SELECT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_dash.config->'tiles') t
        WHERE t->>'id' = v_r.tile_id
      ) INTO v_tile_exists;

      IF NOT v_tile_exists THEN
        UPDATE public.dashboard_alarm_rules SET status = 'kachel_entfernt', updated_at = p_now WHERE id = v_r.id;
        CONTINUE;
      END IF;

      -- B. Verantwortlicher noch mit Rechten?
      SELECT EXISTS (
        SELECT 1
        FROM public.organization_members m
        WHERE m.organization_id = v_r.organization_id
          AND m.user_id = v_r.responsible_user_id
          AND m.status = 'active'
          AND m.role IN ('admin', 'manager')
      ) INTO v_resp_valid;

      IF NOT v_resp_valid THEN
        UPDATE public.dashboard_alarm_rules SET status = 'verantwortlicher_ohne_rechte', updated_at = p_now WHERE id = v_r.id;
        CONTINUE;
      END IF;

      -- C. Wert holen
      v_kpi_res := public.alarm_kpi_value(v_r.organization_id, v_r.catalog_id, v_r.pipeline);
      v_wert := (v_kpi_res->>'wert')::NUMERIC;
      v_einheit := v_kpi_res->>'einheit';
      v_zustand := v_kpi_res->>'zustand';

      -- D. Schwellenwert auswerten
      v_eval_res := public.alarm_evaluate_threshold(v_r.rule_config, v_wert, v_zustand, v_einheit);
      v_stufe := v_eval_res->>'stufe';
      v_grenze := (v_eval_res->>'grenze')::NUMERIC;
      v_text := COALESCE(v_eval_res->>'text', '');

      -- E. Zustand abgleichen
      SELECT * INTO v_state FROM public.dashboard_alarm_state WHERE rule_id = v_r.id;
      IF NOT FOUND THEN
        -- Initialer Zustand
        INSERT INTO public.dashboard_alarm_state (
          rule_id, organization_id, beobachtete_stufe, beobachtet_seit, beobachtete_laeufe,
          bestaetigte_stufe, bestaetigt_am, letzter_messwert, letzte_einheit, letzte_auswertung
        )
        VALUES (
          v_r.id, v_r.organization_id, v_stufe, p_now, 1,
          v_stufe, p_now, v_wert, v_einheit, p_now
        )
        RETURNING * INTO v_state;
      ELSE
        -- Update Zustand
        IF v_stufe = v_state.beobachtete_stufe THEN
          v_laeufe_neu := v_state.beobachtete_laeufe + 1;
        ELSE
          v_laeufe_neu := 1;
        END IF;

        -- Prüfen ob Mindestdauer erreicht und Stufe geändert
        IF v_laeufe_neu >= v_r.mindestdauer_laeufe AND v_stufe <> v_state.bestaetigte_stufe THEN
          -- Cooldown prüfen:
          -- Eskalation zu kritisch durchbricht Abklingzeit
          v_cooldown_ok := TRUE;
          IF v_stufe <> 'kritisch' AND v_state.letztes_ereignis_am IS NOT NULL AND v_r.abklingzeit_sekunden > 0 THEN
            IF p_now < v_state.letztes_ereignis_am + (v_r.abklingzeit_sekunden * interval '1 second') THEN
              v_cooldown_ok := FALSE;
            END IF;
          END IF;

          IF v_cooldown_ok THEN
            -- Ereignis erzeugen!
            INSERT INTO public.dashboard_alarm_events (
              organization_id, rule_id, trigger_run_id, alter_zustand, neuer_zustand,
              messwert, einheit, grenze, meldung, created_at
            )
            VALUES (
              v_r.organization_id, v_r.id, v_run_id, v_state.bestaetigte_stufe, v_stufe,
              v_wert, v_einheit, v_grenze, v_text, p_now
            );
            v_ereignisse_erzeugt := v_ereignisse_erzeugt + 1;

            UPDATE public.dashboard_alarm_state
            SET beobachtete_stufe = v_stufe,
                beobachtet_seit = CASE WHEN v_stufe = v_state.beobachtete_stufe THEN v_state.beobachtet_seit ELSE p_now END,
                beobachtete_laeufe = v_laeufe_neu,
                bestaetigte_stufe = v_stufe,
                bestaetigt_am = p_now,
                letzter_messwert = v_wert,
                letzte_einheit = v_einheit,
                letzte_auswertung = p_now,
                letztes_ereignis_am = p_now,
                letzte_ereignis_stufe = v_stufe,
                auswertungsfehler = NULL
            WHERE rule_id = v_r.id;
          ELSE
            -- In Cooldown: Bestätigte Stufe nicht wechseln, aber State aktualisieren
            UPDATE public.dashboard_alarm_state
            SET beobachtete_stufe = v_stufe,
                beobachtete_laeufe = v_laeufe_neu,
                letzter_messwert = v_wert,
                letzte_einheit = v_einheit,
                letzte_auswertung = p_now,
                auswertungsfehler = NULL
            WHERE rule_id = v_r.id;
          END IF;
        ELSE
          -- Keine Bestätigung
          UPDATE public.dashboard_alarm_state
          SET beobachtete_stufe = v_stufe,
              beobachtet_seit = CASE WHEN v_stufe = v_state.beobachtete_stufe THEN v_state.beobachtet_seit ELSE p_now END,
              beobachtete_laeufe = v_laeufe_neu,
              letzter_messwert = v_wert,
              letzte_einheit = v_einheit,
              letzte_auswertung = p_now,
              auswertungsfehler = NULL
          WHERE rule_id = v_r.id;
        END IF;
      END IF;

      v_regeln_ausgewertet := v_regeln_ausgewertet + 1;

    EXCEPTION WHEN OTHERS THEN
      v_fehler_anzahl := v_fehler_anzahl + 1;
      UPDATE public.dashboard_alarm_state
      SET auswertungsfehler = SQLERRM,
          letzte_auswertung = p_now
      WHERE rule_id = v_r.id;
    END;
  END LOOP;

  -- Worker Run abschließen
  UPDATE public.alarm_worker_runs
  SET beendet_am = clock_timestamp(),
      dauer_ms = EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INT,
      regeln_gesamt = v_regeln_gesamt,
      regeln_ausgewertet = v_regeln_ausgewertet,
      ereignisse_erzeugt = v_ereignisse_erzeugt,
      fehler_anzahl = v_fehler_anzahl,
      status = CASE
        WHEN v_fehler_anzahl = 0 THEN 'erfolg'
        WHEN v_regeln_ausgewertet > 0 THEN 'teilweise_fehler'
        ELSE 'fehler'
      END
  WHERE id = v_run_id;

  RETURN jsonb_build_object(
    'runId', v_run_id,
    'regelnGesamt', v_regeln_gesamt,
    'regelnAusgewertet', v_regeln_ausgewertet,
    'ereignisseErzeugt', v_ereignisse_erzeugt,
    'fehlerAnzahl', v_fehler_anzahl,
    'status', CASE WHEN v_fehler_anzahl = 0 THEN 'erfolg' ELSE 'teilweise_fehler' END
  );
END;
$$;

-- Lebenszeichen-Status
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

  SELECT count(*) INTO v_rules_count FROM public.dashboard_alarm_rules WHERE status = 'aktiv';

  RETURN jsonb_build_object(
    'status', v_status,
    'letzterLaufAm', v_last_run.gestartet_am,
    'letzterErfolgAm', v_last_success.gestartet_am,
    'auswertungAktiv', v_active,
    'aktiveRegeln', v_rules_count
  );
END;
$$;

-- ============================================================================
-- 7. RPCs für Manager & Admin
-- ============================================================================

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
  v_org_id UUID;
  v_role TEXT;
  v_dash_org UUID;
  v_rule_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'LP_AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  -- Dashboard Organisation ermitteln
  SELECT organization_id INTO v_dash_org FROM public.dashboards WHERE id = p_dashboard_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Rolle in Organisation prüfen
  SELECT role INTO v_role
  FROM public.organization_members
  WHERE organization_id = v_dash_org
    AND user_id = v_user_id
    AND status = 'active';

  IF v_role IS NULL OR v_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'LP_AUTH_INSUFFICIENT_PERMISSIONS' USING ERRCODE = '42501';
  END IF;

  -- Kennzahl alarmfähig prüfen
  IF p_catalog_id NOT LIKE 'crm.pipeline_%' AND p_catalog_id NOT LIKE 'live.%' THEN
    RAISE EXCEPTION 'LP_ALARM_KPI_NOT_CAPABLE: %', p_catalog_id USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.dashboard_alarm_rules (
    organization_id, dashboard_id, tile_id, catalog_id, pipeline,
    rule_config, mindestdauer_laeufe, abklingzeit_sekunden, status,
    created_by, responsible_user_id
  )
  VALUES (
    v_dash_org, p_dashboard_id, p_tile_id, p_catalog_id, p_pipeline,
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
      responsible_user_id = v_user_id,
      updated_at = now()
  RETURNING id INTO v_rule_id;

  RETURN v_rule_id;
END;
$$;

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
  WHERE organization_id = v_r.organization_id
    AND user_id = v_user_id
    AND status = 'active';

  IF v_role IS NULL OR v_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'LP_AUTH_INSUFFICIENT_PERMISSIONS' USING ERRCODE = '42501';
  END IF;

  UPDATE public.dashboard_alarm_rules
  SET rule_config = p_rule_config,
      mindestdauer_laeufe = COALESCE(p_mindestdauer, 1),
      abklingzeit_sekunden = COALESCE(p_abklingzeit, 0),
      updated_at = now()
  WHERE id = p_rule_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.pause_dashboard_alarm_rule(p_rule_id UUID)
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
  SELECT * INTO v_r FROM public.dashboard_alarm_rules WHERE id = p_rule_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'LP_ALARM_RULE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;

  SELECT role INTO v_role
  FROM public.organization_members
  WHERE organization_id = v_r.organization_id AND user_id = v_user_id AND status = 'active';

  IF v_role IS NULL OR v_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'LP_AUTH_INSUFFICIENT_PERMISSIONS' USING ERRCODE = '42501';
  END IF;

  UPDATE public.dashboard_alarm_rules SET status = 'pausiert', updated_at = now() WHERE id = p_rule_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.resume_dashboard_alarm_rule(p_rule_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_r RECORD;
  v_role TEXT;
  v_resp_role TEXT;
BEGIN
  SELECT * INTO v_r FROM public.dashboard_alarm_rules WHERE id = p_rule_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'LP_ALARM_RULE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;

  SELECT role INTO v_role
  FROM public.organization_members
  WHERE organization_id = v_r.organization_id AND user_id = v_user_id AND status = 'active';

  IF v_role IS NULL OR v_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'LP_AUTH_INSUFFICIENT_PERMISSIONS' USING ERRCODE = '42501';
  END IF;

  -- Verantwortlichen prüfen
  SELECT role INTO v_resp_role
  FROM public.organization_members
  WHERE organization_id = v_r.organization_id AND user_id = v_r.responsible_user_id AND status = 'active';

  IF v_resp_role IS NULL OR v_resp_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'LP_ALARM_RESPONSIBLE_HAS_NO_RIGHTS' USING ERRCODE = '42501';
  END IF;

  UPDATE public.dashboard_alarm_rules SET status = 'aktiv', updated_at = now() WHERE id = p_rule_id;
END;
$$;

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
  SELECT * INTO v_r FROM public.dashboard_alarm_rules WHERE id = p_rule_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'LP_ALARM_RULE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;

  SELECT role INTO v_role
  FROM public.organization_members
  WHERE organization_id = v_r.organization_id AND user_id = v_user_id AND status = 'active';

  IF v_role IS NULL OR v_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'LP_AUTH_INSUFFICIENT_PERMISSIONS' USING ERRCODE = '42501';
  END IF;

  UPDATE public.dashboard_alarm_rules
  SET responsible_user_id = v_user_id,
      status = 'aktiv',
      updated_at = now()
  WHERE id = p_rule_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_dashboard_alarm_rule(p_rule_id UUID)
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
  SELECT * INTO v_r FROM public.dashboard_alarm_rules WHERE id = p_rule_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'LP_ALARM_RULE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;

  SELECT role INTO v_role
  FROM public.organization_members
  WHERE organization_id = v_r.organization_id AND user_id = v_user_id AND status = 'active';

  IF v_role IS NULL OR v_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'LP_AUTH_INSUFFICIENT_PERMISSIONS' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.dashboard_alarm_rules WHERE id = p_rule_id;
END;
$$;

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
  SELECT organization_id INTO v_dash_org FROM public.dashboards WHERE id = p_dashboard_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = v_dash_org AND user_id = v_user_id AND status = 'active'
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
DECLARE
  v_user_id UUID := auth.uid();
  v_dash_org UUID;
  v_is_member BOOLEAN;
BEGIN
  SELECT organization_id INTO v_dash_org FROM public.dashboards WHERE id = p_dashboard_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'LP_DASHBOARD_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = v_dash_org AND user_id = v_user_id AND status = 'active'
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'LP_AUTH_INSUFFICIENT_PERMISSIONS' USING ERRCODE = '42501';
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

-- ============================================================================
-- 8. Revisions- & Ereignis-Aufbewahrung (Retention)
-- ============================================================================

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
      r.revision,
      r.created_at,
      ROW_NUMBER() OVER (PARTITION BY r.dashboard_id ORDER BY r.revision DESC) AS rn
    FROM public.dashboard_revisions r
  ),
  to_delete AS (
    SELECT r.id
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
  deleted AS (
    DELETE FROM public.dashboard_revisions
    WHERE id IN (SELECT id FROM to_delete)
    RETURNING id
  )
  SELECT count(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_dashboard_alarm_events()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INT := 0;
BEGIN
  WITH deleted AS (
    DELETE FROM public.dashboard_alarm_events
    WHERE created_at < now() - interval '12 months'
    RETURNING id
  )
  SELECT count(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$;

-- ============================================================================
-- 9. Berechtigungen & pg_cron Einplanung
-- ============================================================================

-- Nur interne Systemaufrufe für Worker & Cleanup
REVOKE ALL ON FUNCTION public.evaluate_dashboard_alarms(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_dashboard_revisions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_dashboard_alarm_events() FROM PUBLIC, anon, authenticated;

-- RPC-Grants für authenticated
GRANT EXECUTE ON FUNCTION public.alarm_worker_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_dashboard_alarm_rule(UUID, TEXT, TEXT, TEXT, JSONB, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_dashboard_alarm_rule(UUID, JSONB, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pause_dashboard_alarm_rule(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resume_dashboard_alarm_rule(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.takeover_dashboard_alarm_rule(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_dashboard_alarm_rule(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_dashboard_alarm_rules(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_dashboard_alarm_events(UUID, INT, INT) TO authenticated;

-- Jobs in pg_cron einplanen (falls cron verfügbar)
DO $$
DECLARE
  v_job_id BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('dashboard-alarms-eval');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    PERFORM cron.schedule('dashboard-alarms-eval', '*/5 * * * *', 'SELECT public.evaluate_dashboard_alarms(now());');

    BEGIN
      PERFORM cron.unschedule('dashboard-daily-cleanup');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    SELECT cron.schedule('dashboard-daily-cleanup', '0 3 * * *', 'SELECT public.cleanup_dashboard_revisions(); SELECT public.cleanup_dashboard_alarm_events();') INTO v_job_id;
    IF v_job_id IS NOT NULL THEN
      PERFORM cron.alter_job(job_id := v_job_id, active := false);
    END IF;
  END IF;
END;
$$;

