-- ============================================================================
-- LeadPilot E2E Test-Seed (Gate G58 / Auftrag 067L Nacharbeit 3)
--
-- ACHTUNG / SICHERHEITSHINWEIS:
-- DIESE DATEI IST AUSSCHLIESSLICH FÜR LOKALE ENTWICKLUNGS- UND CI-DATENBANKEN
-- (supabase start / supabase db reset auf temporären Runner-Containern).
-- NIEMALS GEGEN EIN GEHOSTETES ODER PRODUKTIVES PROJEKT AUSFÜHREN!
--
-- Die Passwörter sind öffentlich bekannte Wegwerf-Werte, die ausschließlich
-- in flüchtigen lokalen Test-Containern existieren.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Organisationen (Org A und Org B für Mandantentrennung)
-- ----------------------------------------------------------------------------
INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Organisation A (E2E)', 'synthetic', 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Organisation B (E2E)', 'synthetic', 'active')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  mode = EXCLUDED.mode,
  status = EXCLUDED.status;

-- ----------------------------------------------------------------------------
-- 2. Auth-Benutzer (auth.users)
-- Bekanntes lokales Test-Passwort: TestPassword123!
-- ----------------------------------------------------------------------------
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  reauthentication_token,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at
)
VALUES
  -- 1. Org A Admin (Haupt-Testnutzer für E2E & Mandantentrennung)
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin-a@e2e.local',
    crypt('TestPassword123!', gen_salt('bf')),
    NOW(),
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin Org A"}'::jsonb,
    false,
    NOW(),
    NOW()
  ),
  -- 2. Org B Admin (Für Mandantentrennungs-Test tenant-isolation.spec.ts)
  (
    '44444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin-b@e2e.local',
    crypt('TestPassword123!', gen_salt('bf')),
    NOW(),
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin Org B"}'::jsonb,
    false,
    NOW(),
    NOW()
  ),
  -- 3. No-Member (Registrierter Nutzer ohne Organisations-Mitgliedschaft)
  (
    '66666666-6666-6666-6666-666666666666',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'nomember@e2e.local',
    crypt('TestPassword123!', gen_salt('bf')),
    NOW(),
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"No Member User"}'::jsonb,
    false,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  confirmation_token = EXCLUDED.confirmation_token,
  recovery_token = EXCLUDED.recovery_token,
  email_change_token_new = EXCLUDED.email_change_token_new,
  email_change = EXCLUDED.email_change,
  reauthentication_token = EXCLUDED.reauthentication_token,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 3. Auth-Identitäten (auth.identities - zwingend für GoTrue E-Mail-Login)
-- ----------------------------------------------------------------------------
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    jsonb_build_object('sub', '11111111-1111-1111-1111-111111111111', 'email', 'admin-a@e2e.local', 'email_verified', true),
    'email',
    'admin-a@e2e.local',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '44444444-4444-4444-4444-444444444444',
    jsonb_build_object('sub', '44444444-4444-4444-4444-444444444444', 'email', 'admin-b@e2e.local', 'email_verified', true),
    'email',
    'admin-b@e2e.local',
    NOW(),
    NOW(),
    NOW()
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    '66666666-6666-6666-6666-666666666666',
    jsonb_build_object('sub', '66666666-6666-6666-6666-666666666666', 'email', 'nomember@e2e.local', 'email_verified', true),
    'email',
    'nomember@e2e.local',
    NOW(),
    NOW(),
    NOW()
  )
ON CONFLICT (provider_id, provider) DO UPDATE SET
  identity_data = EXCLUDED.identity_data,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 4. Organisations-Mitgliedschaften (public.organization_members)
-- Gate G60 (Auftrag 067N): admin-a@e2e.local ist regulärer Admin von Organisation A
-- ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') für echte serverseitige Mandantentrennung.
-- Historische G58-Zuordnung: ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'admin')
-- wurde durch die serverseitige Mandanten-CRM-Quelle abgelöst.
-- ----------------------------------------------------------------------------
INSERT INTO public.organization_members (user_id, organization_id, role)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin'),
  ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin')
ON CONFLICT (user_id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  role = EXCLUDED.role;

-- ----------------------------------------------------------------------------
-- 5. Mandantendaten (public.companies)
-- Explizit von tenant-isolation.spec.ts gefordert:
-- Org A sieht 'Firma A1', Org B sieht 'Firma B1'.
-- ----------------------------------------------------------------------------
INSERT INTO public.companies (id, domain, name, industry, city, postal_code, employee_count, organization_id)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a1.test', 'Firma A1', 'IT', 'Berlin', '10115', 50, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('c0000000-0000-0000-0000-000000000002', 'b1.test', 'Firma B1', 'IT', 'Hamburg', '20095', 30, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  domain = EXCLUDED.domain,
  organization_id = EXCLUDED.organization_id;

-- ----------------------------------------------------------------------------
-- 6. Kontakte (public.contacts)
-- ----------------------------------------------------------------------------
INSERT INTO public.contacts (id, company_id, email, first_name, last_name, job_title, organization_id)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'anna.schmidt@a1.test', 'Anna', 'Schmidt', 'CEO', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'bernd.bauer@b1.test', 'Bernd', 'Bauer', 'CTO', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  organization_id = EXCLUDED.organization_id;

-- ----------------------------------------------------------------------------
-- 7. Deals (public.imported_funnel_deals)
-- ----------------------------------------------------------------------------
INSERT INTO public.imported_funnel_deals (id, deal_name, stage, amount, close_date, pipeline, organization_id)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Enterprise Paket A1', 'PROPOSAL', 45000, '2026-11-30', 'default', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('e0000000-0000-0000-0000-000000000002', 'Growth Paket B1', 'QUALIFIED', 20000, '2026-12-15', 'default', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
ON CONFLICT (id) DO UPDATE SET
  deal_name = EXCLUDED.deal_name,
  organization_id = EXCLUDED.organization_id;
