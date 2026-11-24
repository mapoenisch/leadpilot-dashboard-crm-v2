-- pgTAP-Tests für Auftrag 174 (P16b): gestufte Umstellung auf den neuen Editor.
-- Prüft: Schalter je Organisation nur per SQL (keine Schreibrechte für angemeldete Nutzer),
-- Mitglieder lesen nur die eigene Organisation, Umstellung nur mit gültiger Entscheidung,
-- Fixierung nach der Umstellung, Rückweg ohne Datenverlust, Admin-Übersicht nur für Admins.

BEGIN;

SELECT plan(43);
SET CONSTRAINTS ALL IMMEDIATE;

-- ---------------------------------------------------------------- Setup --
-- Org A: af740000-...0a, Org B: af740000-...0b
INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('af740000-0000-0000-0000-00000000000a', 'Org A (Umstellung Test)', 'synthetic', 'active'),
  ('af740000-0000-0000-0000-00000000000b', 'Org B (Umstellung Test)', 'synthetic', 'active');

-- 01 Admin A, 02 Manager A
-- 11 gleich, 12 v1_geaendert ohne Entscheidung, 13 beide_geaendert ohne Entscheidung,
-- 14 keine_kopie, 15 nur_v2, 16 v1_geaendert mit gültiger Entscheidung "v2_behalten",
-- 17 v1_geaendert mit verfallener Entscheidung, 18 beide_geaendert mit "spaeter",
-- 19 ohne jeden Stand, 21 Admin B, 22 Viewer B
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('9f740000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin-a@umstellung.local', 'x', now()),
  ('9f740000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'mgr-a@umstellung.local', 'x', now()),
  ('9f740000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'u11@umstellung.local', 'x', now()),
  ('9f740000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', 'u12@umstellung.local', 'x', now()),
  ('9f740000-0000-0000-0000-000000000013', 'authenticated', 'authenticated', 'u13@umstellung.local', 'x', now()),
  ('9f740000-0000-0000-0000-000000000014', 'authenticated', 'authenticated', 'u14@umstellung.local', 'x', now()),
  ('9f740000-0000-0000-0000-000000000015', 'authenticated', 'authenticated', 'u15@umstellung.local', 'x', now()),
  ('9f740000-0000-0000-0000-000000000016', 'authenticated', 'authenticated', 'u16@umstellung.local', 'x', now()),
  ('9f740000-0000-0000-0000-000000000017', 'authenticated', 'authenticated', 'u17@umstellung.local', 'x', now()),
  ('9f740000-0000-0000-0000-000000000018', 'authenticated', 'authenticated', 'u18@umstellung.local', 'x', now()),
  ('9f740000-0000-0000-0000-000000000019', 'authenticated', 'authenticated', 'u19@umstellung.local', 'x', now()),
  ('9f740000-0000-0000-0000-000000000021', 'authenticated', 'authenticated', 'admin-b@umstellung.local', 'x', now()),
  ('9f740000-0000-0000-0000-000000000022', 'authenticated', 'authenticated', 'view-b@umstellung.local', 'x', now());

INSERT INTO public.organization_members (user_id, organization_id, role, status)
SELECT u.id::uuid, 'af740000-0000-0000-0000-00000000000a', r.role, 'active'
FROM (VALUES
  ('9f740000-0000-0000-0000-000000000001', 'admin'),
  ('9f740000-0000-0000-0000-000000000002', 'manager'),
  ('9f740000-0000-0000-0000-000000000011', 'viewer'),
  ('9f740000-0000-0000-0000-000000000012', 'viewer'),
  ('9f740000-0000-0000-0000-000000000013', 'viewer'),
  ('9f740000-0000-0000-0000-000000000014', 'viewer'),
  ('9f740000-0000-0000-0000-000000000015', 'viewer'),
  ('9f740000-0000-0000-0000-000000000016', 'viewer'),
  ('9f740000-0000-0000-0000-000000000017', 'viewer'),
  ('9f740000-0000-0000-0000-000000000018', 'viewer'),
  ('9f740000-0000-0000-0000-000000000019', 'viewer')
) AS r(uid, role)
JOIN auth.users AS u ON u.id = r.uid::uuid;

INSERT INTO public.organization_members (user_id, organization_id, role, status)
VALUES
  ('9f740000-0000-0000-0000-000000000021', 'af740000-0000-0000-0000-00000000000b', 'admin', 'active'),
  ('9f740000-0000-0000-0000-000000000022', 'af740000-0000-0000-0000-00000000000b', 'viewer', 'active');

CREATE FUNCTION pg_temp.v2cfg(p_user TEXT, p_last INTEGER)
RETURNS JSONB LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'version', 2, 'title', 'Executive Dashboard', 'scope', 'personal',
    'ownerUserId', p_user, 'organizationId', 'af740000-0000-0000-0000-00000000000a',
    'globalTimeframe', 'monat', 'tiles', '[]'::jsonb,
    'metadata', jsonb_build_object(
      'migrated_from_v1', true, 'last_migrated_revision', p_last, 'user_edited', false
    )
  )
$$;

-- V1-Revisionen: 11->3, 12->5, 13->4, 14->2, 16->5, 17->5, 18->4
INSERT INTO public.executive_dashboard_preferences (organization_id, user_id, config, schema_version, revision, updated_at)
SELECT 'af740000-0000-0000-0000-00000000000a', v.uid::uuid, '{"version":1,"tiles":[]}', 1, v.rev, '2026-11-20 10:00:00+00'
FROM (VALUES
  ('9f740000-0000-0000-0000-000000000011', 3),
  ('9f740000-0000-0000-0000-000000000012', 5),
  ('9f740000-0000-0000-0000-000000000013', 4),
  ('9f740000-0000-0000-0000-000000000014', 2),
  ('9f740000-0000-0000-0000-000000000016', 5),
  ('9f740000-0000-0000-0000-000000000017', 5),
  ('9f740000-0000-0000-0000-000000000018', 4)
) AS v(uid, rev);

-- V2-Kopien (ID-Endung = Nutzer): Revision, kopiert bei V1-Revision
INSERT INTO public.dashboards (id, organization_id, scope, user_id, title, created_by_user_id, revision, config)
SELECT ('d7740000-0000-0000-0000-0000000000' || v.n)::uuid, 'af740000-0000-0000-0000-00000000000a', 'personal',
  ('9f740000-0000-0000-0000-0000000000' || v.n)::uuid, 'Executive Dashboard',
  ('9f740000-0000-0000-0000-0000000000' || v.n)::uuid, v.rev,
  pg_temp.v2cfg('9f740000-0000-0000-0000-0000000000' || v.n, v.last)
FROM (VALUES
  ('11', 4, 3),  -- gleich
  ('12', 1, 2),  -- v1_geaendert
  ('13', 3, 1),  -- beide_geaendert
  ('15', 1, 1),  -- nur_v2
  ('16', 1, 2),  -- v1_geaendert
  ('17', 1, 2),  -- v1_geaendert
  ('18', 2, 1)   -- beide_geaendert
) AS v(n, rev, last);

-- Entscheidungen: 16 gültig (passt zu V1 5 / V2 1), 17 verfallen (V1 war 4), 18 "spaeter"
INSERT INTO public.dashboard_rollout_decisions (organization_id, user_id, ergebnis_klasse, entscheidung, v1_revision, v2_revision, dashboard_id)
VALUES
  ('af740000-0000-0000-0000-00000000000a', '9f740000-0000-0000-0000-000000000016', 'v1_geaendert', 'v2_behalten', 5, 1, 'd7740000-0000-0000-0000-000000000016'),
  ('af740000-0000-0000-0000-00000000000a', '9f740000-0000-0000-0000-000000000017', 'v1_geaendert', 'v2_behalten', 4, 1, 'd7740000-0000-0000-0000-000000000017'),
  ('af740000-0000-0000-0000-00000000000a', '9f740000-0000-0000-0000-000000000018', 'beide_geaendert', 'spaeter', 4, 2, 'd7740000-0000-0000-0000-000000000018');

CREATE FUNCTION pg_temp.as_user(p_user TEXT) RETURNS VOID LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
GRANT EXECUTE ON FUNCTION pg_temp.as_user(TEXT) TO authenticated;

CREATE FUNCTION pg_temp.editor_of(p_user TEXT) RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE v TEXT;
BEGIN
  PERFORM pg_temp.as_user(p_user);
  SELECT s.editor INTO v FROM public.dashboard_editor_rollout_status() AS s;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.editor_of(TEXT) TO authenticated;

-- ======================================================== 1..4 Struktur
SELECT has_table('public', 'dashboard_editor_rollout', 'Tabelle dashboard_editor_rollout existiert');
SELECT has_table('public', 'dashboard_editor_switches', 'Tabelle dashboard_editor_switches existiert');
SELECT has_function('public', 'dashboard_editor_rollout_status', 'Status-RPC existiert');
SELECT has_function('public', 'dashboard_editor_rollout_overview', 'Admin-Übersicht existiert');

-- ======================================================== 5..10 Rechte am Schalter
SET ROLE authenticated;
SELECT pg_temp.as_user('9f740000-0000-0000-0000-000000000001');
SELECT throws_ok(
  $$ INSERT INTO public.dashboard_editor_rollout (organization_id, stufe) VALUES ('af740000-0000-0000-0000-00000000000a', 1) $$,
  '42501', NULL, 'Org-Admin kann den Schalter nicht anlegen'
);
SELECT is((SELECT count(*)::int FROM public.dashboard_editor_rollout), 0, 'Ohne Zeile: Admin liest keine Stufe');
RESET ROLE;

-- Marc schaltet per SQL: Org A Stufe 1, Org B bleibt ohne Zeile (Stufe 0)
INSERT INTO public.dashboard_editor_rollout (organization_id, stufe, notiz)
VALUES ('af740000-0000-0000-0000-00000000000a', 1, 'Test-Organisation');

SELECT isnt((SELECT aktiviert_at FROM public.dashboard_editor_rollout WHERE organization_id = 'af740000-0000-0000-0000-00000000000a'), NULL, 'aktiviert_at wird gesetzt');

SET ROLE authenticated;
SELECT pg_temp.as_user('9f740000-0000-0000-0000-000000000001');
SELECT throws_ok(
  $$ UPDATE public.dashboard_editor_rollout SET stufe = 3 $$,
  '42501', NULL, 'Org-Admin kann die Stufe nicht ändern'
);
SELECT is((SELECT count(*)::int FROM public.dashboard_editor_rollout), 1, 'Mitglied A liest die eigene Stufe');
SELECT pg_temp.as_user('9f740000-0000-0000-0000-000000000022');
SELECT is((SELECT count(*)::int FROM public.dashboard_editor_rollout), 0, 'Mitglied B liest die Stufe von Org A nicht');

-- ======================================================== 11..13 Keine direkten Umstellungsdaten
SELECT throws_ok(
  $$ SELECT * FROM public.dashboard_editor_switches $$,
  '42501', NULL, 'Umstellungen sind nicht direkt lesbar'
);
SELECT throws_ok(
  $$ INSERT INTO public.dashboard_editor_switches (organization_id, user_id) VALUES ('af740000-0000-0000-0000-00000000000b', '9f740000-0000-0000-0000-000000000022') $$,
  '42501', NULL, 'Umstellungen sind nicht direkt schreibbar'
);
SELECT throws_ok(
  $$ SELECT public.dashboard_editor_switch_allowed('gleich', NULL, NULL) $$,
  '42501', NULL, 'Hilfsfunktion ist nicht öffentlich'
);

-- ======================================================== 14..15 Org B (Stufe 0) bleibt V1
SELECT is(pg_temp.editor_of('9f740000-0000-0000-0000-000000000022'), 'v1', 'Org ohne Stufe: alter Editor');
SELECT is((SELECT stufe FROM public.dashboard_editor_rollout_status()), 0, 'Org ohne Zeile meldet Stufe 0');

-- ======================================================== Probelauf ohne Umstellung
SELECT pg_temp.as_user('9f740000-0000-0000-0000-000000000011');
SELECT is((SELECT editor || '/' || grund FROM public.dashboard_editor_rollout_status(false)), 'v2/umstellbar', 'Probelauf meldet umstellbar');
SELECT is((SELECT umgestellt_at FROM public.dashboard_editor_rollout_status(false)), NULL, 'Probelauf stellt nicht um');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.dashboard_editor_switches), 0, 'Probelauf schreibt keine Umstellung');
SET ROLE authenticated;

-- ======================================================== 16..24 Org A Stufe 1: Umstellung je Klasse
SELECT is(pg_temp.editor_of('9f740000-0000-0000-0000-000000000011'), 'v2', 'gleich -> neuer Editor');
SELECT is(pg_temp.editor_of('9f740000-0000-0000-0000-000000000012'), 'v1', 'v1_geaendert ohne Entscheidung -> alter Editor');
SELECT is((SELECT grund FROM public.dashboard_editor_rollout_status()), 'entscheidung_fehlt', 'Grund: Entscheidung fehlt');
SELECT is(pg_temp.editor_of('9f740000-0000-0000-0000-000000000013'), 'v2', 'beide_geaendert ohne Entscheidung -> Pilot behalten (Marc 23.11.)');
SELECT is(pg_temp.editor_of('9f740000-0000-0000-0000-000000000014'), 'v2', 'keine_kopie -> neuer Editor (Kopie beim Öffnen)');
SELECT is(pg_temp.editor_of('9f740000-0000-0000-0000-000000000015'), 'v2', 'nur_v2 -> neuer Editor');
SELECT is(pg_temp.editor_of('9f740000-0000-0000-0000-000000000016'), 'v2', 'v1_geaendert mit gültiger Entscheidung -> neuer Editor');
SELECT is(pg_temp.editor_of('9f740000-0000-0000-0000-000000000017'), 'v1', 'verfallene Entscheidung -> alter Editor');
SELECT is((SELECT grund FROM public.dashboard_editor_rollout_status()), 'entscheidung_verfallen', 'Grund: Entscheidung verfallen');

-- ======================================================== 25..26
SELECT is(pg_temp.editor_of('9f740000-0000-0000-0000-000000000018'), 'v1', 'beide_geaendert mit "später" -> alter Editor');
SELECT is(pg_temp.editor_of('9f740000-0000-0000-0000-000000000019'), 'v2', 'ohne jeden Stand -> neuer Editor');

-- ======================================================== 27..30 Fixierung nach Umstellung
SELECT pg_temp.as_user('9f740000-0000-0000-0000-000000000016');
SELECT isnt((SELECT umgestellt_at FROM public.dashboard_editor_rollout_status()), NULL, 'umgestellt_at ist dokumentiert');
RESET ROLE;
-- Weitere Bearbeitung in V2 und in V1 nach der Umstellung: Entscheidung wäre jetzt verfallen.
UPDATE public.dashboards SET revision = 2 WHERE id = 'd7740000-0000-0000-0000-000000000016';
UPDATE public.executive_dashboard_preferences SET revision = 6
WHERE user_id = '9f740000-0000-0000-0000-000000000016';
SET ROLE authenticated;
SELECT is(pg_temp.editor_of('9f740000-0000-0000-0000-000000000016'), 'v2', 'Nach Umstellung kein Rückfall durch spätere Bearbeitung');
SELECT is((SELECT grund FROM public.dashboard_editor_rollout_status()), 'umgestellt', 'Grund: umgestellt');
SELECT is(pg_temp.editor_of('9f740000-0000-0000-0000-000000000016'), 'v2', 'Wiederholter Aufruf bleibt stabil');

-- ======================================================== 31..35 Rückweg: Stufe 0
RESET ROLE;
CREATE TEMP TABLE v2_before AS SELECT id, revision, config FROM public.dashboards
WHERE organization_id = 'af740000-0000-0000-0000-00000000000a';
UPDATE public.dashboard_editor_rollout SET stufe = 0 WHERE organization_id = 'af740000-0000-0000-0000-00000000000a';
SET ROLE authenticated;
SELECT is(pg_temp.editor_of('9f740000-0000-0000-0000-000000000011'), 'v1', 'Rückweg: wieder alter Editor');
SELECT is((SELECT grund FROM public.dashboard_editor_rollout_status()), 'rueckweg', 'Grund: Rückweg (zeigt Hinweis)');
SELECT is((SELECT v1_updated_at FROM public.dashboard_editor_rollout_status()), '2026-11-20 10:00:00+00'::timestamptz, 'Stand des alten Editors für den Hinweis');
SELECT is(pg_temp.editor_of('9f740000-0000-0000-0000-000000000012'), 'v1', 'Nie umgestellter Nutzer bleibt alter Editor');
SELECT is((SELECT grund FROM public.dashboard_editor_rollout_status()), 'stufe_0', 'Grund ohne Hinweis: Stufe 0');
RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM public.dashboards AS d JOIN v2_before AS b ON b.id = d.id
   WHERE d.revision = b.revision AND d.config = b.config),
  (SELECT count(*)::int FROM v2_before),
  'Rückweg ändert keine V2-Daten'
);

-- ======================================================== 37..38 Erneutes Aktivieren verliert nichts
UPDATE public.dashboard_editor_rollout SET stufe = 1 WHERE organization_id = 'af740000-0000-0000-0000-00000000000a';
SET ROLE authenticated;
SELECT is(pg_temp.editor_of('9f740000-0000-0000-0000-000000000016'), 'v2', 'Erneut aktiviert: umgestellter Nutzer sofort wieder neuer Editor');

-- ======================================================== 38..40 Admin-Übersicht
SELECT pg_temp.as_user('9f740000-0000-0000-0000-000000000002');
SELECT throws_ok($$ SELECT * FROM public.dashboard_editor_rollout_overview() $$, '42501', 'LP_FORBIDDEN', 'Manager sieht die Übersicht nicht');
SELECT pg_temp.as_user('9f740000-0000-0000-0000-000000000001');
SELECT is(
  (SELECT stufe || '/' || nutzer_v2 || '/' || offene_entscheidungen FROM public.dashboard_editor_rollout_overview()),
  '1/6/3',
  'Übersicht: Stufe 1, 6 umgestellt, 3 offene Entscheidungen (12, 17, 18)'
);
SELECT is(
  (SELECT nutzer_aktiv FROM public.dashboard_editor_rollout_overview()), 11,
  'Übersicht zählt alle aktiven Mitglieder'
);

SELECT * FROM finish();
ROLLBACK;
