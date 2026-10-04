-- Auftrag 072 (Executive Dashboard, Teilauftrag 3): persönliche Dashboard-Konfiguration.
-- Zwei Organisationen, zwei Benutzer derselben Organisation, Viewer, Benutzer ohne bzw. mit
-- gesperrter Mitgliedschaft. Prüft Lesetrennung, Revision/Konflikt, Servervalidierung und
-- dass unbekannte KPI-IDs unverändert gespeichert werden.
-- Ausführung: supabase test db. Läuft komplett in BEGIN … ROLLBACK.

BEGIN;

SELECT plan(28);

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('d4000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin-a@dash-pref-test.local', 'x', now()),
  ('d4000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'viewer-a@dash-pref-test.local', 'x', now()),
  ('d4000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'admin-b@dash-pref-test.local', 'x', now()),
  ('d4000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'nomember@dash-pref-test.local', 'x', now()),
  ('d4000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'suspended-a@dash-pref-test.local', 'x', now());

INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('d40a0000-0000-0000-0000-00000000000a', 'Org A (Dashboard-Test)', 'synthetic', 'active'),
  ('d40b0000-0000-0000-0000-00000000000b', 'Org B (Dashboard-Test)', 'synthetic', 'active');

INSERT INTO public.organization_members (user_id, organization_id, role, status)
VALUES
  ('d4000000-0000-0000-0000-000000000001', 'd40a0000-0000-0000-0000-00000000000a', 'admin', 'active'),
  ('d4000000-0000-0000-0000-000000000002', 'd40a0000-0000-0000-0000-00000000000a', 'viewer', 'active'),
  ('d4000000-0000-0000-0000-000000000003', 'd40b0000-0000-0000-0000-00000000000b', 'admin', 'active'),
  ('d4000000-0000-0000-0000-000000000005', 'd40a0000-0000-0000-0000-00000000000a', 'viewer', 'suspended');

CREATE TEMP TABLE cfg AS SELECT
  '{"version":1,"tiles":[{"tileId":"t1","catalogId":"baseline.arr","view":"zahl","size":"klein","filterMode":"fester_stand"}]}'::jsonb AS v1,
  '{"version":1,"tiles":[{"tileId":"t2","catalogId":"baseline.umsatz","view":"zahl","size":"klein","filterMode":"fester_stand"}]}'::jsonb AS v2,
  '{"version":1,"tiles":[{"tileId":"x","catalogId":"baseline.gibt_es_nicht","view":"zahl","size":"klein","filterMode":"fester_stand"}]}'::jsonb AS unknown_kpi;
GRANT SELECT ON cfg TO authenticated, anon;

SET ROLE authenticated;

-- --------------------------------------------- 1..4: Erstanlage, Revision --
SELECT set_config('request.jwt.claims', '{"sub":"d4000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT is(
  (SELECT revision FROM public.save_dashboard_preferences((SELECT v1 FROM cfg), 0)),
  1,
  'Erstanlage mit Revision 0 liefert Revision 1'
);
SELECT is(
  (SELECT config FROM public.executive_dashboard_preferences),
  (SELECT v1 FROM cfg),
  'gespeicherte Konfiguration ist lesbar'
);
SELECT is(
  (SELECT revision FROM public.save_dashboard_preferences((SELECT v2 FROM cfg), 1)),
  2,
  'Speichern mit aktueller Revision liefert Revision 2'
);
SELECT is(
  (SELECT schema_version FROM public.executive_dashboard_preferences),
  1,
  'schema_version folgt der Konfiguration'
);

-- --------------------------------------------- 5..8: Konflikte --
SELECT throws_ok(
  $$SELECT * FROM public.save_dashboard_preferences((SELECT v1 FROM cfg), 1)$$,
  'P0001', 'LP_DASHBOARD_CONFLICT', 'veraltete Revision ergibt Konflikt'
);
SELECT is(
  (SELECT config FROM public.executive_dashboard_preferences),
  (SELECT v2 FROM cfg),
  'nach dem Konflikt bleibt die gespeicherte Konfiguration unverändert'
);
SELECT throws_ok(
  $$SELECT * FROM public.save_dashboard_preferences((SELECT v1 FROM cfg), 0)$$,
  'P0001', 'LP_DASHBOARD_CONFLICT', 'zweite Erstanlage ergibt Konflikt'
);
SELECT is(
  (SELECT revision FROM public.executive_dashboard_preferences),
  2,
  'Revision bleibt nach den Konflikten bei 2'
);

-- --------------------------------------------- 9..11: Viewer derselben Organisation --
SELECT set_config('request.jwt.claims', '{"sub":"d4000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT is(
  (SELECT count(*) FROM public.executive_dashboard_preferences),
  0::bigint,
  'Viewer A sieht die Konfiguration von Admin A nicht'
);
SELECT is(
  (SELECT revision FROM public.save_dashboard_preferences((SELECT v1 FROM cfg), 0)),
  1,
  'Viewer A darf sein eigenes Layout speichern'
);
SELECT is(
  (SELECT count(*) FROM public.executive_dashboard_preferences),
  1::bigint,
  'Viewer A sieht genau seine eigene Zeile'
);

-- --------------------------------------------- 12..13: fremde Organisation --
SELECT set_config('request.jwt.claims', '{"sub":"d4000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT is(
  (SELECT count(*) FROM public.executive_dashboard_preferences),
  0::bigint,
  'Admin B sieht keine Konfiguration aus Org A'
);
SELECT is(
  (SELECT revision FROM public.save_dashboard_preferences((SELECT v2 FROM cfg), 0)),
  1,
  'Admin B legt eine eigene Zeile an, ohne Org A zu berühren'
);

-- --------------------------------------------- 14..15: ohne Mitgliedschaft --
SELECT set_config('request.jwt.claims', '{"sub":"d4000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT * FROM public.save_dashboard_preferences((SELECT v1 FROM cfg), 0)$$,
  '42501', 'LP_DASHBOARD_NO_MEMBERSHIP', 'Benutzer ohne Mitgliedschaft darf nicht speichern'
);
SELECT set_config('request.jwt.claims', '{"sub":"d4000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT * FROM public.save_dashboard_preferences((SELECT v1 FROM cfg), 0)$$,
  '42501', 'LP_DASHBOARD_NO_MEMBERSHIP', 'gesperrtes Mitglied darf nicht speichern'
);

-- --------------------------------------------- 16..18: keine direkten Schreibrechte --
SELECT set_config('request.jwt.claims', '{"sub":"d4000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT throws_ok(
  $$INSERT INTO public.executive_dashboard_preferences (organization_id, user_id, config, schema_version, revision)
    VALUES ('d40b0000-0000-0000-0000-00000000000b', 'd4000000-0000-0000-0000-000000000001', '{}'::jsonb, 1, 1)$$,
  '42501', NULL, 'direkter INSERT ist gesperrt'
);
SELECT throws_ok(
  $$UPDATE public.executive_dashboard_preferences SET revision = 99$$,
  '42501', NULL, 'direktes UPDATE ist gesperrt'
);
SELECT throws_ok(
  $$DELETE FROM public.executive_dashboard_preferences$$,
  '42501', NULL, 'direktes DELETE ist gesperrt'
);

-- --------------------------------------------- 19..25: Servervalidierung --
SELECT throws_ok(
  $$SELECT * FROM public.save_dashboard_preferences('[]'::jsonb, 2)$$,
  '22023', 'LP_DASHBOARD_INVALID', 'kein Objekt'
);
SELECT throws_ok(
  $$SELECT * FROM public.save_dashboard_preferences('{"version":1,"tiles":[],"formula":"A/B"}'::jsonb, 2)$$,
  '22023', 'LP_DASHBOARD_INVALID', 'fremdes Feld'
);
SELECT throws_ok(
  $$SELECT * FROM public.save_dashboard_preferences('{"version":2,"tiles":[]}'::jsonb, 2)$$,
  '22023', 'LP_DASHBOARD_INVALID', 'unbekannte Version'
);
SELECT throws_ok(
  $$SELECT * FROM public.save_dashboard_preferences(
    jsonb_build_object('version', 1, 'tiles',
      (SELECT jsonb_agg(jsonb_build_object('tileId', 't' || i, 'catalogId', 'baseline.arr')) FROM generate_series(1, 25) AS i)), 2)$$,
  '22023', 'LP_DASHBOARD_INVALID', '25 Kacheln sind zu viele'
);
SELECT throws_ok(
  $$SELECT * FROM public.save_dashboard_preferences('{"version":1,"tiles":[{"catalogId":"baseline.arr"}]}'::jsonb, 2)$$,
  '22023', 'LP_DASHBOARD_INVALID', 'Kachel ohne tileId'
);
SELECT throws_ok(
  $$SELECT * FROM public.save_dashboard_preferences(
    jsonb_build_object('version', 1, 'tiles', jsonb_build_array(
      jsonb_build_object('tileId', 't1', 'catalogId', 'baseline.arr', 'title', repeat('x', 33000)))), 2)$$,
  '22023', 'LP_DASHBOARD_INVALID', 'Konfiguration über 32768 Byte'
);
SELECT is(
  (SELECT revision FROM public.executive_dashboard_preferences),
  2,
  'abgelehnte Konfigurationen ändern nichts'
);

-- --------------------------------------------- 26..28: unbekannte KPI-ID, anon --
SELECT lives_ok(
  $$SELECT * FROM public.save_dashboard_preferences((SELECT unknown_kpi FROM cfg), 2)$$,
  'Kachel mit unbekannter KPI-ID wird angenommen'
);
SELECT is(
  (SELECT config FROM public.executive_dashboard_preferences),
  (SELECT unknown_kpi FROM cfg),
  'Kachel mit unbekannter KPI-ID bleibt unverändert erhalten'
);

RESET ROLE;
SET ROLE anon;
SELECT throws_ok(
  $$SELECT count(*) FROM public.executive_dashboard_preferences$$,
  '42501', NULL, 'anon hat keinen Lesezugriff'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
