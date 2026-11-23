-- pgTAP-Tests für Auftrag 173 (P16a §2.2 Nr. 7): Rechte-Gesamtprüfung per direktem RPC-Aufruf.
-- Matrix Viewer/Manager/Admin × persönlich/Team × lesen/schreiben/freigeben/Alarm/Import/
-- Export/Kiosk, fremde Organisation, anonymer Zugriff und Rechteentzug während offener Sitzung.
--
-- Import entspricht serverseitig create_dashboard_v2, Export und Kiosk dem Lesen über
-- load_dashboard_v2/list_accessible_dashboards_v2 (beide laufen nur über diese RPCs).
--
-- Abschnitt „Bekannte Lücken“ (TODO): Die Alarm-RPCs aus 167 prüfen nur die Organisationsrolle,
-- nicht das Lese-/Schreibrecht am Dashboard. Die Tests beschreiben das Sollverhalten und laufen
-- als pgTAP-TODO mit (sichtbar rot, ohne die Suite zu brechen), bis der Zwischenauftrag sie
-- behebt. Siehe docs/dashboard/GESAMTABNAHME_P16.md, Befund B-1.

BEGIN;

SELECT plan(35);
SET CONSTRAINTS ALL IMMEDIATE;

-- ---------------------------------------------------------------- Setup --
INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('af732000-0000-0000-0000-00000000000a', 'Org A (Rechte P16)', 'synthetic', 'active'),
  ('af732000-0000-0000-0000-00000000000b', 'Org B (Rechte P16)', 'synthetic', 'active');

-- 01 Admin A, 02 Manager A Teammitglied, 03 Manager A ohne Team, 04 Viewer A Teammitglied,
-- 05 Viewer A ohne Team, 06 Admin B
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('9f732000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin-a@rechte.local', 'x', now()),
  ('9f732000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'mgr-team@rechte.local', 'x', now()),
  ('9f732000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'mgr-ohne@rechte.local', 'x', now()),
  ('9f732000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'view-team@rechte.local', 'x', now()),
  ('9f732000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'view-ohne@rechte.local', 'x', now()),
  ('9f732000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'admin-b@rechte.local', 'x', now());

INSERT INTO public.organization_members (user_id, organization_id, role, status)
VALUES
  ('9f732000-0000-0000-0000-000000000001', 'af732000-0000-0000-0000-00000000000a', 'admin', 'active'),
  ('9f732000-0000-0000-0000-000000000002', 'af732000-0000-0000-0000-00000000000a', 'manager', 'active'),
  ('9f732000-0000-0000-0000-000000000003', 'af732000-0000-0000-0000-00000000000a', 'manager', 'active'),
  ('9f732000-0000-0000-0000-000000000004', 'af732000-0000-0000-0000-00000000000a', 'viewer', 'active'),
  ('9f732000-0000-0000-0000-000000000005', 'af732000-0000-0000-0000-00000000000a', 'viewer', 'active'),
  ('9f732000-0000-0000-0000-000000000006', 'af732000-0000-0000-0000-00000000000b', 'admin', 'active');

INSERT INTO public.dashboard_teams (id, organization_id, name)
VALUES ('7e732000-0000-0000-0000-000000000001', 'af732000-0000-0000-0000-00000000000a', 'Vertrieb');
INSERT INTO public.dashboard_team_members (team_id, user_id, organization_id)
VALUES
  ('7e732000-0000-0000-0000-000000000001', '9f732000-0000-0000-0000-000000000002', 'af732000-0000-0000-0000-00000000000a'),
  ('7e732000-0000-0000-0000-000000000001', '9f732000-0000-0000-0000-000000000004', 'af732000-0000-0000-0000-00000000000a');

CREATE FUNCTION pg_temp.cfg(p_scope TEXT) RETURNS JSONB LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'version', 2, 'title', 'Rechte', 'scope', p_scope, 'ownerUserId', 'x', 'organizationId', 'x',
    'globalTimeframe', 'monat',
    'tiles', '[{"id":"t1","catalogId":"crm.pipeline_deals","presentation":"zahl","layouts":{"desktop":{"x":0,"y":0,"w":3,"h":3},"tablet":{"x":0,"y":0,"w":3,"h":3},"mobile":{"x":0,"y":0,"w":1,"h":3}}}]'::jsonb
  ) || CASE WHEN p_scope = 'team' THEN '{"teamId":"7e732000-0000-0000-0000-000000000001"}'::jsonb ELSE '{}'::jsonb END
$$;

INSERT INTO public.dashboards (id, organization_id, scope, user_id, team_id, title, created_by_user_id, revision, config)
VALUES
  ('d7732000-0000-0000-0000-0000000000a1', 'af732000-0000-0000-0000-00000000000a', 'team', NULL, '7e732000-0000-0000-0000-000000000001', 'Team', '9f732000-0000-0000-0000-000000000002', 1, pg_temp.cfg('team')),
  ('d7732000-0000-0000-0000-0000000000b2', 'af732000-0000-0000-0000-00000000000a', 'personal', '9f732000-0000-0000-0000-000000000002', NULL, 'P2', '9f732000-0000-0000-0000-000000000002', 1, pg_temp.cfg('personal')),
  ('d7732000-0000-0000-0000-0000000000b4', 'af732000-0000-0000-0000-00000000000a', 'personal', '9f732000-0000-0000-0000-000000000004', NULL, 'P4', '9f732000-0000-0000-0000-000000000004', 1, pg_temp.cfg('personal'));

-- Regel von Manager 02 auf dem Team-Dashboard (für Übernahme-/Listentests)
INSERT INTO public.dashboard_alarm_rules (id, organization_id, dashboard_id, tile_id, catalog_id, rule_config, status, created_by, responsible_user_id)
VALUES ('a7732000-0000-0000-0000-000000000001', 'af732000-0000-0000-0000-00000000000a', 'd7732000-0000-0000-0000-0000000000a1', 't1', 'crm.pipeline_deals',
        '{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"Stück","warnung":10}'::jsonb, 'aktiv',
        '9f732000-0000-0000-0000-000000000002', '9f732000-0000-0000-0000-000000000002');

SET ROLE authenticated;

-- ======================================================== Datenbereich Team (0)
RESET ROLE;
INSERT INTO public.imported_funnel_deals (id, organization_id, deal_name, amount, stage, pipeline, close_date)
VALUES
  ('d732-1', 'af732000-0000-0000-0000-00000000000a', 'Deal 1', 50000, 'Gewonnen Abschluss', 'enterprise', current_date),
  ('d732-2', 'af732000-0000-0000-0000-00000000000a', 'Deal 2', 25000, 'Qualifiziert', 'standard', current_date),
  ('d732-3', 'af732000-0000-0000-0000-00000000000b', 'Deal B', 99000, 'Qualifiziert', 'standard', current_date);
SET ROLE authenticated;
-- Teamzuordnung erzeugt keinen zusätzlichen Dealfilter: Teammitglied und Nicht-Mitglied derselben
-- Organisation erhalten dieselbe Aggregation (Organisationsdatenbereich).
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000002","role":"authenticated"}', true);
CREATE TEMP TABLE agg_team AS SELECT public.dashboard_crm_pipeline_overview(NULL) AS v;
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT is(public.dashboard_crm_pipeline_overview(NULL) - 'asOf', (SELECT v - 'asOf' FROM agg_team),
  'Team-Mitglied und Nicht-Mitglied sehen denselben Organisationsdatenbereich');
SELECT is((SELECT (v->>'totalDeals')::int FROM agg_team), 2, 'Aggregation umfasst genau die Deals der eigenen Organisation');

-- ======================================================== Persönlich (1..5)
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT is((SELECT revision FROM public.save_dashboard_v2('d7732000-0000-0000-0000-0000000000b4', 1, 'P4', pg_temp.cfg('personal'))), 2,
  'Viewer: eigenes persönliches Dashboard speichern erlaubt');
SELECT is((SELECT count(*)::int FROM public.create_dashboard_v2('Import Viewer', pg_temp.cfg('personal'), 'personal')), 1,
  'Viewer: Import als persönliches Dashboard erlaubt');
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT throws_ok($$ SELECT * FROM public.load_dashboard_v2('d7732000-0000-0000-0000-0000000000b4') $$, 'P0002', 'LP_DASHBOARD_NOT_FOUND',
  'Manager: fremdes persönliches Dashboard nicht lesbar (auch kein Export/Kiosk)');
SELECT throws_ok($$ SELECT * FROM public.save_dashboard_v2('d7732000-0000-0000-0000-0000000000b4', 2, 'X', pg_temp.cfg('personal')) $$, 'P0002', 'LP_DASHBOARD_NOT_FOUND',
  'Manager: fremdes persönliches Dashboard nicht schreibbar');
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT throws_ok($$ SELECT * FROM public.load_dashboard_v2('d7732000-0000-0000-0000-0000000000b4') $$, 'P0002', 'LP_DASHBOARD_NOT_FOUND',
  'Admin: fremdes persönliches Dashboard nicht lesbar');

-- ======================================================== Team lesen/schreiben (6..12)
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT is((SELECT scope FROM public.load_dashboard_v2('d7732000-0000-0000-0000-0000000000a1')), 'team', 'Viewer im Team: Team-Dashboard lesbar');
SELECT throws_ok($$ SELECT * FROM public.save_dashboard_v2('d7732000-0000-0000-0000-0000000000a1', 1, 'Team', pg_temp.cfg('team')) $$, '42501', 'LP_TEAM_ACCESS_REVOKED',
  'Viewer im Team: Team-Dashboard nicht schreibbar');
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000005","role":"authenticated"}', true);
SELECT throws_ok($$ SELECT * FROM public.load_dashboard_v2('d7732000-0000-0000-0000-0000000000a1') $$, 'P0002', 'LP_DASHBOARD_NOT_FOUND',
  'Viewer ohne Team: Team-Dashboard nicht lesbar');
SELECT is((SELECT count(*)::int FROM public.list_accessible_dashboards_v2() WHERE id = 'd7732000-0000-0000-0000-0000000000a1'), 0,
  'Viewer ohne Team: Team-Dashboard nicht in der Auswahl (Kiosk-Rotation)');
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT throws_ok($$ SELECT * FROM public.save_dashboard_v2('d7732000-0000-0000-0000-0000000000a1', 1, 'Team', pg_temp.cfg('team')) $$, 'P0002', 'LP_DASHBOARD_NOT_FOUND',
  'Manager ohne Team: Team-Dashboard nicht schreibbar');
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT is((SELECT revision FROM public.save_dashboard_v2('d7732000-0000-0000-0000-0000000000a1', 1, 'Team', pg_temp.cfg('team'))), 2,
  'Manager im Team: Team-Dashboard schreibbar');
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT is((SELECT revision FROM public.save_dashboard_v2('d7732000-0000-0000-0000-0000000000a1', 2, 'Team', pg_temp.cfg('team'))), 3,
  'Admin: Team-Dashboard schreibbar');

-- ======================================================== Freigeben (13..15)
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT throws_ok($$ SELECT * FROM public.copy_dashboard_v2('d7732000-0000-0000-0000-0000000000b4', 'team', '7e732000-0000-0000-0000-000000000001', 'Geteilt') $$, '42501', NULL,
  'Viewer: Freigabe ans Team abgewiesen');
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.copy_dashboard_v2('d7732000-0000-0000-0000-0000000000b2', 'team', '7e732000-0000-0000-0000-000000000001', 'Geteilt')), 1,
  'Manager im Team: Freigabe ans Team erlaubt');
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT throws_ok($$ SELECT * FROM public.copy_dashboard_v2('d7732000-0000-0000-0000-0000000000b4', 'team', '7e732000-0000-0000-0000-000000000001', 'Geteilt') $$, NULL, NULL,
  'Manager ohne Team: Freigabe ans Team abgewiesen');

-- ======================================================== Alarm (16..17)
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT throws_ok($$ SELECT public.create_dashboard_alarm_rule('d7732000-0000-0000-0000-0000000000a1', 't1', 'crm.pipeline_deals', NULL,
  '{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"Stück","warnung":10}'::jsonb, 1, 0) $$,
  '42501', 'LP_AUTH_INSUFFICIENT_PERMISSIONS', 'Viewer: keine Alarmregel');
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT isnt(public.create_dashboard_alarm_rule('d7732000-0000-0000-0000-0000000000b2', 't1', 'crm.pipeline_deals', NULL,
  '{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"Stück","warnung":10}'::jsonb, 1, 0), NULL,
  'Manager: Alarmregel auf eigenem Dashboard erlaubt');

-- ======================================================== Fremde Organisation (18..21)
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000006","role":"authenticated"}', true);
SELECT throws_ok($$ SELECT * FROM public.load_dashboard_v2('d7732000-0000-0000-0000-0000000000a1') $$, 'P0002', 'LP_DASHBOARD_NOT_FOUND',
  'Admin fremder Organisation: Team-Dashboard nicht lesbar');
SELECT throws_ok($$ SELECT * FROM public.save_dashboard_v2('d7732000-0000-0000-0000-0000000000a1', 3, 'X', pg_temp.cfg('team')) $$, 'P0002', 'LP_DASHBOARD_NOT_FOUND',
  'Admin fremder Organisation: Team-Dashboard nicht schreibbar');
SELECT throws_ok($$ SELECT public.create_dashboard_alarm_rule('d7732000-0000-0000-0000-0000000000a1', 't1', 'crm.pipeline_deals', NULL, '{}'::jsonb, 1, 0) $$,
  '42501', 'LP_AUTH_INSUFFICIENT_PERMISSIONS', 'Admin fremder Organisation: keine Alarmregel');
SELECT throws_ok($$ SELECT public.takeover_dashboard_alarm_rule('a7732000-0000-0000-0000-000000000001') $$,
  '42501', 'LP_AUTH_INSUFFICIENT_PERMISSIONS', 'Admin fremder Organisation: keine Regelübernahme');

-- ======================================================== Rechteentzug während offener Sitzung (22..24)
-- Manager 02 hat das Team-Dashboard in Revision 3 geöffnet; der Admin entfernt ihn aus dem Team.
RESET ROLE;
DELETE FROM public.dashboard_team_members
WHERE team_id = '7e732000-0000-0000-0000-000000000001' AND user_id = '9f732000-0000-0000-0000-000000000002';
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT throws_ok($$ SELECT * FROM public.save_dashboard_v2('d7732000-0000-0000-0000-0000000000a1', 3, 'Team', pg_temp.cfg('team')) $$, 'P0002', 'LP_DASHBOARD_NOT_FOUND',
  'Nach Entfernen aus dem Team: Speichern der offenen Sitzung abgewiesen');
-- Viewer 04 bleibt im Team, wird aber auf „deaktiviert“ gesetzt
RESET ROLE;
UPDATE public.organization_members SET status = 'suspended'
WHERE user_id = '9f732000-0000-0000-0000-000000000004' AND organization_id = 'af732000-0000-0000-0000-00000000000a';
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT throws_ok($$ SELECT * FROM public.load_dashboard_v2('d7732000-0000-0000-0000-0000000000a1') $$, NULL, NULL,
  'Deaktiviertes Mitglied: Team-Dashboard nicht mehr lesbar');
SELECT throws_ok($$ SELECT * FROM public.save_dashboard_v2('d7732000-0000-0000-0000-0000000000b4', 2, 'P4', pg_temp.cfg('personal')) $$, NULL, NULL,
  'Deaktiviertes Mitglied: auch eigenes Dashboard nicht mehr speicherbar');

-- ======================================================== Anonym (25..27)
RESET ROLE;
SET ROLE anon;
SELECT throws_ok($$ SELECT * FROM public.load_dashboard_v2('d7732000-0000-0000-0000-0000000000a1') $$, '42501', NULL, 'Anonym: kein Laden');
SELECT throws_ok($$ SELECT * FROM public.dashboard_v1_v2_reconciliation() $$, '42501', NULL, 'Anonym: kein Abgleich');
SELECT throws_ok($$ SELECT public.create_dashboard_alarm_rule('d7732000-0000-0000-0000-0000000000a1', 't1', 'crm.pipeline_deals', NULL, '{}'::jsonb, 1, 0) $$, '42501', NULL, 'Anonym: keine Alarmregel');
RESET ROLE;

-- ======================================================== Übernahme (28) und bekannte Lücken (29..33, TODO Befund B-1)
-- Manager 03 bekommt die Teammitgliedschaft nicht; er darf das Team-Dashboard weder lesen noch
-- schreiben und deshalb auch keine Alarmregel darauf anlegen, übernehmen, löschen oder sehen.
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT throws_ok($$ SELECT public.takeover_dashboard_alarm_rule('a7732000-0000-0000-0000-000000000001') $$,
  '42501', 'LP_AUTH_INSUFFICIENT_PERMISSIONS', 'Manager: Regelübernahme nur durch Admin (seit 168)');
SELECT todo_start('Befund B-1: Alarm-RPCs prüfen kein Dashboard-Lese-/Schreibrecht (Zwischenauftrag 173a)');
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000005","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.list_dashboard_alarm_rules('d7732000-0000-0000-0000-0000000000a1')), 0,
  'Soll: Viewer ohne Team sieht keine Regeln eines nicht lesbaren Dashboards');
SELECT set_config('request.jwt.claims', '{"sub":"9f732000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT throws_ok($$ SELECT public.pause_dashboard_alarm_rule('a7732000-0000-0000-0000-000000000001') $$,
  NULL, NULL, 'Soll: Manager ohne Team pausiert keine fremde Regel');
SELECT throws_ok($$ SELECT public.create_dashboard_alarm_rule('d7732000-0000-0000-0000-0000000000b4', 't1', 'crm.pipeline_deals', NULL,
  '{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"Stück","warnung":10}'::jsonb, 1, 0) $$,
  NULL, NULL, 'Soll: Manager legt keine Regel auf fremdem persönlichem Dashboard an');
SELECT throws_ok($$ SELECT public.create_dashboard_alarm_rule('d7732000-0000-0000-0000-0000000000a1', 't1', 'crm.pipeline_deals', NULL,
  '{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"Stück","warnung":10}'::jsonb, 1, 0) $$,
  NULL, NULL, 'Soll: Manager ohne Team legt keine Regel auf dem Team-Dashboard an und übernimmt keine bestehende per Überschreiben');
SELECT throws_ok($$ SELECT public.delete_dashboard_alarm_rule('a7732000-0000-0000-0000-000000000001') $$,
  NULL, NULL, 'Soll: Manager ohne Team löscht keine fremde Regel');
SELECT todo_end();
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
