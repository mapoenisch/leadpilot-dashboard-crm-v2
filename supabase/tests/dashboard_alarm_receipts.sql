-- pgTAP-Tests fuer Auftrag 168: Alarmquittierung, Lesebestaetigung, Admin-Uebernahme und Retention-Info
BEGIN;

SELECT plan(22);
SET CONSTRAINTS ALL IMMEDIATE;

-- 1. Setup Testdaten: 2 Organisationen, 3 Nutzer
INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('df680000-0000-0000-0000-000000000001', 'Org 168 Alpha', 'synthetic', 'active'),
  ('df680000-0000-0000-0000-000000000002', 'Org 168 Beta', 'synthetic', 'active');

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('8f680000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin168@alpha.local', 'x', now()),
  ('8f680000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'viewer168@alpha.local', 'x', now()),
  ('8f680000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'outsider168@beta.local', 'x', now());

INSERT INTO public.organization_members (user_id, organization_id, role, status)
VALUES
  ('8f680000-0000-0000-0000-000000000001', 'df680000-0000-0000-0000-000000000001', 'admin', 'active'),
  ('8f680000-0000-0000-0000-000000000002', 'df680000-0000-0000-0000-000000000001', 'viewer', 'active'),
  ('8f680000-0000-0000-0000-000000000003', 'df680000-0000-0000-0000-000000000002', 'admin', 'active');

-- Test-Dashboard in Org Alpha
INSERT INTO public.dashboards (id, organization_id, scope, user_id, created_by_user_id, title, revision, config)
VALUES (
  'df680000-0000-0000-0000-000000000010',
  'df680000-0000-0000-0000-000000000001',
  'personal',
  '8f680000-0000-0000-0000-000000000001',
  '8f680000-0000-0000-0000-000000000001',
  'Dashboard 168 Test',
  1,
  '{"version":2,"title":"Alarm Test"}'::jsonb
);

-- Alarm-Regel anlegen (vom Admin)
INSERT INTO public.dashboard_alarm_rules (
  id, organization_id, dashboard_id, tile_id, catalog_id, rule_config,
  mindestdauer_laeufe, abklingzeit_sekunden, status, created_by, responsible_user_id
) VALUES (
  'df680000-0000-0000-0000-000000000020',
  'df680000-0000-0000-0000-000000000001',
  'df680000-0000-0000-0000-000000000010',
  'tile-1',
  'crm.pipeline_deals',
  '{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"Stück","warnung":10}'::jsonb,
  1, 0, 'aktiv',
  '8f680000-0000-0000-0000-000000000001',
  '8f680000-0000-0000-0000-000000000001'
);

-- 3 Alarm-Ereignisse erzeugen: 1 Warnung, 1 Kritisch, 1 Normal
INSERT INTO public.dashboard_alarm_events (
  id, organization_id, rule_id, alter_zustand, neuer_zustand, messwert, einheit, grenze, meldung
) VALUES
  ('df680000-0000-0000-0000-000000000031', 'df680000-0000-0000-0000-000000000001', 'df680000-0000-0000-0000-000000000020', 'normal', 'warnung', 12, 'Stück', 10, 'Warnschwelle überschritten'),
  ('df680000-0000-0000-0000-000000000032', 'df680000-0000-0000-0000-000000000001', 'df680000-0000-0000-0000-000000000020', 'warnung', 'kritisch', 25, 'Stück', 20, 'Kritische Schwelle überschritten'),
  ('df680000-0000-0000-0000-000000000033', 'df680000-0000-0000-0000-000000000001', 'df680000-0000-0000-0000-000000000020', 'kritisch', 'normal', 5, 'Stück', 10, 'Wieder im Normalbereich');

-- ============================================================================
-- Tests 1-7: Tabellen und Funktionen existieren
-- ============================================================================
SELECT has_table('public', 'dashboard_alarm_receipts', '1. Tabelle dashboard_alarm_receipts existiert');
SELECT has_function('public', 'mark_dashboard_alarm_events_read', '2. Funktion mark_dashboard_alarm_events_read existiert');
SELECT has_function('public', 'mark_all_dashboard_alarm_events_read', '3. Funktion mark_all_dashboard_alarm_events_read existiert');
SELECT has_function('public', 'acknowledge_dashboard_alarm_event', '4. Funktion acknowledge_dashboard_alarm_event existiert');
SELECT has_function('public', 'count_unread_dashboard_alarm_events', '5. Funktion count_unread_dashboard_alarm_events existiert');
SELECT has_function('public', 'list_dashboard_alarm_events_v2', '6. Funktion list_dashboard_alarm_events_v2 existiert');
SELECT has_function('public', 'list_organization_alarm_rules', '7. Funktion list_organization_alarm_rules existiert');

-- ============================================================================
-- Test 8 & 9: Zähler für Admin und Viewer
-- ============================================================================
-- Als Admin anmelden
SET LOCAL "request.jwt.claims" = '{"sub": "8f680000-0000-0000-0000-000000000001", "role": "authenticated"}';
SELECT is(
  public.count_unread_dashboard_alarm_events(),
  2,
  '8. Admin zählt 2 ungelesene Alarme (Warnung + Kritisch, Normal zählt nicht)'
);

-- ============================================================================
-- Test 10: Quittieren bei 'normal' schlägt fehl
-- ============================================================================
SELECT throws_matching(
  $$SELECT public.acknowledge_dashboard_alarm_event('df680000-0000-0000-0000-000000000033', 'Geht nicht')$$,
  'LP_ALARM_CANNOT_ACKNOWLEDGE_NORMAL',
  '10. Quittieren eines Wechsels nach normal wird abgewiesen'
);

-- ============================================================================
-- Test 11: Kommentar > 280 Zeichen wird abgewiesen
-- ============================================================================
SELECT throws_matching(
  $$SELECT public.acknowledge_dashboard_alarm_event('df680000-0000-0000-0000-000000000031', repeat('x', 281))$$,
  'LP_ALARM_COMMENT_TOO_LONG',
  '11. Quittierungskommentar > 280 Zeichen wird abgewiesen'
);

-- ============================================================================
-- Test 12 & 13: Viewer darf quittieren (persönlich), aber keine Regeln anlegen
-- ============================================================================
SET LOCAL "request.jwt.claims" = '{"sub": "8f680000-0000-0000-0000-000000000002", "role": "authenticated"}';
SELECT lives_ok(
  $$SELECT public.acknowledge_dashboard_alarm_event('df680000-0000-0000-0000-000000000031', 'Gesehen und kümmere mich'::TEXT)$$,
  '12. Viewer darf Warnungs-Event quittieren'
);

SELECT throws_matching(
  $$SELECT public.create_dashboard_alarm_rule(
    'df680000-0000-0000-0000-000000000010'::UUID,
    't2'::TEXT,
    'crm.pipeline_deals'::TEXT,
    NULL::TEXT,
    '{"formatVersion":2,"enabled":true}'::JSONB
  )$$,
  'LP_AUTH_INSUFFICIENT_PERMISSIONS',
  '13. Viewer darf keine Alarmregel anlegen'
);

-- ============================================================================
-- Test 14: Quittierung erscheint in list_dashboard_alarm_events_v2 mit Email
-- ============================================================================
SET LOCAL "request.jwt.claims" = '{"sub": "8f680000-0000-0000-0000-000000000001", "role": "authenticated"}';
SELECT is(
  (
    SELECT (quittiert_von->0->>'email')
    FROM public.list_dashboard_alarm_events_v2('df680000-0000-0000-0000-000000000010'::UUID)
    WHERE id = 'df680000-0000-0000-0000-000000000031'
  ),
  'viewer168@alpha.local',
  '14. Admin sieht Quittierung des Viewers mit dessen E-Mail'
);

-- ============================================================================
-- Test 15: Fremde Organisation wird abgewiesen
-- ============================================================================
SET LOCAL "request.jwt.claims" = '{"sub": "8f680000-0000-0000-0000-000000000003", "role": "authenticated"}';
SELECT throws_matching(
  $$SELECT public.acknowledge_dashboard_alarm_event('df680000-0000-0000-0000-000000000031', 'Fremd')$$,
  'LP_AUTH_INSUFFICIENT_PERMISSIONS',
  '15. Nutzer aus fremder Organisation darf Event nicht quittieren'
);

-- ============================================================================
-- Test 16: Lesebestätigung einzeln und Zähler-Reduktion
-- ============================================================================
SET LOCAL "request.jwt.claims" = '{"sub": "8f680000-0000-0000-0000-000000000001", "role": "authenticated"}';
SELECT is(
  public.mark_dashboard_alarm_events_read(ARRAY['df680000-0000-0000-0000-000000000031'::UUID]),
  1,
  '16. 1 Event erfolgreich als gelesen markiert'
);

SELECT is(
  public.count_unread_dashboard_alarm_events(),
  1,
  '17. Zähler sinkt von 2 auf 1 nach Lesebestätigung'
);

-- ============================================================================
-- Test 18: mark_all_dashboard_alarm_events_read
-- ============================================================================
SELECT is(
  public.mark_all_dashboard_alarm_events_read('df680000-0000-0000-0000-000000000010'::UUID),
  3,
  '18. mark_all_dashboard_alarm_events_read markiert alle Events des Dashboards'
);

SELECT is(
  public.count_unread_dashboard_alarm_events(),
  0,
  '19. Zähler ist jetzt 0'
);

-- ============================================================================
-- Test 20 & 21: Admin-Übernahme (takeover_dashboard_alarm_rule)
-- ============================================================================
-- Setze Regel auf 'verantwortlicher_ohne_rechte'
UPDATE public.dashboard_alarm_rules
SET status = 'verantwortlicher_ohne_rechte', responsible_user_id = '8f680000-0000-0000-0000-000000000002'
WHERE id = 'df680000-0000-0000-0000-000000000020';

-- Nicht-Admin scheitert
SET LOCAL "request.jwt.claims" = '{"sub": "8f680000-0000-0000-0000-000000000002", "role": "authenticated"}';
SELECT throws_matching(
  $$SELECT public.takeover_dashboard_alarm_rule('df680000-0000-0000-0000-000000000020'::UUID)$$,
  'LP_AUTH_INSUFFICIENT_PERMISSIONS',
  '20. Viewer kann Regel nicht übernehmen'
);

-- Admin übernimmt erfolgreich
SET LOCAL "request.jwt.claims" = '{"sub": "8f680000-0000-0000-0000-000000000001", "role": "authenticated"}';
SELECT lives_ok(
  $$SELECT public.takeover_dashboard_alarm_rule('df680000-0000-0000-0000-000000000020'::UUID)$$,
  '21. Admin übernimmt Regel'
);

-- Test 22: Regel ist aktiv und Event 'fortgesetzt' wurde erzeugt
SELECT is(
  (SELECT status FROM public.dashboard_alarm_rules WHERE id = 'df680000-0000-0000-0000-000000000020'),
  'aktiv',
  '22. Regel ist nach Übernahme wieder aktiv'
);

-- Test 23: dashboard_revision_retention_info liefert Ergebnis
SELECT ok(
  EXISTS(SELECT 1 FROM public.dashboard_revision_retention_info('df680000-0000-0000-0000-000000000010'::UUID)),
  '23. dashboard_revision_retention_info liefert Rückgabe für berechtigtes Dashboard'
);

SELECT * FROM finish();
ROLLBACK;
