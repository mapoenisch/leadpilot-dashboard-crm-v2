-- pgTAP-Tests fuer Auftrag 167: Revisions- und Ereignis-Aufbewahrung
BEGIN;

SELECT plan(8);
SET CONSTRAINTS ALL IMMEDIATE;

-- Setup Test-Organisation und Nutzer
INSERT INTO public.organizations (id, name, mode, status)
VALUES ('cf670000-0000-0000-0000-00000000000a', 'Org Retention 167', 'synthetic', 'active');

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES ('7f670000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin-ret@test.local', 'x', now());

INSERT INTO public.organization_members (user_id, organization_id, role, status)
VALUES ('7f670000-0000-0000-0000-000000000001', 'cf670000-0000-0000-0000-00000000000a', 'admin', 'active');

-- Test 1: cleanup_dashboard_revisions existiert
SELECT has_function('public', 'cleanup_dashboard_revisions', 'Funktion cleanup_dashboard_revisions existiert');

-- Test 2: cleanup_dashboard_alarm_events existiert
SELECT has_function('public', 'cleanup_dashboard_alarm_events', 'Funktion cleanup_dashboard_alarm_events existiert');

-- Test 3: Dashboard anlegen
INSERT INTO public.dashboards (id, organization_id, scope, user_id, created_by_user_id, title, revision, config)
VALUES (
  'cf670000-0000-0000-0000-000000000001',
  'cf670000-0000-0000-0000-00000000000a',
  'personal',
  '7f670000-0000-0000-0000-000000000001',
  '7f670000-0000-0000-0000-000000000001',
  'Dashboard Retention Test',
  130,
  '{"version":2,"title":"Retention Test"}'::jsonb
);

-- 130 Revisionen erzeugen:
-- Revision 1 (2 Jahre alt) -> muss bleiben!
INSERT INTO public.dashboard_revisions (dashboard_id, organization_id, revision, title, config, created_by_user_id, created_at, change_summary)
VALUES (
  'cf670000-0000-0000-0000-000000000001',
  'cf670000-0000-0000-0000-00000000000a',
  1,
  'Rev 1',
  '{"v":1}'::jsonb,
  '7f670000-0000-0000-0000-000000000001',
  now() - interval '24 months',
  'Ersterstellung'
);

-- Revisionen 2 bis 30 (2 Jahre alt, rn > 100)
-- Aber Revision 5 ist Wiederherstellungsquelle von Revision 120 -> muss bleiben!
INSERT INTO public.dashboard_revisions (dashboard_id, organization_id, revision, title, config, created_by_user_id, created_at, change_summary)
SELECT
  'cf670000-0000-0000-0000-000000000001',
  'cf670000-0000-0000-0000-00000000000a',
  g,
  'Rev ' || g,
  '{"v":2}'::jsonb,
  '7f670000-0000-0000-0000-000000000001',
  now() - interval '24 months' + (g * interval '1 day'),
  'Normaler Save ' || g
FROM generate_series(2, 30) g;

-- Revisionen 31 bis 130 (letzte 100 Revisionen -> rn <= 100, muessen bleiben!)
INSERT INTO public.dashboard_revisions (dashboard_id, organization_id, revision, title, config, created_by_user_id, created_at, change_summary)
SELECT
  'cf670000-0000-0000-0000-000000000001',
  'cf670000-0000-0000-0000-00000000000a',
  g,
  'Rev ' || g,
  '{"v":2}'::jsonb,
  '7f670000-0000-0000-0000-000000000001',
  now() - interval '6 months' + (g * interval '1 hour'),
  CASE WHEN g = 120 THEN 'Wiederherstellung von Revision 5' ELSE 'Normaler Save ' || g END
FROM generate_series(31, 130) g;

-- Erwartung vor Cleanup: 130 Revisionen vorhanden
SELECT is(
  (SELECT count(*)::INT FROM public.dashboard_revisions WHERE dashboard_id = 'cf670000-0000-0000-0000-000000000001'),
  130,
  'Vor Cleanup genau 130 Revisionen vorhanden'
);

-- Test 4: cleanup_dashboard_revisions loescht genau 28 Revisionen (Revision 1 bleibt, Revision 5 bleibt, 2..4 und 6..30 geloescht = 29 - 1 = 28 geloescht)
SELECT is(
  public.cleanup_dashboard_revisions(),
  28,
  'Genau 28 alte Revisionen geloescht'
);

-- Test 5: Revision 1 und 5 sind noch da
SELECT is(
  (SELECT count(*)::INT FROM public.dashboard_revisions WHERE dashboard_id = 'cf670000-0000-0000-0000-000000000001' AND revision IN (1, 5)),
  2,
  'Revision 1 und Wiederherstellungsquelle Revision 5 bleiben erhalten'
);

-- Test 6: Zweiter Lauf loescht 0 Revisionen (Idempotenz)
SELECT is(
  public.cleanup_dashboard_revisions(),
  0,
  'Zweiter Aufruf von cleanup_dashboard_revisions loescht 0 Revisionen'
);

-- Alarm Events anlegen
INSERT INTO public.dashboard_alarm_rules (
  id, organization_id, dashboard_id, tile_id, catalog_id, rule_config, created_by, responsible_user_id
)
VALUES (
  'cf670000-0000-0000-0000-000000000002',
  'cf670000-0000-0000-0000-00000000000a',
  'cf670000-0000-0000-0000-000000000001',
  't1',
  'crm.pipeline_deals',
  '{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"Stück","warnung":10}'::jsonb,
  '7f670000-0000-0000-0000-000000000001',
  '7f670000-0000-0000-0000-000000000001'
);

-- Event 13 Monate alt -> loeschen
INSERT INTO public.dashboard_alarm_events (
  organization_id, rule_id, alter_zustand, neuer_zustand, messwert, einheit, meldung, created_at
)
VALUES (
  'cf670000-0000-0000-0000-00000000000a',
  'cf670000-0000-0000-0000-000000000002',
  'normal', 'warnung', 15, 'Stück', 'Altes Event',
  now() - interval '13 months'
);

-- Event 6 Monate alt -> bleibt
INSERT INTO public.dashboard_alarm_events (
  organization_id, rule_id, alter_zustand, neuer_zustand, messwert, einheit, meldung, created_at
)
VALUES (
  'cf670000-0000-0000-0000-00000000000a',
  'cf670000-0000-0000-0000-000000000002',
  'warnung', 'kritisch', 25, 'Stück', 'Neues Event',
  now() - interval '6 months'
);

-- Test 7: cleanup_dashboard_alarm_events loescht 1 Event
SELECT is(
  public.cleanup_dashboard_alarm_events(),
  1,
  'cleanup_dashboard_alarm_events loescht genau 1 abgelaufenes Event'
);

-- Test 8: Genau 1 Event bleibt uebrig
SELECT is(
  (SELECT count(*)::INT FROM public.dashboard_alarm_events WHERE organization_id = 'cf670000-0000-0000-0000-00000000000a'),
  1,
  'Neues Event bleibt erhalten'
);

SELECT * FROM finish();
ROLLBACK;
