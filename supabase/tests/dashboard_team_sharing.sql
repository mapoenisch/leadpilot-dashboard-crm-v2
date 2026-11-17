-- pgTAP-Tests fuer Auftrag 162 (P11a): Team-Freigaben im Server
-- Vollstaendige Pruefung der Rechtematrix, Mandantentrennung, RLS, RPCs, Konflikte, Audit.

BEGIN;

SELECT plan(52);
SET CONSTRAINTS ALL IMMEDIATE;

-- ---------------------------------------------------------------- Setup --
-- Feste UUIDs
-- Organisationen
-- Org A: af620000-0000-0000-0000-00000000000a
-- Org B: af620000-0000-0000-0000-00000000000b

INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('af620000-0000-0000-0000-00000000000a', 'Org A (Team Test)', 'synthetic', 'active'),
  ('af620000-0000-0000-0000-00000000000b', 'Org B (Team Test)', 'synthetic', 'active');

-- Nutzer
-- Org A:
-- 9f620000-0000-0000-0000-000000000001 : Admin A (admin, active)
-- 9f620000-0000-0000-0000-000000000002 : Manager A1 (manager, active) -> Mitglied in Team A1
-- 9f620000-0000-0000-0000-000000000003 : Manager A2 (manager, active) -> Nicht-Mitglied in Team A1
-- 9f620000-0000-0000-0000-000000000004 : Viewer A1 (viewer, active)   -> Mitglied in Team A1
-- 9f620000-0000-0000-0000-000000000005 : Viewer A2 (viewer, active)   -> Nicht-Mitglied in Team A1
-- 9f620000-0000-0000-0000-000000000006 : Manager A3 (manager, suspended) -> Zeile in Team A1
-- Org B:
-- 9f620000-0000-0000-0000-000000000007 : Admin B (admin, active)

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('9f620000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin-a@team-test.local', 'x', now()),
  ('9f620000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'mgr-a1@team-test.local', 'x', now()),
  ('9f620000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'mgr-a2@team-test.local', 'x', now()),
  ('9f620000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'view-a1@team-test.local', 'x', now()),
  ('9f620000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'view-a2@team-test.local', 'x', now()),
  ('9f620000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'mgr-a3-susp@team-test.local', 'x', now()),
  ('9f620000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'admin-b@team-test.local', 'x', now());

INSERT INTO public.organization_members (user_id, organization_id, role, status)
VALUES
  ('9f620000-0000-0000-0000-000000000001', 'af620000-0000-0000-0000-00000000000a', 'admin', 'active'),
  ('9f620000-0000-0000-0000-000000000002', 'af620000-0000-0000-0000-00000000000a', 'manager', 'active'),
  ('9f620000-0000-0000-0000-000000000003', 'af620000-0000-0000-0000-00000000000a', 'manager', 'active'),
  ('9f620000-0000-0000-0000-000000000004', 'af620000-0000-0000-0000-00000000000a', 'viewer', 'active'),
  ('9f620000-0000-0000-0000-000000000005', 'af620000-0000-0000-0000-00000000000a', 'viewer', 'active'),
  ('9f620000-0000-0000-0000-000000000006', 'af620000-0000-0000-0000-00000000000a', 'manager', 'active'),
  ('9f620000-0000-0000-0000-000000000007', 'af620000-0000-0000-0000-00000000000b', 'admin', 'active');

SET ROLE authenticated;

-- ============================================================================
-- Tests 1..9: Teamverwaltung & Mandantentrennung
-- ============================================================================

-- 1. Admin A legt Team A1 an
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000001","role":"authenticated"}', true);

CREATE TEMP TABLE tmp_team_created AS
SELECT * FROM public.create_dashboard_team_v2('Vertrieb Nord', 'Norddeutsche Region');

SELECT is(
  (SELECT name || '/' || description FROM tmp_team_created),
  'Vertrieb Nord/Norddeutsche Region',
  'Admin A kann Team erfolgreich anlegen'
);

-- 2. Manager A1 versucht Team anzulegen -> LP_FORBIDDEN
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT throws_ok(
  $$ SELECT * FROM public.create_dashboard_team_v2('Vertrieb Süd', 'Test') $$,
  '42501',
  'LP_FORBIDDEN',
  'Manager darf kein Team anlegen'
);

-- 3. Doppelter Teamname in derselben Org -> LP_TEAM_NAME_TAKEN
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT throws_ok(
  $$ SELECT * FROM public.create_dashboard_team_v2('vertrieb nord', 'Doppelt') $$,
  '23505',
  'LP_TEAM_NAME_TAKEN',
  'Doppelter Teamname (case-insensitive) wird abgewiesen'
);

-- 4. Admin A aktualisiert Team A1
CREATE TEMP TABLE tmp_team_updated AS
SELECT * FROM public.update_dashboard_team_v2(
  (SELECT id FROM tmp_team_created),
  'Vertrieb Nord-Ost',
  'Angepasst'
);

SELECT is(
  (SELECT name || '/' || description FROM tmp_team_updated),
  'Vertrieb Nord-Ost/Angepasst',
  'Admin kann Team aktualisieren'
);

-- 5. Admin A fuegt Mitglieder zu Team A1 hinzu: Manager A1, Viewer A1, Suspended Manager A3
SELECT ok(
  public.add_dashboard_team_member_v2((SELECT id FROM tmp_team_created), '9f620000-0000-0000-0000-000000000002'),
  'Manager A1 zu Team A1 hinzugefuegt'
);
SELECT ok(
  public.add_dashboard_team_member_v2((SELECT id FROM tmp_team_created), '9f620000-0000-0000-0000-000000000004'),
  'Viewer A1 zu Team A1 hinzugefuegt'
);
SELECT ok(
  public.add_dashboard_team_member_v2((SELECT id FROM tmp_team_created), '9f620000-0000-0000-0000-000000000006'),
  'Manager A3 zu Team A1 hinzugefuegt'
);

-- Manager A3 suspendieren (simuliert bestehende Mitgliedschaft, aber entzogenen Org-Status)
RESET ROLE;
UPDATE public.organization_members
SET status = 'suspended'
WHERE user_id = '9f620000-0000-0000-0000-000000000006' AND organization_id = 'af620000-0000-0000-0000-00000000000a';
SET ROLE authenticated;

-- 6. add_dashboard_team_member_v2 ist idempotent
SELECT ok(
  public.add_dashboard_team_member_v2((SELECT id FROM tmp_team_created), '9f620000-0000-0000-0000-000000000002'),
  'Hinzufuegen desselben Mitglieds ist idempotent'
);

-- 7. Nutzer aus fremder Organisation hinzufuegen -> LP_MEMBER_NOT_IN_ORG
SELECT throws_ok(
  format('SELECT public.add_dashboard_team_member_v2(%L::uuid, ''9f620000-0000-0000-0000-000000000007''::uuid)', (SELECT id FROM tmp_team_created)),
  '22023',
  'LP_MEMBER_NOT_IN_ORG',
  'Nutzer aus fremder Org wird abgewiesen'
);

-- 8. list_dashboard_team_members_v2 als Admin
SELECT is(
  (SELECT count(*)::integer FROM public.list_dashboard_team_members_v2((SELECT id FROM tmp_team_created))),
  3,
  'Admin sieht alle 3 Mitglieder des Teams'
);

-- 9. list_dashboard_teams_v2 als Manager A1 (Mitglied) vs Manager A2 (Nicht-Mitglied)
SELECT is(
  (SELECT count(*)::integer FROM public.list_dashboard_teams_v2()),
  1,
  'Admin sieht Team A1'
);
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT is(
  (SELECT count(*)::integer FROM public.list_dashboard_teams_v2()),
  1,
  'Manager A1 (Mitglied) sieht Team A1'
);
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT is(
  (SELECT count(*)::integer FROM public.list_dashboard_teams_v2()),
  0,
  'Manager A2 (Nicht-Mitglied) sieht Team A1 nicht'
);

-- ============================================================================
-- Tests 10..20: Team-Dashboards anlegen, lesen, schreiben
-- ============================================================================

-- 10. Manager A1 (Mitglied) legt Team-Dashboard an
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000002","role":"authenticated"}', true);

CREATE TEMP TABLE tmp_dash_created AS
SELECT * FROM public.create_dashboard_v2(
  'Team Board 1',
  jsonb_build_object(
    'version', 2,
    'title', 'Team Board 1',
    'scope', 'team',
    'teamId', (SELECT id::text FROM tmp_team_created),
    'ownerUserId', '9f620000-0000-0000-0000-000000000002',
    'organizationId', 'af620000-0000-0000-0000-00000000000a',
    'globalTimeframe', 'aktuell',
    'tiles', '[]'::jsonb
  ),
  'team',
  (SELECT id FROM tmp_team_created)
);

SELECT is(
  (SELECT revision FROM tmp_dash_created),
  1,
  'Manager A1 (Mitglied) legt Team-Dashboard erfolgreich an'
);

-- 11. Manager A2 (Nicht-Mitglied) versucht Team-Dashboard anzulegen -> LP_TEAM_NOT_FOUND
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT throws_ok(
  format(
    'SELECT * FROM public.create_dashboard_v2(''Fremdes Board'', jsonb_build_object(''version'', 2, ''title'', ''Fremdes Board'', ''scope'', ''team'', ''teamId'', %L, ''ownerUserId'', ''9f620000-0000-0000-0000-000000000003'', ''organizationId'', ''af620000-0000-0000-0000-00000000000a'', ''globalTimeframe'', ''aktuell'', ''tiles'', ''[]''::jsonb), ''team'', %L::uuid)',
    (SELECT id::text FROM tmp_team_created),
    (SELECT id::text FROM tmp_team_created)
  ),
  'P0002',
  'LP_TEAM_NOT_FOUND',
  'Nicht-Mitglied erhaelt LP_TEAM_NOT_FOUND beim Anlegeversuch'
);

-- 12. Viewer A1 (Mitglied, aber nur Leserecht) versucht anzulegen -> LP_TEAM_ACCESS_REVOKED
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT throws_ok(
  format(
    'SELECT * FROM public.create_dashboard_v2(''Viewer Board'', jsonb_build_object(''version'', 2, ''title'', ''Viewer Board'', ''scope'', ''team'', ''teamId'', %L, ''ownerUserId'', ''9f620000-0000-0000-0000-000000000004'', ''organizationId'', ''af620000-0000-0000-0000-00000000000a'', ''globalTimeframe'', ''aktuell'', ''tiles'', ''[]''::jsonb), ''team'', %L::uuid)',
    (SELECT id::text FROM tmp_team_created),
    (SELECT id::text FROM tmp_team_created)
  ),
  '42501',
  'LP_TEAM_ACCESS_REVOKED',
  'Viewer-Mitglied erhaelt LP_TEAM_ACCESS_REVOKED beim Anlegen'
);

-- 13. Admin A (kein Mitglied von Team A1) laedt Dashboard mit can_write = true
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT is(
  (SELECT title || '/' || scope || '/' || can_write::text FROM public.load_dashboard_v2((SELECT dashboard_id FROM tmp_dash_created))),
  'Team Board 1/team/true',
  'Admin A laedt Team-Dashboard mit can_write = true'
);

-- 14. Manager A1 (Mitglied) laedt Dashboard mit can_write = true
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT is(
  (SELECT title || '/' || scope || '/' || can_write::text FROM public.load_dashboard_v2((SELECT dashboard_id FROM tmp_dash_created))),
  'Team Board 1/team/true',
  'Manager A1 (Mitglied) laedt Dashboard mit can_write = true'
);

-- 15. Viewer A1 (Mitglied) laedt Dashboard mit can_write = false
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT is(
  (SELECT title || '/' || scope || '/' || can_write::text FROM public.load_dashboard_v2((SELECT dashboard_id FROM tmp_dash_created))),
  'Team Board 1/team/false',
  'Viewer A1 (Mitglied) laedt Dashboard mit can_write = false'
);

-- 16. Viewer A2 (Nicht-Mitglied) laedt Dashboard -> LP_DASHBOARD_NOT_FOUND
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000005","role":"authenticated"}', true);
SELECT throws_ok(
  format('SELECT * FROM public.load_dashboard_v2(%L::uuid)', (SELECT dashboard_id FROM tmp_dash_created)),
  'P0002',
  'LP_DASHBOARD_NOT_FOUND',
  'Viewer A2 (Nicht-Mitglied) sieht LP_DASHBOARD_NOT_FOUND'
);

-- 17. Suspended Manager A3 laedt Dashboard -> LP_AUTH_REQUIRED
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000006","role":"authenticated"}', true);
SELECT throws_ok(
  format('SELECT * FROM public.load_dashboard_v2(%L::uuid)', (SELECT dashboard_id FROM tmp_dash_created)),
  '42501',
  'LP_AUTH_REQUIRED',
  'Gesperrter Manager hat keine aktive Mitgliedschaft und scheitert mit LP_AUTH_REQUIRED'
);

-- 18. Manager A1 speichert Aenderungen (Revision 1 -> 2)
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000002","role":"authenticated"}', true);
CREATE TEMP TABLE tmp_dash_saved AS
SELECT * FROM public.save_dashboard_v2(
  (SELECT dashboard_id FROM tmp_dash_created),
  'Team Board 1 Updated',
  jsonb_build_object('version', 2, 'title', 'Team Board 1 Updated', 'scope', 'team', 'teamId', (SELECT id::text FROM tmp_team_created), 'ownerUserId', '9f620000-0000-0000-0000-000000000002', 'organizationId', 'af620000-0000-0000-0000-00000000000a', 'globalTimeframe', 'aktuell', 'tiles', '[]'::jsonb),
  1,
  'Zweite Revision'
);

SELECT is(
  (SELECT revision FROM tmp_dash_saved),
  2,
  'Manager A1 speichert erfolgreich Revision 2'
);

-- 19. Viewer A1 versucht zu speichern -> LP_TEAM_ACCESS_REVOKED
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT throws_ok(
  format(
    'SELECT * FROM public.save_dashboard_v2(%L::uuid, ''Team Board Viewer Edit'', jsonb_build_object(''version'', 2, ''title'', ''Team Board Viewer Edit'', ''scope'', ''team'', ''teamId'', %L, ''ownerUserId'', ''9f620000-0000-0000-0000-000000000004'', ''organizationId'', ''af620000-0000-0000-0000-00000000000a'', ''globalTimeframe'', ''aktuell'', ''tiles'', ''[]''::jsonb), 2)',
    (SELECT dashboard_id FROM tmp_dash_created),
    (SELECT id::text FROM tmp_team_created)
  ),
  '42501',
  'LP_TEAM_ACCESS_REVOKED',
  'Viewer-Mitglied scheitert beim Speichern mit LP_TEAM_ACCESS_REVOKED'
);

-- 20. Manager A2 (Nicht-Mitglied) versucht zu speichern -> LP_DASHBOARD_NOT_FOUND
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT throws_ok(
  format(
    'SELECT * FROM public.save_dashboard_v2(%L::uuid, ''Non Member Edit'', jsonb_build_object(''version'', 2, ''title'', ''Non Member Edit'', ''scope'', ''team'', ''teamId'', %L, ''ownerUserId'', ''9f620000-0000-0000-0000-000000000003'', ''organizationId'', ''af620000-0000-0000-0000-00000000000a'', ''globalTimeframe'', ''aktuell'', ''tiles'', ''[]''::jsonb), 2)',
    (SELECT dashboard_id FROM tmp_dash_created),
    (SELECT id::text FROM tmp_team_created)
  ),
  'P0002',
  'LP_DASHBOARD_NOT_FOUND',
  'Nicht-Mitglied scheitert beim Speichern mit LP_DASHBOARD_NOT_FOUND'
);

-- ============================================================================
-- Tests 21..30: Mandantentrennung, Rechteentzug, Reihenfolge, Austritt, Revisionen
-- ============================================================================

-- 21. Mandantentrennung: Admin B aus Org B sieht und laedt nichts aus Org A
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000007","role":"authenticated"}', true);
SELECT throws_ok(
  format('SELECT * FROM public.load_dashboard_v2(%L::uuid)', (SELECT dashboard_id FROM tmp_dash_created)),
  'P0002',
  'LP_DASHBOARD_NOT_FOUND',
  'Admin aus Org B sieht Dashboard aus Org A nicht'
);

-- 22. Rechteentzug: Admin entfernt Manager A1 -> naechstes Speichern LP_DASHBOARD_NOT_FOUND (da kein Leserecht mehr)
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT ok(
  public.remove_dashboard_team_member_v2((SELECT id FROM tmp_team_created), '9f620000-0000-0000-0000-000000000002'),
  'Manager A1 aus Team A1 entfernt'
);

SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT throws_ok(
  format(
    'SELECT * FROM public.save_dashboard_v2(%L::uuid, ''Versuch nach Entzug'', jsonb_build_object(''version'', 2, ''title'', ''Versuch nach Entzug'', ''scope'', ''team'', ''teamId'', %L, ''ownerUserId'', ''9f620000-0000-0000-0000-000000000002'', ''organizationId'', ''af620000-0000-0000-0000-00000000000a'', ''globalTimeframe'', ''aktuell'', ''tiles'', ''[]''::jsonb), 2)',
    (SELECT dashboard_id FROM tmp_dash_created),
    (SELECT id::text FROM tmp_team_created)
  ),
  'P0002',
  'LP_DASHBOARD_NOT_FOUND',
  'Nach Entfernen aus dem Team ist das Dashboard nicht mehr auffindbar'
);

-- 23. Reihenfolge: Bei entzogenem Schreibrecht (z.B. Viewer) mit veralteter Revision kommt LP_TEAM_ACCESS_REVOKED vor LP_DASHBOARD_CONFLICT
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT throws_ok(
  format(
    'SELECT * FROM public.save_dashboard_v2(%L::uuid, ''Viewer Konflikt Test'', jsonb_build_object(''version'', 2, ''title'', ''Viewer Konflikt Test'', ''scope'', ''team'', ''teamId'', %L, ''ownerUserId'', ''9f620000-0000-0000-0000-000000000004'', ''organizationId'', ''af620000-0000-0000-0000-00000000000a'', ''globalTimeframe'', ''aktuell'', ''tiles'', ''[]''::jsonb), 999)',
    (SELECT dashboard_id FROM tmp_dash_created),
    (SELECT id::text FROM tmp_team_created)
  ),
  '42501',
  'LP_TEAM_ACCESS_REVOKED',
  'Rechtepruefung scheitert mit LP_TEAM_ACCESS_REVOKED vor Konfliktpruefung'
);

-- Manager A1 wieder hinzufuegen
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT ok(
  public.add_dashboard_team_member_v2((SELECT id FROM tmp_team_created), '9f620000-0000-0000-0000-000000000002'),
  'Manager A1 wieder hinzugefuegt'
);

-- 24. Konfliktpruefung: Berechtigter Nutzer mit falscher expected_revision erhaelt LP_DASHBOARD_CONFLICT
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT throws_ok(
  format(
    'SELECT * FROM public.save_dashboard_v2(%L::uuid, ''Konflikt Test'', jsonb_build_object(''version'', 2, ''title'', ''Konflikt Test'', ''scope'', ''team'', ''teamId'', %L, ''ownerUserId'', ''9f620000-0000-0000-0000-000000000002'', ''organizationId'', ''af620000-0000-0000-0000-00000000000a'', ''globalTimeframe'', ''aktuell'', ''tiles'', ''[]''::jsonb), 1)',
    (SELECT dashboard_id FROM tmp_dash_created),
    (SELECT id::text FROM tmp_team_created)
  ),
  'P0001',
  'LP_DASHBOARD_CONFLICT',
  'Schreibberechtigter erhaelt LP_DASHBOARD_CONFLICT bei Revisionsabweichung'
);

-- 25. Ersteller-Austritt: Ersteller Manager A1 wird entfernt, aber Dashboard bleibt und Admin speichert erfolgreich
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT ok(
  public.remove_dashboard_team_member_v2((SELECT id FROM tmp_team_created), '9f620000-0000-0000-0000-000000000002'),
  'Ersteller Manager A1 endgueltig aus Team entfernt'
);

CREATE TEMP TABLE tmp_admin_saved AS
SELECT * FROM public.save_dashboard_v2(
  (SELECT dashboard_id FROM tmp_dash_created),
  'Admin Saved After Creator Left',
  jsonb_build_object('version', 2, 'title', 'Admin Saved After Creator Left', 'scope', 'team', 'teamId', (SELECT id::text FROM tmp_team_created), 'ownerUserId', '9f620000-0000-0000-0000-000000000001', 'organizationId', 'af620000-0000-0000-0000-00000000000a', 'globalTimeframe', 'aktuell', 'tiles', '[]'::jsonb),
  2,
  'Admin Uebernahme'
);

SELECT is(
  (SELECT revision::text || '/' || (SELECT created_by_user_id::text FROM public.dashboards WHERE id = (SELECT dashboard_id FROM tmp_dash_created)) FROM tmp_admin_saved),
  '3/9f620000-0000-0000-0000-000000000002',
  'Dashboard bleibt erhalten, Admin speichert Revision 3, created_by_user_id unveraendert'
);

-- Manager A2 als Mitglied hinzufuegen
SELECT ok(
  public.add_dashboard_team_member_v2((SELECT id FROM tmp_team_created), '9f620000-0000-0000-0000-000000000003'),
  'Manager A2 zu Team A1 hinzugefuegt'
);

-- 26. Rollenwechsel: Manager A2 zu viewer degradiert -> naechstes Speichern scheitert mit LP_TEAM_ACCESS_REVOKED
RESET ROLE;
UPDATE public.organization_members
SET role = 'viewer'
WHERE user_id = '9f620000-0000-0000-0000-000000000003' AND organization_id = 'af620000-0000-0000-0000-00000000000a';
SET ROLE authenticated;

SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT throws_ok(
  format(
    'SELECT * FROM public.save_dashboard_v2(%L::uuid, ''Degradierter Manager Speichern'', jsonb_build_object(''version'', 2, ''title'', ''Degradierter Manager Speichern'', ''scope'', ''team'', ''teamId'', %L, ''ownerUserId'', ''9f620000-0000-0000-0000-000000000003'', ''organizationId'', ''af620000-0000-0000-0000-00000000000a'', ''globalTimeframe'', ''aktuell'', ''tiles'', ''[]''::jsonb), 3)',
    (SELECT dashboard_id FROM tmp_dash_created),
    (SELECT id::text FROM tmp_team_created)
  ),
  '42501',
  'LP_TEAM_ACCESS_REVOKED',
  'Degradierter Manager (jetzt Viewer) erhaelt LP_TEAM_ACCESS_REVOKED'
);

-- 27. Config-Bindung: Speichern mit manipulierter config traegt die Zeilenwerte
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000001","role":"authenticated"}', true);

CREATE TEMP TABLE tmp_bound_saved AS
SELECT * FROM public.save_dashboard_v2(
  (SELECT dashboard_id FROM tmp_dash_created),
  'Bound Config Test',
  jsonb_build_object('version', 2, 'title', 'Bound Config Test', 'scope', 'personal', 'teamId', '00000000-0000-0000-0000-000000000000', 'ownerUserId', '9f620000-0000-0000-0000-000000000001', 'organizationId', 'af620000-0000-0000-0000-00000000000a', 'globalTimeframe', 'aktuell', 'tiles', '[]'::jsonb),
  3
);

SELECT is(
  (SELECT (config->>'scope') || ':' || (config->>'teamId') FROM public.dashboards WHERE id = (SELECT dashboard_id FROM tmp_dash_created)),
  'team:' || (SELECT id::text FROM tmp_team_created),
  'Config-Felder scope und teamId werden serverseitig aus der Zeile gebunden'
);

-- 28. get_dashboard_v2_revisions: Admin und Viewer A1 lesen Revisionen, Nicht-Mitglied scheitert
SELECT is(
  (SELECT count(*)::integer FROM public.get_dashboard_v2_revisions((SELECT dashboard_id FROM tmp_dash_created))),
  4,
  'Admin liest 4 Revisionen des Team-Dashboards'
);
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT is(
  (SELECT count(*)::integer FROM public.get_dashboard_v2_revisions((SELECT dashboard_id FROM tmp_dash_created))),
  4,
  'Viewer A1 (Mitglied) liest 4 Revisionen des Team-Dashboards'
);
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000005","role":"authenticated"}', true);
SELECT throws_ok(
  format('SELECT * FROM public.get_dashboard_v2_revisions(%L::uuid)', (SELECT dashboard_id FROM tmp_dash_created)),
  'P0002',
  'LP_DASHBOARD_NOT_FOUND',
  'Viewer A2 (Nicht-Mitglied) erhaelt LP_DASHBOARD_NOT_FOUND bei Revisionsabfrage'
);

-- 29. restore_dashboard_revision_v2 als Admin
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000001","role":"authenticated"}', true);

CREATE TEMP TABLE tmp_restored AS
SELECT * FROM public.restore_dashboard_revision_v2(
  (SELECT dashboard_id FROM tmp_dash_created),
  1,
  4
);

SELECT is(
  (SELECT new_revision::text || '/' || (SELECT title FROM public.dashboards WHERE id = (SELECT dashboard_id FROM tmp_dash_created)) FROM tmp_restored),
  '5/Team Board 1',
  'Revision 1 wird erfolgreich als Revision 5 wiederhergestellt'
);

-- 30. restore_dashboard_revision_v2 als Viewer A1 -> LP_TEAM_ACCESS_REVOKED
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT throws_ok(
  format('SELECT * FROM public.restore_dashboard_revision_v2(%L::uuid, 1, 5)', (SELECT dashboard_id FROM tmp_dash_created)),
  '42501',
  'LP_TEAM_ACCESS_REVOKED',
  'Viewer-Mitglied scheitert bei Wiederherstellung mit LP_TEAM_ACCESS_REVOKED'
);

-- ============================================================================
-- Tests 31..40: Kopieren, Listen, Loeschen, Obergrenzen, RLS, Audit
-- ============================================================================

-- 31. copy_dashboard_v2: Team -> persoenlich als Viewer A1
CREATE TEMP TABLE tmp_copied_pers AS
SELECT * FROM public.copy_dashboard_v2(
  (SELECT dashboard_id FROM tmp_dash_created),
  'personal',
  NULL,
  'Meine persoenliche Kopie'
);

SELECT is(
  (SELECT revision::text || '/' || (SELECT change_summary FROM public.dashboard_revisions WHERE dashboard_id = (SELECT dashboard_id FROM tmp_copied_pers)) FROM tmp_copied_pers),
  '1/Kopie von Team Board 1',
  'Viewer kann Team-Dashboard in persoenliches Dashboard kopieren (Revision 1)'
);

-- 32. copy_dashboard_v2: persoenlich -> Team als Admin
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000001","role":"authenticated"}', true);

CREATE TEMP TABLE tmp_admin_pers_created AS
SELECT * FROM public.create_dashboard_v2(
  'Admin Persönlich',
  jsonb_build_object('version', 2, 'title', 'Admin Persönlich', 'scope', 'personal', 'ownerUserId', '9f620000-0000-0000-0000-000000000001', 'organizationId', 'af620000-0000-0000-0000-00000000000a', 'globalTimeframe', 'aktuell', 'tiles', '[]'::jsonb),
  'personal'
);

CREATE TEMP TABLE tmp_copied_team AS
SELECT * FROM public.copy_dashboard_v2(
  (SELECT dashboard_id FROM tmp_admin_pers_created),
  'team',
  (SELECT id FROM tmp_team_created),
  'Kopiertes Team Board'
);

SELECT is(
  (SELECT revision::text || '/' || (SELECT scope FROM public.dashboards WHERE id = (SELECT dashboard_id FROM tmp_copied_team)) FROM tmp_copied_team),
  '1/team',
  'Persoenliches Dashboard kann in Team kopiert werden'
);

-- 33. copy_dashboard_v2 Titelregel (1-80 Zeichen)
SELECT throws_ok(
  format('SELECT * FROM public.copy_dashboard_v2(%L::uuid, ''personal'', NULL, '''')', (SELECT dashboard_id FROM tmp_admin_pers_created)),
  '22023',
  'LP_DASHBOARD_INVALID: title must be 1-80 characters',
  'Leerer Kopiertitel wird abgewiesen'
);

-- 34. list_accessible_dashboards_v2 listet eigene persoenliche + zugaengliche Team-Dashboards
SELECT is(
  (SELECT count(*)::integer FROM public.list_accessible_dashboards_v2()),
  3,
  'Admin sieht eigenes persoenliches + 2 Team-Dashboards'
);

-- 35. delete_dashboard_team_v2 verweigert Loeschen, solange Dashboards vorhanden sind
SELECT throws_ok(
  format('SELECT public.delete_dashboard_team_v2(%L::uuid)', (SELECT id FROM tmp_team_created)),
  '22023',
  'LP_TEAM_HAS_DASHBOARDS',
  'Team mit Dashboards kann nicht geloescht werden'
);

-- 36. delete_team_dashboard_v2 loescht Team-Dashboard und Revisionen
SELECT is(
  (SELECT count(*)::integer FROM public.delete_team_dashboard_v2((SELECT dashboard_id FROM tmp_dash_created), 5)),
  1,
  'Team-Dashboard wird erfolgreich geloescht'
);
SELECT is(
  (SELECT count(*)::integer FROM public.dashboard_revisions WHERE dashboard_id = (SELECT dashboard_id FROM tmp_dash_created)),
  0,
  'Revisionen des geloeschten Team-Dashboards wurden mitgeloescht'
);

-- 37. delete_dashboard_team_v2 ohne Dashboards (zuerst das 2. Board ueber RPC loeschen)
SELECT is(
  (SELECT count(*)::integer FROM public.delete_team_dashboard_v2((SELECT dashboard_id FROM tmp_copied_team), 1)),
  1,
  'Zweites Team-Dashboard ueber RPC geloescht'
);

SELECT ok(
  public.delete_dashboard_team_v2((SELECT id FROM tmp_team_created)),
  'Team ohne Dashboards kann geloescht werden'
);

-- 38. RLS Direktpruefung: Mutation als authenticated scheitert
SELECT throws_matching(
  $$ INSERT INTO public.dashboard_teams (organization_id, name) VALUES ('af620000-0000-0000-0000-00000000000a', 'Hacked') $$,
  'permission denied',
  'Direktes INSERT auf dashboard_teams scheitert per RLS / Revoke'
);

-- 39. Team-Dashboard Obergrenze (50): neues Team anlegen und simulieren
CREATE TEMP TABLE tmp_limit_team AS
SELECT * FROM public.create_dashboard_team_v2('Limit Team', 'Test Limit');

-- 50 Dashboards simulieren
RESET ROLE;
INSERT INTO public.dashboards (id, organization_id, scope, team_id, title, config, revision, created_by_user_id)
SELECT
  gen_random_uuid(),
  'af620000-0000-0000-0000-00000000000a',
  'team',
  (SELECT id FROM tmp_limit_team),
  'Board ' || i,
  jsonb_build_object('version', 2, 'title', 'Board ' || i, 'scope', 'team', 'teamId', (SELECT id::text FROM tmp_limit_team), 'ownerUserId', '9f620000-0000-0000-0000-000000000001', 'organizationId', 'af620000-0000-0000-0000-00000000000a', 'globalTimeframe', 'aktuell', 'tiles', '[]'::jsonb),
  1,
  '9f620000-0000-0000-0000-000000000001'
FROM generate_series(1, 50) i;
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"9f620000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT throws_ok(
  format(
    'SELECT * FROM public.create_dashboard_v2(''Board 51'', jsonb_build_object(''version'', 2, ''title'', ''Board 51'', ''scope'', ''team'', ''teamId'', %L, ''ownerUserId'', ''9f620000-0000-0000-0000-000000000001'', ''organizationId'', ''af620000-0000-0000-0000-00000000000a'', ''globalTimeframe'', ''aktuell'', ''tiles'', ''[]''::jsonb), ''team'', %L::uuid)',
    (SELECT id::text FROM tmp_limit_team),
    (SELECT id::text FROM tmp_limit_team)
  ),
  '22023',
  'LP_TEAM_DASHBOARD_LIMIT',
  '51. Team-Dashboard scheitert an Obergrenze 50'
);

-- 40. Audit-Log Eintraege verifizieren
SELECT ok(
  EXISTS (SELECT 1 FROM public.audit_log WHERE action = 'dashboard.team.created' AND organization_id = 'af620000-0000-0000-0000-00000000000a')
  AND EXISTS (SELECT 1 FROM public.audit_log WHERE action = 'dashboard.team.updated' AND organization_id = 'af620000-0000-0000-0000-00000000000a')
  AND EXISTS (SELECT 1 FROM public.audit_log WHERE action = 'dashboard.team.member_added' AND organization_id = 'af620000-0000-0000-0000-00000000000a')
  AND EXISTS (SELECT 1 FROM public.audit_log WHERE action = 'dashboard.team.member_removed' AND organization_id = 'af620000-0000-0000-0000-00000000000a')
  AND EXISTS (SELECT 1 FROM public.audit_log WHERE action = 'dashboard.copied' AND organization_id = 'af620000-0000-0000-0000-00000000000a')
  AND EXISTS (SELECT 1 FROM public.audit_log WHERE action = 'dashboard.team_dashboard.deleted' AND organization_id = 'af620000-0000-0000-0000-00000000000a')
  AND EXISTS (SELECT 1 FROM public.audit_log WHERE action = 'dashboard.team.deleted' AND organization_id = 'af620000-0000-0000-0000-00000000000a'),
  'Alle erwarteten Audit-Log Actions wurden erzeugt'
);

SELECT * FROM finish();
ROLLBACK;
