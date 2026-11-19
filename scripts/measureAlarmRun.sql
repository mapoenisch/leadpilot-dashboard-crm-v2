-- Benchmark: 200 aktive Alarmregeln in 5 Organisationen
-- Anforderung: Ein Lauf < 2 Sekunden lokal
BEGIN;

-- 5 Organisationen anlegen
INSERT INTO public.organizations (id, name, mode, status)
SELECT
  ('ef670000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid,
  'Org Perf ' || i,
  'synthetic',
  'active'
FROM generate_series(1, 5) i;

-- 5 Admin-User anlegen
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
SELECT
  ('6f670000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid,
  'authenticated',
  'authenticated',
  'perf' || i || '@test.local',
  'x',
  now()
FROM generate_series(1, 5) i;

-- Mitglieder zuweisen
INSERT INTO public.organization_members (user_id, organization_id, role, status)
SELECT
  ('6f670000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid,
  ('ef670000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid,
  'admin',
  'active'
FROM generate_series(1, 5) i;

-- Dashboards mit je 40 Kacheln anlegen
DO $$
DECLARE
  v_tiles JSONB;
  v_org UUID;
  v_user UUID;
  v_dash_id UUID;
  v_kpis TEXT[] := ARRAY[
    'crm.pipeline_deals', 'crm.pipeline_volumen', 'crm.pipeline_gewonnen', 'crm.pipeline_offen',
    'live.arr', 'live.mrr', 'live.pipeline_coverage', 'live.pipeline_leads'
  ];
BEGIN
  FOR i IN 1..5 LOOP
    v_org := ('ef670000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid;
    v_user := ('6f670000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid;
    v_dash_id := ('5f670000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid;

    v_tiles := '[]'::jsonb;
    FOR t IN 1..40 LOOP
      v_tiles := v_tiles || jsonb_build_object(
        'id', 'tile_' || t,
        'catalogId', v_kpis[((t - 1) % 8) + 1]
      );
    END LOOP;

    INSERT INTO public.dashboards (id, organization_id, scope, user_id, created_by_user_id, title, revision, config)
    VALUES (
      v_dash_id,
      v_org,
      'personal',
      v_user,
      v_user,
      'Perf Dashboard ' || i,
      1,
      jsonb_build_object('version', 2, 'title', 'Perf Dashboard ' || i, 'tiles', v_tiles)
    );

    -- 40 Regeln je Dashboard anlegen
    FOR t IN 1..40 LOOP
      INSERT INTO public.dashboard_alarm_rules (
        organization_id, dashboard_id, tile_id, catalog_id, rule_config,
        mindestdauer_laeufe, abklingzeit_sekunden, status, created_by, responsible_user_id
      )
      VALUES (
        v_org,
        v_dash_id,
        'tile_' || t,
        v_kpis[((t - 1) % 8) + 1],
        '{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":100}'::jsonb,
        1,
        0,
        'aktiv',
        v_user,
        v_user
      );
    END LOOP;

    -- Ein paar Testdaten je Org
    INSERT INTO public.imported_funnel_deals (id, organization_id, deal_name, amount, stage, pipeline, close_date)
    VALUES ('deal_' || i, v_org, 'Deal ' || i, 15000, 'Gewonnen Abschluss', 'standard', current_date);

    INSERT INTO public.live_kpi_public_feed (organization_id, kpi_id, value, unit, occurred_at, quality_status, source_system, ingested_at)
    VALUES (v_org, 'arr', 500000, 'EUR', now() - interval '5 minutes', 'good', 'test', now());
  END LOOP;
END;
$$;

-- Leistungsmessung
DO $$
DECLARE
  v_start TIMESTAMPTZ := clock_timestamp();
  v_res JSONB;
  v_duration_ms INT;
BEGIN
  v_res := public.evaluate_dashboard_alarms(now());
  v_duration_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start))::INT;

  RAISE NOTICE '>>> PERFORMANCE-MESSUNG: 200 Regeln ausgewertet in % ms (Ergebnis: %) <<<', v_duration_ms, v_res;
  IF v_duration_ms > 2000 THEN
    RAISE EXCEPTION 'PERFORMANCE FEHLGESCHLAGEN: Dauer % ms > 2000 ms', v_duration_ms;
  END IF;
END;
$$;

ROLLBACK;
