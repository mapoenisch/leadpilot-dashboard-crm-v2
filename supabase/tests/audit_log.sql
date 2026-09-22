-- G62 (Auftrag 067P, Step 2): pgTAP-Tests fuer audit_log.
-- Prueft: Admin kann SELECTen, Viewer/Manager koennen nicht SELECTen,
-- Cross-Tenant-Zugriff ist blockiert, UPDATE und DELETE schlagen fehl.
-- Ausfuehrung: npx supabase test db

BEGIN;

SELECT plan(14);

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

-- Seed-Eintraege ueber Service-Role (umgeht RLS direkt)
INSERT INTO public.audit_log (id, organization_id, actor_id, actor_email, action, details)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'aaaaaaaa-0000-0000-0000-000000000001',
    'REDACTED',
    'auth.login',
    '{"ip":"REDACTED"}'::JSONB
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'aaaaaaaa-0000-0000-0000-000000000004',
    'REDACTED',
    'auth.login',
    '{"ip":"REDACTED"}'::JSONB
  );

-- ---------------------------------------------------------------- Test 1-3: Admin von Org C kann SELECTen --
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

-- ---------------------------------------------------------------- Test 6: Admin aus Org D sieht Org-C-Eintraege nicht --
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

-- ---------------------------------------------------------------- Test 7-9: INSERT ist erlaubt fuer Mitglieder --
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL role TO authenticated;

SELECT lives_ok(
  $$
    INSERT INTO public.audit_log (organization_id, actor_id, action, details)
    VALUES (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'aaaaaaaa-0000-0000-0000-000000000001',
      'data_source.switch',
      '{"source":"hubspot"}'::JSONB
    )
  $$,
  'Admin (Org C) kann audit_log-Eintrag einfuegen'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL role TO authenticated;

SELECT lives_ok(
  $$
    INSERT INTO public.audit_log (organization_id, actor_id, action, details)
    VALUES (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'aaaaaaaa-0000-0000-0000-000000000002',
      'scenario.run_started',
      '{}'::JSONB
    )
  $$,
  'Manager (Org C) kann audit_log-Eintrag einfuegen'
);

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
SET LOCAL role TO authenticated;

SELECT lives_ok(
  $$
    INSERT INTO public.audit_log (organization_id, actor_id, action, details)
    VALUES (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'aaaaaaaa-0000-0000-0000-000000000003',
      'auth.logout',
      '{}'::JSONB
    )
  $$,
  'Viewer (Org C) kann audit_log-Eintrag einfuegen'
);

-- ---------------------------------------------------------------- Test 10: Cross-Tenant INSERT schlaegt fehl --
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
  NULL,
  NULL,
  'Viewer (Org C) kann keine Eintraege in Org D einfuegen (RLS)'
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

-- ---------------------------------------------------------------- Test 13: Korrekte Spalten vorhanden --
SELECT has_column('public', 'audit_log', 'id',             'Spalte id vorhanden');
SELECT has_column('public', 'audit_log', 'organization_id','Spalte organization_id vorhanden');

-- ---------------------------------------------------------------- Teardown --
RESET role;

SELECT * FROM finish();
ROLLBACK;
