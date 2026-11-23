-- pgTAP-Tests für Auftrag 173 (P16a): Abgleich V1 <-> V2, Entscheidungen, Übernahme.
-- Prüft: nur Admin der eigenen Organisation, alle fünf Ergebnisklassen, Revisionsbindung der
-- Entscheidung, Übernahme als neue Revision ohne Überschreiben, V1 bleibt unverändert.

BEGIN;

SELECT plan(46);
SET CONSTRAINTS ALL IMMEDIATE;

-- ---------------------------------------------------------------- Setup --
-- Org A: af730000-0000-0000-0000-00000000000a, Org B: af730000-0000-0000-0000-00000000000b
INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('af730000-0000-0000-0000-00000000000a', 'Org A (Rollout Test)', 'synthetic', 'active'),
  ('af730000-0000-0000-0000-00000000000b', 'Org B (Rollout Test)', 'synthetic', 'active');

-- 01 Admin A, 02 Manager A, 03 Viewer A,
-- 11 Nutzer "gleich", 12 "v1_geaendert", 13 "beide_geaendert", 14 "keine_kopie", 15 "nur_v2",
-- 21 Admin B (fremde Organisation)
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('9f730000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin-a@rollout.local', 'x', now()),
  ('9f730000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'mgr-a@rollout.local', 'x', now()),
  ('9f730000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'view-a@rollout.local', 'x', now()),
  ('9f730000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'u11-gleich@rollout.local', 'x', now()),
  ('9f730000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', 'u12-v1@rollout.local', 'x', now()),
  ('9f730000-0000-0000-0000-000000000013', 'authenticated', 'authenticated', 'u13-beide@rollout.local', 'x', now()),
  ('9f730000-0000-0000-0000-000000000014', 'authenticated', 'authenticated', 'u14-ohne@rollout.local', 'x', now()),
  ('9f730000-0000-0000-0000-000000000015', 'authenticated', 'authenticated', 'u15-nurv2@rollout.local', 'x', now()),
  ('9f730000-0000-0000-0000-000000000021', 'authenticated', 'authenticated', 'admin-b@rollout.local', 'x', now());

INSERT INTO public.organization_members (user_id, organization_id, role, status)
VALUES
  ('9f730000-0000-0000-0000-000000000001', 'af730000-0000-0000-0000-00000000000a', 'admin', 'active'),
  ('9f730000-0000-0000-0000-000000000002', 'af730000-0000-0000-0000-00000000000a', 'manager', 'active'),
  ('9f730000-0000-0000-0000-000000000003', 'af730000-0000-0000-0000-00000000000a', 'viewer', 'active'),
  ('9f730000-0000-0000-0000-000000000011', 'af730000-0000-0000-0000-00000000000a', 'viewer', 'active'),
  ('9f730000-0000-0000-0000-000000000012', 'af730000-0000-0000-0000-00000000000a', 'viewer', 'active'),
  ('9f730000-0000-0000-0000-000000000013', 'af730000-0000-0000-0000-00000000000a', 'manager', 'active'),
  ('9f730000-0000-0000-0000-000000000014', 'af730000-0000-0000-0000-00000000000a', 'viewer', 'active'),
  ('9f730000-0000-0000-0000-000000000015', 'af730000-0000-0000-0000-00000000000a', 'viewer', 'active'),
  ('9f730000-0000-0000-0000-000000000021', 'af730000-0000-0000-0000-00000000000b', 'admin', 'active');

-- Minimal gültige V2-Konfiguration für einen Nutzer.
CREATE FUNCTION pg_temp.v2cfg(p_user TEXT, p_last INTEGER, p_base INTEGER DEFAULT NULL)
RETURNS JSONB LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'version', 2, 'title', 'Executive Dashboard', 'scope', 'personal',
    'ownerUserId', p_user, 'organizationId', 'af730000-0000-0000-0000-00000000000a',
    'globalTimeframe', 'monat', 'tiles', '[]'::jsonb,
    'metadata', jsonb_strip_nulls(jsonb_build_object(
      'migrated_from_v1', true, 'last_migrated_revision', p_last,
      'migrated_v2_revision', p_base, 'user_edited', false
    ))
  )
$$;

-- V1-Zeilen (Revisionen): 11 -> 3, 12 -> 5, 13 -> 4, 14 -> 2
INSERT INTO public.executive_dashboard_preferences (organization_id, user_id, config, schema_version, revision)
VALUES
  ('af730000-0000-0000-0000-00000000000a', '9f730000-0000-0000-0000-000000000011', '{"version":1,"tiles":[]}', 1, 3),
  ('af730000-0000-0000-0000-00000000000a', '9f730000-0000-0000-0000-000000000012', '{"version":1,"tiles":[]}', 1, 5),
  ('af730000-0000-0000-0000-00000000000a', '9f730000-0000-0000-0000-000000000013', '{"version":1,"tiles":[]}', 1, 4),
  ('af730000-0000-0000-0000-00000000000a', '9f730000-0000-0000-0000-000000000014', '{"version":1,"tiles":[]}', 1, 2);

-- V2-Kopien: 11 kopiert bei Rev 3 (V2 bearbeitet, Rev 4) -> gleich;
-- 12 kopiert bei Rev 2, V2 unbearbeitet (Rev 1) -> v1_geaendert;
-- 13 kopiert bei Rev 1, V2 bearbeitet (Rev 3) -> beide_geaendert;
-- 15 nur V2 -> nur_v2. Zusätzlich für 11 ein jüngeres Vorlagen-Dashboard (darf nicht zählen).
INSERT INTO public.dashboards (id, organization_id, scope, user_id, title, created_by_user_id, revision, config, created_at)
VALUES
  ('d7730000-0000-0000-0000-000000000011', 'af730000-0000-0000-0000-00000000000a', 'personal', '9f730000-0000-0000-0000-000000000011', 'Executive Dashboard', '9f730000-0000-0000-0000-000000000011', 4, pg_temp.v2cfg('9f730000-0000-0000-0000-000000000011', 3), now() - interval '2 day'),
  ('d7730000-0000-0000-0000-000000000111', 'af730000-0000-0000-0000-00000000000a', 'personal', '9f730000-0000-0000-0000-000000000011', 'Vorlage', '9f730000-0000-0000-0000-000000000011', 1, pg_temp.v2cfg('9f730000-0000-0000-0000-000000000011', 1), now() - interval '1 day'),
  ('d7730000-0000-0000-0000-000000000012', 'af730000-0000-0000-0000-00000000000a', 'personal', '9f730000-0000-0000-0000-000000000012', 'Executive Dashboard', '9f730000-0000-0000-0000-000000000012', 1, pg_temp.v2cfg('9f730000-0000-0000-0000-000000000012', 2), now() - interval '2 day'),
  ('d7730000-0000-0000-0000-000000000013', 'af730000-0000-0000-0000-00000000000a', 'personal', '9f730000-0000-0000-0000-000000000013', 'Mein Pilot', '9f730000-0000-0000-0000-000000000013', 3, pg_temp.v2cfg('9f730000-0000-0000-0000-000000000013', 1), now() - interval '2 day'),
  ('d7730000-0000-0000-0000-000000000015', 'af730000-0000-0000-0000-00000000000a', 'personal', '9f730000-0000-0000-0000-000000000015', 'Executive Dashboard', '9f730000-0000-0000-0000-000000000015', 1, pg_temp.v2cfg('9f730000-0000-0000-0000-000000000015', 1), now() - interval '2 day');

INSERT INTO public.dashboard_revisions (dashboard_id, organization_id, revision, title, config, created_by_user_id)
SELECT d.id, d.organization_id, d.revision, d.title, d.config, d.user_id FROM public.dashboards AS d
WHERE d.organization_id = 'af730000-0000-0000-0000-00000000000a';

CREATE TEMP TABLE v1_before AS
SELECT user_id, revision, config, updated_at FROM public.executive_dashboard_preferences
WHERE organization_id = 'af730000-0000-0000-0000-00000000000a';
GRANT SELECT ON v1_before TO authenticated;

-- ======================================================== 1..6 Klassifizierung (rein)
SELECT is(public.dashboard_rollout_classify(true, 3, true, 3, 4, 1), 'gleich', 'V1 unverändert seit Kopie -> gleich (V2 beliebig)');
SELECT is(public.dashboard_rollout_classify(true, 5, true, 2, 1, 1), 'v1_geaendert', 'V1 neuer, V2 unbearbeitet -> v1_geaendert');
SELECT is(public.dashboard_rollout_classify(true, 4, true, 1, 3, 1), 'beide_geaendert', 'V1 neuer und V2 bearbeitet -> beide_geaendert');
SELECT is(public.dashboard_rollout_classify(true, 2, false, NULL, NULL, NULL), 'keine_kopie', 'V1 ohne V2 -> keine_kopie');
SELECT is(public.dashboard_rollout_classify(false, NULL, true, 1, 1, 1), 'nur_v2', 'V2 ohne V1 -> nur_v2');
SELECT is(public.dashboard_rollout_classify(true, 1, true, NULL, 1, 1), 'v1_geaendert', 'Fehlende Quellrevision gilt als geändert (keine stille Gleichheit)');

SET ROLE authenticated;

-- ======================================================== 7..9 Nur Admin
SELECT set_config('request.jwt.claims', '{"sub":"9f730000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT throws_ok($$ SELECT * FROM public.dashboard_v1_v2_reconciliation() $$, '42501', 'LP_FORBIDDEN', 'Manager darf den Abgleich nicht sehen');
SELECT set_config('request.jwt.claims', '{"sub":"9f730000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT throws_ok($$ SELECT * FROM public.dashboard_v1_v2_reconciliation() $$, '42501', 'LP_FORBIDDEN', 'Viewer darf den Abgleich nicht sehen');
SELECT throws_ok(
  $$ SELECT * FROM public.dashboard_rollout_decide('9f730000-0000-0000-0000-000000000012', 'spaeter', 5, 1, 'd7730000-0000-0000-0000-000000000012') $$,
  '42501', 'LP_FORBIDDEN', 'Viewer darf nicht entscheiden'
);

-- ======================================================== 10..15 Abgleich Admin A
SELECT set_config('request.jwt.claims', '{"sub":"9f730000-0000-0000-0000-000000000001","role":"authenticated"}', true);
CREATE TEMP TABLE rec1 AS SELECT * FROM public.dashboard_v1_v2_reconciliation();

SELECT is((SELECT count(*)::int FROM rec1), 5, 'Abgleich liefert genau die fünf Nutzer mit V1 oder V2-Kopie');
SELECT is((SELECT ergebnis_klasse FROM rec1 WHERE user_id = '9f730000-0000-0000-0000-000000000011'), 'gleich', 'Klasse gleich');
SELECT is((SELECT ergebnis_klasse FROM rec1 WHERE user_id = '9f730000-0000-0000-0000-000000000012'), 'v1_geaendert', 'Klasse v1_geaendert');
SELECT is((SELECT ergebnis_klasse FROM rec1 WHERE user_id = '9f730000-0000-0000-0000-000000000013'), 'beide_geaendert', 'Klasse beide_geaendert');
SELECT is((SELECT ergebnis_klasse FROM rec1 WHERE user_id = '9f730000-0000-0000-0000-000000000014'), 'keine_kopie', 'Klasse keine_kopie');
SELECT is((SELECT ergebnis_klasse FROM rec1 WHERE user_id = '9f730000-0000-0000-0000-000000000015'), 'nur_v2', 'Klasse nur_v2');

-- 16..17 Kopie = ältestes migriertes Dashboard, nicht die jüngere Vorlage
SELECT is((SELECT v2_dashboard_id FROM rec1 WHERE user_id = '9f730000-0000-0000-0000-000000000011'),
  'd7730000-0000-0000-0000-000000000011'::uuid, 'V2-Kopie ist das älteste migrierte persönliche Dashboard');
SELECT is((SELECT v1_revision || '/' || v2_revision || '/' || last_migrated_revision FROM rec1 WHERE user_id = '9f730000-0000-0000-0000-000000000012'),
  '5/1/2', 'Revisionsstände V1/V2/Quellrevision werden geliefert');

-- 18 Fremde Organisation sieht nichts von Org A
SELECT set_config('request.jwt.claims', '{"sub":"9f730000-0000-0000-0000-000000000021","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.dashboard_v1_v2_reconciliation()), 0, 'Admin B sieht keine Nutzer aus Org A');
-- 19 Admin B kann für Nutzer aus Org A nicht entscheiden (Nutzer gilt in Org B als unbekannt)
SELECT throws_ok(
  $$ SELECT * FROM public.dashboard_rollout_decide('9f730000-0000-0000-0000-000000000012', 'spaeter', 5, 1, 'd7730000-0000-0000-0000-000000000012') $$,
  'P0002', 'LP_ROLLOUT_NOT_FOUND', 'Entscheidung über fremde Organisation abgewiesen'
);
-- 20 Admin B kann nicht übernehmen
SELECT throws_ok(
  $$ SELECT * FROM public.dashboard_rollout_adopt_v1('9f730000-0000-0000-0000-000000000012', 5, 1, 'd7730000-0000-0000-0000-000000000012', '{}'::jsonb) $$,
  'P0002', NULL, 'Übernahme über fremde Organisation abgewiesen'
);

-- ======================================================== 21..25 Entscheidung mit Revisionsbindung
SELECT set_config('request.jwt.claims', '{"sub":"9f730000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT throws_ok(
  $$ SELECT * FROM public.dashboard_rollout_decide('9f730000-0000-0000-0000-000000000013', 'v2_behalten', 3, 3, 'd7730000-0000-0000-0000-000000000013') $$,
  'P0001', 'LP_ROLLOUT_STALE', 'Veraltete erwartete Revision wird abgewiesen'
);
SELECT throws_ok(
  $$ SELECT * FROM public.dashboard_rollout_decide('9f730000-0000-0000-0000-000000000013', 'v1_uebernehmen', 4, 3, 'd7730000-0000-0000-0000-000000000013') $$,
  '22023', 'LP_ROLLOUT_INVALID: Entscheidung nicht erlaubt', 'Übernahme nur über die Übernahme-RPC'
);
SELECT is(
  (SELECT entscheidung FROM public.dashboard_rollout_decide('9f730000-0000-0000-0000-000000000013', 'v2_behalten', 4, 3, 'd7730000-0000-0000-0000-000000000013')),
  'v2_behalten', 'Admin entscheidet V2-Pilot behalten'
);
SELECT is(
  (SELECT entscheidung_gueltig FROM public.dashboard_v1_v2_reconciliation() WHERE user_id = '9f730000-0000-0000-0000-000000000013'),
  true, 'Entscheidung ist für die geprüften Revisionen gültig'
);
-- Nutzer 13 bearbeitet V1 erneut -> Entscheidung verfällt
RESET ROLE;
UPDATE public.executive_dashboard_preferences SET revision = 5
WHERE organization_id = 'af730000-0000-0000-0000-00000000000a' AND user_id = '9f730000-0000-0000-0000-000000000013';
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"9f730000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT is(
  (SELECT entscheidung_gueltig FROM public.dashboard_v1_v2_reconciliation() WHERE user_id = '9f730000-0000-0000-0000-000000000013'),
  false, 'Nach erneuter V1-Bearbeitung ist die Entscheidung verfallen'
);

-- ======================================================== 26..35 Übernahme als neue Revision
SELECT throws_ok(
  $$ SELECT * FROM public.dashboard_rollout_adopt_v1('9f730000-0000-0000-0000-000000000012', 4, 1, 'd7730000-0000-0000-0000-000000000012', pg_temp.v2cfg('x', 1)) $$,
  'P0001', 'LP_ROLLOUT_STALE', 'Übernahme mit veralteter V1-Revision abgewiesen'
);
SELECT throws_ok(
  $$ SELECT * FROM public.dashboard_rollout_adopt_v1('9f730000-0000-0000-0000-000000000014', 2, NULL, NULL, pg_temp.v2cfg('x', 1)) $$,
  'P0002', 'LP_ROLLOUT_NO_COPY', 'Ohne V2-Kopie keine Übernahme'
);
SELECT throws_ok(
  $$ SELECT * FROM public.dashboard_rollout_adopt_v1('9f730000-0000-0000-0000-000000000012', 5, 1, 'd7730000-0000-0000-0000-000000000012', '{"version":1}'::jsonb) $$,
  '22023', NULL, 'Ungültige Konfiguration wird serverseitig abgewiesen'
);

CREATE TEMP TABLE adopt1 AS
SELECT * FROM public.dashboard_rollout_adopt_v1(
  '9f730000-0000-0000-0000-000000000012', 5, 1, 'd7730000-0000-0000-0000-000000000012',
  pg_temp.v2cfg('fremd', 99) || '{"title":"Manipuliert","organizationId":"af730000-0000-0000-0000-00000000000b"}'::jsonb
);
SELECT is((SELECT revision FROM adopt1), 2, 'Übernahme erzeugt die nächste Revision');

RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM public.dashboard_revisions WHERE dashboard_id = 'd7730000-0000-0000-0000-000000000012'),
  2, 'Alte und neue Revision liegen beide in der Historie (kein Überschreiben)'
);
SELECT is(
  (SELECT change_summary FROM public.dashboard_revisions WHERE dashboard_id = 'd7730000-0000-0000-0000-000000000012' AND revision = 2),
  'Übernahme aus altem Editor (V1-Revision 5)', 'Änderungszusammenfassung nennt die V1-Revision'
);
SELECT is(
  (SELECT (config->'metadata'->>'last_migrated_revision') || '/' || (config->'metadata'->>'migrated_v2_revision') || '/' || (config->>'organizationId') || '/' || (config->>'ownerUserId') || '/' || title
   FROM public.dashboards WHERE id = 'd7730000-0000-0000-0000-000000000012'),
  '5/2/af730000-0000-0000-0000-00000000000a/9f730000-0000-0000-0000-000000000012/Executive Dashboard',
  'Server bindet Quellrevision, Organisation, Besitzer und Titel (Eingaben überschrieben)'
);
SELECT is(
  (SELECT count(*)::int FROM public.audit_log WHERE action = 'dashboard.rollout_v1_adopted' AND target_id = 'd7730000-0000-0000-0000-000000000012'),
  1, 'Übernahme ist im Audit-Log protokolliert'
);
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"9f730000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT is(
  (SELECT ergebnis_klasse || '/' || entscheidung || '/' || entscheidung_gueltig::text FROM public.dashboard_v1_v2_reconciliation() WHERE user_id = '9f730000-0000-0000-0000-000000000012'),
  'gleich/v1_uebernehmen/true', 'Erneuter Abgleich nach Übernahme zeigt gleich mit gültiger Entscheidung'
);
-- 33 Spätere Nutzerbearbeitung in V2 gilt als bearbeitet (Basis = Übernahmerevision)
RESET ROLE;
UPDATE public.dashboards SET revision = 3 WHERE id = 'd7730000-0000-0000-0000-000000000012';
UPDATE public.executive_dashboard_preferences SET revision = 6
WHERE organization_id = 'af730000-0000-0000-0000-00000000000a' AND user_id = '9f730000-0000-0000-0000-000000000012';
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"9f730000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT is(
  (SELECT ergebnis_klasse FROM public.dashboard_v1_v2_reconciliation() WHERE user_id = '9f730000-0000-0000-0000-000000000012'),
  'beide_geaendert', 'Bearbeitung nach Übernahme zählt ab der Übernahmerevision'
);

-- 34 V1 bleibt unverändert (nur gelesen) – Revisionen nur durch Test-Setup verändert
RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM public.executive_dashboard_preferences AS p JOIN v1_before AS b USING (user_id)
   WHERE p.organization_id = 'af730000-0000-0000-0000-00000000000a' AND p.config = b.config),
  4, 'V1-Konfigurationen sind durch Abgleich, Entscheidung und Übernahme unverändert'
);

-- 35..36 Kein Direktzugriff auf die Entscheidungstabelle
SET ROLE authenticated;
SELECT throws_ok($$ SELECT * FROM public.dashboard_rollout_decisions $$, '42501', NULL, 'Kein direktes Lesen der Entscheidungstabelle');
SELECT throws_ok(
  $$ INSERT INTO public.dashboard_rollout_decisions (organization_id, user_id, ergebnis_klasse, entscheidung)
     VALUES ('af730000-0000-0000-0000-00000000000a', '9f730000-0000-0000-0000-000000000011', 'gleich', 'spaeter') $$,
  '42501', NULL, 'Kein direktes Schreiben der Entscheidungstabelle'
);

-- 39..41 Kopiermigration erneut ausführen: keine Duplikate, bearbeiteter V2-Stand bleibt
SELECT set_config('request.jwt.claims', '{"sub":"9f730000-0000-0000-0000-000000000013","role":"authenticated"}', true);
SELECT is(
  (SELECT id FROM public.get_or_create_personal_dashboard_v2(pg_temp.v2cfg('9f730000-0000-0000-0000-000000000013', 5))),
  'd7730000-0000-0000-0000-000000000013'::uuid, 'Erneute Kopiermigration liefert die bestehende Kopie'
);
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.dashboards WHERE user_id = '9f730000-0000-0000-0000-000000000013'), 1, 'Erneute Kopiermigration legt kein Duplikat an');
SELECT is(
  (SELECT revision || '/' || (config->'metadata'->>'last_migrated_revision') FROM public.dashboards WHERE id = 'd7730000-0000-0000-0000-000000000013'),
  '3/1', 'Bearbeiteter V2-Stand und Quellrevision bleiben unverändert'
);

-- 42..46 Codex PR #219: Dashboard-ID-Bindung und robuste Metadaten
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"9f730000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT throws_ok(
  $$ SELECT * FROM public.dashboard_rollout_decide('9f730000-0000-0000-0000-000000000011', 'spaeter', 3, 4, 'd7730000-0000-0000-0000-000000000111') $$,
  'P0001', 'LP_ROLLOUT_STALE', 'Entscheidung mit abweichender erwarteter Dashboard-ID wird abgewiesen'
);
SELECT is(
  (SELECT entscheidung FROM public.dashboard_rollout_decide('9f730000-0000-0000-0000-000000000011', 'spaeter', 3, 4, 'd7730000-0000-0000-0000-000000000011')),
  'spaeter', 'Entscheidung mit passender Dashboard-ID wird gespeichert'
);
-- Pilotkopie gelöscht, ein Duplikat mit derselben Revision bleibt: Entscheidung verfällt
RESET ROLE;
DELETE FROM public.dashboards WHERE id = 'd7730000-0000-0000-0000-000000000011';
UPDATE public.dashboards SET revision = 4 WHERE id = 'd7730000-0000-0000-0000-000000000111';
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"9f730000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT is(
  (SELECT v2_dashboard_id::text || '/' || entscheidung_gueltig::text FROM public.dashboard_v1_v2_reconciliation() WHERE user_id = '9f730000-0000-0000-0000-000000000011'),
  'd7730000-0000-0000-0000-000000000111/false', 'Ausgetauschte Pilotkopie bei gleicher Revision: Entscheidung verfallen'
);
-- Metadaten außerhalb des Ganzzahlbereichs brechen den Abgleich nicht ab
RESET ROLE;
UPDATE public.dashboards
SET config = jsonb_set(config, '{metadata,last_migrated_revision}', '2147483648'::jsonb)
WHERE id = 'd7730000-0000-0000-0000-000000000015';
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"9f730000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.dashboard_v1_v2_reconciliation()), 5, 'Überlaufender Metadatenwert lässt den Abgleich laufen');
SELECT is(
  (SELECT coalesce(last_migrated_revision::text, 'leer') FROM public.dashboard_v1_v2_reconciliation() WHERE user_id = '9f730000-0000-0000-0000-000000000015'),
  'leer', 'Ungültiger Metadatenwert gilt als fehlende Herkunft'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
