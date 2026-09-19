-- G46 (Auftrag 067C, Step 4): Administrativer, transaktionaler Bootstrap des
-- synthetischen Demo-Mandanten (Design §10.3). Ersetzt den entfernten
-- Browser-Seeder: kleiner, klar gekennzeichneter Demo-Bestand, idempotent per
-- ON CONFLICT DO NOTHING, ausschließlich Demo-Organisation.
-- Echte Mandanten entstehen per Admin-Einladung, nicht per Seed.

BEGIN;

-- Demo-Organisation sicherstellen (aus G45-Migration, hier idempotent).
INSERT INTO public.organizations (id, name, mode, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'LeadPilot Demo', 'synthetic', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.companies (id, domain, name, industry, city, postal_code, employee_count, organization_id)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'demo-acme.test', 'Acme Demo GmbH', 'Software', 'Berlin', '10115', 120, '00000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000002', 'demo-globus.test', 'Globus Demo AG', 'Handel', 'Hamburg', '20095', 45, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.contacts (id, company_id, email, first_name, last_name, job_title, organization_id)
VALUES
  ('d0000000-0000-0000-0000-000000000011', 'd0000000-0000-0000-0000-000000000001', 'demo.kontakt@demo-acme.test', 'Demo', 'Kontakt', 'Geschäftsführung', '00000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000012', 'd0000000-0000-0000-0000-000000000002', 'demo.einkauf@demo-globus.test', 'Demo', 'Einkauf', 'Einkaufsleitung', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.imported_funnel_deals (id, deal_name, stage, amount, close_date, pipeline, organization_id)
VALUES
  ('d0000000-0000-0000-0000-000000000021', 'Demo-Deal Acme', 'PROPOSAL', 50000, '2026-09-30', 'default', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

COMMIT;
