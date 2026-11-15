-- Auftrag 158 (P09b): V2-Vorlagen und Dashboard-Auswahl
-- Tests für:
-- 1. Vorlagen-Validierung auf dem Server (dashboard_config_v2_invalid_reason)
-- 2. list_personal_dashboards_v2 (Isolation, Sortierung, Kachel-/Sektionszähler)
-- 3. delete_personal_dashboard_v2 (Revisionsprüfung, Mandantenisolation, Schutz des letzten Dashboards, Kaskade)
-- 4. duplicate_personal_dashboard_v2 (Übernahme, neue ID, Revisionshistorie, Titelgrenzen)
-- 5. Obergrenze 20 (create_dashboard_v2 und duplicate_personal_dashboard_v2)
-- 6. Rechteprüfung (anon gesperrt)

BEGIN;

SELECT plan(24);

-- ---------------------------------------------------------------- Setup --
DELETE FROM public.dashboard_revisions WHERE organization_id IN ('a1580000-0000-0000-0000-000000000001', 'a1580000-0000-0000-0000-000000000002');
DELETE FROM public.dashboards WHERE organization_id IN ('a1580000-0000-0000-0000-000000000001', 'a1580000-0000-0000-0000-000000000002');
DELETE FROM public.organization_members WHERE organization_id IN ('a1580000-0000-0000-0000-000000000001', 'a1580000-0000-0000-0000-000000000002');
DELETE FROM auth.users WHERE email LIKE '%@158-test.local';
DELETE FROM public.organizations WHERE id IN ('a1580000-0000-0000-0000-000000000001', 'a1580000-0000-0000-0000-000000000002');

-- Benutzer 1 (Org 1)
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES ('91580000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'u1@158-test.local', 'x', now());

-- Benutzer 2 (Org 1, gleicher Mandant)
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES ('91580000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'u2@158-test.local', 'x', now());

-- Benutzer 3 (Org 2, fremder Mandant)
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES ('91580000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'u3@158-test.local', 'x', now());

-- Organisationen
INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('a1580000-0000-0000-0000-000000000001', 'Org 1 (158 Test)', 'synthetic', 'active'),
  ('a1580000-0000-0000-0000-000000000002', 'Org 2 (158 Test)', 'synthetic', 'active');

-- Mitgliedschaften
INSERT INTO public.organization_members (user_id, organization_id, role, status)
VALUES
  ('91580000-0000-0000-0000-000000000001', 'a1580000-0000-0000-0000-000000000001', 'admin', 'active'),
  ('91580000-0000-0000-0000-000000000002', 'a1580000-0000-0000-0000-000000000001', 'viewer', 'active'),
  ('91580000-0000-0000-0000-000000000003', 'a1580000-0000-0000-0000-000000000002', 'admin', 'active');

-- Basis-Konfiguration für Tests
CREATE TEMP TABLE tmp_base_config AS
SELECT jsonb_build_object(
  'version', 2,
  'title', 'Basis Dashboard',
  'scope', 'personal',
  'ownerUserId', '91580000-0000-0000-0000-000000000001',
  'organizationId', 'a1580000-0000-0000-0000-000000000001',
  'globalTimeframe', 'aktuell',
  'tiles', jsonb_build_array(
    jsonb_build_object(
      'id', 't1',
      'catalogId', 'crm.pipeline_deals',
      'title', 'Deals',
      'presentation', 'zahl',
      'layouts', jsonb_build_object('desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 4, 'h', 2))
    ),
    jsonb_build_object(
      'id', 't2',
      'catalogId', 'crm.pipeline_volumen',
      'title', 'Volumen',
      'presentation', 'zahl',
      'layouts', jsonb_build_object('desktop', jsonb_build_object('x', 4, 'y', 0, 'w', 4, 'h', 2))
    )
  ),
  'sections', jsonb_build_array(
    jsonb_build_object('id', 's1', 'title', 'Pipeline', 'collapsed', false, 'tileIds', jsonb_build_array('t1', 't2'))
  )
) AS cfg;

-- ---------------------------------------------------------------- Teil 1: Vorlagen-Gültigkeit --

-- 1. Leere Vorlage gültig
SELECT is(
  public.dashboard_config_v2_invalid_reason(jsonb_build_object(
    'version', 2, 'title', 'Leere Vorlage', 'scope', 'personal',
    'ownerUserId', '91580000-0000-0000-0000-000000000001', 'organizationId', 'a1580000-0000-0000-0000-000000000001',
    'globalTimeframe', 'letzte_30_tage', 'tiles', '[]'::jsonb
  )),
  NULL,
  'Leere Vorlage ist auf dem Server gültig'
);

-- 2. Vorlage mit Sektionen gültig
SELECT is(
  public.dashboard_config_v2_invalid_reason((SELECT cfg FROM tmp_base_config)),
  NULL,
  'Vorlage mit Sektionen ist auf dem Server gültig'
);

-- ---------------------------------------------------------------- Teil 2: Liste & Mandantentrennung --

GRANT SELECT ON tmp_base_config TO authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"91580000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SET ROLE authenticated;

-- User 1 legt Dash A (2 Kacheln, 1 Sektion) und Dash B (0 Kacheln, 0 Sektionen) an
SELECT * FROM public.create_dashboard_v2('Dash A', (SELECT cfg FROM tmp_base_config), 'personal') \gset dash_a_
SELECT * FROM public.create_dashboard_v2('Dash B', jsonb_build_object(
  'version', 2, 'title', 'Dash B', 'scope', 'personal',
  'ownerUserId', '91580000-0000-0000-0000-000000000001', 'organizationId', 'a1580000-0000-0000-0000-000000000001',
  'globalTimeframe', 'aktuell', 'tiles', '[]'::jsonb
), 'personal') \gset dash_b_

-- Zeitstempel explizit staffeln (im Test-Setup via postgres-Rolle)
RESET ROLE;
UPDATE public.dashboards SET updated_at = '2026-11-14 10:00:00Z' WHERE id = :'dash_a_dashboard_id';
UPDATE public.dashboards SET updated_at = '2026-11-14 11:00:00Z' WHERE id = :'dash_b_dashboard_id';
SET ROLE authenticated;

-- 3. list_personal_dashboards_v2 für User 1 liefert 2 Dashboards
SELECT is(
  (SELECT count(*)::integer FROM public.list_personal_dashboards_v2()),
  2,
  'User 1 sieht genau 2 persönliche Dashboards'
);

-- 4. Kachel- und Sektionszähler stimmen
SELECT is(
  (SELECT tile_count || '/' || section_count FROM public.list_personal_dashboards_v2() WHERE id = :'dash_a_dashboard_id'),
  '2/1',
  'Dash A hat 2 Kacheln und 1 Sektion'
);

SELECT is(
  (SELECT tile_count || '/' || section_count FROM public.list_personal_dashboards_v2() WHERE id = :'dash_b_dashboard_id'),
  '0/0',
  'Dash B hat 0 Kacheln und 0 Sektionen'
);

-- 5. Sortierung: Dash B (später angelegt) vor Dash A
SELECT is(
  (SELECT id FROM public.list_personal_dashboards_v2() LIMIT 1),
  :'dash_b_dashboard_id'::uuid,
  'Sortierung ist updated_at DESC'
);

-- 6. User 2 (gleiche Org, anderer Nutzer) sieht nichts
SELECT set_config('request.jwt.claims', '{"sub":"91580000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT is(
  (SELECT count(*)::integer FROM public.list_personal_dashboards_v2()),
  0,
  'User 2 in gleicher Organisation sieht keine Dashboards von User 1'
);

-- 7. User 3 (fremde Org) sieht nichts
SELECT set_config('request.jwt.claims', '{"sub":"91580000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT is(
  (SELECT count(*)::integer FROM public.list_personal_dashboards_v2()),
  0,
  'User 3 in fremder Organisation sieht keine Dashboards von User 1'
);

-- ---------------------------------------------------------------- Teil 3: Löschen & Schutz --

-- 8. Löschen fremder ID schlägt fehl
SELECT throws_ok(
  format('SELECT * FROM public.delete_personal_dashboard_v2(%L::uuid, 1)', :'dash_a_dashboard_id'),
  'P0002',
  'LP_DASHBOARD_NOT_FOUND',
  'User 3 kann Dashboard von User 1 nicht löschen'
);

-- Zurück zu User 1
SELECT set_config('request.jwt.claims', '{"sub":"91580000-0000-0000-0000-000000000001","role":"authenticated"}', true);

-- 9. Löschen mit falscher Revision wirft LP_DASHBOARD_CONFLICT
SELECT throws_ok(
  format('SELECT * FROM public.delete_personal_dashboard_v2(%L::uuid, 99)', :'dash_b_dashboard_id'),
  '40900',
  NULL,
  'Löschen mit falscher Revision wirft Konflikt'
);

-- 10. Dashboard B ist nach fehlgeschlagenem Löschen noch da
SELECT is(
  (SELECT count(*)::integer FROM public.dashboards WHERE id = :'dash_b_dashboard_id'),
  1,
  'Dash B nach Revisionskonflikt noch vorhanden'
);

-- 11. Löschen mit richtiger Revision löscht Dash B und liefert Dash A als next_dashboard_id
SELECT is(
  (SELECT next_dashboard_id FROM public.delete_personal_dashboard_v2(:'dash_b_dashboard_id'::uuid, 1)),
  :'dash_a_dashboard_id'::uuid,
  'Löschen von Dash B liefert Dash A als nächstes Dashboard'
);

-- 12. Dash B und seine Revisionen sind gelöscht
SELECT is(
  (SELECT count(*)::integer FROM public.dashboards WHERE id = :'dash_b_dashboard_id'),
  0,
  'Dash B existiert nicht mehr'
);
SELECT is(
  (SELECT count(*)::integer FROM public.dashboard_revisions WHERE dashboard_id = :'dash_b_dashboard_id'),
  0,
  'Revisionen von Dash B wurden kaskadierend gelöscht'
);

-- 13. Letztes verbleibendes Dashboard (Dash A) kann nicht gelöscht werden
SELECT throws_ok(
  format('SELECT * FROM public.delete_personal_dashboard_v2(%L::uuid, 1)', :'dash_a_dashboard_id'),
  '22023',
  'LP_LAST_DASHBOARD',
  'Das letzte verbleibende Dashboard kann nicht gelöscht werden'
);

-- ---------------------------------------------------------------- Teil 4: Duplizieren --

-- 14. Duplizieren von Dash A übernimmt Kacheln und Sektionen
SELECT * FROM public.duplicate_personal_dashboard_v2(:'dash_a_dashboard_id'::uuid, 'Dash A Kopie') \gset dup_
SELECT is(
  (SELECT count(*)::integer FROM public.dashboards WHERE id = :'dup_dashboard_id'),
  1,
  'Dupliziertes Dashboard wurde angelegt'
);

-- 15. Revision 1 mit Beschreibung
SELECT is(
  (SELECT change_summary FROM public.dashboard_revisions WHERE dashboard_id = :'dup_dashboard_id' AND revision = 1),
  'Dupliziert aus „Dash A“',
  'Revisionshistorie nennt Quelltitel'
);

-- 16. Kacheln und Sektionen im Duplikat vorhanden
SELECT is(
  (SELECT (jsonb_array_length(config->'tiles') || '/' || jsonb_array_length(config->'sections')) FROM public.dashboards WHERE id = :'dup_dashboard_id'),
  '2/1',
  'Duplikat hat Kacheln und Sektionen übernommen'
);

-- 17. Duplizieren mit ungültigem Titel (> 80 Zeichen) scheitert
SELECT throws_ok(
  format('SELECT * FROM public.duplicate_personal_dashboard_v2(%L::uuid, %L)', :'dash_a_dashboard_id', repeat('X', 81)),
  '22023',
  NULL,
  'Duplizieren mit 81 Zeichen schlägt fehl'
);

-- ---------------------------------------------------------------- Teil 5: Obergrenze 20 --

-- User 1 hat aktuell 2 Dashboards (Dash A und Duplikat).
-- Wir erzeugen 18 weitere Dashboards, sodass genau 20 erreicht sind.
DO $$
DECLARE
  v_cfg JSONB := jsonb_build_object(
    'version', 2, 'title', 'T', 'scope', 'personal',
    'ownerUserId', '91580000-0000-0000-0000-000000000001', 'organizationId', 'a1580000-0000-0000-0000-000000000001',
    'globalTimeframe', 'aktuell', 'tiles', '[]'::jsonb
  );
  i INT;
BEGIN
  FOR i IN 3..20 LOOP
    PERFORM public.create_dashboard_v2('Auto ' || i, v_cfg, 'personal');
  END LOOP;
END;
$$;

-- 18. Genau 20 Dashboards vorhanden
SELECT is(
  (SELECT count(*)::integer FROM public.dashboards WHERE user_id = '91580000-0000-0000-0000-000000000001' AND scope = 'personal'),
  20,
  'User 1 hat genau 20 Dashboards erreicht'
);

-- 19. create_dashboard_v2 für das 21. Dashboard scheitert mit LP_DASHBOARD_LIMIT
SELECT throws_ok(
  'SELECT * FROM public.create_dashboard_v2(''Zu viel'', jsonb_build_object(''version'', 2, ''title'', ''Zu viel'', ''scope'', ''personal'', ''ownerUserId'', ''91580000-0000-0000-0000-000000000001'', ''organizationId'', ''a1580000-0000-0000-0000-000000000001'', ''globalTimeframe'', ''aktuell'', ''tiles'', ''[]''::jsonb), ''personal'')',
  '22023',
  'LP_DASHBOARD_LIMIT',
  'create_dashboard_v2 blockiert bei 20 Dashboards'
);

-- 20. duplicate_personal_dashboard_v2 scheitert ebenfalls mit LP_DASHBOARD_LIMIT
SELECT throws_ok(
  format('SELECT * FROM public.duplicate_personal_dashboard_v2(%L::uuid, ''Kopie 21'')', :'dash_a_dashboard_id'),
  '22023',
  'LP_DASHBOARD_LIMIT',
  'duplicate_personal_dashboard_v2 blockiert bei 20 Dashboards'
);

-- ---------------------------------------------------------------- Teil 6: Rechte anon --

SET ROLE anon;

-- 21. anon darf list_personal_dashboards_v2 nicht ausführen
SELECT throws_ok(
  'SELECT * FROM public.list_personal_dashboards_v2()',
  '42501',
  NULL,
  'anon hat keine Ausführungsrechte für list_personal_dashboards_v2'
);

-- 22. anon darf delete_personal_dashboard_v2 nicht ausführen
SELECT throws_ok(
  format('SELECT * FROM public.delete_personal_dashboard_v2(%L::uuid, 1)', :'dash_a_dashboard_id'),
  '42501',
  NULL,
  'anon hat keine Ausführungsrechte für delete_personal_dashboard_v2'
);

RESET ROLE;

ROLLBACK;
