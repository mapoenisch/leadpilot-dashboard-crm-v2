-- pgTAP-Tests fuer Auftrag 167: Rechte & RLS Alarmregeln
BEGIN;

SELECT plan(8);
SET CONSTRAINTS ALL IMMEDIATE;

-- Setup Organisationen und Nutzer
INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('bf670000-0000-0000-0000-00000000000a', 'Org A (Auftrag 167)', 'synthetic', 'active'),
  ('bf670000-0000-0000-0000-00000000000b', 'Org B (Auftrag 167)', 'synthetic', 'active');

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('8f670000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin-a@auftrag167.local', 'x', now()),
  ('8f670000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'mgr-a@auftrag167.local', 'x', now()),
  ('8f670000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'viewer-a@auftrag167.local', 'x', now()),
  ('8f670000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'admin-b@auftrag167.local', 'x', now());

INSERT INTO public.organization_members (user_id, organization_id, role, status)
VALUES
  ('8f670000-0000-0000-0000-000000000001', 'bf670000-0000-0000-0000-00000000000a', 'admin', 'active'),
  ('8f670000-0000-0000-0000-000000000002', 'bf670000-0000-0000-0000-00000000000a', 'manager', 'active'),
  ('8f670000-0000-0000-0000-000000000003', 'bf670000-0000-0000-0000-00000000000a', 'viewer', 'active'),
  ('8f670000-0000-0000-0000-000000000004', 'bf670000-0000-0000-0000-00000000000b', 'admin', 'active');

-- Test 1: create_dashboard_alarm_rule RPC existiert
SELECT has_function('public', 'create_dashboard_alarm_rule', ARRAY['uuid', 'text', 'text', 'text', 'jsonb', 'integer', 'integer'], 'Funktion create_dashboard_alarm_rule existiert');

-- Test 2: list_dashboard_alarm_rules RPC existiert
SELECT has_function('public', 'list_dashboard_alarm_rules', ARRAY['uuid'], 'Funktion list_dashboard_alarm_rules existiert');

-- Test 3: list_dashboard_alarm_events RPC existiert
SELECT has_function('public', 'list_dashboard_alarm_events', ARRAY['uuid', 'integer', 'integer'], 'Funktion list_dashboard_alarm_events existiert');

-- Test 4: takeover_dashboard_alarm_rule RPC existiert
SELECT has_function('public', 'takeover_dashboard_alarm_rule', ARRAY['uuid'], 'Funktion takeover_dashboard_alarm_rule existiert');

-- Dashboard anlegen
SELECT set_config('request.jwt.claims', '{"sub":"8f670000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SET ROLE authenticated;

CREATE TEMP TABLE tmp_dash AS
SELECT dashboard_id FROM public.create_dashboard_v2(
  'Test Dash 167',
  '{"version":2,"title":"Test Dash 167","globalTimeframe":"letzte_30_tage","tiles":[{"id":"t1","catalogId":"crm.pipeline_deals","presentation":"zahl","layouts":{"desktop":{"x":0,"y":0,"w":3,"h":3}}}]}'::jsonb,
  'personal'
);

-- Test 5: Viewer darf keine Regel anlegen (throws exception)
SELECT set_config('request.jwt.claims', '{"sub":"8f670000-0000-0000-0000-000000000003","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT public.create_dashboard_alarm_rule(
    (SELECT dashboard_id FROM tmp_dash),
    't1',
    'crm.pipeline_deals',
    NULL,
    '{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"Stück","warnung":10}'::jsonb,
    1,
    0
  )$$,
  '42501',
  'LP_AUTH_INSUFFICIENT_PERMISSIONS',
  'Viewer darf keine Alarmregel anlegen'
);

-- Test 6: Client kann nicht direkt in dashboard_alarm_events schreiben
SELECT throws_ok(
  $$INSERT INTO public.dashboard_alarm_events (organization_id, rule_id, trigger_run_id, alter_zustand, neuer_zustand, messwert, einheit, meldung)
    VALUES ('bf670000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'normal', 'warnung', 10, 'EUR', 'Fake')$$
);

-- Test 7: evaluate_dashboard_alarms darf nicht von authenticated aufgerufen werden
SELECT throws_ok(
  $$SELECT public.evaluate_dashboard_alarms(now())$$,
  '42501',
  NULL,
  'evaluate_dashboard_alarms darf nicht von authenticated ausgefuehrt werden'
);

-- Test 8: cleanup_dashboard_revisions darf nicht von authenticated aufgerufen werden
SELECT throws_ok(
  $$SELECT public.cleanup_dashboard_revisions()$$,
  '42501',
  NULL,
  'cleanup_dashboard_revisions darf nicht von authenticated ausgefuehrt werden'
);

SELECT * FROM finish();
ROLLBACK;
