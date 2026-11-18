-- ============================================================================
-- GENERATED FILE - NICHT VON HAND AENDERN
-- Erzeugt durch: npx tsx scripts/generateAlarmParitySql.ts
-- Quelle: thresholdReferenceCases.json & alarm_parity_cases.json
-- ============================================================================
BEGIN;

SELECT plan(90);
SET CONSTRAINTS ALL IMMEDIATE;

-- Setup Organisation für Paritätstests
INSERT INTO public.organizations (id, name, mode, status)
VALUES ('df670000-0000-0000-0000-00000000000a', 'Org Parity 167', 'synthetic', 'active');

-- CRM Test-Deals
INSERT INTO public.imported_funnel_deals (id, organization_id, deal_name, amount, stage, pipeline, close_date)
VALUES
  ('d1', 'df670000-0000-0000-0000-00000000000a', 'Deal 1', 50000, 'Gewonnen Abschluss', 'enterprise', current_date),
  ('d2', 'df670000-0000-0000-0000-00000000000a', 'Deal 2', 25000, 'Qualifiziert', 'standard', current_date);

-- Live KPI Test-Feed
INSERT INTO public.live_kpi_public_feed (organization_id, kpi_id, value, unit, occurred_at, quality_status, source_system, ingested_at)
VALUES
  ('df670000-0000-0000-0000-00000000000a', 'arr', 1200000, 'EUR', now() - interval '10 minutes', 'good', 'test', now()),
  ('df670000-0000-0000-0000-00000000000a', 'mrr', 100000, 'EUR', now() - interval '10 minutes', 'good', 'test', now()),
  ('df670000-0000-0000-0000-00000000000a', 'pipeline_coverage', 3.2, 'x', now() - interval '10 minutes', 'good', 'test', now()),
  ('df670000-0000-0000-0000-00000000000a', 'arr_direct', 600000, 'EUR', now() - interval '10 minutes', 'good', 'test', now()),
  ('df670000-0000-0000-0000-00000000000a', 'arr_partner', 400000, 'EUR', now() - interval '10 minutes', 'good', 'test', now()),
  ('df670000-0000-0000-0000-00000000000a', 'arr_outbound', 150000, 'EUR', now() - interval '10 minutes', 'good', 'test', now()),
  ('df670000-0000-0000-0000-00000000000a', 'arr_other', 50000, 'EUR', now() - interval '10 minutes', 'good', 'test', now()),
  ('df670000-0000-0000-0000-00000000000a', 'pipeline_leads', 180, 'Stück', now() - interval '10 minutes', 'good', 'test', now()),
  ('df670000-0000-0000-0000-00000000000a', 'pipeline_mql', 95, 'Stück', now() - interval '10 minutes', 'good', 'test', now()),
  ('df670000-0000-0000-0000-00000000000a', 'pipeline_sql', 48, 'Stück', now() - interval '10 minutes', 'good', 'test', now()),
  ('df670000-0000-0000-0000-00000000000a', 'pipeline_offers', 22, 'Stück', now() - interval '10 minutes', 'good', 'test', now()),
  ('df670000-0000-0000-0000-00000000000a', 'pipeline_won', 12, 'Stück', now() - interval '10 minutes', 'good', 'test', now());

-- 1. KPI-Abdeckung: Jede alarmfaehige Kennzahl liefert ueber alarm_kpi_value einen gueltigen Datensatz
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'crm.pipeline_deals')->>'zustand'),
  'ok',
  'KPI crm.pipeline_deals ist alarmfaehig und liefert zustand ok'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'crm.pipeline_volumen')->>'zustand'),
  'ok',
  'KPI crm.pipeline_volumen ist alarmfaehig und liefert zustand ok'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'crm.pipeline_gewonnen')->>'zustand'),
  'ok',
  'KPI crm.pipeline_gewonnen ist alarmfaehig und liefert zustand ok'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'crm.pipeline_offen')->>'zustand'),
  'ok',
  'KPI crm.pipeline_offen ist alarmfaehig und liefert zustand ok'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.arr')->>'zustand'),
  'ok',
  'KPI live.arr ist alarmfaehig und liefert zustand ok'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.mrr')->>'zustand'),
  'ok',
  'KPI live.mrr ist alarmfaehig und liefert zustand ok'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.pipeline_coverage')->>'zustand'),
  'ok',
  'KPI live.pipeline_coverage ist alarmfaehig und liefert zustand ok'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.arr_direct')->>'zustand'),
  'ok',
  'KPI live.arr_direct ist alarmfaehig und liefert zustand ok'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.arr_partner')->>'zustand'),
  'ok',
  'KPI live.arr_partner ist alarmfaehig und liefert zustand ok'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.arr_outbound')->>'zustand'),
  'ok',
  'KPI live.arr_outbound ist alarmfaehig und liefert zustand ok'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.arr_other')->>'zustand'),
  'ok',
  'KPI live.arr_other ist alarmfaehig und liefert zustand ok'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.pipeline_leads')->>'zustand'),
  'ok',
  'KPI live.pipeline_leads ist alarmfaehig und liefert zustand ok'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.pipeline_mql')->>'zustand'),
  'ok',
  'KPI live.pipeline_mql ist alarmfaehig und liefert zustand ok'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.pipeline_sql')->>'zustand'),
  'ok',
  'KPI live.pipeline_sql ist alarmfaehig und liefert zustand ok'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.pipeline_offers')->>'zustand'),
  'ok',
  'KPI live.pipeline_offers ist alarmfaehig und liefert zustand ok'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.pipeline_won')->>'zustand'),
  'ok',
  'KPI live.pipeline_won ist alarmfaehig und liefert zustand ok'
);

-- 2. Paritaetstests gegen dieselben Erwartungswerte wie Vitest
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'crm.pipeline_deals', NULL)->>'wert')::NUMERIC,
  2::NUMERIC,
  'Paritaetsfall crm-deals-basic: crm.pipeline_deals wert = 2'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'crm.pipeline_volumen', NULL)->>'wert')::NUMERIC,
  75000::NUMERIC,
  'Paritaetsfall crm-volumen-basic: crm.pipeline_volumen wert = 75000'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'crm.pipeline_gewonnen', NULL)->>'wert')::NUMERIC,
  50000::NUMERIC,
  'Paritaetsfall crm-gewonnen-basic: crm.pipeline_gewonnen wert = 50000'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'crm.pipeline_offen', NULL)->>'wert')::NUMERIC,
  25000::NUMERIC,
  'Paritaetsfall crm-offen-basic: crm.pipeline_offen wert = 25000'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'crm.pipeline_deals', 'enterprise')->>'wert')::NUMERIC,
  1::NUMERIC,
  'Paritaetsfall crm-deals-filter-pipeline: crm.pipeline_deals wert = 1'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.arr', NULL)->>'wert')::NUMERIC,
  1200000::NUMERIC,
  'Paritaetsfall live-arr-latest: live.arr wert = 1200000'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.mrr', NULL)->>'wert')::NUMERIC,
  100000::NUMERIC,
  'Paritaetsfall live-mrr-latest: live.mrr wert = 100000'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.pipeline_coverage', NULL)->>'wert')::NUMERIC,
  3.2::NUMERIC,
  'Paritaetsfall live-pipeline-coverage-latest: live.pipeline_coverage wert = 3.2'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.arr_direct', NULL)->>'wert')::NUMERIC,
  600000::NUMERIC,
  'Paritaetsfall live-arr-direct-latest: live.arr_direct wert = 600000'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.arr_partner', NULL)->>'wert')::NUMERIC,
  400000::NUMERIC,
  'Paritaetsfall live-arr-partner-latest: live.arr_partner wert = 400000'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.arr_outbound', NULL)->>'wert')::NUMERIC,
  150000::NUMERIC,
  'Paritaetsfall live-arr-outbound-latest: live.arr_outbound wert = 150000'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.arr_other', NULL)->>'wert')::NUMERIC,
  50000::NUMERIC,
  'Paritaetsfall live-arr-other-latest: live.arr_other wert = 50000'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.pipeline_leads', NULL)->>'wert')::NUMERIC,
  180::NUMERIC,
  'Paritaetsfall live-pipeline-leads-latest: live.pipeline_leads wert = 180'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.pipeline_mql', NULL)->>'wert')::NUMERIC,
  95::NUMERIC,
  'Paritaetsfall live-pipeline-mql-latest: live.pipeline_mql wert = 95'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.pipeline_sql', NULL)->>'wert')::NUMERIC,
  48::NUMERIC,
  'Paritaetsfall live-pipeline-sql-latest: live.pipeline_sql wert = 48'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.pipeline_offers', NULL)->>'wert')::NUMERIC,
  22::NUMERIC,
  'Paritaetsfall live-pipeline-offers-latest: live.pipeline_offers wert = 22'
);
SELECT is(
  (public.alarm_kpi_value('df670000-0000-0000-0000-00000000000a'::uuid, 'live.pipeline_won', NULL)->>'wert')::NUMERIC,
  12::NUMERIC,
  'Paritaetsfall live-pipeline-won-latest: live.pipeline_won wert = 12'
);

-- 3. Schwellenwert-Referenzfaelle aus thresholdReferenceCases.json
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":200,"kritisch":500}'::jsonb, '199.99'::TEXT, 'ok', 'EUR')->>'stufe',
  'normal',
  'Referenzfall hoch-01: hoch_ist_schlecht: Wert knapp unter Warnung -> normal'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":200,"kritisch":500}'::jsonb, '200'::TEXT, 'ok', 'EUR')->>'stufe',
  'warnung',
  'Referenzfall hoch-02: hoch_ist_schlecht: Wert exakt auf Warnung -> warnung'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":200,"kritisch":500}'::jsonb, '200.01'::TEXT, 'ok', 'EUR')->>'stufe',
  'warnung',
  'Referenzfall hoch-03: hoch_ist_schlecht: Wert knapp ueber Warnung -> warnung'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":200,"kritisch":500}'::jsonb, '499.99'::TEXT, 'ok', 'EUR')->>'stufe',
  'warnung',
  'Referenzfall hoch-04: hoch_ist_schlecht: Wert knapp unter Kritisch -> warnung'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":200,"kritisch":500}'::jsonb, '500'::TEXT, 'ok', 'EUR')->>'stufe',
  'kritisch',
  'Referenzfall hoch-05: hoch_ist_schlecht: Wert exakt auf Kritisch -> kritisch'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":200,"kritisch":500}'::jsonb, '500.01'::TEXT, 'ok', 'EUR')->>'stufe',
  'kritisch',
  'Referenzfall hoch-06: hoch_ist_schlecht: Wert ueber Kritisch -> kritisch'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":200,"kritisch":500}'::jsonb, '0'::TEXT, 'ok', 'EUR')->>'stufe',
  'normal',
  'Referenzfall hoch-07: hoch_ist_schlecht: Wert 0 -> normal'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":200,"kritisch":500}'::jsonb, '-50'::TEXT, 'ok', 'EUR')->>'stufe',
  'normal',
  'Referenzfall hoch-08: hoch_ist_schlecht: negativer Wert (-50) -> normal'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"%","warnung":100}'::jsonb, '99.9'::TEXT, 'ok', '%')->>'stufe',
  'normal',
  'Referenzfall hoch-ohne-kritisch-01: hoch_ist_schlecht ohne Kritisch: unter Warnung -> normal'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"%","warnung":100}'::jsonb, '100'::TEXT, 'ok', '%')->>'stufe',
  'warnung',
  'Referenzfall hoch-ohne-kritisch-02: hoch_ist_schlecht ohne Kritisch: exakt Warnung -> warnung'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"%","warnung":100}'::jsonb, '150'::TEXT, 'ok', '%')->>'stufe',
  'warnung',
  'Referenzfall hoch-ohne-kritisch-03: hoch_ist_schlecht ohne Kritisch: ueber Warnung -> warnung'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"niedrig_ist_schlecht","einheit":"EUR","warnung":50,"kritisch":20}'::jsonb, '50.01'::TEXT, 'ok', 'EUR')->>'stufe',
  'normal',
  'Referenzfall niedrig-01: niedrig_ist_schlecht: Wert knapp ueber Warnung -> normal'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"niedrig_ist_schlecht","einheit":"EUR","warnung":50,"kritisch":20}'::jsonb, '50'::TEXT, 'ok', 'EUR')->>'stufe',
  'warnung',
  'Referenzfall niedrig-02: niedrig_ist_schlecht: Wert exakt auf Warnung -> warnung'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"niedrig_ist_schlecht","einheit":"EUR","warnung":50,"kritisch":20}'::jsonb, '49.99'::TEXT, 'ok', 'EUR')->>'stufe',
  'warnung',
  'Referenzfall niedrig-03: niedrig_ist_schlecht: Wert knapp unter Warnung -> warnung'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"niedrig_ist_schlecht","einheit":"EUR","warnung":50,"kritisch":20}'::jsonb, '20.01'::TEXT, 'ok', 'EUR')->>'stufe',
  'warnung',
  'Referenzfall niedrig-04: niedrig_ist_schlecht: Wert knapp ueber Kritisch -> warnung'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"niedrig_ist_schlecht","einheit":"EUR","warnung":50,"kritisch":20}'::jsonb, '20'::TEXT, 'ok', 'EUR')->>'stufe',
  'kritisch',
  'Referenzfall niedrig-05: niedrig_ist_schlecht: Wert exakt auf Kritisch -> kritisch'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"niedrig_ist_schlecht","einheit":"EUR","warnung":50,"kritisch":20}'::jsonb, '19.99'::TEXT, 'ok', 'EUR')->>'stufe',
  'kritisch',
  'Referenzfall niedrig-06: niedrig_ist_schlecht: Wert unter Kritisch -> kritisch'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"niedrig_ist_schlecht","einheit":"EUR","warnung":50,"kritisch":20}'::jsonb, '0'::TEXT, 'ok', 'EUR')->>'stufe',
  'kritisch',
  'Referenzfall niedrig-07: niedrig_ist_schlecht: Wert 0 -> kritisch'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"niedrig_ist_schlecht","einheit":"EUR","warnung":50,"kritisch":20}'::jsonb, '-10'::TEXT, 'ok', 'EUR')->>'stufe',
  'kritisch',
  'Referenzfall niedrig-08: niedrig_ist_schlecht: negativer Wert (-10) -> kritisch'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"niedrig_ist_schlecht","einheit":"EUR","warnung":-10,"kritisch":-30}'::jsonb, '-5'::TEXT, 'ok', 'EUR')->>'stufe',
  'normal',
  'Referenzfall niedrig-neg-01: niedrig_ist_schlecht mit negativen Grenzen: ueber Warnung (-5) -> normal'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"niedrig_ist_schlecht","einheit":"EUR","warnung":-10,"kritisch":-30}'::jsonb, '-10'::TEXT, 'ok', 'EUR')->>'stufe',
  'warnung',
  'Referenzfall niedrig-neg-02: niedrig_ist_schlecht mit negativen Grenzen: exakt Warnung (-10) -> warnung'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"niedrig_ist_schlecht","einheit":"EUR","warnung":-10,"kritisch":-30}'::jsonb, '-20'::TEXT, 'ok', 'EUR')->>'stufe',
  'warnung',
  'Referenzfall niedrig-neg-03: niedrig_ist_schlecht mit negativen Grenzen: zwischen Grenzen (-20) -> warnung'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"niedrig_ist_schlecht","einheit":"EUR","warnung":-10,"kritisch":-30}'::jsonb, '-30'::TEXT, 'ok', 'EUR')->>'stufe',
  'kritisch',
  'Referenzfall niedrig-neg-04: niedrig_ist_schlecht mit negativen Grenzen: exakt Kritisch (-30) -> kritisch'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"niedrig_ist_schlecht","einheit":"EUR","warnung":-10,"kritisch":-30}'::jsonb, '-40'::TEXT, 'ok', 'EUR')->>'stufe',
  'kritisch',
  'Referenzfall niedrig-neg-05: niedrig_ist_schlecht mit negativen Grenzen: unter Kritisch (-40) -> kritisch'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"zielbereich","einheit":"%","untenKritisch":10,"untenWarnung":20,"obenWarnung":80,"obenKritisch":90}'::jsonb, '9'::TEXT, 'ok', '%')->>'stufe',
  'kritisch',
  'Referenzfall ziel-01: zielbereich voll: unter untenKritisch -> kritisch'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"zielbereich","einheit":"%","untenKritisch":10,"untenWarnung":20,"obenWarnung":80,"obenKritisch":90}'::jsonb, '10'::TEXT, 'ok', '%')->>'stufe',
  'kritisch',
  'Referenzfall ziel-02: zielbereich voll: exakt untenKritisch -> kritisch'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"zielbereich","einheit":"%","untenKritisch":10,"untenWarnung":20,"obenWarnung":80,"obenKritisch":90}'::jsonb, '10.01'::TEXT, 'ok', '%')->>'stufe',
  'warnung',
  'Referenzfall ziel-03: zielbereich voll: knapp ueber untenKritisch -> warnung'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"zielbereich","einheit":"%","untenKritisch":10,"untenWarnung":20,"obenWarnung":80,"obenKritisch":90}'::jsonb, '19.99'::TEXT, 'ok', '%')->>'stufe',
  'warnung',
  'Referenzfall ziel-04: zielbereich voll: knapp unter untenWarnung -> warnung'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"zielbereich","einheit":"%","untenKritisch":10,"untenWarnung":20,"obenWarnung":80,"obenKritisch":90}'::jsonb, '20'::TEXT, 'ok', '%')->>'stufe',
  'normal',
  'Referenzfall ziel-05: zielbereich voll: exakt untenWarnung -> normal'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"zielbereich","einheit":"%","untenKritisch":10,"untenWarnung":20,"obenWarnung":80,"obenKritisch":90}'::jsonb, '50'::TEXT, 'ok', '%')->>'stufe',
  'normal',
  'Referenzfall ziel-06: zielbereich voll: Mitte (50) -> normal'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"zielbereich","einheit":"%","untenKritisch":10,"untenWarnung":20,"obenWarnung":80,"obenKritisch":90}'::jsonb, '80'::TEXT, 'ok', '%')->>'stufe',
  'normal',
  'Referenzfall ziel-07: zielbereich voll: exakt obenWarnung -> normal'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"zielbereich","einheit":"%","untenKritisch":10,"untenWarnung":20,"obenWarnung":80,"obenKritisch":90}'::jsonb, '80.01'::TEXT, 'ok', '%')->>'stufe',
  'warnung',
  'Referenzfall ziel-08: zielbereich voll: knapp ueber obenWarnung -> warnung'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"zielbereich","einheit":"%","untenKritisch":10,"untenWarnung":20,"obenWarnung":80,"obenKritisch":90}'::jsonb, '89.99'::TEXT, 'ok', '%')->>'stufe',
  'warnung',
  'Referenzfall ziel-09: zielbereich voll: knapp unter obenKritisch -> warnung'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"zielbereich","einheit":"%","untenKritisch":10,"untenWarnung":20,"obenWarnung":80,"obenKritisch":90}'::jsonb, '90'::TEXT, 'ok', '%')->>'stufe',
  'kritisch',
  'Referenzfall ziel-10: zielbereich voll: exakt obenKritisch -> kritisch'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"zielbereich","einheit":"%","untenKritisch":10,"untenWarnung":20,"obenWarnung":80,"obenKritisch":90}'::jsonb, '91'::TEXT, 'ok', '%')->>'stufe',
  'kritisch',
  'Referenzfall ziel-11: zielbereich voll: ueber obenKritisch -> kritisch'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"zielbereich","einheit":"x","untenWarnung":15,"obenWarnung":25}'::jsonb, '10'::TEXT, 'ok', 'x')->>'stufe',
  'warnung',
  'Referenzfall ziel-nur-warn-01: zielbereich nur Warngrenzen: unter untenWarnung -> warnung'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"zielbereich","einheit":"x","untenWarnung":15,"obenWarnung":25}'::jsonb, '15'::TEXT, 'ok', 'x')->>'stufe',
  'normal',
  'Referenzfall ziel-nur-warn-02: zielbereich nur Warngrenzen: exakt untenWarnung -> normal'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"zielbereich","einheit":"x","untenWarnung":15,"obenWarnung":25}'::jsonb, '20'::TEXT, 'ok', 'x')->>'stufe',
  'normal',
  'Referenzfall ziel-nur-warn-03: zielbereich nur Warngrenzen: Mitte (20) -> normal'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"zielbereich","einheit":"x","untenWarnung":15,"obenWarnung":25}'::jsonb, '25'::TEXT, 'ok', 'x')->>'stufe',
  'normal',
  'Referenzfall ziel-nur-warn-04: zielbereich nur Warngrenzen: exakt obenWarnung -> normal'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"zielbereich","einheit":"x","untenWarnung":15,"obenWarnung":25}'::jsonb, '25.01'::TEXT, 'ok', 'x')->>'stufe',
  'warnung',
  'Referenzfall ziel-nur-warn-05: zielbereich nur Warngrenzen: ueber obenWarnung -> warnung'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":100}'::jsonb, NULL::TEXT, 'ok', 'EUR')->>'stufe',
  'keine_daten',
  'Referenzfall daten-01: Messwert null -> keine_daten'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":100}'::jsonb, 'NaN'::TEXT, 'ok', 'EUR')->>'stufe',
  'nicht_bewertet',
  'Referenzfall daten-02: Messwert NaN -> nicht_bewertet'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":100}'::jsonb, 'Infinity'::TEXT, 'ok', 'EUR')->>'stufe',
  'nicht_bewertet',
  'Referenzfall daten-03: Messwert Infinity -> nicht_bewertet'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":100}'::jsonb, '-Infinity'::TEXT, 'ok', 'EUR')->>'stufe',
  'nicht_bewertet',
  'Referenzfall daten-04: Messwert -Infinity -> nicht_bewertet'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":100}'::jsonb, '200'::TEXT, 'fehler', 'EUR')->>'stufe',
  'nicht_bewertet',
  'Referenzfall zustand-01: Kachelzustand fehler -> nicht_bewertet'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":100}'::jsonb, '200'::TEXT, 'veraltet', 'EUR')->>'stufe',
  'nicht_bewertet',
  'Referenzfall zustand-02: Kachelzustand veraltet -> nicht_bewertet'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":100}'::jsonb, '200'::TEXT, 'offline', 'EUR')->>'stufe',
  'nicht_bewertet',
  'Referenzfall zustand-03: Kachelzustand offline -> nicht_bewertet'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":false,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":100}'::jsonb, '200'::TEXT, 'ok', 'EUR')->>'stufe',
  'nicht_bewertet',
  'Referenzfall regel-inaktiv-01: Regel nicht aktiviert (enabled: false) -> nicht_bewertet'
);
SELECT is(
  public.alarm_evaluate_threshold('{"enabled":true,"operator":"gt","warningValue":100,"criticalValue":200}'::jsonb, '150'::TEXT, 'ok', 'EUR')->>'stufe',
  'warnung',
  'Referenzfall alt-gt-01: Altregel gt: warnung 100, kritisch 200, wert 150 -> warnung'
);
SELECT is(
  public.alarm_evaluate_threshold('{"enabled":true,"operator":"gte","warningValue":100}'::jsonb, '100'::TEXT, 'ok', 'EUR')->>'stufe',
  'warnung',
  'Referenzfall alt-gte-01: Altregel gte: warnung 100, wert 100 -> warnung'
);
SELECT is(
  public.alarm_evaluate_threshold('{"enabled":true,"operator":"lt","warningValue":50,"criticalValue":10}'::jsonb, '50'::TEXT, 'ok', 'EUR')->>'stufe',
  'warnung',
  'Referenzfall alt-lt-01: Altregel lt: warnung 50, kritisch 10, wert 50 -> warnung'
);
SELECT is(
  public.alarm_evaluate_threshold('{"enabled":true,"operator":"lte","warningValue":50,"criticalValue":10}'::jsonb, '10'::TEXT, 'ok', 'EUR')->>'stufe',
  'kritisch',
  'Referenzfall alt-lte-01: Altregel lte: warnung 50, kritisch 10, wert 10 -> kritisch'
);
SELECT is(
  public.alarm_evaluate_threshold('{"enabled":true,"operator":"eq","warningValue":100}'::jsonb, '100'::TEXT, 'ok', 'EUR')->>'stufe',
  'regel_ungueltig',
  'Referenzfall alt-eq-01: Altregel eq -> regel_ungueltig'
);
SELECT is(
  public.alarm_evaluate_threshold('{"enabled":true,"operator":"between","warningValue":100,"criticalValue":200}'::jsonb, '150'::TEXT, 'ok', 'EUR')->>'stufe',
  'regel_ungueltig',
  'Referenzfall alt-between-01: Altregel between -> regel_ungueltig'
);
SELECT is(
  public.alarm_evaluate_threshold('{"enabled":true,"operator":"gt"}'::jsonb, '150'::TEXT, 'ok', 'EUR')->>'stufe',
  'regel_ungueltig',
  'Referenzfall alt-invalid-01: Altregel ohne warningValue -> regel_ungueltig'
);
SELECT is(
  public.alarm_evaluate_threshold('{"enabled":true,"operator":"gt","warningValue":200,"criticalValue":100}'::jsonb, '150'::TEXT, 'ok', 'EUR')->>'stufe',
  'regel_ungueltig',
  'Referenzfall alt-invalid-02: Altregel mit kritisch <= warnung bei gt -> regel_ungueltig'
);
SELECT is(
  public.alarm_evaluate_threshold('{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":100}'::jsonb, '150'::TEXT, 'ok', '%')->>'stufe',
  'regel_ungueltig',
  'Referenzfall einheit-01: Einheitenwechsel zwischen Regel (EUR) und Katalog (%) -> regel_ungueltig'
);

SELECT * FROM finish();
ROLLBACK;
