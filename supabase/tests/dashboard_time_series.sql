-- Auftrag 160 (P10b-1): Server-Zeitreihen, Historienbeginn und Datenlücken
-- pgTAP-Test für public.dashboard_time_series

BEGIN;

SELECT plan(29);

-- ---------------------------------------------------------------- Setup --
DELETE FROM public.deal_stage_events WHERE deal_id LIKE 'd160-%';
DELETE FROM public.live_kpi_public_feed WHERE kpi_id LIKE 'kpi160_%';
DELETE FROM public.imported_funnel_deals WHERE id LIKE 'd160-%';
DELETE FROM public.organization_members WHERE user_id IN (
  '91600000-0000-0000-0000-000000000001',
  '91600000-0000-0000-0000-000000000002',
  '91600000-0000-0000-0000-000000000003',
  '91600000-0000-0000-0000-000000000004'
);
DELETE FROM auth.users WHERE email LIKE '%@160-test.local';
DELETE FROM public.organizations WHERE id IN (
  'a1600000-0000-0000-0000-000000000001',
  'b1600000-0000-0000-0000-000000000002',
  'c1600000-0000-0000-0000-000000000003'
);

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('91600000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'member-a@160-test.local', 'x', now()),
  ('91600000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'viewer-a@160-test.local', 'x', now()),
  ('91600000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'suspended-a@160-test.local', 'x', now()),
  ('91600000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'member-b@160-test.local', 'x', now());

INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('a1600000-0000-0000-0000-000000000001', 'Org A (160 Test)', 'synthetic', 'active'),
  ('b1600000-0000-0000-0000-000000000002', 'Org B (160 Test)', 'synthetic', 'active'),
  ('c1600000-0000-0000-0000-000000000003', 'Org C ohne Daten (160 Test)', 'synthetic', 'active');

INSERT INTO public.organization_members (user_id, organization_id, role, status)
VALUES
  ('91600000-0000-0000-0000-000000000001', 'a1600000-0000-0000-0000-000000000001', 'admin', 'active'),
  ('91600000-0000-0000-0000-000000000002', 'a1600000-0000-0000-0000-000000000001', 'viewer', 'active'),
  ('91600000-0000-0000-0000-000000000003', 'a1600000-0000-0000-0000-000000000001', 'viewer', 'suspended'),
  ('91600000-0000-0000-0000-000000000004', 'b1600000-0000-0000-0000-000000000002', 'admin', 'active');

-- Deals für Org A (zwei Pipelines)
INSERT INTO public.imported_funnel_deals (id, deal_name, stage, amount, close_date, pipeline, organization_id)
VALUES
  ('d160-a1', 'Deal A1', 'Deal gewonnen', 10000, '2026-10-31', 'Standard', 'a1600000-0000-0000-0000-000000000001'),
  ('d160-a2', 'Deal A2', 'Deal gewonnen', 20000, '2026-10-31', 'Partner', 'a1600000-0000-0000-0000-000000000001'),
  ('d160-a3', 'Deal A3', 'Erstgespräch geführt', 5000, '2026-10-31', 'Standard', 'a1600000-0000-0000-0000-000000000001');

-- Deal für Org B
INSERT INTO public.imported_funnel_deals (id, deal_name, stage, amount, close_date, pipeline, organization_id)
VALUES
  ('d160-b1', 'Deal B1', 'Deal gewonnen', 99999, '2026-10-31', 'Standard', 'b1600000-0000-0000-0000-000000000002');

-- Ereignisse für Org A: Historienbeginn 2026-10-05 10:00:00+02
INSERT INTO public.deal_stage_events (id, organization_id, deal_id, from_stage, to_stage, actor_id, occurred_at)
VALUES
  ('e160-a001-0000-0000-0000-000000000001', 'a1600000-0000-0000-0000-000000000001', 'd160-a1', 'Verhandlung', 'Deal gewonnen', '91600000-0000-0000-0000-000000000001', '2026-10-05 10:00:00+02'),
  ('e160-a002-0000-0000-0000-000000000002', 'a1600000-0000-0000-0000-000000000001', 'd160-a2', 'Angebot erstellt', 'won', '91600000-0000-0000-0000-000000000001', '2026-10-05 11:00:00+02'),
  ('e160-a003-0000-0000-0000-000000000003', 'a1600000-0000-0000-0000-000000000001', 'd160-a3', 'Lead eingegangen', 'Erstgespräch geführt', '91600000-0000-0000-0000-000000000001', '2026-10-12 09:00:00+02');

-- Ereignis für Org B: Historienbeginn 2026-10-19 12:00:00+02
INSERT INTO public.deal_stage_events (id, organization_id, deal_id, from_stage, to_stage, actor_id, occurred_at)
VALUES
  ('e160-b001-0000-0000-0000-000000000001', 'b1600000-0000-0000-0000-000000000002', 'd160-b1', 'Verhandlung', 'Deal gewonnen', '91600000-0000-0000-0000-000000000004', '2026-10-19 12:00:00+02');

-- Live-Messwerte für Org A: KPI kpi160_active
-- Zwei Messungen in derselben Stunde 2026-10-05 10:00:00+02 (100 und 150), 150 hat neueres occurred_at
-- Gleichstand-Test in Stunde 2026-10-05 11:00:00+02: gleiches occurred_at, 250 hat größeres ingested_at
INSERT INTO public.live_kpi_public_feed (id, organization_id, kpi_id, value, unit, occurred_at, quality_status, source_system, ingested_at)
VALUES
  ('f160-a001-0000-0000-0000-000000000001', 'a1600000-0000-0000-0000-000000000001', 'kpi160_active', 100, 'count', '2026-10-05 10:10:00+02', 'ok', 'test', '2026-10-05 10:10:05+02'),
  ('f160-a002-0000-0000-0000-000000000002', 'a1600000-0000-0000-0000-000000000001', 'kpi160_active', 150, 'count', '2026-10-05 10:50:00+02', 'ok', 'test', '2026-10-05 10:50:05+02'),
  ('f160-a003-0000-0000-0000-000000000003', 'a1600000-0000-0000-0000-000000000001', 'kpi160_active', 200, 'count', '2026-10-05 11:20:00+02', 'ok', 'test', '2026-10-05 11:20:01+02'),
  ('f160-a004-0000-0000-0000-000000000004', 'a1600000-0000-0000-0000-000000000001', 'kpi160_active', 250, 'count', '2026-10-05 11:20:00+02', 'ok', 'test', '2026-10-05 11:20:02+02');

-- DST Test-Ereignis: Nacht der Zeitumstellung 2026-10-25 01:30:00+02
INSERT INTO public.deal_stage_events (id, organization_id, deal_id, from_stage, to_stage, actor_id, occurred_at)
VALUES
  ('e160-a004-0000-0000-0000-000000000004', 'a1600000-0000-0000-0000-000000000001', 'd160-a1', 'Erstgespräch geführt', 'Bedarfsanalyse', '91600000-0000-0000-0000-000000000001', '2026-10-25 01:30:00+02');

-- ---------------------------------------------------------------- Tests --

-- 1. Signatur & Existenz
SELECT has_function(
  'public',
  'dashboard_time_series',
  ARRAY['text', 'text', 'text', 'timestamp with time zone', 'timestamp with time zone', 'text'],
  'Funktion public.dashboard_time_series existiert mit korrekter Signatur'
);

-- 2. anon hat kein Ausführungsrecht
SELECT throws_ok(
  $$SELECT public.dashboard_time_series('deal_stage_events', 'Deal gewonnen', 'woche', '2026-10-05 00:00:00+02'::timestamptz, '2026-10-19 00:00:00+02'::timestamptz)$$,
  '42501',
  NULL,
  'anon wird bei Aufruf von dashboard_time_series abgewiesen'
);

-- 3. Inaktives Mitglied wirft LP_NOT_MEMBER
SELECT set_config('request.jwt.claims', '{"sub":"91600000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SET ROLE authenticated;
SELECT throws_ok(
  $$SELECT public.dashboard_time_series('deal_stage_events', 'Deal gewonnen', 'woche', '2026-10-05 00:00:00+02'::timestamptz, '2026-10-19 00:00:00+02'::timestamptz)$$,
  '42501',
  'LP_NOT_MEMBER',
  'Suspendiertes Mitglied wird mit LP_NOT_MEMBER abgewiesen'
);
RESET ROLE;

-- Ab hier: authentifizierter Nutzer von Org A
SELECT set_config('request.jwt.claims', '{"sub":"91600000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SET ROLE authenticated;

-- 4. Fehlerprüfung: unbekannte Quelle
SELECT throws_ok(
  $$SELECT public.dashboard_time_series('unbekannt', 'Deal gewonnen', 'woche', '2026-10-05 00:00:00+02'::timestamptz, '2026-10-19 00:00:00+02'::timestamptz)$$,
  '22023',
  'unbekannte Quelle',
  'Unbekannte Quelle wirft 22023'
);

-- 5. Fehlerprüfung: unbekannte Auflösung
SELECT throws_ok(
  $$SELECT public.dashboard_time_series('deal_stage_events', 'Deal gewonnen', 'sekunde', '2026-10-05 00:00:00+02'::timestamptz, '2026-10-19 00:00:00+02'::timestamptz)$$,
  '22023',
  'unbekannte Auflösung',
  'Unbekannte Auflösung wirft 22023'
);

-- 6. Fehlerprüfung: p_metric leer
SELECT throws_ok(
  $$SELECT public.dashboard_time_series('deal_stage_events', '  ', 'woche', '2026-10-05 00:00:00+02'::timestamptz, '2026-10-19 00:00:00+02'::timestamptz)$$,
  '22023',
  'p_metric leer',
  'Leere Metrik wirft 22023'
);

-- 7. Fehlerprüfung: p_pipeline bei Live gesetzt
SELECT throws_ok(
  $$SELECT public.dashboard_time_series('live_kpi', 'kpi160_active', 'stunde', '2026-10-05 10:00:00+02'::timestamptz, '2026-10-05 12:00:00+02'::timestamptz, 'Standard')$$,
  '22023',
  'p_pipeline bei Live gesetzt',
  'p_pipeline bei Live wirft 22023'
);

-- 8. Fehlerprüfung: p_from >= p_to
SELECT throws_ok(
  $$SELECT public.dashboard_time_series('deal_stage_events', 'Deal gewonnen', 'woche', '2026-10-19 00:00:00+02'::timestamptz, '2026-10-05 00:00:00+02'::timestamptz)$$,
  '22023',
  'p_from >= p_to',
  'p_from >= p_to wirft 22023'
);

-- 9. Fehlerprüfung: p_to in der Zukunft (> 60 s)
SELECT throws_ok(
  $$SELECT public.dashboard_time_series('deal_stage_events', 'Deal gewonnen', 'woche', '2026-10-05 00:00:00+02'::timestamptz, clock_timestamp() + interval '5 minutes')$$,
  '22023',
  'p_to in der Zukunft',
  'p_to in der Zukunft wirft 22023'
);

-- 10. Punktobergrenze: 401 Punkte werden abgewiesen
SELECT throws_ok(
  $$SELECT public.dashboard_time_series('deal_stage_events', 'Deal gewonnen', 'tag', '2025-01-01 00:00:00+01'::timestamptz, '2026-02-06 00:00:00+01'::timestamptz)$$,
  '22023',
  'zu_viele_punkte',
  'Zeitraum mit > 400 Punkten wirft zu_viele_punkte'
);

-- 11. Punktobergrenze: genau 400 Punkte werden akzeptiert
SELECT is(
  jsonb_array_length(
    public.dashboard_time_series(
      'deal_stage_events',
      'Deal gewonnen',
      'tag',
      '2025-01-01 00:00:00+01'::timestamptz,
      '2026-02-05 00:00:00+01'::timestamptz
    )->'points'
  ),
  400,
  'Genau 400 Punkte werden geliefert'
);

-- 12. CRM: Historienbeginn für Org A
SELECT is(
  (public.dashboard_time_series(
    'deal_stage_events',
    'Deal gewonnen',
    'woche',
    '2026-10-05 00:00:00+02'::timestamptz,
    '2026-10-19 00:00:00+02'::timestamptz
  ))->>'historyStartAt',
  '2026-10-05T10:00:00+02:00',
  'historyStartAt ist das früheste Ereignis der Organisation'
);

-- 13. CRM: Normalisierung (won zählt als Deal gewonnen)
SELECT is(
  (
    SELECT (jsonb_path_query_first(
      public.dashboard_time_series(
        'deal_stage_events',
        'Deal gewonnen',
        'woche',
        '2026-10-05 00:00:00+02'::timestamptz,
        '2026-10-19 00:00:00+02'::timestamptz
      ),
      '$.points[*] ? (@.bucketStart == "2026-10-05T00:00:00+02:00").value'
    )::text)::int
  ),
  2,
  'Normalisierung: won und Deal gewonnen zählen beide (Wert 2 in KW 41)'
);

-- 14. CRM: Nullwert ab Historienbeginn (KW 42 ohne Deal gewonnen = 0, belegt)
SELECT is(
  (
    SELECT jsonb_path_query_first(
      public.dashboard_time_series(
        'deal_stage_events',
        'Deal gewonnen',
        'woche',
        '2026-10-05 00:00:00+02'::timestamptz,
        '2026-10-19 00:00:00+02'::timestamptz
      ),
      '$.points[*] ? (@.bucketStart == "2026-10-12T00:00:00+02:00").status'
    )::text
  ),
  '"belegt"',
  'Abschnitt nach Historienbeginn ohne Eintritt hat Status belegt'
);

SELECT is(
  (
    SELECT (jsonb_path_query_first(
      public.dashboard_time_series(
        'deal_stage_events',
        'Deal gewonnen',
        'woche',
        '2026-10-05 00:00:00+02'::timestamptz,
        '2026-10-19 00:00:00+02'::timestamptz
      ),
      '$.points[*] ? (@.bucketStart == "2026-10-12T00:00:00+02:00").value'
    )::text)::int
  ),
  0,
  'Abschnitt nach Historienbeginn ohne Eintritt hat Wert 0'
);

-- 15. CRM: Vor Historienbeginn (KW 40 vor 2026-10-05) ist vor_historienbeginn / null
SELECT is(
  (
    SELECT jsonb_path_query_first(
      public.dashboard_time_series(
        'deal_stage_events',
        'Deal gewonnen',
        'woche',
        '2026-09-28 00:00:00+02'::timestamptz,
        '2026-10-12 00:00:00+02'::timestamptz
      ),
      '$.points[*] ? (@.bucketStart == "2026-09-28T00:00:00+02:00").status'
    )::text
  ),
  '"vor_historienbeginn"',
  'Abschnitt vor Historienbeginn hat Status vor_historienbeginn'
);

SELECT is(
  (
    SELECT jsonb_path_query_first(
      public.dashboard_time_series(
        'deal_stage_events',
        'Deal gewonnen',
        'woche',
        '2026-09-28 00:00:00+02'::timestamptz,
        '2026-10-12 00:00:00+02'::timestamptz
      ),
      '$.points[*] ? (@.bucketStart == "2026-09-28T00:00:00+02:00").value'
    )::text
  ),
  'null',
  'Abschnitt vor Historienbeginn hat Wert null'
);

-- 16. CRM: Alle Phasen mit '*'
SELECT is(
  (
    SELECT (jsonb_path_query_first(
      public.dashboard_time_series(
        'deal_stage_events',
        '*',
        'woche',
        '2026-10-05 00:00:00+02'::timestamptz,
        '2026-10-19 00:00:00+02'::timestamptz
      ),
      '$.points[*] ? (@.bucketStart == "2026-10-12T00:00:00+02:00").value'
    )::text)::int
  ),
  1,
  'Metrik * zählt alle Phasenwechsel (Erstgespräch in KW 42)'
);

-- 17. CRM: Pipeline-Filter
SELECT is(
  (
    SELECT (jsonb_path_query_first(
      public.dashboard_time_series(
        'deal_stage_events',
        'Deal gewonnen',
        'woche',
        '2026-10-05 00:00:00+02'::timestamptz,
        '2026-10-19 00:00:00+02'::timestamptz,
        'Standard'
      ),
      '$.points[*] ? (@.bucketStart == "2026-10-05T00:00:00+02:00").value'
    )::text)::int
  ),
  1,
  'Pipeline Standard liefert nur 1 Deal gewonnen in KW 41 (Partner ausgeschlossen)'
);

SELECT is(
  (public.dashboard_time_series(
    'deal_stage_events',
    'Deal gewonnen',
    'woche',
    '2026-10-05 00:00:00+02'::timestamptz,
    '2026-10-19 00:00:00+02'::timestamptz
  ))->>'pipelineBasis',
  'aktuelle_pipeline_des_deals',
  'CRM-Ergebnis weist pipelineBasis aus'
);

-- 18. Live: Letzter Wert im Abschnitt (150 statt 100 um 10:50 Uhr)
SELECT is(
  (
    SELECT (jsonb_path_query_first(
      public.dashboard_time_series(
        'live_kpi',
        'kpi160_active',
        'stunde',
        '2026-10-05 10:00:00+02'::timestamptz,
        '2026-10-05 12:00:00+02'::timestamptz
      ),
      '$.points[*] ? (@.bucketStart == "2026-10-05T10:00:00+02:00").value'
    )::text)::numeric
  ),
  150::numeric,
  'Live: letzter Wert im Zeitabschnitt gewählt (150)'
);

-- 19. Live: Gleichstand occurred_at entscheidet nach ingested_at DESC (250 statt 200)
SELECT is(
  (
    SELECT (jsonb_path_query_first(
      public.dashboard_time_series(
        'live_kpi',
        'kpi160_active',
        'stunde',
        '2026-10-05 10:00:00+02'::timestamptz,
        '2026-10-05 13:00:00+02'::timestamptz
      ),
      '$.points[*] ? (@.bucketStart == "2026-10-05T11:00:00+02:00").value'
    )::text)::numeric
  ),
  250::numeric,
  'Live: bei Gleichstand von occurred_at entscheidet größtes ingested_at (250)'
);

-- 20. Live: Lücke ab Historienbeginn (Stunde 12:00 Uhr hat keinen Messwert -> status luecke, value null)
SELECT is(
  (
    SELECT jsonb_path_query_first(
      public.dashboard_time_series(
        'live_kpi',
        'kpi160_active',
        'stunde',
        '2026-10-05 10:00:00+02'::timestamptz,
        '2026-10-05 13:00:00+02'::timestamptz
      ),
      '$.points[*] ? (@.bucketStart == "2026-10-05T12:00:00+02:00").status'
    )::text
  ),
  '"luecke"',
  'Live: Abschnitt ohne Messwert hat Status luecke'
);

SELECT is(
  (
    SELECT jsonb_path_query_first(
      public.dashboard_time_series(
        'live_kpi',
        'kpi160_active',
        'stunde',
        '2026-10-05 10:00:00+02'::timestamptz,
        '2026-10-05 13:00:00+02'::timestamptz
      ),
      '$.points[*] ? (@.bucketStart == "2026-10-05T12:00:00+02:00").value'
    )::text
  ),
  'null',
  'Live: Abschnitt ohne Messwert hat Wert null'
);

-- 21. Live: measuredAt wird für belegte Punkte geliefert
SELECT is(
  (
    SELECT jsonb_path_query_first(
      public.dashboard_time_series(
        'live_kpi',
        'kpi160_active',
        'stunde',
        '2026-10-05 10:00:00+02'::timestamptz,
        '2026-10-05 11:00:00+02'::timestamptz
      ),
      '$.points[*] ? (@.bucketStart == "2026-10-05T10:00:00+02:00").measuredAt'
    )::text
  ),
  '"2026-10-05T10:50:00+02:00"',
  'Live: measuredAt nennt exakten Zeitpunkt des Messwerts'
);

-- 22. Sommerzeitumstellung (25.10.2026): Tages- und Wochengrenzen in Europe/Berlin
SELECT is(
  (
    SELECT (jsonb_path_query_first(
      public.dashboard_time_series(
        'deal_stage_events',
        'Bedarfsanalyse',
        'tag',
        '2026-10-24 00:00:00+02'::timestamptz,
        '2026-10-27 00:00:00+01'::timestamptz
      ),
      '$.points[*] ? (@.bucketStart == "2026-10-25T00:00:00+02:00").value'
    )::text)::int
  ),
  1,
  'DST: Umstellungstag 25.10.2026 enthält das Ereignis von 01:30 Uhr MESZ'
);

-- 23. Mandantentrennung: Org B sieht keine Ereignisse von Org A
SELECT set_config('request.jwt.claims', '{"sub":"91600000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT is(
  (
    SELECT jsonb_path_query_first(
      public.dashboard_time_series(
        'deal_stage_events',
        'Deal gewonnen',
        'woche',
        '2026-10-05 00:00:00+02'::timestamptz,
        '2026-10-19 00:00:00+02'::timestamptz
      ),
      '$.points[*] ? (@.bucketStart == "2026-10-05T00:00:00+02:00").status'
    )::text
  ),
  '"vor_historienbeginn"',
  'Org B sieht vor_historienbeginn in KW 41 (Ereignis von Org A isoliert)'
);

SELECT is(
  (public.dashboard_time_series(
    'deal_stage_events',
    'Deal gewonnen',
    'woche',
    '2026-10-05 00:00:00+02'::timestamptz,
    '2026-10-26 00:00:00+01'::timestamptz
  ))->>'historyStartAt',
  '2026-10-19T12:00:00+02:00',
  'historyStartAt von Org B ist das eigene früheste Ereignis (2026-10-19)'
);

-- 29. Halboffenes Fenster: Ereignisse vor p_from werden nicht mitgezählt (Codex Review)
SELECT set_config('request.jwt.claims', '{"sub":"91600000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT is(
  (
    SELECT (jsonb_path_query_first(
      public.dashboard_time_series(
        'deal_stage_events',
        'Deal gewonnen',
        'woche',
        '2026-10-07 00:00:00+02'::timestamptz,
        '2026-10-19 00:00:00+02'::timestamptz
      ),
      '$.points[*] ? (@.bucketStart == "2026-10-05T00:00:00+02:00").value'
    )::text)::int
  ),
  0,
  'Ereignisse am 05.10. liegen vor p_from (07.10.) und werden nicht gezählt'
);

SELECT finish();
ROLLBACK;
