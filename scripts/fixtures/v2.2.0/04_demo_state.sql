-- Demo-Bestand im Stand v2.2.0: CRM-Zeilen ohne Organisationsbezug, wie sie der
-- frühere Browser-Seeder geschrieben hat. Synthetisch, keine echten Daten.
INSERT INTO public.companies (id, domain, name, industry, city, postal_code, employee_count) VALUES
  ('c-v220-1', 'alt-eins.test', 'Alt Eins GmbH', 'Software', 'Erfurt', '99084', 40),
  ('c-v220-2', 'alt-zwei.test', 'Alt Zwei AG', 'Handel', 'Leipzig', '04109', 12);
INSERT INTO public.contacts (id, company_id, email, first_name, last_name, job_title) VALUES
  ('k-v220-1', 'c-v220-1', 'eins@alt-eins.test', 'Erika', 'Eins', 'Geschäftsführung');
INSERT INTO public.imported_funnel_deals (id, deal_name, stage, amount, close_date, pipeline) VALUES
  ('f-v220-1', 'Alt-Deal', 'PROPOSAL', 12000, '2026-06-30', 'default');
