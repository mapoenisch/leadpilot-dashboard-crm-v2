-- pgTAP-Tests fuer Auftrag 167: Server-Alarme (P13b)
BEGIN;

SELECT plan(15);
SET CONSTRAINTS ALL IMMEDIATE;

-- Test 1: alarm_evaluate_threshold existiert
SELECT has_function('public', 'alarm_evaluate_threshold', ARRAY['jsonb', 'numeric', 'text', 'text'], 'Funktion alarm_evaluate_threshold existiert');

-- Test 2: Referenzfall hoch-02 (Wert 200, Warnung 200) -> stufe = warnung
SELECT is(
  public.alarm_evaluate_threshold(
    '{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":200,"kritisch":500}'::jsonb,
    200,
    'ok',
    'EUR'
  )->>'stufe',
  'warnung',
  'Referenzfall hoch-02 liefert stufe = warnung'
);

-- Test 3: Referenzfall hoch-05 (Wert 500, Kritisch 500) -> stufe = kritisch
SELECT is(
  public.alarm_evaluate_threshold(
    '{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":200,"kritisch":500}'::jsonb,
    500,
    'ok',
    'EUR'
  )->>'stufe',
  'kritisch',
  'Referenzfall hoch-05 liefert stufe = kritisch'
);

-- Test 4: Zielbereich Rand exakt
SELECT is(
  public.alarm_evaluate_threshold(
    '{"formatVersion":2,"enabled":true,"art":"zielbereich","einheit":"EUR","untenKritisch":10,"untenWarnung":20,"obenWarnung":80,"obenKritisch":90}'::jsonb,
    20,
    'ok',
    'EUR'
  )->>'stufe',
  'normal',
  'Zielbereich genau auf untenWarnung bleibt normal'
);

-- Test 5: Kachelzustand veraltet -> nicht_bewertet
SELECT is(
  public.alarm_evaluate_threshold(
    '{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":100}'::jsonb,
    150,
    'veraltet',
    'EUR'
  )->>'stufe',
  'nicht_bewertet',
  'Kachelzustand veraltet fuehrt zu nicht_bewertet'
);

-- Test 6: Kachelzustand fehler -> nicht_bewertet
SELECT is(
  public.alarm_evaluate_threshold(
    '{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"EUR","warnung":100}'::jsonb,
    150,
    'fehler',
    'EUR'
  )->>'stufe',
  'nicht_bewertet',
  'Kachelzustand fehler fuehrt zu nicht_bewertet'
);

-- Test 7: Einheit wechselt -> regel_ungueltig
SELECT is(
  public.alarm_evaluate_threshold(
    '{"formatVersion":2,"enabled":true,"art":"hoch_ist_schlecht","einheit":"USD","warnung":100}'::jsonb,
    150,
    'ok',
    'EUR'
  )->>'stufe',
  'regel_ungueltig',
  'Abweichende Einheit fuehrt zu regel_ungueltig'
);

-- Test 8: Tabellen existieren
SELECT has_table('public', 'dashboard_alarm_rules', 'Tabelle dashboard_alarm_rules existiert');
SELECT has_table('public', 'dashboard_alarm_state', 'Tabelle dashboard_alarm_state existiert');
SELECT has_table('public', 'dashboard_alarm_events', 'Tabelle dashboard_alarm_events existiert');
SELECT has_table('public', 'alarm_worker_runs', 'Tabelle alarm_worker_runs existiert');
SELECT has_table('public', 'alarm_settings', 'Tabelle alarm_settings existiert');

-- Test 13: alarm_worker_status Funktion existiert
SELECT has_function('public', 'alarm_worker_status', 'Funktion alarm_worker_status existiert');

-- Test 14: alarm_kpi_value Funktion existiert
SELECT has_function('public', 'alarm_kpi_value', ARRAY['uuid', 'text', 'text'], 'Funktion alarm_kpi_value existiert');

-- Test 15: evaluate_dashboard_alarms Funktion existiert
SELECT has_function('public', 'evaluate_dashboard_alarms', ARRAY['timestamptz'], 'Funktion evaluate_dashboard_alarms existiert');

SELECT * FROM finish();
ROLLBACK;
