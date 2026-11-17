-- Sicherheitskorrektur (Auftrag FIX_DASHBOARD_REVISIONS_SCOPE):
-- get_dashboard_v2_revisions darf Revisionen von Team-Dashboards nicht an
-- beliebige Mitglieder der Organisation herausgeben. Bis P11 (Auftrag 162)
-- sind ausschließlich eigene persönliche Dashboards lesbar.
--
-- Vor der Migration 20261121_dashboard_revisions_scope_guard.sql rot
-- (Tests 1 und 2), danach grün. Läuft komplett in BEGIN … ROLLBACK.

BEGIN;

SELECT plan(6);

-- ---------------------------------------------------------------- Setup --
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('9f210000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin-a@fix-rev.local', 'x', now()),
  ('9f210000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'viewer-a@fix-rev.local', 'x', now()),
  ('9f210000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'admin-b@fix-rev.local', 'x', now());

INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('af210000-0000-0000-0000-00000000000a', 'Org A (Fix Rev)', 'synthetic', 'active'),
  ('af210000-0000-0000-0000-00000000000b', 'Org B (Fix Rev)', 'synthetic', 'active');

INSERT INTO public.organization_members (user_id, organization_id, role, status)
VALUES
  ('9f210000-0000-0000-0000-000000000001', 'af210000-0000-0000-0000-00000000000a', 'admin', 'active'),
  ('9f210000-0000-0000-0000-000000000002', 'af210000-0000-0000-0000-00000000000a', 'viewer', 'active'),
  ('9f210000-0000-0000-0000-000000000003', 'af210000-0000-0000-0000-00000000000b', 'admin', 'active');

-- Team in Org A, nur der Admin ist Mitglied
INSERT INTO public.dashboard_teams (id, organization_id, name)
VALUES ('cf210000-0000-0000-0000-000000000001', 'af210000-0000-0000-0000-00000000000a', 'Vertrieb Süd');

INSERT INTO public.dashboard_team_members (team_id, user_id, organization_id)
VALUES ('cf210000-0000-0000-0000-000000000001', '9f210000-0000-0000-0000-000000000001', 'af210000-0000-0000-0000-00000000000a');

-- Team-Dashboard direkt angelegt (über RPC bis P11 gesperrt; simuliert z. B.
-- eine Service-Role-Zeile oder einen künftigen P11-Stand)
INSERT INTO public.dashboards (id, organization_id, scope, user_id, team_id, title, config, revision, created_by_user_id)
VALUES (
  'df210000-0000-0000-0000-000000000001', 'af210000-0000-0000-0000-00000000000a', 'team', NULL,
  'cf210000-0000-0000-0000-000000000001', 'Team-Board', '{}'::jsonb, 1, '9f210000-0000-0000-0000-000000000001'
);

INSERT INTO public.dashboard_revisions (dashboard_id, organization_id, revision, title, config, created_by_user_id, change_summary)
VALUES (
  'df210000-0000-0000-0000-000000000001', 'af210000-0000-0000-0000-00000000000a', 1, 'Team-Board', '{}'::jsonb,
  '9f210000-0000-0000-0000-000000000001', 'vertraulich'
);

-- Persönliches Dashboard des Admins (Regressionsfall)
INSERT INTO public.dashboards (id, organization_id, scope, user_id, team_id, title, config, revision, created_by_user_id)
VALUES (
  'df210000-0000-0000-0000-000000000002', 'af210000-0000-0000-0000-00000000000a', 'personal',
  '9f210000-0000-0000-0000-000000000001', NULL, 'Mein Board', '{}'::jsonb, 1, '9f210000-0000-0000-0000-000000000001'
);

INSERT INTO public.dashboard_revisions (dashboard_id, organization_id, revision, title, config, created_by_user_id)
VALUES (
  'df210000-0000-0000-0000-000000000002', 'af210000-0000-0000-0000-00000000000a', 1, 'Mein Board', '{}'::jsonb,
  '9f210000-0000-0000-0000-000000000001'
);

SET ROLE authenticated;

-- ---------------------------------------------------------------- Tests --

-- 1. Viewer derselben Org ohne Teammitgliedschaft sieht keine Team-Revisionen
SELECT set_config('request.jwt.claims', '{"sub":"9f210000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT throws_ok(
  $$ SELECT * FROM public.get_dashboard_v2_revisions('df210000-0000-0000-0000-000000000001') $$,
  'P0002',
  'LP_DASHBOARD_NOT_FOUND',
  'Nicht-Mitglied derselben Organisation erhält keine Team-Revisionen'
);

-- 2. Bis P11 auch nicht der Admin (Team-Scope ist gesperrt, Rechte folgen erst mit 162)
SELECT set_config('request.jwt.claims', '{"sub":"9f210000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT throws_ok(
  $$ SELECT * FROM public.get_dashboard_v2_revisions('df210000-0000-0000-0000-000000000001') $$,
  'P0002',
  'LP_DASHBOARD_NOT_FOUND',
  'Team-Revisionen bleiben bis P11 für alle gesperrt'
);

-- 3. Regression: Eigentümer liest eigene persönliche Revisionen
SELECT is(
  (SELECT count(*)::integer FROM public.get_dashboard_v2_revisions('df210000-0000-0000-0000-000000000002')),
  1,
  'Eigentümer sieht die Revisionen seines persönlichen Dashboards'
);

-- 4. Anderer Nutzer derselben Org sieht fremde persönliche Revisionen nicht
SELECT set_config('request.jwt.claims', '{"sub":"9f210000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT throws_ok(
  $$ SELECT * FROM public.get_dashboard_v2_revisions('df210000-0000-0000-0000-000000000002') $$,
  'P0002',
  'LP_DASHBOARD_NOT_FOUND',
  'Fremdes persönliches Dashboard bleibt unsichtbar'
);

-- 5. Fremde Organisation sieht nichts
SELECT set_config('request.jwt.claims', '{"sub":"9f210000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT throws_ok(
  $$ SELECT * FROM public.get_dashboard_v2_revisions('df210000-0000-0000-0000-000000000001') $$,
  'P0002',
  'LP_DASHBOARD_NOT_FOUND',
  'Fremde Organisation erhält keine Team-Revisionen'
);

-- 6. anon darf die Funktion nicht ausführen
RESET ROLE;
SELECT ok(
  NOT has_function_privilege('anon', 'public.get_dashboard_v2_revisions(uuid)', 'EXECUTE'),
  'anon hat kein EXECUTE-Recht'
);

ROLLBACK;
