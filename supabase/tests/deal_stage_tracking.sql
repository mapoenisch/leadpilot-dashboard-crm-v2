-- Auftrag 137: Phasenwechsel — RPC, Historie und Verweildauer.
-- Vor der Migration 20261110 rot (Tabelle, Spalte und Funktion fehlen).
-- Ausführung: supabase test db (lokal) bzw. psql mit pgTAP.

BEGIN;

SELECT plan(23);

-- ---------------------------------------------------------------- Setup --
DELETE FROM public.deal_stage_events WHERE deal_id LIKE 'ds137-%';
DELETE FROM public.imported_funnel_deals WHERE id LIKE 'ds137-%';
DELETE FROM public.organization_members WHERE user_id IN (
  '91370000-0000-0000-0000-000000000001',
  '91370000-0000-0000-0000-000000000002',
  '91370000-0000-0000-0000-000000000003',
  '91370000-0000-0000-0000-000000000004'
);
DELETE FROM auth.users WHERE email LIKE '%@stage137-test.local';

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('91370000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'manager-st@stage137-test.local', 'x', now()),
  ('91370000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'admin-st@stage137-test.local', 'x', now()),
  ('91370000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'viewer-st@stage137-test.local', 'x', now()),
  ('91370000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'admin-b-st@stage137-test.local', 'x', now());

INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('a1370000-0000-0000-0000-000000000001', 'Org A (Stage-Test)', 'synthetic', 'active'),
  ('b1370000-0000-0000-0000-000000000002', 'Org B (Stage-Test)', 'synthetic', 'active');

INSERT INTO public.organization_members (user_id, organization_id, role)
VALUES
  ('91370000-0000-0000-0000-000000000001', 'a1370000-0000-0000-0000-000000000001', 'manager'),
  ('91370000-0000-0000-0000-000000000002', 'a1370000-0000-0000-0000-000000000001', 'admin'),
  ('91370000-0000-0000-0000-000000000003', 'a1370000-0000-0000-0000-000000000001', 'viewer'),
  ('91370000-0000-0000-0000-000000000004', 'b1370000-0000-0000-0000-000000000002', 'admin');

INSERT INTO public.imported_funnel_deals (id, deal_name, stage, amount, close_date, pipeline, organization_id)
VALUES
  ('ds137-a1', 'Deal A1', 'Lead eingegangen', 1000, '2026-12-31', 'default', 'a1370000-0000-0000-0000-000000000001'),
  ('ds137-a2', 'Deal A2 (HubSpot-Rohwert)', 'closedwon', 2000, '2026-12-31', 'default', 'a1370000-0000-0000-0000-000000000001'),
  ('ds137-a3', 'Deal A3', 'Bedarfsanalyse', 3000, '2026-12-31', 'default', 'a1370000-0000-0000-0000-000000000001'),
  ('ds137-legacy', 'Bestandsdeal', 'Verhandlung', 4000, '2026-12-31', 'default', 'a1370000-0000-0000-0000-000000000001'),
  ('ds137-b1', 'Deal B1', 'Lead eingegangen', 5000, '2026-12-31', 'default', 'b1370000-0000-0000-0000-000000000002');

-- ------------------------------------------------- 1..3: Manager A --
SELECT set_config('request.jwt.claims', '{"sub":"91370000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT lives_ok(
  $$SELECT * FROM public.move_deal_stage('ds137-a1', 'Lead eingegangen', 'Erstgespräch geführt')$$,
  'manager_moves_deal: Manager verschiebt Deal'
);
SELECT is(
  (SELECT stage FROM public.imported_funnel_deals WHERE id = 'ds137-a1'),
  'Erstgespräch geführt',
  'manager_moves_deal: Phase ist gespeichert'
);
SELECT ok(
  (SELECT stage_entered_at IS NOT NULL FROM public.imported_funnel_deals WHERE id = 'ds137-a1'),
  'manager_moves_deal: stage_entered_at ist gesetzt'
);

-- ------------------------------------------------- 4..5: Admin A --
SELECT set_config('request.jwt.claims', '{"sub":"91370000-0000-0000-0000-000000000002","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT * FROM public.move_deal_stage('ds137-a3', 'Bedarfsanalyse', 'Angebot erstellt')$$,
  'admin_moves_deal: Admin verschiebt Deal'
);
SELECT is(
  (SELECT stage FROM public.imported_funnel_deals WHERE id = 'ds137-a3'),
  'Angebot erstellt',
  'admin_moves_deal: Phase ist gespeichert'
);

-- ------------------------------------------------ 6..7: Viewer A --
SELECT set_config('request.jwt.claims', '{"sub":"91370000-0000-0000-0000-000000000003","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.move_deal_stage('ds137-a1', 'Erstgespräch geführt', 'Bedarfsanalyse')$$,
  'LP403',
  NULL,
  'viewer_rejected_lp403: Viewer wird abgewiesen'
);
RESET ROLE;
SELECT is(
  (SELECT stage FROM public.imported_funnel_deals WHERE id = 'ds137-a1'),
  'Erstgespräch geführt',
  'viewer_rejected_lp403: Phase bleibt unverändert'
);

-- -------------------------------------- 8..9: fremder Mandant (Admin B) --
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"91370000-0000-0000-0000-000000000004","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.move_deal_stage('ds137-a1', 'Erstgespräch geführt', 'Bedarfsanalyse')$$,
  'LP404',
  NULL,
  'foreign_tenant_lp404: fremder Mandant wird abgewiesen'
);
RESET ROLE;
SELECT is(
  (SELECT stage FROM public.imported_funnel_deals WHERE id = 'ds137-a1'),
  'Erstgespräch geführt',
  'foreign_tenant_lp404: Phase des fremden Deals bleibt unverändert'
);

-- ------------------------------------------------ 10..11: Konflikt --
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"91370000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT * FROM public.move_deal_stage('ds137-a1', 'Lead eingegangen', 'Bedarfsanalyse')$$,
  'LP409',
  NULL,
  'stale_expected_lp409: veraltete erwartete Phase wird abgewiesen'
);
RESET ROLE;
SELECT is(
  (SELECT stage FROM public.imported_funnel_deals WHERE id = 'ds137-a1'),
  'Erstgespräch geführt',
  'stale_expected_lp409: Phase bleibt unverändert'
);

-- ------------------------------------------- 12: ungültige Zielphase --
SET ROLE authenticated;

SELECT throws_ok(
  $$SELECT * FROM public.move_deal_stage('ds137-a1', 'Erstgespräch geführt', 'Irgendeine Phase')$$,
  'LP422',
  NULL,
  'invalid_stage_lp422: unbekannte Zielphase wird abgewiesen'
);

-- -------------------------------------- 13..14: gleiche Phase, kein Event --
SELECT lives_ok(
  $$SELECT * FROM public.move_deal_stage('ds137-a1', 'Erstgespräch geführt', 'Erstgespräch geführt')$$,
  'same_stage_no_event: gleiche Phase ist ein No-op'
);
SELECT is(
  (SELECT count(*) FROM public.deal_stage_events WHERE deal_id = 'ds137-a1'),
  1::bigint,
  'same_stage_no_event: No-op schreibt kein Event'
);

-- ------------------------------------- 15..17: HubSpot-Rohwert als erwartet --
SELECT lives_ok(
  $$SELECT * FROM public.move_deal_stage('ds137-a2', 'closedwon', 'Deal verloren')$$,
  'raw_hubspot_stage_moves: Rohwert closedwon wird akzeptiert'
);
SELECT is(
  (SELECT stage FROM public.imported_funnel_deals WHERE id = 'ds137-a2'),
  'Deal verloren',
  'raw_hubspot_stage_moves: Phase ist gespeichert'
);
SELECT is(
  (SELECT from_stage FROM public.deal_stage_events WHERE deal_id = 'ds137-a2' ORDER BY occurred_at DESC LIMIT 1),
  'closedwon',
  'raw_hubspot_stage_moves: Event hält den Rohwert fest'
);

-- ------------------------------------- 18..21: Event und Audit --
-- Audit-Log ist nur für Admins lesbar; die Prüfung läuft als Eigentümer.
RESET ROLE;
SELECT is(
  (SELECT from_stage FROM public.deal_stage_events WHERE deal_id = 'ds137-a1'),
  'Lead eingegangen',
  'event_and_audit_written: Event enthält die Ausgangsphase'
);
SELECT is(
  (SELECT to_stage FROM public.deal_stage_events WHERE deal_id = 'ds137-a1'),
  'Erstgespräch geführt',
  'event_and_audit_written: Event enthält die Zielphase'
);
SELECT is(
  (SELECT action FROM public.audit_log
   WHERE target_id = 'ds137-a1' AND action = 'crm.deal.stage_changed'
   ORDER BY created_at DESC LIMIT 1),
  'crm.deal.stage_changed',
  'event_and_audit_written: Audit-Eintrag existiert'
);
SELECT is(
  (SELECT details FROM public.audit_log
   WHERE target_id = 'ds137-a1' AND action = 'crm.deal.stage_changed'
   ORDER BY created_at DESC LIMIT 1),
  '{"from": "Lead eingegangen", "to": "Erstgespräch geführt"}'::jsonb,
  'event_and_audit_written: Audit-Details nennen from und to'
);

-- ------------------------------------- 22: direkter INSERT auf Events --
SET ROLE authenticated;
SELECT throws_ok(
  $$INSERT INTO public.deal_stage_events (organization_id, deal_id, to_stage)
    VALUES ('a1370000-0000-0000-0000-000000000001', 'ds137-a1', 'Bedarfsanalyse')$$,
  '42501',
  NULL,
  'direct_event_insert_denied: direkter INSERT ist gesperrt'
);

-- ------------------------------------- 23: Bestandsdaten bleiben unbekannt --
RESET ROLE;
SELECT is(
  (SELECT stage_entered_at FROM public.imported_funnel_deals WHERE id = 'ds137-legacy'),
  NULL,
  'existing_deals_null_entered_at: Bestandsdeal hat keine Verweildauer'
);

SELECT * FROM finish();
ROLLBACK;
