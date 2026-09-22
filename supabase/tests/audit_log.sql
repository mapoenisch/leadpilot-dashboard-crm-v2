-- G62-Nacharbeit (Auftrag 067P, Review-Befund P0 + P1): pgTAP-Tests fuer audit_log-Haertung.
-- Prueft: Direkte INSERTs sind fuer ALLE Rollen blockiert (42501), Audit-Ereignisse
-- laufen ueber log_audit_event() mit serverseitiger Org-/Akteur-Ableitung und
-- geschlossener Action-/Ziel-Whitelist, UPDATE/DELETE bleiben verboten,
-- PII-Spalten (actor_email, ip_address) existieren nicht mehr.
-- Ausfuehrung: npx supabase test db

BEGIN;

SELECT plan(19);

-- ---------------------------------------------------------------- Setup --
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
  (SELECT COUNT(*) FROM public.audit_log WHERE organization_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc') = 1,
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

-- ---------------------------------------------------------------- Test 10-11: Serverpfad mit Ableitung --
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
SET LOCAL role TO authenticated;

SELECT ok(
  (SELECT public.log_audit_event(
    'auth.logout', NULL, NULL, '{"source":"web"}'::JSONB, 'corr-viewer-1'
  ))::TEXT ~ '^[0-9a-f]{8}-[0-9a-f]{4}-',
  'Serverpfad gibt UUID zurueck (Viewer darf eigenes Ereignis protokollieren)'
);

RESET role;

SELECT ok(
  (SELECT organization_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
     AND actor_id = 'aaaaaaaa-0000-0000-0000-000000000003'
     AND action = 'auth.logout'
     AND correlation_id = 'corr-viewer-1'
   FROM public.audit_log WHERE correlation_id = 'corr-viewer-1'),
  'Serverpfad leitet Organisation und Akteur aus der Sitzung ab (kein Client-Input)'
);

-- ---------------------------------------------------------------- Test 12-14: Whitelist-Ablehnung --
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL role TO authenticated;

SELECT throws_ok(
  $$ SELECT public.log_audit_event('tamper.drop_table', NULL, NULL, '{}'::JSONB, NULL) $$,
  'P0001',
  NULL,
  'Serverpfad lehnt unbekannte Aktion ab (Action-Whitelist)'
);

SELECT throws_ok(
  $$ SELECT public.log_audit_event('auth.login', ' dropped_table', NULL, '{}'::JSONB, NULL) $$,
  'P0001',
  NULL,
  'Serverpfad lehnt unbekannten Ziel-Typ ab (Kontext-Whitelist)'
);

SELECT throws_ok(
  $$ SELECT public.log_audit_event('auth.login', NULL, NULL, '["kein","objekt"]'::JSONB, NULL) $$,
  'P0001',
  NULL,
  'Serverpfad lehnt Details ohne JSON-Objekt ab'
);

-- ---------------------------------------------------------------- Test 15-16: UPDATE und DELETE schlagen fehl --
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

-- ---------------------------------------------------------------- Test 17: Keine PII-Spalten mehr --
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'audit_log'
      AND column_name IN ('actor_email', 'ip_address')
  ),
  'PII-Spalten actor_email und ip_address existieren nicht (G62: keine PII)'
);

-- ---------------------------------------------------------------- Test 18-19: Kernspalten vorhanden --
SELECT has_column('public', 'audit_log', 'id', 'Spalte id vorhanden');
SELECT has_column('public', 'audit_log', 'organization_id', 'Spalte organization_id vorhanden');

-- ---------------------------------------------------------------- Teardown --
RESET role;

SELECT * FROM finish();
ROLLBACK;
