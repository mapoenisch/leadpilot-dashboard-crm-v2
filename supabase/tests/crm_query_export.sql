-- ============================================================================
-- Gate G60 / Auftrag 067N: pgTAP-Tests für CRM Query Indizes & Mandantenabfragen
-- ============================================================================
BEGIN;

SELECT plan(23);

-- 1..16: Index-Prüfungen für public.companies, contacts, imported_funnel_deals
SELECT has_index('public', 'companies', 'idx_companies_org_name', 'Index idx_companies_org_name existiert');
SELECT has_index('public', 'companies', 'idx_companies_org_industry', 'Index idx_companies_org_industry existiert');
SELECT has_index('public', 'companies', 'idx_companies_org_city', 'Index idx_companies_org_city existiert');
SELECT has_index('public', 'companies', 'idx_companies_org_employee_count', 'Index idx_companies_org_employee_count existiert');
SELECT has_index('public', 'companies', 'idx_companies_org_created_at', 'Index idx_companies_org_created_at existiert');

SELECT has_index('public', 'contacts', 'idx_contacts_org_last_name', 'Index idx_contacts_org_last_name existiert');
SELECT has_index('public', 'contacts', 'idx_contacts_org_email', 'Index idx_contacts_org_email existiert');
SELECT has_index('public', 'contacts', 'idx_contacts_org_company', 'Index idx_contacts_org_company existiert');
SELECT has_index('public', 'contacts', 'idx_contacts_org_job_title', 'Index idx_contacts_org_job_title existiert');
SELECT has_index('public', 'contacts', 'idx_contacts_org_created_at', 'Index idx_contacts_org_created_at existiert');

SELECT has_index('public', 'imported_funnel_deals', 'idx_deals_org_deal_name', 'Index idx_deals_org_deal_name existiert');
SELECT has_index('public', 'imported_funnel_deals', 'idx_deals_org_stage', 'Index idx_deals_org_stage existiert');
SELECT has_index('public', 'imported_funnel_deals', 'idx_deals_org_amount', 'Index idx_deals_org_amount existiert');
SELECT has_index('public', 'imported_funnel_deals', 'idx_deals_org_close_date', 'Index idx_deals_org_close_date existiert');
SELECT has_index('public', 'imported_funnel_deals', 'idx_deals_org_pipeline', 'Index idx_deals_org_pipeline existiert');
SELECT has_index('public', 'imported_funnel_deals', 'idx_deals_org_created_at', 'Index idx_deals_org_created_at existiert');

-- Setup Testdaten für RLS-Prüfungen
INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'admin-a@crm-test.local', 'x', now()),
  ('44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'admin-b@crm-test.local', 'x', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Org A', 'synthetic', 'active'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Org B', 'synthetic', 'active')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO public.organization_members (user_id, organization_id, role, status)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin', 'active'),
  ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin', 'active')
ON CONFLICT (user_id) DO UPDATE SET organization_id = EXCLUDED.organization_id, role = EXCLUDED.role, status = EXCLUDED.status;

INSERT INTO public.companies (id, domain, name, industry, city, postal_code, organization_id)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a1.test', 'Firma A1', 'IT', 'Berlin', '10115', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('c0000000-0000-0000-0000-000000000002', 'b1.test', 'Firma B1', 'IT', 'Hamburg', '20095', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('c0000000-0000-0000-0000-000000000003', 'calc.test', ' =1+1 Formel-Firma', 'IT', 'Berlin', '10115', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('c0000000-0000-0000-0000-000000000004', 'a2.test', 'Firma A2', 'Finanzen', 'München', '80331', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id, name = EXCLUDED.name;

INSERT INTO public.contacts (id, company_id, email, first_name, last_name, job_title, organization_id)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'anna@a1.test', 'Anna', 'Schmidt', 'CEO', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id;

INSERT INTO public.imported_funnel_deals (id, deal_name, stage, amount, close_date, pipeline, organization_id)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Deal A1', 'PROPOSAL', 50000, '2026-12-01', 'default', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('e0000000-0000-0000-0000-000000000003', ' =2+2 Formel Deal', 'LEAD', 5000, '2026-12-31', 'default', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id;

-- 17..22: Mandantenabfragen unter RLS (Org A vs Org B)
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM public.companies WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  3::bigint,
  'Org A sieht eigene Companies (inkl. Formel-Testdatensatz und Paginierungs-Seed)'
);

SELECT is(
  (SELECT count(*) FROM public.companies WHERE organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  0::bigint,
  'Org A sieht fremde Company nicht'
);

SELECT is(
  (SELECT count(*) FROM public.contacts WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1::bigint,
  'Org A sieht eigenen Kontakt'
);

SELECT is(
  (SELECT count(*) FROM public.imported_funnel_deals WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  2::bigint,
  'Org A sieht eigene Funnel Deals (inkl. Formel-Testdatensatz)'
);

SELECT is(
  (SELECT count(*) FROM public.companies WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND name LIKE ' =1+1%'),
  1::bigint,
  'Formeldatensatz in public.companies ist als statischer Text mandantenisoliert abgelegt'
);

-- Wechsel auf Admin B
SELECT set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);

SELECT is(
  (SELECT count(*) FROM public.companies WHERE organization_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  1::bigint,
  'Org B sieht eigene Company (Firma B1)'
);

SELECT is(
  (SELECT count(*) FROM public.companies WHERE organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0::bigint,
  'Org B sieht fremde Company nicht'
);

SELECT * FROM finish();
ROLLBACK;
