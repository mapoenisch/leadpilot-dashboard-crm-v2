-- Auftrag 154 (P08a): Abfragevertrag und Vollbestandsaggregation
-- Tests für:
-- 1. Strukturprüfung in dashboard_config_v2_invalid_reason
-- 2. Restore einer P07-Revision (Rückwärtskompatibilität)
-- 3. RPC public.dashboard_crm_pipeline_overview:
--    - Rechte (anon, Nicht-Mitglied, inaktives Mitglied, Mandantentrennung)
--    - Fehlercodes (LP_CRM_INVALID_DEAL bei Betrag < 0 oder leerer Stufe)
--    - Deterministischer Tie-Break (Volumen DESC, Count DESC, Stufe COLLATE "C" ASC)
--    - Vollbestand bei 1.500 Deals (keine 1.000er-Kappung)

BEGIN;

SELECT plan(23);

-- ---------------------------------------------------------------- Setup --
DELETE FROM public.dashboard_revisions WHERE dashboard_id IN (
  SELECT id FROM public.dashboards WHERE title LIKE '154-Test%'
);
DELETE FROM public.dashboards WHERE title LIKE '154-Test%';
DELETE FROM public.deal_stage_events WHERE deal_id LIKE 'd154-%';
DELETE FROM public.imported_funnel_deals WHERE id LIKE 'd154-%';
DELETE FROM public.organization_members WHERE user_id IN (
  '91540000-0000-0000-0000-000000000001',
  '91540000-0000-0000-0000-000000000002',
  '91540000-0000-0000-0000-000000000003',
  '91540000-0000-0000-0000-000000000004'
);
DELETE FROM auth.users WHERE email LIKE '%@154-test.local';
DELETE FROM public.organizations WHERE id IN (
  'a1540000-0000-0000-0000-000000000001',
  'b1540000-0000-0000-0000-000000000002'
);

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('91540000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'member-a@154-test.local', 'x', now()),
  ('91540000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'inactive-a@154-test.local', 'x', now()),
  ('91540000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'member-b@154-test.local', 'x', now()),
  ('91540000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'no-org@154-test.local', 'x', now());

INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('a1540000-0000-0000-0000-000000000001', 'Org A (154 Test)', 'synthetic', 'active'),
  ('b1540000-0000-0000-0000-000000000002', 'Org B (154 Test)', 'synthetic', 'active');

INSERT INTO public.organization_members (user_id, organization_id, role, status)
VALUES
  ('91540000-0000-0000-0000-000000000001', 'a1540000-0000-0000-0000-000000000001', 'admin', 'active'),
  ('91540000-0000-0000-0000-000000000002', 'a1540000-0000-0000-0000-000000000001', 'viewer', 'suspended'),
  ('91540000-0000-0000-0000-000000000003', 'b1540000-0000-0000-0000-000000000002', 'admin', 'active');

-- ---------------------------------------------------------------- Teil 1: Strukturprüfung in dashboard_config_v2_invalid_reason --

-- 1. Gültig: P07 Legacy-Kachel ohne query
SELECT is(
  public.dashboard_config_v2_invalid_reason(jsonb_build_object(
    'version', 2,
    'title', 'P07 Dashboard',
    'scope', 'personal',
    'ownerUserId', '91540000-0000-0000-0000-000000000001',
    'organizationId', 'a1540000-0000-0000-0000-000000000001',
    'globalTimeframe', 'aktuell',
    'tiles', jsonb_build_array(
      jsonb_build_object(
        'id', 't1',
        'catalogId', 'crm.pipeline_deals',
        'title', 'Deals',
        'presentation', 'zahl',
        'layouts', jsonb_build_object('desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 3, 'h', 2))
      )
    )
  )),
  NULL,
  'P07 Legacy-Kachel ohne query ist gültig'
);

-- 2. Gültig: Kachel mit kanonischer query (minimal)
SELECT is(
  public.dashboard_config_v2_invalid_reason(jsonb_build_object(
    'version', 2,
    'title', 'Kanonisch Minimal',
    'scope', 'personal',
    'ownerUserId', '91540000-0000-0000-0000-000000000001',
    'organizationId', 'a1540000-0000-0000-0000-000000000001',
    'globalTimeframe', 'aktuell',
    'tiles', jsonb_build_array(
      jsonb_build_object(
        'id', 't1',
        'catalogId', 'crm.pipeline_deals',
        'title', 'Deals',
        'presentation', 'zahl',
        'layouts', jsonb_build_object('desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 3, 'h', 2)),
        'query', jsonb_build_object('metricId', 'crm.pipeline_deals')
      )
    )
  )),
  NULL,
  'Kachel mit minimaler query ist gültig'
);

-- 3. Gültig: Kachel mit voller query (pipelineId null, groupBy stage, filters {})
SELECT is(
  public.dashboard_config_v2_invalid_reason(jsonb_build_object(
    'version', 2,
    'title', 'Kanonisch Voll',
    'scope', 'personal',
    'ownerUserId', '91540000-0000-0000-0000-000000000001',
    'organizationId', 'a1540000-0000-0000-0000-000000000001',
    'globalTimeframe', 'aktuell',
    'tiles', jsonb_build_array(
      jsonb_build_object(
        'id', 't1',
        'catalogId', 'crm.pipeline_stufen_volumen',
        'title', 'Stufen Volumen',
        'presentation', 'balken',
        'layouts', jsonb_build_object('desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 6, 'h', 4)),
        'query', jsonb_build_object(
          'metricId', 'crm.pipeline_stufen_volumen',
          'pipelineId', NULL,
          'timeframe', 'aktuell',
          'aggregation', 'letzter_stand',
          'groupBy', jsonb_build_array('stage'),
          'filters', jsonb_build_object()
        )
      )
    )
  )),
  NULL,
  'Kachel mit voller query ist gültig'
);

-- 4. Ungültig: Unbekanntes Feld in query
SELECT isnt(
  public.dashboard_config_v2_invalid_reason(jsonb_build_object(
    'version', 2,
    'title', 'Unbekanntes Feld',
    'scope', 'personal',
    'ownerUserId', '91540000-0000-0000-0000-000000000001',
    'organizationId', 'a1540000-0000-0000-0000-000000000001',
    'globalTimeframe', 'aktuell',
    'tiles', jsonb_build_array(
      jsonb_build_object(
        'id', 't1',
        'catalogId', 'crm.pipeline_deals',
        'title', 'Deals',
        'presentation', 'zahl',
        'layouts', jsonb_build_object('desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 3, 'h', 2)),
        'query', jsonb_build_object('metricId', 'crm.pipeline_deals', 'illegalKey', 123)
      )
    )
  )),
  NULL,
  'Unbekanntes Feld in query wird abgewiesen'
);

-- 5. Ungültig: metricId weicht von catalogId ab
SELECT isnt(
  public.dashboard_config_v2_invalid_reason(jsonb_build_object(
    'version', 2,
    'title', 'Metrik Abweichung',
    'scope', 'personal',
    'ownerUserId', '91540000-0000-0000-0000-000000000001',
    'organizationId', 'a1540000-0000-0000-0000-000000000001',
    'globalTimeframe', 'aktuell',
    'tiles', jsonb_build_array(
      jsonb_build_object(
        'id', 't1',
        'catalogId', 'crm.pipeline_deals',
        'title', 'Deals',
        'presentation', 'zahl',
        'layouts', jsonb_build_object('desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 3, 'h', 2)),
        'query', jsonb_build_object('metricId', 'crm.pipeline_volumen')
      )
    )
  )),
  NULL,
  'Abweichende metricId in query wird abgewiesen'
);

-- 6. Ungültig: groupBy nicht Array oder mehr als 'stage'
SELECT isnt(
  public.dashboard_config_v2_invalid_reason(jsonb_build_object(
    'version', 2,
    'title', 'Ungültiges GroupBy',
    'scope', 'personal',
    'ownerUserId', '91540000-0000-0000-0000-000000000001',
    'organizationId', 'a1540000-0000-0000-0000-000000000001',
    'globalTimeframe', 'aktuell',
    'tiles', jsonb_build_array(
      jsonb_build_object(
        'id', 't1',
        'catalogId', 'crm.pipeline_deals',
        'title', 'Deals',
        'presentation', 'zahl',
        'layouts', jsonb_build_object('desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 3, 'h', 2)),
        'query', jsonb_build_object('metricId', 'crm.pipeline_deals', 'groupBy', jsonb_build_array('region'))
      )
    )
  )),
  NULL,
  'Ungültige Gruppierungsdimension wird abgewiesen'
);

-- 7. Ungültig: filters ist nicht leer
SELECT isnt(
  public.dashboard_config_v2_invalid_reason(jsonb_build_object(
    'version', 2,
    'title', 'Filters nicht leer',
    'scope', 'personal',
    'ownerUserId', '91540000-0000-0000-0000-000000000001',
    'organizationId', 'a1540000-0000-0000-0000-000000000001',
    'globalTimeframe', 'aktuell',
    'tiles', jsonb_build_array(
      jsonb_build_object(
        'id', 't1',
        'catalogId', 'crm.pipeline_deals',
        'title', 'Deals',
        'presentation', 'zahl',
        'layouts', jsonb_build_object('desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 3, 'h', 2)),
        'query', jsonb_build_object('metricId', 'crm.pipeline_deals', 'filters', jsonb_build_object('bad', true))
      )
    )
  )),
  NULL,
  'Nicht-leeres filters-Objekt wird abgewiesen'
);

-- ---------------------------------------------------------------- Teil 2: P07 Revision Restore --

-- 8. Erstellen und Wiederherstellen einer P07-Revision ohne query
SELECT set_config('request.jwt.claims', '{"sub":"91540000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SET ROLE authenticated;

DO $$
DECLARE
  v_res RECORD;
  v_dash_id UUID;
  v_rev1 INTEGER;
  v_rev2 INTEGER;
  v_p07_cfg JSONB;
  v_v2_cfg JSONB;
BEGIN
  v_p07_cfg := jsonb_build_object(
    'version', 2,
    'title', '154-Test P07 Revision',
    'scope', 'personal',
    'ownerUserId', '91540000-0000-0000-0000-000000000001',
    'organizationId', 'a1540000-0000-0000-0000-000000000001',
    'globalTimeframe', '2025-01-01/2025-12-31',
    'tiles', jsonb_build_array(
      jsonb_build_object(
        'id', 't_p07_1',
        'catalogId', 'crm.pipeline_deals',
        'title', 'Alte Kachel',
        'presentation', 'zahl',
        'layouts', jsonb_build_object('desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 3, 'h', 2)),
        'timeframeOverride', '2025-01-01/2025-12-31'
      )
    )
  );

  SELECT * INTO v_res FROM public.create_dashboard_v2('154-Test P07 Revision', v_p07_cfg, 'personal');
  v_dash_id := v_res.dashboard_id;
  v_rev1 := v_res.revision;

  -- Revision 2 anlegen
  v_v2_cfg := jsonb_set(v_p07_cfg, '{title}', '"154-Test P07 Revision Geändert"');
  SELECT revision INTO v_rev2 FROM public.save_dashboard_v2(v_dash_id, v_rev1, '154-Test P07 Revision Geändert', v_v2_cfg);

  -- Revision 1 (P07) wiederherstellen
  PERFORM public.restore_dashboard_revision_v2(v_dash_id, v_rev1, v_rev2);
END;
$$;

SELECT is(
  (SELECT title FROM public.dashboards WHERE title = '154-Test P07 Revision' LIMIT 1),
  '154-Test P07 Revision',
  'P07 Revision ohne query erfolgreich wiederhergestellt'
);

RESET ROLE;

-- ---------------------------------------------------------------- Teil 3: RPC public.dashboard_crm_pipeline_overview --

-- 9. Anon darf RPC nicht aufrufen
SET ROLE anon;
SELECT throws_ok(
  $$SELECT public.dashboard_crm_pipeline_overview()$$,
  '42501',
  NULL,
  'Anon darf dashboard_crm_pipeline_overview nicht aufrufen (permission denied)'
);
RESET ROLE;

-- 10. Authentifizierter Nutzer ohne Mandant erhält LP_NOT_MEMBER
SELECT set_config('request.jwt.claims', '{"sub":"91540000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SET ROLE authenticated;
SELECT throws_ok(
  $$SELECT public.dashboard_crm_pipeline_overview()$$,
  '42501',
  'LP_NOT_MEMBER',
  'Nutzer ohne Mandantschaft wirft LP_NOT_MEMBER'
);
RESET ROLE;

-- 11. Nutzer mit inaktivem Mitgliedsstatus erhält LP_NOT_MEMBER
SELECT set_config('request.jwt.claims', '{"sub":"91540000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SET ROLE authenticated;
SELECT throws_ok(
  $$SELECT public.dashboard_crm_pipeline_overview()$$,
  '42501',
  'LP_NOT_MEMBER',
  'Nutzer mit Status suspended wirft LP_NOT_MEMBER'
);
RESET ROLE;

-- Deals für Mandant A und B einfügen
INSERT INTO public.imported_funnel_deals (id, deal_name, stage, amount, close_date, pipeline, organization_id)
VALUES
  ('d154-a1', 'Deal A1', 'Erstkontakt', 1000.00, '2026-12-31', 'Vertrieb', 'a1540000-0000-0000-0000-000000000001'),
  ('d154-a2', 'Deal A2', 'Qualifizierung', 2000.00, '2026-12-31', 'Vertrieb', 'a1540000-0000-0000-0000-000000000001'),
  ('d154-a3', 'Deal A3', 'Gewonnen (Closed Won)', 5000.00, '2026-12-31', 'Vertrieb', 'a1540000-0000-0000-0000-000000000001'),
  ('d154-a4', 'Deal A4', 'Verloren (Closed Lost)', 3000.00, '2026-12-31', 'Partner', 'a1540000-0000-0000-0000-000000000001'),
  ('d154-a5', 'Deal A5', 'Erstkontakt', 2000.00, '2026-12-31', 'Partner', 'a1540000-0000-0000-0000-000000000001'),
  -- Mandant B Deals
  ('d154-b1', 'Deal B1', 'Gewonnen', 99000.00, '2026-12-31', 'Vertrieb', 'b1540000-0000-0000-0000-000000000002');

-- 12. Mandantentrennung: Nutzer A sieht nur Mandant A Deals (kein Mandant B Deal)
SELECT set_config('request.jwt.claims', '{"sub":"91540000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SET ROLE authenticated;

SELECT is(
  (SELECT (public.dashboard_crm_pipeline_overview()->>'totalDeals')::INT),
  5,
  'Mandant A sieht genau 5 Deals (Mandant B isoliert)'
);

-- 13. Gesamtrechnung Mandant A über alle Pipelines:
-- Gesamtvolumen: 1000 + 2000 + 5000 + 3000 + 2000 = 13000
SELECT is(
  (SELECT (public.dashboard_crm_pipeline_overview()->>'totalVolume')::NUMERIC),
  13000.00,
  'Gesamtvolumen über alle Pipelines ist 13000.00'
);

-- 14. Gewonnenes Volumen: nur 'Gewonnen (Closed Won)' = 5000
SELECT is(
  (SELECT (public.dashboard_crm_pipeline_overview()->>'wonVolume')::NUMERIC),
  5000.00,
  'Gewonnenes Volumen ist 5000.00'
);

-- 15. Offenes Volumen: Gesamt 13000 - Won 5000 - Lost 3000 = 5000
SELECT is(
  (SELECT (public.dashboard_crm_pipeline_overview()->>'openVolume')::NUMERIC),
  5000.00,
  'Offenes Volumen ist 5000.00'
);

-- 16. Pipeline-Filter: 'Vertrieb' liefert nur 3 Deals mit 8000.00 Volumen
SELECT is(
  (SELECT (public.dashboard_crm_pipeline_overview('Vertrieb')->>'totalDeals')::INT),
  3,
  'Pipeline-Filter Vertrieb liefert 3 Deals'
);

SELECT is(
  (SELECT (public.dashboard_crm_pipeline_overview('Vertrieb')->>'totalVolume')::NUMERIC),
  8000.00,
  'Pipeline-Filter Vertrieb liefert 8000.00 Volumen'
);

-- 17. Deterministischer Tie-Break bei gleichem Volumen und gleicher Anzahl:
-- Wir fügen zwei Stufen mit gleichem Volumen und Count ein: 'Z-Stufe' und 'A-Stufe'
INSERT INTO public.imported_funnel_deals (id, deal_name, stage, amount, close_date, pipeline, organization_id)
VALUES
  ('d154-tie1', 'Tie 1', 'Z-Stufe', 400.00, '2026-12-31', 'Tie-Pipe', 'a1540000-0000-0000-0000-000000000001'),
  ('d154-tie2', 'Tie 2', 'A-Stufe', 400.00, '2026-12-31', 'Tie-Pipe', 'a1540000-0000-0000-0000-000000000001');

SELECT is(
  (SELECT public.dashboard_crm_pipeline_overview('Tie-Pipe')->'stages'->0->>'stage'),
  'A-Stufe',
  'Tie-Break sortiert bei gleichem Volumen und Count alphabetisch (A vor Z)'
);

-- 18. Ungültiger Deal: Negativer Betrag wirft LP_CRM_INVALID_DEAL (22023)
INSERT INTO public.imported_funnel_deals (id, deal_name, stage, amount, close_date, pipeline, organization_id)
VALUES ('d154-bad1', 'Bad Deal', 'Erstkontakt', -50.00, '2026-12-31', 'Bad-Pipe-1', 'a1540000-0000-0000-0000-000000000001');

SELECT throws_ok(
  $$SELECT public.dashboard_crm_pipeline_overview('Bad-Pipe-1')$$,
  '22023',
  'LP_CRM_INVALID_DEAL',
  'Negativer Deal-Betrag wirft LP_CRM_INVALID_DEAL'
);

-- 19. Ungültiger Deal: Leere Stufe wirft LP_CRM_INVALID_DEAL (22023)
INSERT INTO public.imported_funnel_deals (id, deal_name, stage, amount, close_date, pipeline, organization_id)
VALUES ('d154-bad2', 'Bad Stage', '   ', 100.00, '2026-12-31', 'Bad-Pipe-2', 'a1540000-0000-0000-0000-000000000001');

SELECT throws_ok(
  $$SELECT public.dashboard_crm_pipeline_overview('Bad-Pipe-2')$$,
  '22023',
  'LP_CRM_INVALID_DEAL',
  'Leere Stufe wirft LP_CRM_INVALID_DEAL'
);

-- ---------------------------------------------------------------- Teil 4: 1.500-Deal Vollbestand --

-- 20. 1.500 Deals in Test-Pipeline einfügen und ohne Limit aggregieren
INSERT INTO public.imported_funnel_deals (id, deal_name, stage, amount, close_date, pipeline, organization_id)
SELECT
  'd154-bulk-' || i::text,
  'Bulk Deal ' || i::text,
  CASE (i % 3)
    WHEN 0 THEN 'Gewonnen'
    WHEN 1 THEN 'Qualifizierung'
    ELSE 'Erstkontakt'
  END,
  10.00,
  '2026-12-31',
  'Bulk-1500',
  'a1540000-0000-0000-0000-000000000001'
FROM generate_series(1, 1500) AS s(i);

SELECT is(
  (SELECT (public.dashboard_crm_pipeline_overview('Bulk-1500')->>'totalDeals')::INT),
  1500,
  '1.500 Deals werden vollständig ausgewertet (keine 1.000er-Kappung)'
);

-- 21. evaluatedDeals entspricht 1500
SELECT is(
  (SELECT (public.dashboard_crm_pipeline_overview('Bulk-1500')->>'evaluatedDeals')::INT),
  1500,
  'evaluatedDeals ist exakt 1500'
);

-- 22. Gesamtvolumen von 1.500 Deals a 10.00 EUR = 15.000.00 EUR
SELECT is(
  (SELECT (public.dashboard_crm_pipeline_overview('Bulk-1500')->>'totalVolume')::NUMERIC),
  15000.00,
  'Gesamtvolumen von 1.500 Deals beträgt exakt 15000.00'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
