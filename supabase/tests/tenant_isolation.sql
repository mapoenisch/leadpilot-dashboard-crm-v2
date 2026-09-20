-- G45 (Auftrag 067B, Step 1): Negative Tenant-Isolation-Tests für zwei
-- Organisationen und alle drei Rollen (admin / manager / viewer).
-- Jeder Fremdmandanten-Zugriff (SELECT / INSERT / UPDATE / DELETE, direkt,
-- über Fremdschlüssel oder RPC) muss scheitern oder leer bleiben.
-- Vor der 067B-Migration rot (Schema fehlt), danach grün.
-- Ausführung: supabase test db (lokal) bzw. psql mit pgTAP.

BEGIN;

SELECT plan(27);

-- ---------------------------------------------------------------- Setup --
-- Feste UUIDs für reproduzierbare Läufe; Cleanup zuerst (idempotenter Re-Run).
-- Reihenfolge beachten (FKs): Deals → Contacts → Companies → Members → Organisationen.
DELETE FROM public.imported_funnel_deals;
DELETE FROM public.contacts;
DELETE FROM public.companies;
DELETE FROM public.organizations;
DELETE FROM auth.users WHERE email LIKE '%@tenant-test.local' OR id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666'
);

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'admin-a@tenant-test.local', 'x', now()),
  ('22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'manager-a@tenant-test.local', 'x', now()),
  ('33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'viewer-a@tenant-test.local', 'x', now()),
  ('44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'admin-b@tenant-test.local', 'x', now()),
  ('55555555-5555-5555-5555-555555555555', 'authenticated', 'authenticated', 'viewer-b@tenant-test.local', 'x', now()),
  ('66666666-6666-6666-6666-666666666666', 'authenticated', 'authenticated', 'nomember@tenant-test.local', 'x', now());

INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A (Test)', 'synthetic', 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B (Test)', 'synthetic', 'active');

INSERT INTO public.organization_members (user_id, organization_id, role)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'manager'),
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'viewer'),
  ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin'),
  ('55555555-5555-5555-5555-555555555555', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'viewer');

INSERT INTO public.companies (id, domain, name, industry, city, postal_code, organization_id)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a1.test', 'Firma A1', 'IT', 'Berlin', '10115', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('c0000000-0000-0000-0000-000000000002', 'b1.test', 'Firma B1', 'IT', 'Hamburg', '20095', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- Als Admin von Org A einloggen (JWT-Claims + Rolle setzen).
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SET ROLE authenticated;

-- ------------------------------------------------- 1..4: SELECT-Trennung --
SELECT is(
  (SELECT count(*) FROM public.companies),
  1::bigint,
  'Admin Org A sieht genau eine eigene Company'
);

SELECT is(
  (SELECT count(*) FROM public.companies WHERE organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0::bigint,
  'Admin Org A sieht keine fremde Company'
);

SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*) FROM public.companies),
  1::bigint,
  'Viewer Org A sieht genau eine eigene Company'
);

SELECT is(
  (SELECT count(*) FROM public.companies WHERE id = 'c0000000-0000-0000-0000-000000000002'),
  0::bigint,
  'Viewer Org A sieht fremde Company per Direktzugriff nicht'
);

-- ------------------------------------------------- 5..7: Write-Trennung --
SELECT set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);

SELECT throws_ok(
  $$ INSERT INTO public.companies (id, domain, name, industry, city, postal_code, organization_id)
     VALUES ('c0000000-0000-0000-0000-00000000ff', 'x.test', 'Fremd', 'IT', 'X', '00000', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  NULL,
  'Viewer Org B kann nicht in fremde Org schreiben'
);

SELECT throws_ok(
  $$ INSERT INTO public.contacts (id, company_id, email, first_name, last_name, job_title)
     VALUES ('d0000000-0000-0000-0000-0000000000ff', 'c0000000-0000-0000-0000-000000000001', 'x@x.test', 'X', 'Y', 'Z') $$,
  NULL,
  'Fremdschlüssel-Trick über fremde Company schlägt fehl'
);

SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

CREATE TEMP TABLE IF NOT EXISTS probe_result (n BIGINT);
TRUNCATE probe_result;
DO $$
DECLARE affected INT;
BEGIN
  UPDATE public.companies SET name = 'Gehackt'
  WHERE id = 'c0000000-0000-0000-0000-000000000002';
  GET DIAGNOSTICS affected = ROW_COUNT;
  INSERT INTO probe_result VALUES (affected);
END $$;

SELECT is(
  (SELECT n FROM probe_result),
  0::bigint,
  'Viewer kann fremde Company nicht ändern'
);

-- ------------------------------------------------- 8..10: Rollenmatrix --
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

SELECT lives_ok(
  $$ INSERT INTO public.companies (id, domain, name, industry, city, postal_code, organization_id)
     VALUES ('c0000000-0000-0000-0000-0000000000aa', 'a2.test', 'Firma A2', 'IT', 'Berlin', '10115', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'Admin darf in eigener Org schreiben'
);

SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

SELECT throws_ok(
  $$ INSERT INTO public.companies (id, domain, name, industry, city, postal_code, organization_id)
     VALUES ('c0000000-0000-0000-0000-0000000000ab', 'a3.test', 'Firma A3', 'IT', 'Berlin', '10115', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  NULL,
  'Manager darf CRM-Tabellen nicht schreiben (nur lesen)'
);

SELECT set_config('request.jwt.claims', '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*) FROM public.companies),
  0::bigint,
  'User ohne Mitgliedschaft sieht nichts'
);

-- ------------------------------------------------- 11..13: RPC-Schutz --
SELECT is(
  public.current_organization_id(),
  NULL::uuid,
  'current_organization_id ist ohne Mitgliedschaft NULL'
);

SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

SELECT is(
  public.current_organization_id(),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'current_organization_id liefert eigene Org'
);

SELECT is(
  public.has_org_role(ARRAY['admin']),
  true,
  'Admin besteht Rollenprüfung'
);

-- ------------------------------------------------- 14..16: DELETE + Anon --
SELECT set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);

TRUNCATE probe_result;
DO $$
DECLARE affected INT;
BEGIN
  DELETE FROM public.companies WHERE id = 'c0000000-0000-0000-0000-000000000001';
  GET DIAGNOSTICS affected = ROW_COUNT;
  INSERT INTO probe_result VALUES (affected);
END $$;

SELECT is(
  (SELECT n FROM probe_result),
  0::bigint,
  'Admin Org B kann fremde Company nicht löschen'
);

RESET ROLE;

-- ------------------------------------------------- 15..19: Rollenmatrix je Tabelle
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM public.companies),
  2::bigint,
  'Manager Org A liest eigene Companies (A1, A2)'
);

TRUNCATE probe_result;
DO $$
DECLARE affected INT;
BEGIN
  UPDATE public.companies SET name = 'Manager-Edit'
  WHERE id = 'c0000000-0000-0000-0000-000000000001';
  GET DIAGNOSTICS affected = ROW_COUNT;
  INSERT INTO probe_result VALUES (affected);
END $$;

SELECT is(
  (SELECT n FROM probe_result),
  0::bigint,
  'Manager kann eigene Company nicht ändern'
);

TRUNCATE probe_result;
DO $$
DECLARE affected INT;
BEGIN
  DELETE FROM public.companies WHERE id = 'c0000000-0000-0000-0000-000000000001';
  GET DIAGNOSTICS affected = ROW_COUNT;
  INSERT INTO probe_result VALUES (affected);
END $$;

SELECT is(
  (SELECT n FROM probe_result),
  0::bigint,
  'Manager kann eigene Company nicht löschen'
);

SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

SELECT throws_ok(
  $$ INSERT INTO public.companies (id, domain, name, industry, city, postal_code, organization_id)
     VALUES ('c0000000-0000-0000-0000-0000000000cc', 'ax.test', 'Firma AX', 'IT', 'Berlin', '10115', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  NULL,
  'Viewer kann nicht einmal in eigener Org schreiben'
);

SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

SELECT lives_ok(
  $$ UPDATE public.companies SET name = 'Firma A1' WHERE id = 'c0000000-0000-0000-0000-000000000001' $$,
  'Admin darf in eigener Org ändern'
);

-- ------------------------------------------------- 20..22: FK-Grenzen
SELECT throws_ok(
  $$ INSERT INTO public.companies (id, domain, name, industry, city, postal_code, organization_id)
     VALUES ('c0000000-0000-0000-0000-0000000000dd', 'zz.test', 'Firma ZZ', 'IT', 'X', '00000', '99999999-9999-9999-9999-999999999999') $$,
  NULL,
  'Company mit unbekannter Organisation scheitert am FK'
);

SELECT throws_ok(
  $$ INSERT INTO public.contacts (id, company_id, email, first_name, last_name, job_title, organization_id)
     VALUES ('d0000000-0000-0000-0000-0000000000ee', 'c0000000-0000-0000-0000-000000000002', 'e@e.test', 'E', 'F', 'G', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  NULL,
  'Contact mit fremder Company trotz eigener Org scheitert am zusammengesetzten FK'
);

SELECT lives_ok(
  $$ INSERT INTO public.imported_funnel_deals (id, deal_name, stage, amount, close_date, pipeline, organization_id)
     VALUES ('e0000000-0000-0000-0000-0000000000aa', 'Deal A1', 'LEAD', 1000, '2026-06-01', 'default', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'Admin darf Deal in eigener Org anlegen'
);

-- ------------------------------------------------- 23..26: Suspendierung
SELECT set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*) FROM public.imported_funnel_deals),
  0::bigint,
  'Viewer Org B sieht fremden Deal nicht'
);

RESET ROLE;
UPDATE public.organization_members SET status = 'suspended'
WHERE user_id = '33333333-3333-3333-3333-333333333333';
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*) FROM public.companies),
  0::bigint,
  'Suspendiertes Mitglied sieht nichts mehr'
);

SELECT is(
  public.has_org_role(ARRAY['viewer']),
  false,
  'Suspendiertes Mitglied besteht keine Rollenprüfung'
);

RESET ROLE;
UPDATE public.organization_members SET status = 'active'
WHERE user_id = '33333333-3333-3333-3333-333333333333';
UPDATE public.organizations SET status = 'suspended'
WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*) FROM public.companies),
  0::bigint,
  'Mitglied suspendierter Organisation sieht nichts mehr'
);

RESET ROLE;
UPDATE public.organizations SET status = 'active'
WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

SELECT is(
  (SELECT count(*) FROM public.companies),
  3::bigint,
  'Kontrolle ohne RLS-Rolle: alle Test-Companies bestehen (A1, B1, A2)'
);

SELECT * FROM finish();

ROLLBACK;
