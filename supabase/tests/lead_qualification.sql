-- Auftrag 139: lead_qualifications, convert_lead_to_deal und Mandantentrennung.
-- Vor der Migration 20261111 rot (Tabelle, Spalte und Funktion fehlen).
-- Ausführung: supabase test db (lokal) bzw. psql mit pgTAP.

BEGIN;

SELECT plan(30);

-- ---------------------------------------------------------------- Setup --
DELETE FROM public.lead_qualifications WHERE contact_id LIKE 'lq139-%';
DELETE FROM public.deal_stage_events WHERE deal_id IN (
  SELECT id FROM public.imported_funnel_deals WHERE source_contact_id LIKE 'lq139-%'
);
DELETE FROM public.audit_log WHERE action = 'crm.lead.converted'
  AND target_id LIKE 'lq139-%';
DELETE FROM public.imported_funnel_deals WHERE source_contact_id LIKE 'lq139-%';
DELETE FROM public.contacts WHERE id LIKE 'lq139-%';
DELETE FROM public.companies WHERE id LIKE 'lq139-%';
DELETE FROM public.organization_members WHERE user_id IN (
  '91390000-0000-0000-0000-000000000001',
  '91390000-0000-0000-0000-000000000002',
  '91390000-0000-0000-0000-000000000003',
  '91390000-0000-0000-0000-000000000004'
);
DELETE FROM auth.users WHERE email LIKE '%@qual139-test.local';
DELETE FROM public.organizations WHERE id IN (
  'a1390000-0000-0000-0000-000000000001',
  'b1390000-0000-0000-0000-000000000002'
);

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('91390000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'manager-q@qual139-test.local', 'x', now()),
  ('91390000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'admin-q@qual139-test.local', 'x', now()),
  ('91390000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'viewer-q@qual139-test.local', 'x', now()),
  ('91390000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'admin-b-q@qual139-test.local', 'x', now());

INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('a1390000-0000-0000-0000-000000000001', 'Org A (Qual-Test)', 'synthetic', 'active'),
  ('b1390000-0000-0000-0000-000000000002', 'Org B (Qual-Test)', 'synthetic', 'active');

INSERT INTO public.organization_members (user_id, organization_id, role)
VALUES
  ('91390000-0000-0000-0000-000000000001', 'a1390000-0000-0000-0000-000000000001', 'manager'),
  ('91390000-0000-0000-0000-000000000002', 'a1390000-0000-0000-0000-000000000001', 'admin'),
  ('91390000-0000-0000-0000-000000000003', 'a1390000-0000-0000-0000-000000000001', 'viewer'),
  ('91390000-0000-0000-0000-000000000004', 'b1390000-0000-0000-0000-000000000002', 'admin');

INSERT INTO public.companies (id, domain, name, industry, city, postal_code, employee_count, organization_id)
VALUES
  ('lq139-comp-a', 'qual-a.test', 'Qual Firma A', 'IT', 'Berlin', '10115', 50, 'a1390000-0000-0000-0000-000000000001'),
  ('lq139-comp-b', 'qual-b.test', 'Qual Firma B', 'IT', 'Hamburg', '20095', 30, 'b1390000-0000-0000-0000-000000000002');

INSERT INTO public.contacts (id, company_id, email, first_name, last_name, job_title, organization_id)
VALUES
  ('lq139-c1', 'lq139-comp-a', 'lead1@qual-a.test', 'Lena', 'Eins', 'CEO', 'a1390000-0000-0000-0000-000000000001'),
  ('lq139-c2', 'lq139-comp-a', 'lead2@qual-a.test', 'Paul', 'Zwei', 'CTO', 'a1390000-0000-0000-0000-000000000001'),
  ('lq139-c3', 'lq139-comp-a', 'lead3@qual-a.test', 'Tina', 'Drei', 'CFO', 'a1390000-0000-0000-0000-000000000001'),
  ('lq139-c4', 'lq139-comp-a', 'lead4@qual-a.test', 'Uwe', 'Vier', 'VP', 'a1390000-0000-0000-0000-000000000001'),
  ('lq139-c5', 'lq139-comp-a', 'lead5@qual-a.test', 'Sara', 'Fuenf', 'CEO', 'a1390000-0000-0000-0000-000000000001'),
  ('lq139-cb', 'lq139-comp-b', 'leadb@qual-b.test', 'Bert', 'Sechs', 'CEO', 'b1390000-0000-0000-0000-000000000002');

-- ------------------------------------------- 1..6: BANT speichern (Manager A) --
SELECT set_config('request.jwt.claims', '{"sub":"91390000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT lives_ok(
  $$INSERT INTO public.lead_qualifications
      (organization_id, contact_id, budget, authority, need, timeline, notes, qualified_at)
    VALUES ('a1390000-0000-0000-0000-000000000001', 'lq139-c1', true, true, false, true, 'Notiz A', NOW())$$,
  'qualification_save: Manager speichert BANT'
);
SELECT is(
  (SELECT budget FROM public.lead_qualifications
   WHERE organization_id = 'a1390000-0000-0000-0000-000000000001' AND contact_id = 'lq139-c1'),
  true,
  'qualification_save: Werte sind gespeichert'
);
SELECT ok(
  (SELECT qualified_at IS NOT NULL FROM public.lead_qualifications
   WHERE contact_id = 'lq139-c1'),
  'qualification_save: qualified_at ist gesetzt'
);
SELECT is(
  (SELECT updated_by FROM public.lead_qualifications WHERE contact_id = 'lq139-c1'),
  '91390000-0000-0000-0000-000000000001'::uuid,
  'qualification_save: updated_by ist der speichernde Nutzer'
);

-- ------------------------------------------------ 7..8: Viewer darf nicht --
SELECT set_config('request.jwt.claims', '{"sub":"91390000-0000-0000-0000-000000000003","role":"authenticated"}', true);

SELECT throws_ok(
  $$INSERT INTO public.lead_qualifications (organization_id, contact_id, budget)
    VALUES ('a1390000-0000-0000-0000-000000000001', 'lq139-c2', true)$$,
  '42501',
  NULL,
  'viewer_qualification_denied: Viewer-INSERT ist gesperrt'
);
RESET ROLE;
SELECT is(
  (SELECT count(*) FROM public.lead_qualifications WHERE contact_id = 'lq139-c2'),
  0::bigint,
  'viewer_qualification_denied: keine Zeile entstanden'
);

-- ------------------------------------------- 9..10: Manager konvertiert --
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"91390000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT * FROM public.convert_lead_to_deal('lq139-c1', 'Qual Deal Eins', 'Erstgespräch geführt', 25000, '2026-12-31', 'Enterprise SaaS')$$,
  'manager_converts: Manager konvertiert Lead'
);
RESET ROLE;

SELECT is(
  (SELECT source_contact_id FROM public.imported_funnel_deals
   WHERE organization_id = 'a1390000-0000-0000-0000-000000000001' AND deal_name = 'Qual Deal Eins'),
  'lq139-c1',
  'manager_converts: Deal trägt source_contact_id'
);
SELECT ok(
  (SELECT stage_entered_at IS NOT NULL FROM public.imported_funnel_deals
   WHERE organization_id = 'a1390000-0000-0000-0000-000000000001' AND deal_name = 'Qual Deal Eins'),
  'manager_converts: stage_entered_at ist gesetzt'
);
SELECT is(
  (SELECT from_stage FROM public.deal_stage_events
   WHERE deal_id IN (SELECT id FROM public.imported_funnel_deals WHERE deal_name = 'Qual Deal Eins')),
  NULL,
  'manager_converts: Event hat from_stage NULL'
);
SELECT ok(
  (SELECT qualified_at IS NOT NULL FROM public.lead_qualifications WHERE contact_id = 'lq139-c1'),
  'manager_converts: qualified_at bleibt/ wird gesetzt'
);
SELECT is(
  (SELECT action FROM public.audit_log
   WHERE target_id = 'lq139-c1' AND action = 'crm.lead.converted'
   ORDER BY created_at DESC LIMIT 1),
  'crm.lead.converted',
  'manager_converts: Audit-Eintrag existiert'
);

-- ------------------------------------------- 11..12: zweite Konvertierung --
SET ROLE authenticated;
SELECT throws_ok(
  $$SELECT * FROM public.convert_lead_to_deal('lq139-c1', 'Nochmal', 'Erstgespräch geführt', 100, '2026-12-31', 'Enterprise SaaS')$$,
  'LP409',
  NULL,
  'second_conversion_lp409: doppelte Konvertierung wird abgewiesen'
);
RESET ROLE;
SELECT is(
  (SELECT count(*) FROM public.imported_funnel_deals WHERE source_contact_id = 'lq139-c1'),
  1::bigint,
  'second_conversion_lp409: genau ein Deal existiert'
);

-- ------------------------------------------- 13..14: Betrag <= 0 --
SET ROLE authenticated;
SELECT throws_ok(
  $$SELECT * FROM public.convert_lead_to_deal('lq139-c2', 'Null Deal', 'Erstgespräch geführt', 0, '2026-12-31', 'Enterprise SaaS')$$,
  'LP422',
  NULL,
  'zero_amount_lp422: Betrag 0 wird abgewiesen'
);
RESET ROLE;
SELECT is(
  (SELECT count(*) FROM public.imported_funnel_deals WHERE source_contact_id = 'lq139-c2'),
  0::bigint,
  'zero_amount_lp422: kein Deal entstanden'
);

-- ------------------------------------------- 15..16: atomar bei Fehler --
SET ROLE authenticated;
SELECT throws_ok(
  $$SELECT * FROM public.convert_lead_to_deal('lq139-c3', 'Atomic Deal', 'Irgendeine Phase', 5000, '2026-12-31', 'Enterprise SaaS')$$,
  'LP422',
  NULL,
  'conversion_atomic_on_failure: ungültige Phase wird abgewiesen'
);
RESET ROLE;
SELECT is(
  (SELECT count(*) FROM public.imported_funnel_deals WHERE source_contact_id = 'lq139-c3'),
  0::bigint,
  'conversion_atomic_on_failure: kein Deal-Fragment'
);
SELECT is(
  (SELECT count(*) FROM public.deal_stage_events e
   JOIN public.imported_funnel_deals d ON d.id = e.deal_id
   WHERE d.source_contact_id = 'lq139-c3'),
  0::bigint,
  'conversion_atomic_on_failure: kein Event-Fragment'
);

-- ------------------------------------------- 17..18: fremder Kontakt --
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"91390000-0000-0000-0000-000000000004","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.convert_lead_to_deal('lq139-c4', 'Fremder Deal', 'Erstgespräch geführt', 1000, '2026-12-31', 'Enterprise SaaS')$$,
  'LP404',
  NULL,
  'foreign_contact_lp404: Kontakt aus fremdem Mandant wird abgewiesen'
);
RESET ROLE;
SELECT is(
  (SELECT count(*) FROM public.imported_funnel_deals WHERE source_contact_id = 'lq139-c4'),
  0::bigint,
  'foreign_contact_lp404: kein Deal entstanden'
);

-- ------------------------------------------- 19..20: Viewer RPC --
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"91390000-0000-0000-0000-000000000003","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.convert_lead_to_deal('lq139-c5', 'Viewer Deal', 'Erstgespräch geführt', 1000, '2026-12-31', 'Enterprise SaaS')$$,
  'LP403',
  NULL,
  'viewer_rejected: Viewer-Konvertierung wird abgewiesen'
);
RESET ROLE;

-- ------------------------------------------- 21..26: Mandantentrennung --
-- Org B speichert eigene Qualifizierung; Org A darf sie nicht sehen.
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"91390000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT lives_ok(
  $$INSERT INTO public.lead_qualifications (organization_id, contact_id, budget)
    VALUES ('b1390000-0000-0000-0000-000000000002', 'lq139-cb', true)$$,
  'qualification_tenant_isolated: Org B speichert eigene Zeile'
);

SELECT set_config('request.jwt.claims', '{"sub":"91390000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT is(
  (SELECT count(*) FROM public.lead_qualifications WHERE contact_id = 'lq139-cb'),
  0::bigint,
  'qualification_tenant_isolated: Org A sieht Org-B-Zeile nicht'
);
SELECT is(
  (SELECT count(*) FROM public.lead_qualifications WHERE contact_id = 'lq139-c1'),
  1::bigint,
  'qualification_tenant_isolated: Org A sieht eigene Zeile'
);
SELECT throws_ok(
  $$INSERT INTO public.lead_qualifications (organization_id, contact_id, budget)
    VALUES ('b1390000-0000-0000-0000-000000000002', 'lq139-c2', true)$$,
  '42501',
  NULL,
  'qualification_tenant_isolated: Org A kann nicht in Org B schreiben'
);
RESET ROLE;

-- ------------------------------------------------ 27..28: Notizen-Limit --
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"91390000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT throws_ok(
  $$INSERT INTO public.lead_qualifications (organization_id, contact_id, notes)
    VALUES ('a1390000-0000-0000-0000-000000000001', 'lq139-c4', repeat('x', 2001))$$,
  '23514',
  NULL,
  'notes_limit_2000: Notizen über 2000 Zeichen werden abgewiesen'
);
SELECT lives_ok(
  $$INSERT INTO public.lead_qualifications (organization_id, contact_id, notes)
    VALUES ('a1390000-0000-0000-0000-000000000001', 'lq139-c4', repeat('x', 2000))$$,
  'notes_limit_2000: 2000 Zeichen sind erlaubt'
);
RESET ROLE;

-- ------------------------------------------- 29..30: Update durch Manager --
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"91390000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT lives_ok(
  $$UPDATE public.lead_qualifications SET timeline = true
    WHERE organization_id = 'a1390000-0000-0000-0000-000000000001' AND contact_id = 'lq139-c1'$$,
  'qualification_update: Manager aktualisiert BANT'
);
RESET ROLE;
SELECT is(
  (SELECT timeline FROM public.lead_qualifications WHERE contact_id = 'lq139-c1'),
  true,
  'qualification_update: Wert ist aktualisiert'
);

SELECT * FROM finish();
ROLLBACK;
