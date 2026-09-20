-- G59 (Auftrag 067M, Step 1): pgTAP-Tests für Mitgliederverwaltung,
-- Einladungen und die Datenbank-Invariante LAST_ACTIVE_ADMIN.
--
-- Ausführung: supabase test db (lokal).
-- Vor der 067M-Migration rot (Tabelle organization_invitations und
-- Trigger LAST_ACTIVE_ADMIN fehlen noch), danach grün.

BEGIN;

SELECT plan(16);

-- ---------------------------------------------------------------- Setup --
-- Feste, kollisionsfreie UUIDs für deterministische Testläufe.
-- Cleanup vorab für idempotente Re-Runs (FKs beachten).
DELETE FROM public.imported_funnel_deals WHERE organization_id IN (
  'a0000000-0000-0000-0000-00000000000a',
  'b0000000-0000-0000-0000-00000000000b'
);
DELETE FROM public.contacts WHERE organization_id IN (
  'a0000000-0000-0000-0000-00000000000a',
  'b0000000-0000-0000-0000-00000000000b'
);
DELETE FROM public.companies WHERE organization_id IN (
  'a0000000-0000-0000-0000-00000000000a',
  'b0000000-0000-0000-0000-00000000000b'
);
DELETE FROM public.organization_members WHERE organization_id IN (
  'a0000000-0000-0000-0000-00000000000a',
  'b0000000-0000-0000-0000-00000000000b'
);
DELETE FROM public.organizations WHERE id IN (
  'a0000000-0000-0000-0000-00000000000a',
  'b0000000-0000-0000-0000-00000000000b'
);
DELETE FROM auth.users WHERE email LIKE '%@member-test.local';

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'admin-a1@member-test.local', 'x', now()),
  ('a2222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'manager-a@member-test.local', 'x', now()),
  ('a3333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'viewer-a@member-test.local', 'x', now()),
  ('b4444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'admin-b@member-test.local', 'x', now()),
  ('a7777777-7777-7777-7777-777777777777', 'authenticated', 'authenticated', 'admin-a2@member-test.local', 'x', now());

INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('a0000000-0000-0000-0000-00000000000a', 'Org A (Member Test)', 'synthetic', 'active'),
  ('b0000000-0000-0000-0000-00000000000b', 'Org B (Member Test)', 'synthetic', 'active');

-- Org A: Anfangs genau ein Admin (Admin A1), ein Manager, ein Viewer
INSERT INTO public.organization_members (user_id, organization_id, role, status)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-00000000000a', 'admin', 'active'),
  ('a2222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-00000000000a', 'manager', 'active'),
  ('a3333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-00000000000a', 'viewer', 'active'),
  ('b4444444-4444-4444-4444-444444444444', 'b0000000-0000-0000-0000-00000000000b', 'admin', 'active');

-- --------------------------------- 1: Tabelle organization_invitations existiert
SELECT has_table('public', 'organization_invitations', 'Tabelle organization_invitations existiert');

-- --------------------------------- 2..4: LAST_ACTIVE_ADMIN Invariante (Org mit 1 Admin)
-- Versuch 1: Admin A1 auf 'viewer' herabstufen -> muss mit LAST_ACTIVE_ADMIN scheitern
SELECT throws_matching(
  $$ UPDATE public.organization_members
     SET role = 'viewer'
     WHERE user_id = 'a1111111-1111-1111-1111-111111111111'
       AND organization_id = 'a0000000-0000-0000-0000-00000000000a' $$,
  'LAST_ACTIVE_ADMIN',
  'Herabstufung des einzigen aktiven Admins scheitert mit LAST_ACTIVE_ADMIN'
);

-- Versuch 2: Admin A1 suspendieren (status = suspended) -> muss mit LAST_ACTIVE_ADMIN scheitern
SELECT throws_matching(
  $$ UPDATE public.organization_members
     SET status = 'suspended'
     WHERE user_id = 'a1111111-1111-1111-1111-111111111111'
       AND organization_id = 'a0000000-0000-0000-0000-00000000000a' $$,
  'LAST_ACTIVE_ADMIN',
  'Deaktivierung des einzigen aktiven Admins scheitert mit LAST_ACTIVE_ADMIN'
);

-- Versuch 3: Admin A1 löschen (DELETE) -> muss mit LAST_ACTIVE_ADMIN scheitern
SELECT throws_matching(
  $$ DELETE FROM public.organization_members
     WHERE user_id = 'a1111111-1111-1111-1111-111111111111'
       AND organization_id = 'a0000000-0000-0000-0000-00000000000a' $$,
  'LAST_ACTIVE_ADMIN',
  'Loeschung des einzigen aktiven Admins scheitert mit LAST_ACTIVE_ADMIN'
);

-- Versuch 4: Loeschung des einzigen Mitglieds einer Organisation (Org B hat nur Admin B, v_remaining_members = 0)
SELECT throws_matching(
  $$ DELETE FROM public.organization_members
     WHERE user_id = 'b4444444-4444-4444-4444-444444444444'
       AND organization_id = 'b0000000-0000-0000-0000-00000000000b' $$,
  'LAST_ACTIVE_ADMIN',
  'Loeschung des einzigen Mitglieds (Admin) einer Organisation scheitert mit LAST_ACTIVE_ADMIN'
);

-- --------------------------------- 5..8: Multi-Admin Verhalten
-- Zweiten Admin hinzufügen
INSERT INTO public.organization_members (user_id, organization_id, role, status)
VALUES ('a7777777-7777-7777-7777-777777777777', 'a0000000-0000-0000-0000-00000000000a', 'admin', 'active');

-- Nun hat Org A zwei aktive Admins. Herabstufung von Admin A1 muss gelingen!
SELECT lives_ok(
  $$ UPDATE public.organization_members
     SET role = 'manager'
     WHERE user_id = 'a1111111-1111-1111-1111-111111111111'
       AND organization_id = 'a0000000-0000-0000-0000-00000000000a' $$,
  'Herabstufung eines Admins gelingt, wenn ein weiterer aktiver Admin existiert'
);

SELECT is(
  (SELECT role FROM public.organization_members WHERE user_id = 'a1111111-1111-1111-1111-111111111111'),
  'manager',
  'Admin A1 ist nun manager'
);

-- Nun ist Admin A2 der einzige aktive Admin von Org A. Versuch, A2 herabzustufen, muss scheitern!
SELECT throws_matching(
  $$ UPDATE public.organization_members
     SET role = 'viewer'
     WHERE user_id = 'a7777777-7777-7777-7777-777777777777'
       AND organization_id = 'a0000000-0000-0000-0000-00000000000a' $$,
  'LAST_ACTIVE_ADMIN',
  'Herabstufung des nun letzten verbleibenden Admins scheitert wieder mit LAST_ACTIVE_ADMIN'
);

-- Versuch, Admin A2 zu deaktivieren, muss ebenfalls scheitern!
SELECT throws_matching(
  $$ UPDATE public.organization_members
     SET status = 'suspended'
     WHERE user_id = 'a7777777-7777-7777-7777-777777777777'
       AND organization_id = 'a0000000-0000-0000-0000-00000000000a' $$,
  'LAST_ACTIVE_ADMIN',
  'Deaktivierung des nun letzten verbleibenden Admins scheitert mit LAST_ACTIVE_ADMIN'
);

-- --------------------------------- 9..11: Nicht-Admin Mitglieder duerfen geaendert/deaktiviert werden
SELECT lives_ok(
  $$ UPDATE public.organization_members
     SET role = 'viewer'
     WHERE user_id = 'a2222222-2222-2222-2222-222222222222'
       AND organization_id = 'a0000000-0000-0000-0000-00000000000a' $$,
  'Manager darf ohne LAST_ACTIVE_ADMIN herabgestuft werden'
);

SELECT lives_ok(
  $$ UPDATE public.organization_members
     SET status = 'suspended'
     WHERE user_id = 'a3333333-3333-3333-3333-333333333333'
       AND organization_id = 'a0000000-0000-0000-0000-00000000000a' $$,
  'Viewer darf ohne LAST_ACTIVE_ADMIN suspendiert werden'
);

SELECT lives_ok(
  $$ DELETE FROM public.organization_members
     WHERE user_id = 'a3333333-3333-3333-3333-333333333333'
       AND organization_id = 'a0000000-0000-0000-0000-00000000000a' $$,
  'Suspendierter Viewer darf geloescht werden'
);

-- --------------------------------- 12..14: RLS Default-Deny fuer Direktzugriffe
-- Wir wechseln zur authentifizierten Rolle von Manager A
SELECT set_config('request.jwt.claims', '{"sub":"a2222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
SET ROLE authenticated;

-- Direkter INSERT auf organization_members muss fuer authenticated geblockt sein
SELECT throws_matching(
  $$ INSERT INTO public.organization_members (user_id, organization_id, role)
     VALUES ('a3333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-00000000000a', 'admin') $$,
  'row-level security policy|42501|permission denied',
  'Direkter INSERT auf organization_members durch authenticated ist per RLS verboten'
);

-- Direkter INSERT auf organization_invitations muss fuer authenticated geblockt sein
SELECT throws_matching(
  $$ INSERT INTO public.organization_invitations (organization_id, email, role, invited_by)
     VALUES ('a0000000-0000-0000-0000-00000000000a', 'new@test.local', 'admin', 'a2222222-2222-2222-2222-222222222222') $$,
  'row-level security policy|42501|permission denied',
  'Direkter INSERT auf organization_invitations durch authenticated ist per RLS verboten'
);

-- Direkter UPDATE auf organization_invitations muss fuer authenticated geblockt sein
SELECT throws_matching(
  $$ UPDATE public.organization_invitations
     SET status = 'accepted'
     WHERE organization_id = 'a0000000-0000-0000-0000-00000000000a' $$,
  'row-level security policy|42501|permission denied',
  'Direkter UPDATE auf organization_invitations durch authenticated ist per RLS verboten'
);

-- --------------------------------- 15: Einladungs-Status Constraint
-- Zurueck zur postgres Rolle
RESET ROLE;
SELECT throws_matching(
  $$ INSERT INTO public.organization_invitations (organization_id, email, role, invited_by, status)
     VALUES ('a0000000-0000-0000-0000-00000000000a', 'invalid@test.local', 'viewer', 'a1111111-1111-1111-1111-111111111111', 'invalid_status') $$,
  'check constraint',
  'Ungueltiger Einladungsstatus wird durch CHECK constraint abgewiesen'
);

ROLLBACK;
