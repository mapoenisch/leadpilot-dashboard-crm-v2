-- G59 (Auftrag 067M, Step 1): pgTAP-Tests für Mitgliederverwaltung,
-- Einladungen und die Datenbank-Invariante LAST_ACTIVE_ADMIN.
--
-- Ausführung: supabase test db (lokal).
-- Vor der 067M-Migration rot (Tabelle organization_invitations und
-- Trigger LAST_ACTIVE_ADMIN fehlen noch), danach grün.

BEGIN;

SELECT plan(31);
SET CONSTRAINTS ALL IMMEDIATE;

-- ---------------------------------------------------------------- Setup --
-- Feste, kollisionsfreie UUIDs für deterministische Testläufe.
-- Cleanup vorab für idempotente Re-Runs (FKs beachten).
-- G62-Folgeanpassung (Trigger trg_audit_log_member_changes, genehmigte
-- Scope-Erweiterung 2026-09-22): audit_log ist append-only — alte Test-Zeilen
-- werden bei pausierten Triggern geloescht, Member-Cleanup erzeugt keine
-- neuen Audit-Zeilen.
ALTER TABLE public.organization_members DISABLE TRIGGER trg_audit_log_member_changes;
ALTER TABLE public.audit_log DISABLE TRIGGER trg_audit_log_immutable;
DELETE FROM public.audit_log WHERE organization_id IN (
  'a0000000-0000-0000-0000-00000000000a',
  'b0000000-0000-0000-0000-00000000000b'
);
ALTER TABLE public.audit_log ENABLE TRIGGER trg_audit_log_immutable;
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

-- G62-Folgeanpassung: Member-Trigger fuer den Test-Body reaktivieren.
ALTER TABLE public.organization_members ENABLE TRIGGER trg_audit_log_member_changes;

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'admin-a1@member-test.local', 'x', now()),
  ('a2222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'manager-a@member-test.local', 'x', now()),
  ('a3333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'viewer-a@member-test.local', 'x', now()),
  ('b4444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'admin-b@member-test.local', 'x', now()),
  ('a7777777-7777-7777-7777-777777777777', 'authenticated', 'authenticated', 'admin-a2@member-test.local', 'x', now()),
  ('a8888888-8888-8888-8888-888888888888', 'authenticated', 'authenticated', 'invitee@member-test.local', 'x', now());

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

-- --------------------------------- 15..19: Atomare Einladungsannahme (accept_organization_invitation)
RESET ROLE;
-- Vorbereitung Test-Einladung
INSERT INTO public.organization_invitations (id, organization_id, email, role, invited_by, status)
VALUES ('e1111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-00000000000a', 'invitee@member-test.local', 'manager', 'a1111111-1111-1111-1111-111111111111', 'pending');

-- 16: Erfolgreiche Annahme legt Mitgliedschaft atomar an
SELECT lives_ok(
  $$ SELECT public.accept_organization_invitation('a8888888-8888-8888-8888-888888888888', 'invitee@member-test.local', 'e1111111-1111-1111-1111-111111111111') $$,
  'accept_organization_invitation gelingt fuer gueltige Einladung atomar'
);

-- Pruefe, dass Status nun 'accepted' ist und Mitglied existiert
SELECT is(
  (SELECT status FROM public.organization_invitations WHERE id = 'e1111111-1111-1111-1111-111111111111'),
  'accepted',
  'Einladungsstatus nach Annahme ist accepted'
);

SELECT is(
  (SELECT role FROM public.organization_members WHERE user_id = 'a8888888-8888-8888-8888-888888888888' AND organization_id = 'a0000000-0000-0000-0000-00000000000a'),
  'manager',
  'Mitgliedschaft nach Annahme hat die vorgesehene Rolle'
);

-- 18: Erneute Annahme der bereits angenommenen Einladung scheitert mit INVITATION_NOT_PENDING
SELECT throws_matching(
  $$ SELECT public.accept_organization_invitation('a8888888-8888-8888-8888-888888888888', 'invitee@member-test.local', 'e1111111-1111-1111-1111-111111111111') $$,
  'INVITATION_NOT_PENDING',
  'Erneute Annahme scheitert mit INVITATION_NOT_PENDING'
);

-- 19: Annahme einer nicht existierenden Einladung scheitert mit NOT_FOUND
SELECT throws_matching(
  $$ SELECT public.accept_organization_invitation('a8888888-8888-8888-8888-888888888888', 'nonexistent@member-test.local') $$,
  'NOT_FOUND',
  'Annahme nicht existierender Einladung scheitert mit NOT_FOUND'
);

-- --------------------------------- 20: Einladungs-Status Constraint
SELECT throws_matching(
  $$ INSERT INTO public.organization_invitations (organization_id, email, role, invited_by, status)
     VALUES ('a0000000-0000-0000-0000-00000000000a', 'invalid@test.local', 'viewer', 'a1111111-1111-1111-1111-111111111111', 'invalid_status') $$,
  'check constraint',
  'Ungueltiger Einladungsstatus wird durch CHECK constraint abgewiesen'
);

-- --------------------------------- 21: P0: Direkter RPC-Bypass durch authenticated wird abgewiesen
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO 'a8888888-8888-8888-8888-888888888888';
SELECT throws_matching(
  $$ SELECT public.accept_organization_invitation('a8888888-8888-8888-8888-888888888888', 'invitee@member-test.local') $$,
  'permission denied|FORBIDDEN|42501',
  'Direkter RPC-Aufruf von accept_organization_invitation durch authenticated wird abgewiesen'
);
RESET ROLE;

-- --------------------------------- 22: P1: Organisationswechsel ueber Einladung wird abgewiesen
INSERT INTO public.organization_invitations (id, organization_id, email, role, invited_by, status)
VALUES ('e2222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-00000000000a', 'admin-b@member-test.local', 'viewer', 'a1111111-1111-1111-1111-111111111111', 'pending');

SELECT throws_matching(
  $$ SELECT public.accept_organization_invitation('b4444444-4444-4444-4444-444444444444', 'admin-b@member-test.local', 'e2222222-2222-2222-2222-222222222222') $$,
  'CANNOT_CHANGE_ORGANIZATION',
  'Organisationswechsel eines bestehenden Mitglieds wird abgewiesen'
);

-- --------------------------------- 23: P2: E-Mail-Mismatch wird mit FORBIDDEN abgewiesen
INSERT INTO public.organization_invitations (id, organization_id, email, role, invited_by, status)
VALUES ('e3333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-00000000000a', 'mismatch@member-test.local', 'viewer', 'a1111111-1111-1111-1111-111111111111', 'pending');

SELECT throws_matching(
  $$ SELECT public.accept_organization_invitation('a8888888-8888-8888-8888-888888888888', 'other@member-test.local', 'e3333333-3333-3333-3333-333333333333') $$,
  'FORBIDDEN',
  'E-Mail-Mismatch bei Einladungsannahme wird mit FORBIDDEN abgewiesen'
);

-- --------------------------------- 24: P1: Automatischer Trigger bei E-Mail-Bestaetigung in auth.users
INSERT INTO public.organization_invitations (id, organization_id, email, role, invited_by, status)
VALUES ('e4444444-4444-4444-4444-444444444444', 'a0000000-0000-0000-0000-00000000000a', 'autouser@member-test.local', 'viewer', 'a1111111-1111-1111-1111-111111111111', 'pending');

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at)
VALUES ('a9999999-9999-9999-9999-999999999999', 'authenticated', 'authenticated', 'autouser@member-test.local', 'x', now(), now());

SELECT is(
  (SELECT status FROM public.organization_invitations WHERE id = 'e4444444-4444-4444-4444-444444444444'),
  'accepted',
  'Trigger nimmt Einladung bei Auth-User Bestaetigung automatisch an'
);

SELECT is(
  (SELECT role FROM public.organization_members WHERE user_id = 'a9999999-9999-9999-9999-999999999999'),
  'viewer',
  'Trigger legt Mitgliedschaft fuer bestaetigten User automatisch an'
);

-- --------------------------------- 25..29: P1: Zwei Organisationen mit derselben Empfaenger-E-Mail
-- Beide Organisationen (Org A und Org B) erstellen eine offene Einladung fuer dieselbe E-Mail
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES ('c1111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'multi@member-test.local', 'x', now());

INSERT INTO public.organization_invitations (id, organization_id, email, role, invited_by, status, created_at)
VALUES
  ('e5555555-5555-5555-5555-555555555555', 'a0000000-0000-0000-0000-00000000000a', 'multi@member-test.local', 'manager', 'a1111111-1111-1111-1111-111111111111', 'pending', now() - INTERVAL '1 hour'),
  ('e6666666-6666-6666-6666-666666666666', 'b0000000-0000-0000-0000-00000000000b', 'multi@member-test.local', 'viewer', 'b4444444-4444-4444-4444-444444444444', 'pending', now());

-- 25: Annahme ohne invitation_id MUSS mit AMBIGUOUS_INVITATION scheitern (kein blindes Raten/ORDER BY created_at DESC)
SELECT throws_matching(
  $$ SELECT public.accept_organization_invitation('c1111111-1111-1111-1111-111111111111', 'multi@member-test.local') $$,
  'AMBIGUOUS_INVITATION',
  'Annahme ohne invitation_id scheitert bei mehreren offenen Einladungen mit AMBIGUOUS_INVITATION'
);

-- 26: Annahme mit konkreter ID von Einladung A gelingt atomar
SELECT lives_ok(
  $$ SELECT public.accept_organization_invitation('c1111111-1111-1111-1111-111111111111', 'multi@member-test.local', 'e5555555-5555-5555-5555-555555555555') $$,
  'Annahme mit konkreter ID fuer Org A gelingt trotz zweiter offener Einladung'
);

-- 27: Einladung A ist status = accepted
SELECT is(
  (SELECT status FROM public.organization_invitations WHERE id = 'e5555555-5555-5555-5555-555555555555'),
  'accepted',
  'Einladung A ist nun accepted'
);

-- 28: Einladung B bleibt unveraendert pending
SELECT is(
  (SELECT status FROM public.organization_invitations WHERE id = 'e6666666-6666-6666-6666-666666666666'),
  'pending',
  'Einladung B bleibt unverändert pending'
);

-- 29: Versuch des nun in Org A gebundenen Users, Einladung B anzunehmen, scheitert mit CANNOT_CHANGE_ORGANIZATION
SELECT throws_matching(
  $$ SELECT public.accept_organization_invitation('c1111111-1111-1111-1111-111111111111', 'multi@member-test.local', 'e6666666-6666-6666-6666-666666666666') $$,
  'CANNOT_CHANGE_ORGANIZATION',
  'Annahme von Einladung B scheitert, da Nutzer bereits Mitglied in Org A ist'
);

SELECT * FROM finish();

-- Teardown: Bereinigung kollidierender Seed-Daten fuer nachfolgende Bestands-Tests (tenant_isolation.sql)
-- G62-Folgeanpassung: Member-Trigger pausieren (keine neuen Audit-Zeilen beim
-- Loeschen), alte Audit-Zeilen bei pausiertem Immutabilitaets-Trigger loeschen
-- — sonst blockiert CASCADE auf die append-only Tabelle den Org-Cleanup.
ALTER TABLE public.organization_members DISABLE TRIGGER trg_audit_log_member_changes;
ALTER TABLE public.audit_log DISABLE TRIGGER trg_audit_log_immutable;
DELETE FROM public.audit_log WHERE organization_id IN (
  'a0000000-0000-0000-0000-00000000000a',
  'b0000000-0000-0000-0000-00000000000b'
);
ALTER TABLE public.audit_log ENABLE TRIGGER trg_audit_log_immutable;
DELETE FROM public.imported_funnel_deals;
DELETE FROM public.contacts;
DELETE FROM public.companies;
UPDATE public.organizations SET status = 'suspended';
DELETE FROM public.organization_invitations;
DELETE FROM public.organization_members;
DELETE FROM public.organizations;
DELETE FROM auth.users WHERE email LIKE '%@member-test.local' OR email LIKE '%@e2e.local' OR id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  'a9999999-9999-9999-9999-999999999999',
  'c1111111-1111-1111-1111-111111111111'
);

COMMIT;
