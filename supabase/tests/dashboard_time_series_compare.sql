-- Auftrag 170 (P14b): Vergleichszeitraum, Joins, Heatmap, Erwartungsbänder
-- pgTAP-Test für public.dashboard_time_series_compare und Alarm-Trigger-Schutz

BEGIN;

SELECT plan(36);

-- ---------------------------------------------------------------- Setup --
DELETE FROM public.deal_stage_events WHERE deal_id LIKE 'd170-%';
DELETE FROM public.live_kpi_public_feed WHERE kpi_id LIKE 'kpi170_%';
DELETE FROM public.imported_funnel_deals WHERE id LIKE 'd170-%';
DELETE FROM public.organization_members WHERE user_id IN (
  '91700000-0000-0000-0000-000000000001',
  '91700000-0000-0000-0000-000000000002',
  '91700000-0000-0000-0000-000000000003'
);
DELETE FROM auth.users WHERE email LIKE '%@170-test.local';
DELETE FROM public.organizations WHERE id IN (
  'a1700000-0000-0000-0000-000000000001',
  'b1700000-0000-0000-0000-000000000002'
);

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('91700000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'member-a@170-test.local', 'x', now()),
  ('91700000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'suspended-a@170-test.local', 'x', now()),
  ('91700000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'member-b@170-test.local', 'x', now());

INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('a1700000-0000-0000-0000-000000000001', 'Org A (170 Test)', 'synthetic', 'active'),
  ('b1700000-0000-0000-0000-000000000002', 'Org B (170 Test)', 'synthetic', 'active');

INSERT INTO public.organization_members (user_id, organization_id, role, status)
VALUES
  ('91700000-0000-0000-0000-000000000001', 'a1700000-0000-0000-0000-000000000001', 'admin', 'active'),
  ('91700000-0000-0000-0000-000000000002', 'a1700000-0000-0000-0000-000000000001', 'viewer', 'suspended'),
  ('91700000-0000-0000-0000-000000000003', 'b1700000-0000-0000-0000-000000000002', 'admin', 'active');

INSERT INTO public.imported_funnel_deals (id, deal_name, stage, amount, close_date, pipeline, organization_id)
VALUES
  ('d170-a1', 'Deal A1', 'Deal gewonnen', 10000, '2026-10-31', 'Standard', 'a1700000-0000-0000-0000-000000000001');

INSERT INTO public.deal_stage_events (id, organization_id, deal_id, from_stage, to_stage, actor_id, occurred_at)
VALUES
  ('e170-a001-0000-0000-0000-000000000001', 'a1700000-0000-0000-0000-000000000001', 'd170-a1', 'Verhandlung', 'Deal gewonnen', '91700000-0000-0000-0000-000000000001', '2026-10-05 10:00:00+02'),
  ('e170-a002-0000-0000-0000-000000000002', 'a1700000-0000-0000-0000-000000000001', 'd170-a1', 'Angebot', 'Deal gewonnen', '91700000-0000-0000-0000-000000000001', '2026-10-12 11:00:00+02'),
  ('e170-a003-0000-0000-0000-000000000003', 'a1700000-0000-0000-0000-000000000001', 'd170-a1', 'Angebot erstellt', 'Verhandlung', '91700000-0000-0000-0000-000000000001', '2026-10-13 09:00:00+02');

-- Live-Messungen: 2026-10-12 10:xx (Basis) und 2026-10-05 10:xx (Vorperiode), Lücke um 11:00
INSERT INTO public.live_kpi_public_feed (id, organization_id, kpi_id, value, unit, occurred_at, quality_status, source_system, ingested_at)
VALUES
  ('f170-a001-0000-0000-0000-000000000001', 'a1700000-0000-0000-0000-000000000001', 'kpi170_arr', 120, 'EUR', '2026-10-05 10:10:00+02', 'ok', 'test', '2026-10-05 10:10:05+02'),
  ('f170-a002-0000-0000-0000-000000000002', 'a1700000-0000-0000-0000-000000000001', 'kpi170_arr', 150, 'EUR', '2026-10-12 10:10:00+02', 'ok', 'test', '2026-10-12 10:10:05+02');

-- ---------------------------------------------------------------- Tests --
-- Hilfsfunktion: gültige V2-Konfiguration mit einer Kachel und frei wählbarer query/presentation
CREATE OR REPLACE FUNCTION pg_temp.cfg170(p_query JSONB, p_presentation TEXT DEFAULT 'linie')
RETURNS JSONB LANGUAGE sql AS $f$
  SELECT jsonb_build_object(
    'version', 2,
    'id', 'd1700000-0000-0000-0000-000000000001',
    'title', 'Test Dashboard',
    'scope', 'personal',
    'ownerUserId', '91700000-0000-0000-0000-000000000001',
    'organizationId', 'a1700000-0000-0000-0000-000000000001',
    'globalTimeframe', 'aktuell',
    'tiles', jsonb_build_array(jsonb_build_object(
      'id', 'tile-alarm',
      'catalogId', 'live.arr',
      'title', 'ARR',
      'presentation', p_presentation,
      'layouts', jsonb_build_object('desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 4, 'h', 4)),
      'query', jsonb_build_object('metricId', 'live.arr') || p_query
    ))
  )
$f$;
GRANT EXECUTE ON FUNCTION pg_temp.cfg170(JSONB, TEXT) TO authenticated;

-- 1–2. Signaturen
SELECT has_function(
  'public', 'dashboard_time_series_compare',
  ARRAY['text', 'text', 'text', 'timestamp with time zone', 'timestamp with time zone', 'text', 'text'],
  'dashboard_time_series_compare existiert mit erwarteter Signatur'
);
SELECT has_function(
  'public', 'dashboard_time_series_phases',
  ARRAY['text', 'timestamp with time zone', 'timestamp with time zone', 'text'],
  'dashboard_time_series_phases existiert mit erwarteter Signatur'
);

-- 3–4. Rechte: anon hat kein Ausführungsrecht
SET ROLE anon;
SELECT throws_ok(
  $$SELECT public.dashboard_time_series_compare('deal_stage_events', 'Deal gewonnen', 'woche', '2026-10-12 00:00:00+02'::timestamptz, '2026-10-19 00:00:00+02'::timestamptz, 'vorperiode')$$,
  '42501', NULL, 'anon darf dashboard_time_series_compare nicht ausführen'
);
SELECT throws_ok(
  $$SELECT public.dashboard_time_series_phases('woche', '2026-10-12 00:00:00+02'::timestamptz, '2026-10-19 00:00:00+02'::timestamptz)$$,
  '42501', NULL, 'anon darf dashboard_time_series_phases nicht ausführen'
);
RESET ROLE;

-- 5. Suspendiertes Mitglied
SELECT set_config('request.jwt.claims', '{"sub":"91700000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SET ROLE authenticated;
SELECT throws_ok(
  $$SELECT public.dashboard_time_series_compare('deal_stage_events', 'Deal gewonnen', 'woche', '2026-10-12 00:00:00+02'::timestamptz, '2026-10-19 00:00:00+02'::timestamptz, 'vorperiode')$$,
  '42501', 'LP_NOT_MEMBER', 'Suspendiertes Mitglied wird mit LP_NOT_MEMBER abgewiesen'
);
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"91700000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SET ROLE authenticated;

-- 6. Unbekannter Vergleichszeitraum
SELECT throws_ok(
  $$SELECT public.dashboard_time_series_compare('deal_stage_events', 'Deal gewonnen', 'woche', '2026-10-12 00:00:00+02'::timestamptz, '2026-10-19 00:00:00+02'::timestamptz, 'ungueltig')$$,
  '22023', 'unbekannter Vergleichszeitraum', 'Ungültiger Vergleichszeitraum wirft 22023'
);

-- 7. Größenbegrenzung serverseitig (über 400 Stunden)
SELECT throws_ok(
  $$SELECT public.dashboard_time_series_compare('deal_stage_events', 'Deal gewonnen', 'stunde', '2026-09-01 00:00:00+02'::timestamptz, '2026-10-19 00:00:00+02'::timestamptz, 'vorperiode')$$,
  '22023', 'zu_viele_punkte', 'Mehr als 400 Punkte je Fenster werden abgewiesen'
);

-- 8–10. Vorperiode: gleiche Länge direkt davor
SELECT is(
  public.dashboard_time_series_compare('deal_stage_events', 'Deal gewonnen', 'woche', '2026-10-12 00:00:00+02'::timestamptz, '2026-10-19 00:00:00+02'::timestamptz, 'vorperiode')->'points'->0->>'value',
  '1', 'Basiswoche 12.10. zählt einen Gewinn'
);
SELECT is(
  public.dashboard_time_series_compare('deal_stage_events', 'Deal gewonnen', 'woche', '2026-10-12 00:00:00+02'::timestamptz, '2026-10-19 00:00:00+02'::timestamptz, 'vorperiode')->'comparePoints'->0->>'value',
  '1', 'Vorperiode (Woche 05.10.) zählt einen Gewinn'
);
SELECT is(
  (public.dashboard_time_series_compare('deal_stage_events', 'Deal gewonnen', 'woche', '2026-10-12 00:00:00+02'::timestamptz, '2026-10-26 00:00:00+01'::timestamptz, 'vorperiode')->>'compareFrom')::timestamptz,
  '2026-09-28 00:00:00+02'::timestamptz,
  'Vorperiode eines Zwei-Wochen-Fensters beginnt zwei Wochen davor (über die Zeitumstellung hinweg)'
);

-- 11. Teilhistorie: Vorperiode beginnt vor dem ersten Ereignis -> unvollständig mit Datum
SELECT is(
  public.dashboard_time_series_compare('deal_stage_events', 'Deal gewonnen', 'woche', '2026-10-12 00:00:00+02'::timestamptz, '2026-10-26 00:00:00+01'::timestamptz, 'vorperiode')->>'partial_reason',
  'Vergleich unvollständig: Daten ab 05.10.2026',
  'Teilhistorie wird mit Datenstand erklärt'
);

-- 12. Kein Rückrechnen: Wochen vor Historienbeginn bleiben ohne Wert
SELECT is(
  public.dashboard_time_series_compare('deal_stage_events', 'Deal gewonnen', 'woche', '2026-10-12 00:00:00+02'::timestamptz, '2026-10-26 00:00:00+01'::timestamptz, 'vorperiode')->'comparePoints'->0->>'status',
  'vor_historienbeginn',
  'Vergleichsabschnitt vor Historienbeginn ist als vor_historienbeginn markiert'
);

-- 13. Vorjahr ohne Historie -> unvollständig, datenstand_ab gesetzt
SELECT ok(
  (public.dashboard_time_series_compare('deal_stage_events', 'Deal gewonnen', 'woche', '2026-10-12 00:00:00+02'::timestamptz, '2026-10-19 00:00:00+02'::timestamptz, 'vorjahr')->>'is_partial')::boolean
  AND (public.dashboard_time_series_compare('deal_stage_events', 'Deal gewonnen', 'woche', '2026-10-12 00:00:00+02'::timestamptz, '2026-10-19 00:00:00+02'::timestamptz, 'vorjahr')->>'datenstand_ab') IS NOT NULL,
  'Vorjahr vor Historienbeginn ist unvollständig und nennt datenstand_ab'
);

-- 13b–13c. Vorjahr bei Wochen: ausgerichtet auf ganze Kalenderwochen (Montag)
SELECT is(
  (public.dashboard_time_series_compare('deal_stage_events', 'Deal gewonnen', 'woche', '2026-10-12 00:00:00+02'::timestamptz, '2026-10-19 00:00:00+02'::timestamptz, 'vorjahr')->>'compareFrom')::timestamptz,
  '2025-10-06 00:00:00+02'::timestamptz,
  'Vorjahr bei Wochen beginnt am Montag der zugehörigen Kalenderwoche'
);
SELECT is(
  jsonb_array_length(public.dashboard_time_series_compare('deal_stage_events', 'Deal gewonnen', 'woche', '2026-10-12 00:00:00+02'::timestamptz, '2026-10-19 00:00:00+02'::timestamptz, 'vorjahr')->'comparePoints'),
  1,
  'Vorjahr bei Wochen liefert genau eine ganze Woche statt zweier angeschnittener'
);

-- 13d–13e. Vorjahr an der Schaltjahrgrenze: kein leeres Vergleichsfenster
SELECT lives_ok(
  $$SELECT public.dashboard_time_series_compare('deal_stage_events', 'Deal gewonnen', 'tag', '2024-02-28 00:00:00+01'::timestamptz, '2024-03-01 00:00:00+01'::timestamptz, 'vorjahr')$$,
  'Täglicher Vorjahr-Vergleich über die Schaltjahrgrenze wirft keinen Fensterfehler'
);
SELECT is(
  jsonb_array_length(public.dashboard_time_series_compare('deal_stage_events', 'Deal gewonnen', 'tag', '2024-02-28 00:00:00+01'::timestamptz, '2024-03-01 00:00:00+01'::timestamptz, 'vorjahr')->'comparePoints'),
  1,
  'Schaltjahres-Kollaps 29.02.2024 -> 28.02.2023 liefert genau einen Vergleichstag'
);

-- 13f. Stündlicher Vorjahr-Vergleich über den Schaltjahresbeginn: nicht-monotone
-- Zuordnung (29.02. kollabiert auf 28.02.) darf keine benötigten Stunden abschneiden
SELECT is(
  jsonb_array_length(public.dashboard_time_series_compare('deal_stage_events', 'Deal gewonnen', 'stunde', '2024-02-28 23:00:00+01'::timestamptz, '2024-02-29 03:00:00+01'::timestamptz, 'vorjahr')->'comparePoints'),
  24,
  'Stündlicher Vorjahr über den Schaltjahresbeginn lädt alle 24 benötigten Vergleichsstunden'
);

-- 14. Vollständige Vorperiode ist nicht unvollständig
SELECT is(
  public.dashboard_time_series_compare('deal_stage_events', 'Deal gewonnen', 'woche', '2026-10-12 00:00:00+02'::timestamptz, '2026-10-19 00:00:00+02'::timestamptz, 'vorperiode')->>'is_partial',
  'false', 'Belegte Vorperiode ist vollständig'
);

-- 15–16. Live: Lücken bleiben Lücken (nicht unvollständig), Wert aus der Vorperiode
SELECT is(
  public.dashboard_time_series_compare('live_kpi', 'kpi170_arr', 'stunde', '2026-10-12 10:00:00+02'::timestamptz, '2026-10-12 12:00:00+02'::timestamptz, 'vorjahr')->'points'->1->>'status',
  'luecke', 'Live-Stunde ohne Messung bleibt Lücke'
);
SELECT is(
  public.dashboard_time_series_compare('live_kpi', 'kpi170_arr', 'stunde', '2026-10-12 10:00:00+02'::timestamptz, '2026-10-12 11:00:00+02'::timestamptz, 'vorperiode')->'comparePoints'->0->>'status',
  'luecke', 'Live-Vorperiode 09:00 ohne Messung bleibt Lücke'
);

-- 17. Phasen-Heatmap: sieben Phasen, Verhandlung in Woche 12.10. gezählt
SELECT is(
  jsonb_array_length(public.dashboard_time_series_phases('woche', '2026-10-12 00:00:00+02'::timestamptz, '2026-10-19 00:00:00+02'::timestamptz)->'phases'),
  7, 'Phasen-RPC liefert sieben Phasen'
);
SELECT is(
  (SELECT ph->'points'->0->>'value'
   FROM jsonb_array_elements(public.dashboard_time_series_phases('woche', '2026-10-12 00:00:00+02'::timestamptz, '2026-10-19 00:00:00+02'::timestamptz)->'phases') ph
   WHERE ph->>'phase' = 'Verhandlung'),
  '1', 'Phase Verhandlung zählt einen Eintritt in der Woche 12.10.'
);
RESET ROLE;

-- 19. Fremde Organisation sieht keine Werte aus Org A
SELECT set_config('request.jwt.claims', '{"sub":"91700000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SET ROLE authenticated;
SELECT is(
  public.dashboard_time_series_compare('deal_stage_events', 'Deal gewonnen', 'woche', '2026-10-12 00:00:00+02'::timestamptz, '2026-10-19 00:00:00+02'::timestamptz, 'vorperiode')->'points'->0->>'value',
  NULL, 'Org B erhält keinen Wert aus Org A'
);
RESET ROLE;

-- 20–25. Konfigurationsprüfung
SELECT is(public.dashboard_config_v2_invalid_reason(pg_temp.cfg170('{"compare":"vorperiode","join":{"metricId":"live.mrr","typ":"inner"},"bands":{"type":"percentile_10_90","periodCount":8}}')), NULL, 'compare, join und bands sind gültig');
SELECT is(public.dashboard_config_v2_invalid_reason(pg_temp.cfg170('{"compare":"gestern"}')), 'query.compare muss vorperiode oder vorjahr sein', 'Unbekannter Vergleich wird abgelehnt');
SELECT is(public.dashboard_config_v2_invalid_reason(pg_temp.cfg170('{"join":{"metricId":"live.mrr","typ":"outer"}}')), 'query.join.typ muss inner oder links sein', 'Unbekannter Join-Typ wird abgelehnt');
SELECT is(public.dashboard_config_v2_invalid_reason(pg_temp.cfg170('{"bands":{"type":"percentile_10_90","periodCount":7}}')), 'query.bands.periodCount muss 8 sein', 'Bänder nur mit 8 Vorperioden');
SELECT is(public.dashboard_config_v2_invalid_reason(pg_temp.cfg170('{"compare":"vorperiode","transformations":[{"art":"gleitender_durchschnitt","fenster":3}]}')), 'query.compare, query.join und query.bands sind nicht mit Umrechnung oder gleitendem Durchschnitt kombinierbar', 'Vergleich mit gleitendem Durchschnitt wird abgelehnt');
SELECT is(public.dashboard_config_v2_invalid_reason(pg_temp.cfg170('{"compare":"vorperiode","transformations":[{"art":"umbenennen","name":"ARR neu"}]}')), NULL, 'Vergleich mit Umbenennung ist zulässig');
SELECT is(public.dashboard_config_v2_invalid_reason(pg_temp.cfg170('{"compare":"vorperiode"}', 'saeulen')), 'query.compare, query.join und query.bands sind nur für Linie oder Fläche zulässig', 'Vergleich wird bei Säulendarstellung abgelehnt');
SELECT is(public.dashboard_config_v2_invalid_reason(pg_temp.cfg170('{"bands":{"type":"percentile_10_90","periodCount":8}}', 'flaeche')), NULL, 'Erwartungsband ist bei Flächendarstellung zulässig');
SELECT is(public.dashboard_config_v2_invalid_reason(pg_temp.cfg170('{"compare":"vorperiode","transformations":[{"art":"einheit_umrechnen","von":"EUR","zu":"Tsd. EUR"}]}')), 'query.compare, query.join und query.bands sind nicht mit Umrechnung oder gleitendem Durchschnitt kombinierbar', 'Vergleich mit Einheitenumrechnung wird abgelehnt');

-- 26–28. Trigger pausiert Alarme bei Vergleich und Heatmap
INSERT INTO public.dashboards (id, organization_id, user_id, created_by_user_id, title, scope, revision, config)
VALUES (
  'd1700000-0000-0000-0000-000000000001', 'a1700000-0000-0000-0000-000000000001',
  '91700000-0000-0000-0000-000000000001', '91700000-0000-0000-0000-000000000001',
  'Test Dashboard', 'personal', 1, pg_temp.cfg170('{}')
);

INSERT INTO public.dashboard_alarm_rules (
  id, organization_id, dashboard_id, tile_id, catalog_id, created_by, responsible_user_id, status,
  rule_config, mindestdauer_laeufe, abklingzeit_sekunden
) VALUES (
  'c1700000-0000-0000-0000-000000000001', 'a1700000-0000-0000-0000-000000000001',
  'd1700000-0000-0000-0000-000000000001', 'tile-alarm', 'live.arr',
  '91700000-0000-0000-0000-000000000001', '91700000-0000-0000-0000-000000000001', 'aktiv',
  jsonb_build_object('formatVersion', 2, 'enabled', true, 'art', 'niedrig_ist_schlecht', 'einheit', 'EUR', 'warnung', 50000),
  1, 0
);

UPDATE public.dashboards SET config = pg_temp.cfg170('{"compare":"vorperiode"}')
WHERE id = 'd1700000-0000-0000-0000-000000000001';

SELECT is(
  (SELECT status || '/' || pause_grund FROM public.dashboard_alarm_rules WHERE id = 'c1700000-0000-0000-0000-000000000001'),
  'pausiert/kennzahl_nicht_alarmfaehig',
  'Vergleich pausiert die aktive Alarmregel'
);

UPDATE public.dashboard_alarm_rules SET status = 'aktiv', pause_grund = NULL
WHERE id = 'c1700000-0000-0000-0000-000000000001';
UPDATE public.dashboards SET config = pg_temp.cfg170('{}', 'heatmap')
WHERE id = 'd1700000-0000-0000-0000-000000000001';

SELECT is(
  (SELECT status FROM public.dashboard_alarm_rules WHERE id = 'c1700000-0000-0000-0000-000000000001'),
  'pausiert',
  'Heatmap pausiert die aktive Alarmregel'
);

UPDATE public.dashboard_alarm_rules SET status = 'aktiv', pause_grund = NULL
WHERE id = 'c1700000-0000-0000-0000-000000000001';
UPDATE public.dashboards SET config = pg_temp.cfg170('{}', 'linie')
WHERE id = 'd1700000-0000-0000-0000-000000000001';

SELECT is(
  (SELECT status FROM public.dashboard_alarm_rules WHERE id = 'c1700000-0000-0000-0000-000000000001'),
  'aktiv',
  'Einfache Linie lässt die Alarmregel aktiv'
);

SELECT * FROM finish();
ROLLBACK;
