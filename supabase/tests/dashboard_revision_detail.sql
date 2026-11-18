-- pgTAP-Tests fuer Auftrag 165 (P12): Dashboard-Revision-Detail und Paging
BEGIN;

SELECT plan(22);
SET CONSTRAINTS ALL IMMEDIATE;

-- Setup Organisationen und Nutzer
INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('af650000-0000-0000-0000-00000000000a', 'Org A (Auftrag 165)', 'synthetic', 'active'),
  ('af650000-0000-0000-0000-00000000000b', 'Org B (Auftrag 165)', 'synthetic', 'active');

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('9f650000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin-a@auftrag165.local', 'x', now()),
  ('9f650000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'mgr-a@auftrag165.local', 'x', now()),
  ('9f650000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'view-a@auftrag165.local', 'x', now()),
  ('9f650000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'outsider-a@auftrag165.local', 'x', now()),
  ('9f650000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'deleted-author@auftrag165.local', 'x', now()),
  ('9f650000-0000-0000-0000-000000000009', 'authenticated', 'authenticated', 'admin-b@auftrag165.local', 'x', now());

INSERT INTO public.organization_members (user_id, organization_id, role, status)
VALUES
  ('9f650000-0000-0000-0000-000000000001', 'af650000-0000-0000-0000-00000000000a', 'admin', 'active'),
  ('9f650000-0000-0000-0000-000000000002', 'af650000-0000-0000-0000-00000000000a', 'manager', 'active'),
  ('9f650000-0000-0000-0000-000000000003', 'af650000-0000-0000-0000-00000000000a', 'viewer', 'active'),
  ('9f650000-0000-0000-0000-000000000004', 'af650000-0000-0000-0000-00000000000a', 'viewer', 'active'),
  ('9f650000-0000-0000-0000-000000000005', 'af650000-0000-0000-0000-00000000000a', 'manager', 'active'),
  ('9f650000-0000-0000-0000-000000000009', 'af650000-0000-0000-0000-00000000000b', 'admin', 'active');

SET ROLE authenticated;

-- Setup Team in Org A
SELECT set_config('request.jwt.claims', '{"sub":"9f650000-0000-0000-0000-000000000001","role":"authenticated"}', true);

CREATE TEMP TABLE tmp_team AS
SELECT id AS team_id FROM public.create_dashboard_team_v2('Vertriebsteam 165', 'Test-Team');

-- Manager A und Viewer A beitreten
SELECT public.add_dashboard_team_member_v2((SELECT team_id FROM tmp_team), '9f650000-0000-0000-0000-000000000002');
SELECT public.add_dashboard_team_member_v2((SELECT team_id FROM tmp_team), '9f650000-0000-0000-0000-000000000003');

-- 1. Manager A legt ein Team-Dashboard an (Revision 1)
SELECT set_config('request.jwt.claims', '{"sub":"9f650000-0000-0000-0000-000000000002","role":"authenticated"}', true);

CREATE TEMP TABLE tmp_team_dash AS
SELECT dashboard_id FROM public.create_dashboard_v2(
  'Team Dashboard Stand 1',
  '{"version":2,"title":"Team Dashboard Stand 1","globalTimeframe":"letzte_30_tage","tiles":[{"id":"t1","catalogId":"baseline.arr","presentation":"zahl","layouts":{"desktop":{"x":0,"y":0,"w":3,"h":3}}}]}'::jsonb,
  'team',
  (SELECT team_id FROM tmp_team)
);

-- Manager A speichert Revision 2
SELECT public.save_dashboard_v2(
  (SELECT dashboard_id FROM tmp_team_dash),
  1,
  'Team Dashboard Stand 2',
  jsonb_build_object(
    'version', 2,
    'title', 'Team Dashboard Stand 2',
    'scope', 'team',
    'teamId', (SELECT team_id::text FROM tmp_team),
    'ownerUserId', '9f650000-0000-0000-0000-000000000002',
    'organizationId', 'af650000-0000-0000-0000-00000000000a',
    'globalTimeframe', 'letzte_30_tage',
    'tiles', jsonb_build_array(
      jsonb_build_object('id', 't1', 'catalogId', 'baseline.arr', 'presentation', 'zahl', 'layouts', jsonb_build_object('desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 3, 'h', 3))),
      jsonb_build_object('id', 't2', 'catalogId', 'baseline.umsatz', 'presentation', 'zahl', 'layouts', jsonb_build_object('desktop', jsonb_build_object('x', 3, 'y', 0, 'w', 3, 'h', 3)))
    )
  ),
  'Zweite Kachel hinzugefuegt'
);

-- Revision 3 von User 5 anlegen (FK im Test deferren/entfernen, damit User 5 später zur Simulation gelöscht werden kann)
RESET ROLE;
ALTER TABLE public.dashboard_revisions DROP CONSTRAINT dashboard_revisions_created_by_user_id_fkey;

INSERT INTO public.dashboard_revisions (
  dashboard_id, organization_id, revision, title, config, created_by_user_id, change_summary
) VALUES (
  (SELECT dashboard_id FROM tmp_team_dash),
  'af650000-0000-0000-0000-00000000000a',
  3,
  'Team Dashboard Stand 3',
  '{"version":2,"title":"Team Dashboard Stand 3","globalTimeframe":"letzte_30_tage","tiles":[]}'::jsonb,
  '9f650000-0000-0000-0000-000000000005',
  'Dritte Revision'
);

UPDATE public.dashboards
SET revision = 3
WHERE id = (SELECT dashboard_id FROM tmp_team_dash);

SET ROLE authenticated;

-- 2. Manager A legt ein persoenliches Dashboard an
SELECT set_config('request.jwt.claims', '{"sub":"9f650000-0000-0000-0000-000000000002","role":"authenticated"}', true);
CREATE TEMP TABLE tmp_pers_dash AS
SELECT dashboard_id FROM public.create_dashboard_v2(
  'Persoenliches Dashboard Manager A',
  '{"version":2,"title":"Persoenliches Dashboard Manager A","globalTimeframe":"letzte_30_tage","tiles":[]}'::jsonb,
  'personal'
);

-- ----------------------------------------------------------------------------
-- Test 1 & 2: Eigenes persoenliches Dashboard lesbar (Page + Detail)
-- ----------------------------------------------------------------------------
SELECT is(
  (SELECT count(*)::integer FROM public.list_dashboard_v2_revisions_page((SELECT dashboard_id FROM tmp_pers_dash))),
  1,
  '1. Eigenes persoenliches Dashboard: Revisionsliste enthaelt 1 Eintrag'
);

SELECT is(
  (SELECT title FROM public.get_dashboard_v2_revision_detail((SELECT dashboard_id FROM tmp_pers_dash), 1)),
  'Persoenliches Dashboard Manager A',
  '2. Eigenes persoenliches Dashboard: Detail liefert Titel der Revision'
);

-- ----------------------------------------------------------------------------
-- Test 3 & 4: Fremdes persoenliches Dashboard abgewiesen (LP_DASHBOARD_NOT_FOUND)
-- ----------------------------------------------------------------------------
-- Viewer A versucht persönliches Dashboard von Manager A zu lesen
SELECT set_config('request.jwt.claims', '{"sub":"9f650000-0000-0000-0000-000000000003","role":"authenticated"}', true);

SELECT throws_matching(
  $$ SELECT * FROM public.list_dashboard_v2_revisions_page((SELECT dashboard_id FROM tmp_pers_dash)) $$,
  'LP_DASHBOARD_NOT_FOUND',
  '3. Fremdes persoenliches Dashboard: list_dashboard_v2_revisions_page wirft LP_DASHBOARD_NOT_FOUND'
);

SELECT throws_matching(
  $$ SELECT * FROM public.get_dashboard_v2_revision_detail((SELECT dashboard_id FROM tmp_pers_dash), 1) $$,
  'LP_DASHBOARD_NOT_FOUND',
  '4. Fremdes persoenliches Dashboard: get_dashboard_v2_revision_detail wirft LP_DASHBOARD_NOT_FOUND'
);

-- ----------------------------------------------------------------------------
-- Test 5 & 6: Viewer-Mitglied darf Team-Dashboard lesen (Page + Detail)
-- ----------------------------------------------------------------------------
SELECT is(
  (SELECT count(*)::integer FROM public.list_dashboard_v2_revisions_page((SELECT dashboard_id FROM tmp_team_dash))),
  3,
  '5. Viewer-Mitglied darf Revisionsliste des Team-Dashboards lesen'
);

SELECT is(
  (SELECT title FROM public.get_dashboard_v2_revision_detail((SELECT dashboard_id FROM tmp_team_dash), 2)),
  'Team Dashboard Stand 2',
  '6. Viewer-Mitglied darf Revision 2 des Team-Dashboards lesen'
);

-- ----------------------------------------------------------------------------
-- Test 7 & 8: Nicht-Mitglied (outsider-a) in derselben Org wird abgewiesen
-- ----------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"sub":"9f650000-0000-0000-0000-000000000004","role":"authenticated"}', true);

SELECT throws_matching(
  $$ SELECT * FROM public.list_dashboard_v2_revisions_page((SELECT dashboard_id FROM tmp_team_dash)) $$,
  'LP_DASHBOARD_NOT_FOUND',
  '7. Nicht-Teammitglied wird bei Revisionsliste abgewiesen'
);

SELECT throws_matching(
  $$ SELECT * FROM public.get_dashboard_v2_revision_detail((SELECT dashboard_id FROM tmp_team_dash), 1) $$,
  'LP_DASHBOARD_NOT_FOUND',
  '8. Nicht-Teammitglied wird bei Detail abgewiesen'
);

-- ----------------------------------------------------------------------------
-- Test 9 & 10: Fremde Organisation (admin-b) wird abgewiesen
-- ----------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"sub":"9f650000-0000-0000-0000-000000000009","role":"authenticated"}', true);

SELECT throws_matching(
  $$ SELECT * FROM public.list_dashboard_v2_revisions_page((SELECT dashboard_id FROM tmp_team_dash)) $$,
  'LP_DASHBOARD_NOT_FOUND',
  '9. Fremde Organisation wird bei Revisionsliste abgewiesen'
);

SELECT throws_matching(
  $$ SELECT * FROM public.get_dashboard_v2_revision_detail((SELECT dashboard_id FROM tmp_team_dash), 1) $$,
  'LP_DASHBOARD_NOT_FOUND',
  '10. Fremde Organisation wird bei Detail abgewiesen'
);

-- ----------------------------------------------------------------------------
-- Test 11..13: Paging und Limit-Pruefung
-- ----------------------------------------------------------------------------
SELECT set_config('request.jwt.claims', '{"sub":"9f650000-0000-0000-0000-000000000002","role":"authenticated"}', true);

SELECT throws_matching(
  $$ SELECT * FROM public.list_dashboard_v2_revisions_page((SELECT dashboard_id FROM tmp_team_dash), NULL, 0) $$,
  'LP_DASHBOARD_INVALID',
  '11. Limit 0 wird abgewiesen'
);

SELECT throws_matching(
  $$ SELECT * FROM public.list_dashboard_v2_revisions_page((SELECT dashboard_id FROM tmp_team_dash), NULL, 101) $$,
  'LP_DASHBOARD_INVALID',
  '12. Limit 101 wird abgewiesen'
);

SELECT is(
  (SELECT array_agg(revision) FROM (
    SELECT revision FROM public.list_dashboard_v2_revisions_page((SELECT dashboard_id FROM tmp_team_dash), 3, 50)
  ) AS p),
  ARRAY[2, 1],
  '13. p_before_revision=3 liefert sauber Revisionen 2 und 1 absteigend'
);

-- ----------------------------------------------------------------------------
-- Test 14 & 15: created_by_is_self
-- ----------------------------------------------------------------------------
-- Manager A (User 2) hat Revision 1 und 2 erstellt, User 5 hat Revision 3
SELECT is(
  (SELECT created_by_is_self FROM public.list_dashboard_v2_revisions_page((SELECT dashboard_id FROM tmp_team_dash)) WHERE revision = 2),
  true,
  '14. Revision 2: created_by_is_self ist true fuer Manager A'
);

SELECT is(
  (SELECT created_by_is_self FROM public.list_dashboard_v2_revisions_page((SELECT dashboard_id FROM tmp_team_dash)) WHERE revision = 3),
  false,
  '15. Revision 3: created_by_is_self ist false fuer Manager A'
);

-- ----------------------------------------------------------------------------
-- Test 16: created_by_name ist fuer alle Leser identisch (E-Mail)
-- ----------------------------------------------------------------------------
SELECT is(
  (SELECT created_by_name FROM public.list_dashboard_v2_revisions_page((SELECT dashboard_id FROM tmp_team_dash)) WHERE revision = 2),
  'mgr-a@auftrag165.local',
  '16. created_by_name liefert E-Mail des Autors'
);

-- ----------------------------------------------------------------------------
-- Test 17 & 18: created_by_active wechselt auf false bei inaktiver Mitgliedschaft
-- ----------------------------------------------------------------------------
SELECT is(
  (SELECT created_by_active FROM public.list_dashboard_v2_revisions_page((SELECT dashboard_id FROM tmp_team_dash)) WHERE revision = 2),
  true,
  '17. created_by_active ist zunaechst true'
);

-- Manager A wird suspendiert
RESET ROLE;
UPDATE public.organization_members
SET status = 'suspended'
WHERE user_id = '9f650000-0000-0000-0000-000000000002';
SET ROLE authenticated;

-- Viewer A liest die Liste: Autor User 2 muss nun created_by_active = false haben
SELECT set_config('request.jwt.claims', '{"sub":"9f650000-0000-0000-0000-000000000003","role":"authenticated"}', true);

SELECT is(
  (SELECT created_by_active FROM public.list_dashboard_v2_revisions_page((SELECT dashboard_id FROM tmp_team_dash)) WHERE revision = 2),
  false,
  '18. created_by_active ist false nach Suspendierung des Mitglieds'
);

-- ----------------------------------------------------------------------------
-- Test 19: Geloeschtes Konto liefert created_by_name = NULL
-- ----------------------------------------------------------------------------
-- User 5 wird aus auth.users geloescht
RESET ROLE;
DELETE FROM auth.users WHERE id = '9f650000-0000-0000-0000-000000000005';
SET ROLE authenticated;

SELECT is(
  (SELECT created_by_name FROM public.list_dashboard_v2_revisions_page((SELECT dashboard_id FROM tmp_team_dash)) WHERE revision = 3),
  NULL::text,
  '19. Geloeschtes Konto liefert created_by_name = NULL'
);

-- ----------------------------------------------------------------------------
-- Test 20: Detail liefert exakte Konfiguration der Revision
-- ----------------------------------------------------------------------------
SELECT is(
  (SELECT (config->'tiles'->1->>'id') FROM public.get_dashboard_v2_revision_detail((SELECT dashboard_id FROM tmp_team_dash), 2)),
  't2',
  '20. get_dashboard_v2_revision_detail liefert exakte Konfiguration von Revision 2'
);

-- ----------------------------------------------------------------------------
-- Test 21: Unbekannte Revision liefert LP_REVISION_NOT_FOUND
-- ----------------------------------------------------------------------------
SELECT throws_matching(
  $$ SELECT * FROM public.get_dashboard_v2_revision_detail((SELECT dashboard_id FROM tmp_team_dash), 999) $$,
  'LP_REVISION_NOT_FOUND',
  '21. Unbekannte Revision wirft LP_REVISION_NOT_FOUND'
);

-- ----------------------------------------------------------------------------
-- Test 22: anon hat kein Ausfuehrungsrecht
-- ----------------------------------------------------------------------------
SET ROLE anon;

SELECT throws_matching(
  $$ SELECT * FROM public.get_dashboard_v2_revision_detail('00000000-0000-0000-0000-000000000000'::uuid, 1) $$,
  'permission denied',
  '22. anon darf get_dashboard_v2_revision_detail nicht aufrufen'
);

SELECT * FROM finish();
ROLLBACK;
