-- pgTAP-Tests für Auftrag 173 (P16a §2.2 Nr. 8): Betriebsnachweise der Server-Alarme.
-- Not-Aus und Wiederanlauf, Lebenszeichen, keine Meldungsflut (Mindestdauer/Abklingzeit),
-- Worker-Neustart ohne doppelte Ereignisse, fehlende Daten, Rechteverlust des Verantwortlichen,
-- Aufräumjob der Alarmhistorie (12 Monate).
--
-- Die Kennzahlquelle alarm_kpi_value wird nur innerhalb dieser Transaktion durch eine
-- steuerbare Testfunktion ersetzt (ROLLBACK am Ende stellt das Original wieder her). So prüfen
-- die Tests die Worker-Logik unabhängig vom CRM-Datenbestand; die Kennzahlen selbst prüft
-- dashboard_alarm_parity.sql.

BEGIN;

SELECT plan(22);
SET CONSTRAINTS ALL IMMEDIATE;

-- ---------------------------------------------------------------- Setup --
INSERT INTO public.organizations (id, name, mode, status)
VALUES ('af731000-0000-0000-0000-00000000000a', 'Org Betrieb', 'synthetic', 'active');

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES ('9f731000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'mgr@betrieb.local', 'x', now());

INSERT INTO public.organization_members (user_id, organization_id, role, status)
VALUES ('9f731000-0000-0000-0000-000000000001', 'af731000-0000-0000-0000-00000000000a', 'manager', 'active');

INSERT INTO public.dashboards (id, organization_id, scope, user_id, title, created_by_user_id, revision, config)
VALUES (
  'd7731000-0000-0000-0000-000000000001', 'af731000-0000-0000-0000-00000000000a', 'personal',
  '9f731000-0000-0000-0000-000000000001', 'Betrieb', '9f731000-0000-0000-0000-000000000001', 1,
  '{"version":2,"title":"Betrieb","scope":"personal","ownerUserId":"x","organizationId":"x","globalTimeframe":"monat","tiles":[{"id":"t1","catalogId":"crm.pipeline_deals"}]}'::jsonb
);

INSERT INTO public.dashboard_alarm_rules (
  id, organization_id, dashboard_id, tile_id, catalog_id, rule_config,
  mindestdauer_laeufe, abklingzeit_sekunden, status, created_by, responsible_user_id
)
VALUES (
  'a7731000-0000-0000-0000-000000000001', 'af731000-0000-0000-0000-00000000000a',
  'd7731000-0000-0000-0000-000000000001', 't1', 'crm.pipeline_deals',
  '{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"Stück","warnung":10,"kritisch":20}'::jsonb,
  2, 3600, 'aktiv', '9f731000-0000-0000-0000-000000000001', '9f731000-0000-0000-0000-000000000001'
);

-- Steuerbare Kennzahlquelle (nur in dieser Transaktion)
CREATE TABLE pg_temp.kpi_stub (wert NUMERIC, zustand TEXT);
INSERT INTO pg_temp.kpi_stub VALUES (5, 'ok');
CREATE OR REPLACE FUNCTION public.alarm_kpi_value(p_org UUID, p_catalog_id TEXT, p_pipeline TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object('wert', wert, 'einheit', 'Stück', 'zustand', zustand) FROM pg_temp.kpi_stub
$$;

CREATE FUNCTION pg_temp.events() RETURNS INT LANGUAGE sql AS $$
  SELECT count(*)::int FROM public.dashboard_alarm_events WHERE rule_id = 'a7731000-0000-0000-0000-000000000001'
$$;
CREATE FUNCTION pg_temp.run_at(p_min INT) RETURNS JSONB LANGUAGE sql AS $$
  SELECT public.evaluate_dashboard_alarms(now() + make_interval(mins => p_min))
$$;

DELETE FROM public.alarm_worker_runs;

-- ======================================================== 1..2 Lebenszeichen ohne Lauf
SELECT is(public.alarm_worker_status()->>'status', 'ueberfaellig', 'Ohne erfolgreichen Lauf meldet der Status „überfällig“ (kein vorgetäuschter Erfolg)');
INSERT INTO public.alarm_worker_runs (gestartet_am, beendet_am, status) VALUES (now() - interval '20 minutes', now() - interval '20 minutes', 'erfolg');
SELECT is(public.alarm_worker_status()->>'status', 'ueberfaellig', 'Letzter Erfolg vor 20 Minuten: Lebenszeichen fehlt');

-- ======================================================== 3..6 Not-Aus
UPDATE public.alarm_settings SET auswertung_aktiv = false WHERE id = 1;
SELECT is(pg_temp.run_at(0)->>'status', 'pausiert', 'Not-Aus: Auswertung läuft nicht');
SELECT is(public.alarm_worker_status()->>'status', 'pausiert', 'Not-Aus: Status zeigt „pausiert“ statt „überfällig“');
SELECT is((SELECT status FROM public.alarm_worker_runs ORDER BY gestartet_am DESC, status LIMIT 1), 'pausiert', 'Not-Aus-Lauf ist protokolliert');
SELECT is((SELECT count(*)::int FROM public.dashboard_alarm_state WHERE rule_id = 'a7731000-0000-0000-0000-000000000001'), 0, 'Not-Aus: kein Regelzustand angelegt');

-- ======================================================== 7..8 Wiederanlauf
UPDATE public.alarm_settings SET auswertung_aktiv = true WHERE id = 1;
SELECT is(pg_temp.run_at(0)->>'status', 'erfolg', 'Wiederanlauf: Auswertung läuft wieder');
SELECT is(public.alarm_worker_status()->>'status', 'ok', 'Wiederanlauf: Lebenszeichen wieder „ok“');

-- ======================================================== 9..13 Keine Meldungsflut
UPDATE pg_temp.kpi_stub SET wert = 14;
SELECT pg_temp.run_at(5);
SELECT is(pg_temp.events(), 0, 'Mindestdauer 2: ein einzelner Warnlauf erzeugt noch kein Ereignis');
SELECT pg_temp.run_at(10);
SELECT is(pg_temp.events(), 1, 'Zweiter Warnlauf in Folge erzeugt genau ein Ereignis');
SELECT pg_temp.run_at(15);
SELECT pg_temp.run_at(20);
SELECT is(pg_temp.events(), 1, 'Anhaltende Warnung erzeugt keine weiteren Ereignisse');
UPDATE pg_temp.kpi_stub SET wert = 5;
SELECT pg_temp.run_at(25);
SELECT pg_temp.run_at(30);
SELECT is(pg_temp.events(), 1, 'Abklingzeit: Rückkehr zu normal innerhalb einer Stunde meldet nicht erneut');
UPDATE pg_temp.kpi_stub SET wert = 25;
SELECT pg_temp.run_at(35);
SELECT pg_temp.run_at(40);
SELECT is(pg_temp.events(), 2, 'Eskalation auf kritisch durchbricht die Abklingzeit');

-- ======================================================== 14..15 Worker-Neustart
-- Ein Neustart verliert den Zustand nicht: derselbe Zeitpunkt erneut ausgewertet erzeugt nichts.
SELECT pg_temp.run_at(40);
SELECT pg_temp.run_at(45);
SELECT is(pg_temp.events(), 2, 'Erneuter Lauf nach Neustart erzeugt keine doppelten Ereignisse');
SELECT is((SELECT bestaetigte_stufe FROM public.dashboard_alarm_state WHERE rule_id = 'a7731000-0000-0000-0000-000000000001'), 'kritisch', 'Bestätigte Stufe bleibt über Läufe hinweg erhalten');

-- ======================================================== 16..17 Fehlende Daten
UPDATE pg_temp.kpi_stub SET wert = NULL, zustand = 'keine_daten';
SELECT is(pg_temp.run_at(50)->>'fehler_anzahl', '0', 'Fehlende Daten führen nicht zu einem Laufzeitfehler');
SELECT is((SELECT beobachtete_stufe FROM public.dashboard_alarm_state WHERE rule_id = 'a7731000-0000-0000-0000-000000000001'), 'keine_daten', 'Fehlende Daten ergeben den definierten Zustand „keine Daten“ (keine erfundene Fortsetzung)');

-- ======================================================== 18..20 Rechteverlust
UPDATE pg_temp.kpi_stub SET wert = 25, zustand = 'ok';
UPDATE public.organization_members SET role = 'viewer'
WHERE user_id = '9f731000-0000-0000-0000-000000000001' AND organization_id = 'af731000-0000-0000-0000-00000000000a';
SELECT pg_temp.run_at(55);
SELECT is((SELECT status FROM public.dashboard_alarm_rules WHERE id = 'a7731000-0000-0000-0000-000000000001'), 'verantwortlicher_ohne_rechte', 'Verantwortlicher ohne Rechte: Regel pausiert zur Übernahme');
SELECT is(pg_temp.events(), 2, 'Pausierte Regel erzeugt keine Ereignisse mehr');
SELECT is((SELECT count(*)::int FROM public.dashboards WHERE id = 'd7731000-0000-0000-0000-000000000001'), 1, 'Dashboard bleibt bei Rechteverlust erhalten');

-- ======================================================== 21..22 Aufräumjob (12 Monate)
INSERT INTO public.dashboard_alarm_events (organization_id, rule_id, alter_zustand, neuer_zustand, meldung, created_at)
VALUES
  ('af731000-0000-0000-0000-00000000000a', 'a7731000-0000-0000-0000-000000000001', 'normal', 'warnung', 'alt', now() - interval '13 months'),
  ('af731000-0000-0000-0000-00000000000a', 'a7731000-0000-0000-0000-000000000001', 'normal', 'warnung', 'jung', now() - interval '11 months');
SELECT is(public.cleanup_dashboard_alarm_events(), 1, 'Aufräumjob löscht nur Ereignisse älter als 12 Monate');
SELECT is((SELECT count(*)::int FROM public.dashboard_alarm_events WHERE meldung = 'jung'), 1, 'Ereignisse innerhalb der Aufbewahrung bleiben');

SELECT * FROM finish();
ROLLBACK;
