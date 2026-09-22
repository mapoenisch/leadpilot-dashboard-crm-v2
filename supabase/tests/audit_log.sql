-- G62-Nacharbeit (Auftrag 067P, Review-Befund P0 + P1, Scope-Erweiterung
-- 2026-09-22; RPC-Entfernung am 2026-09-22 angewiesen): pgTAP-Tests fuer
-- audit_log-Haertung.
-- Prueft: Direkte INSERTs sind fuer ALLE Rollen blockiert (42501), die RPC
-- `log_audit_event()` EXISTIERT NICHT MEHR (42883 — kein schreibender
-- Einstieg), echte Ereignisse erzeugt der DB-Trigger
-- `trg_audit_log_member_changes` auf `organization_members`, UPDATE/DELETE
-- bleiben verboten, PII-Spalten (actor_email, ip_address) existieren nicht.
-- Ausfuehrung: npx supabase test db

BEGIN;

SELECT plan(18);

-- ---------------------------------------------------------------- Setup --
-- G62: audit_log ist append-only (Immutabilitaets-Trigger) — alte Test-Zeilen
-- sind nicht per DELETE entfernbar, solange der Trigger aktiv ist. Fuer
-- idempotente Re-Runs: Member-Trigger pausieren, alte Zeilen loeschen,
-- Schutz wieder aktivieren.
ALTER TABLE public.organization_members DISABLE TRIGGER trg_audit_log_member_changes;
ALTER TABLE public.audit_log DISABLE TRIGGER trg_audit_log_immutable;
DELETE FROM public.audit_log WHERE organization_id IN (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
);
ALTER TABLE public.audit_log ENABLE TRIGGER trg_audit_log_immutable;
DELETE FROM public.audit_log WHERE organization_id IN (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
);
DELETE FROM public.organization_members WHERE organization_id IN (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
);
DELETE FROM public.organizations WHERE id IN (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
);
DELETE FROM auth.users WHERE email LIKE '%@audit-test.local';

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin-c@audit-test.local', 'x', now()),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'manager-c@audit-test.local', 'x', now()),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'viewer-c@audit-test.local', 'x', now()),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'admin-d@audit-test.local', 'x', now());

INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Org C (Audit-Test)', 'synthetic', 'active'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Org D (Audit-Test)', 'synthetic', 'active');

INSERT INTO public.organization_members (user_id, organization_id, role)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'admin'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'manager'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'viewer'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'admin');

-- Member-Trigger fuer den Test-Body reaktivieren (Setup-INSERTs feuern ihn
-- bewusst nicht, damit die Count-Assertions deterministisch bleiben).
ALTER TABLE public.organization_members ENABLE TRIGGER trg_audit_log_member_changes;

-- Seed-Eintraege als Superuser (umgeht RLS direkt, kein PII mehr)
INSERT INTO public.audit_log (id, organization_id, actor_id, action, details)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'auth.login',
    '{}'::JSONB
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'aaaaaaaa-0000-0000-0000-000000000004',
    'auth.login',
    '{}'::JSONB
  );

-- ---------------------------------------------------------------- Test 1-3: Admin SELECT (eigene Org, Isolation) --
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL role TO authenticated;

SELECT ok(
  (SELECT COUNT(*) FROM public.audit_log WHERE organization_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' AND action = 'auth.login') = 1,
  'Admin (Org C) kann eigene audit_log-Eintraege lesen'
);

SELECT ok(
  (SELECT COUNT(*) FROM public.audit_log WHERE organization_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd') = 0,
  'Admin (Org C) sieht keine Eintraege von Org D (Cross-Tenant-Isolation)'
);

SELECT ok(
  (SELECT action FROM public.audit_log WHERE id = 'a0000000-0000-0000-0000-000000000001') = 'auth.login',
  'Admin (Org C) liest korrekten Aktionsnamen'
);

-- ---------------------------------------------------------------- Test 4: Manager kann nicht SELECTen --
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL role TO authenticated;

SELECT ok(
  (SELECT COUNT(*) FROM public.audit_log WHERE organization_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') = 0,
  'Manager (Org C) kann audit_log nicht lesen (RLS)'
);

-- ---------------------------------------------------------------- Test 5: Viewer kann nicht SELECTen --
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
SET LOCAL role TO authenticated;

SELECT ok(
  (SELECT COUNT(*) FROM public.audit_log WHERE organization_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') = 0,
  'Viewer (Org C) kann audit_log nicht lesen (RLS)'
);

-- ---------------------------------------------------------------- Test 6: Cross-Tenant SELECT --
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000004","role":"authenticated"}',
  true
);
SET LOCAL role TO authenticated;

SELECT ok(
  (SELECT COUNT(*) FROM public.audit_log WHERE organization_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') = 0,
  'Admin (Org D) sieht keine Org-C-Eintraege (Cross-Tenant-Isolation)'
);

-- ---------------------------------------------------------------- Test 7-9: Direkte INSERTs sind fuer ALLE blockiert (P0) --
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL role TO authenticated;

SELECT throws_ok(
  $$
    INSERT INTO public.audit_log (organization_id, actor_id, action, details)
    VALUES (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'aaaaaaaa-0000-0000-0000-000000000001',
      'auth.login',
      '{}'::JSONB
    )
  $$,
  '42501',
  NULL,
  'Direkter INSERT als Admin schlaegt fehl (kein Browser-Schreibrecht)'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL role TO authenticated;

SELECT throws_ok(
  $$
    INSERT INTO public.audit_log (organization_id, actor_id, action, details)
    VALUES (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'aaaaaaaa-0000-0000-0000-000000000002',
      'scenario.run_started',
      '{}'::JSONB
    )
  $$,
  '42501',
  NULL,
  'Direkter INSERT als Manager schlaegt fehl (kein Browser-Schreibrecht)'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
SET LOCAL role TO authenticated;

SELECT throws_ok(
  $$
    INSERT INTO public.audit_log (organization_id, actor_id, action, details)
    VALUES (
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'aaaaaaaa-0000-0000-0000-000000000003',
      'auth.login',
      '{}'::JSONB
    )
  $$,
  '42501',
  NULL,
  'Direkter INSERT als Viewer in fremde Org schlaegt fehl (kein Browser-Schreibrecht)'
);

-- ---------------------------------------------------------------- Test 10: Kein RPC-Einstieg mehr (P0) --
-- `public.log_audit_event(...)` ist ersatzlos entfernt (Migration 20260930,
-- Abschnitt 3): Es existiert kein schreibender RPC-Einstieg mehr — weder fuer
-- Browser-Rollen noch sonst. Der Funktionsname darf nicht mehr aufgeloest werden.
SELECT throws_ok(
  $$ SELECT public.log_audit_event('auth.logout', NULL, NULL, '{}'::JSONB, NULL) $$,
  '42883',
  NULL,
  'RPC log_audit_event existiert nicht mehr (undefined_function)'
);

-- ---------------------------------------------------------------- Test 11-12: UPDATE und DELETE schlagen fehl --
RESET role;

SELECT throws_ok(
  $$
    UPDATE public.audit_log
    SET action = 'tampered'
    WHERE id = 'a0000000-0000-0000-0000-000000000001'
  $$,
  'P0001',
  NULL,
  'UPDATE auf audit_log schlaegt fehl (Immutabilitaets-Trigger)'
);

SELECT throws_ok(
  $$
    DELETE FROM public.audit_log
    WHERE id = 'a0000000-0000-0000-0000-000000000001'
  $$,
  'P0001',
  NULL,
  'DELETE auf audit_log schlaegt fehl (Immutabilitaets-Trigger)'
);

-- ---------------------------------------------------------------- Test 13: Keine PII-Spalten mehr --
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_log'
      AND column_name IN ('actor_email', 'ip_address')
  ),
  'PII-Spalten actor_email und ip_address existieren nicht (G62: keine PII)'
);

-- ---------------------------------------------------------------- Test 14-15: Kernspalten vorhanden --
SELECT has_column('public', 'audit_log', 'id', 'Spalte id vorhanden');
SELECT has_column('public', 'audit_log', 'organization_id', 'Spalte organization_id vorhanden');

-- ---------------------------------------------------------------- Test 16-18: DB-Trigger als produktiver Producer (P1) --
-- Echte Mitglieds-Aktionen erzeugen Audit-Zeilen ohne jeden Browser-Schreibpfad:
-- Organisation aus der Zeile, Akteur aus der Sitzung, Details ohne PII.
UPDATE public.organization_members
SET role = 'manager'
WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000003'
  AND organization_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.audit_log
    WHERE organization_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
      AND action = 'member.role_changed'
      AND target_type = 'member'
      AND target_id = 'aaaaaaaa-0000-0000-0000-000000000003'
      AND details->>'old_role' = 'viewer'
      AND details->>'new_role' = 'manager'
  ),
  'Trigger protokolliert Rollenwechsel (member.role_changed mit Org aus der Zeile)'
);

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES ('aaaaaaaa-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'trigger-e@audit-test.local', 'x', now());

INSERT INTO public.organization_members (user_id, organization_id, role)
VALUES ('aaaaaaaa-0000-0000-0000-000000000005', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'viewer');

SELECT ok(
  EXISTS (
    SELECT 1 FROM public.audit_log
    WHERE organization_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
      AND action = 'member.invited'
      AND target_type = 'member'
      AND target_id = 'aaaaaaaa-0000-0000-0000-000000000005'
  ),
  'Trigger protokolliert Einladung/Beitritt (member.invited)'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.audit_log
    WHERE organization_id IN ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd')
      AND (details ? 'email' OR details ? 'actor_email' OR details ? 'ip_address')
  ),
  'Trigger-Details enthalten keine PII-Schluessel (G62: keine PII)'
);

-- ---------------------------------------------------------------- Teardown --
RESET role;

SELECT * FROM finish();
ROLLBACK;
