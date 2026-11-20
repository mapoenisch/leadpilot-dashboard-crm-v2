-- pgTAP Testsuite für Auftrag 169 (P14a): Dashboard-Transformationen & Alarmparität
BEGIN;

SELECT plan(22);

SET CONSTRAINTS ALL IMMEDIATE;

-- ============================================================================
-- 1. Setup Testdaten
-- ============================================================================

INSERT INTO public.organizations (id, name, mode, status)
VALUES ('ee690000-0000-0000-0000-000000000001', 'Org Transformationen 169', 'synthetic', 'active');

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES ('ee690000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'admin169@leadpilot.test', 'x', now());

INSERT INTO public.organization_members (organization_id, user_id, role, status)
VALUES ('ee690000-0000-0000-0000-000000000001', 'ee690000-0000-0000-0000-000000000002', 'admin', 'active');

CREATE OR REPLACE FUNCTION pg_temp.base_config(p_tiles JSONB)
RETURNS JSONB
LANGUAGE sql
AS $$
  SELECT jsonb_build_object(
    'version', 2,
    'id', 'ee690000-0000-0000-0000-000000000010',
    'title', 'Test Dashboard',
    'scope', 'personal',
    'ownerUserId', 'ee690000-0000-0000-0000-000000000002',
    'organizationId', 'ee690000-0000-0000-0000-000000000001',
    'globalTimeframe', '31.12.2025',
    'tiles', p_tiles
  );
$$;

-- ============================================================================
-- 2. Formprüfung in dashboard_config_v2_invalid_reason
-- ============================================================================

-- Gültige Konfiguration mit 2 Transformationen
SELECT is(
  public.dashboard_config_v2_invalid_reason(pg_temp.base_config(
    jsonb_build_array(
      jsonb_build_object(
        'id', 't1',
        'catalogId', 'baseline.arr',
        'title', 'ARR Kachel',
        'presentation', 'zahl',
        'layouts', jsonb_build_object(
          'desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 6, 'h', 4),
          'tablet', jsonb_build_object('x', 0, 'y', 0, 'w', 4, 'h', 4),
          'mobile', jsonb_build_object('x', 0, 'y', 0, 'w', 1, 'h', 4)
        ),
        'query', jsonb_build_object(
          'metricId', 'baseline.arr',
          'transformations', jsonb_build_array(
            jsonb_build_object('art', 'umbenennen', 'name', 'Jährlich ARR'),
            jsonb_build_object('art', 'einheit_umrechnen', 'von', 'EUR', 'zu', 'Tsd. EUR')
          )
        )
      )
    )
  )),
  NULL,
  'Gültige Konfiguration mit 2 Transformationen wird akzeptiert'
);

-- Ungültig: mehr als 3 Transformationen
SELECT is(
  public.dashboard_config_v2_invalid_reason(pg_temp.base_config(
    jsonb_build_array(
      jsonb_build_object(
        'id', 't1',
        'catalogId', 'baseline.arr',
        'title', 'ARR Kachel',
        'presentation', 'zahl',
        'layouts', jsonb_build_object(
          'desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 6, 'h', 4),
          'tablet', jsonb_build_object('x', 0, 'y', 0, 'w', 4, 'h', 4),
          'mobile', jsonb_build_object('x', 0, 'y', 0, 'w', 1, 'h', 4)
        ),
        'query', jsonb_build_object(
          'metricId', 'baseline.arr',
          'transformations', jsonb_build_array(
            jsonb_build_object('art', 'umbenennen', 'name', 'Schritt 1'),
            jsonb_build_object('art', 'umbenennen', 'name', 'Schritt 2'),
            jsonb_build_object('art', 'umbenennen', 'name', 'Schritt 3'),
            jsonb_build_object('art', 'umbenennen', 'name', 'Schritt 4')
          )
        )
      )
    )
  )),
  'maximal 3 Transformationen je Kachel zulässig',
  'Mehr als 3 Transformationen werden abgelehnt'
);

-- Ungültig: unzulässige Transformationsart
SELECT is(
  public.dashboard_config_v2_invalid_reason(pg_temp.base_config(
    jsonb_build_array(
      jsonb_build_object(
        'id', 't1',
        'catalogId', 'baseline.arr',
        'title', 'ARR Kachel',
        'presentation', 'zahl',
        'layouts', jsonb_build_object(
          'desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 6, 'h', 4),
          'tablet', jsonb_build_object('x', 0, 'y', 0, 'w', 4, 'h', 4),
          'mobile', jsonb_build_object('x', 0, 'y', 0, 'w', 1, 'h', 4)
        ),
        'query', jsonb_build_object(
          'metricId', 'baseline.arr',
          'transformations', jsonb_build_array(
            jsonb_build_object('art', 'freie_formel', 'code', 'x * 2')
          )
        )
      )
    )
  )),
  'unzulässige Transformationsart',
  'Freie Formeln oder unzulässige Arten werden abgelehnt'
);

-- Ungültig: Umrechnung nicht in Positivliste
SELECT is(
  public.dashboard_config_v2_invalid_reason(pg_temp.base_config(
    jsonb_build_array(
      jsonb_build_object(
        'id', 't1',
        'catalogId', 'baseline.arr',
        'title', 'ARR Kachel',
        'presentation', 'zahl',
        'layouts', jsonb_build_object(
          'desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 6, 'h', 4),
          'tablet', jsonb_build_object('x', 0, 'y', 0, 'w', 4, 'h', 4),
          'mobile', jsonb_build_object('x', 0, 'y', 0, 'w', 1, 'h', 4)
        ),
        'query', jsonb_build_object(
          'metricId', 'baseline.arr',
          'transformations', jsonb_build_array(
            jsonb_build_object('art', 'einheit_umrechnen', 'von', 'USD', 'zu', 'EUR')
          )
        )
      )
    )
  )),
  'Umrechnung nicht in Positivliste',
  'Nicht gelistete Einheitenpaare werden abgelehnt'
);

-- Ungültig: gleitender_durchschnitt Fenster außerhalb 2–30
SELECT is(
  public.dashboard_config_v2_invalid_reason(pg_temp.base_config(
    jsonb_build_array(
      jsonb_build_object(
        'id', 't1',
        'catalogId', 'baseline.arr',
        'title', 'ARR Kachel',
        'presentation', 'zahl',
        'layouts', jsonb_build_object(
          'desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 6, 'h', 4),
          'tablet', jsonb_build_object('x', 0, 'y', 0, 'w', 4, 'h', 4),
          'mobile', jsonb_build_object('x', 0, 'y', 0, 'w', 1, 'h', 4)
        ),
        'query', jsonb_build_object(
          'metricId', 'baseline.arr',
          'transformations', jsonb_build_array(
            jsonb_build_object('art', 'gleitender_durchschnitt', 'fenster', 1)
          )
        )
      )
    )
  )),
  'fenster muss eine ganze Zahl zwischen 2 und 30 sein',
  'Fenster < 2 wird abgelehnt'
);

-- ============================================================================
-- 3. alarm_apply_transformations Paritätstests gegen Referenzfälle
-- ============================================================================

-- Referenzfall tc-01: EUR -> Tsd. EUR (1234567 -> 1234.567)
SELECT is(
  (public.alarm_apply_transformations(
    jsonb_build_object('wert', 1234567, 'einheit', 'EUR', 'zustand', 'bereit'),
    jsonb_build_array(jsonb_build_object('art', 'einheit_umrechnen', 'von', 'EUR', 'zu', 'Tsd. EUR'))
  )->>'wert')::NUMERIC,
  1234.567,
  'tc-01: EUR -> Tsd. EUR liefert 1234.567'
);

SELECT is(
  public.alarm_apply_transformations(
    jsonb_build_object('wert', 1234567, 'einheit', 'EUR', 'zustand', 'bereit'),
    jsonb_build_array(jsonb_build_object('art', 'einheit_umrechnen', 'von', 'EUR', 'zu', 'Tsd. EUR'))
  )->>'einheit',
  'Tsd. EUR',
  'tc-01: Einheit wird auf Tsd. EUR gesetzt'
);

-- Referenzfall tc-06: EUR -> Mio. EUR (15000000 -> 15)
SELECT is(
  (public.alarm_apply_transformations(
    jsonb_build_object('wert', 15000000, 'einheit', 'EUR', 'zustand', 'bereit'),
    jsonb_build_array(jsonb_build_object('art', 'einheit_umrechnen', 'von', 'EUR', 'zu', 'Mio. EUR'))
  )->>'wert')::NUMERIC,
  15::NUMERIC,
  'tc-06: EUR -> Mio. EUR liefert 15'
);

-- Referenzfall tc-11: Anzahl -> Tsd. (45000 -> 45)
SELECT is(
  (public.alarm_apply_transformations(
    jsonb_build_object('wert', 45000, 'einheit', 'Anzahl', 'zustand', 'bereit'),
    jsonb_build_array(jsonb_build_object('art', 'einheit_umrechnen', 'von', 'Anzahl', 'zu', 'Tsd.'))
  )->>'wert')::NUMERIC,
  45::NUMERIC,
  'tc-11: Anzahl -> Tsd. liefert 45'
);

-- Referenzfall tc-16: Anteil 0–1 -> % (0.75 -> 75)
SELECT is(
  (public.alarm_apply_transformations(
    jsonb_build_object('wert', 0.75, 'einheit', 'Anteil 0–1', 'zustand', 'bereit'),
    jsonb_build_array(jsonb_build_object('art', 'einheit_umrechnen', 'von', 'Anteil 0–1', 'zu', '%'))
  )->>'wert')::NUMERIC,
  75::NUMERIC,
  'tc-16: Anteil 0–1 -> % liefert 75'
);

-- Referenzfall tc-03: Negativer Euro-Wert (-50000 -> -50)
SELECT is(
  (public.alarm_apply_transformations(
    jsonb_build_object('wert', -50000, 'einheit', 'EUR', 'zustand', 'bereit'),
    jsonb_build_array(jsonb_build_object('art', 'einheit_umrechnen', 'von', 'EUR', 'zu', 'Tsd. EUR'))
  )->>'wert')::NUMERIC,
  -50::NUMERIC,
  'tc-03: Negativer Wert wird korrekt umgerechnet'
);

-- Referenzfall tc-02: Nullwert bleibt 0
SELECT is(
  (public.alarm_apply_transformations(
    jsonb_build_object('wert', 0, 'einheit', 'EUR', 'zustand', 'bereit'),
    jsonb_build_array(jsonb_build_object('art', 'einheit_umrechnen', 'von', 'EUR', 'zu', 'Tsd. EUR'))
  )->>'wert')::NUMERIC,
  0::NUMERIC,
  'tc-02: Nullwert bleibt 0'
);

-- Referenzfall tc-31: Umbenennen allein ändert weder Wert noch Einheit und ist alarmfähig
SELECT is(
  public.alarm_apply_transformations(
    jsonb_build_object('wert', 42, 'einheit', 'Anzahl', 'zustand', 'bereit'),
    jsonb_build_array(jsonb_build_object('art', 'umbenennen', 'name', 'Neuer Name'))
  ),
  jsonb_build_object('wert', 42, 'einheit', 'Anzahl', 'zustand', 'bereit', 'alarmfaehig', true),
  'tc-31: Umbenennen ist alarmfähig und ändert keine Werte'
);

-- Kette mit gleitendem Durchschnitt meldet alarmfaehig = false
SELECT is(
  (public.alarm_apply_transformations(
    jsonb_build_object('wert', 100, 'einheit', 'EUR', 'zustand', 'bereit'),
    jsonb_build_array(jsonb_build_object('art', 'gleitender_durchschnitt', 'fenster', 5))
  )->>'alarmfaehig')::BOOLEAN,
  false,
  'Gleitender Durchschnitt meldet alarmfaehig = false'
);

SELECT is(
  public.alarm_apply_transformations(
    jsonb_build_object('wert', 100, 'einheit', 'EUR', 'zustand', 'bereit'),
    jsonb_build_array(jsonb_build_object('art', 'gleitender_durchschnitt', 'fenster', 5))
  )->>'pause_grund',
  'kennzahl_nicht_alarmfaehig',
  'Gleitender Durchschnitt liefert pause_grund = kennzahl_nicht_alarmfaehig'
);

-- ============================================================================
-- 4. Trigger-Test: Speichern einer nicht alarmfähigen Kette pausiert aktive Regel
-- ============================================================================

-- Dashboard mit Kachel anlegen
INSERT INTO public.dashboards (id, organization_id, user_id, created_by_user_id, title, scope, revision, config)
VALUES (
  'ee690000-0000-0000-0000-000000000010',
  'ee690000-0000-0000-0000-000000000001',
  'ee690000-0000-0000-0000-000000000002',
  'ee690000-0000-0000-0000-000000000002',
  'Test Dashboard 169',
  'personal',
  1,
  pg_temp.base_config(
    jsonb_build_array(
      jsonb_build_object(
        'id', 'tile-alarm-1',
        'catalogId', 'live.mrr',
        'title', 'MRR Kachel',
        'presentation', 'zahl',
        'layouts', jsonb_build_object(
          'desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 6, 'h', 4),
          'tablet', jsonb_build_object('x', 0, 'y', 0, 'w', 4, 'h', 4),
          'mobile', jsonb_build_object('x', 0, 'y', 0, 'w', 1, 'h', 4)
        ),
        'query', jsonb_build_object('metricId', 'live.mrr')
      )
    )
  )
);

-- Aktive Alarmregel anlegen
INSERT INTO public.dashboard_alarm_rules (
  id, organization_id, dashboard_id, tile_id, catalog_id, created_by, responsible_user_id, status,
  rule_config, mindestdauer_laeufe, abklingzeit_sekunden
)
VALUES (
  'ee690000-0000-0000-0000-000000000020',
  'ee690000-0000-0000-0000-000000000001',
  'ee690000-0000-0000-0000-000000000010',
  'tile-alarm-1',
  'live.mrr',
  'ee690000-0000-0000-0000-000000000002',
  'ee690000-0000-0000-0000-000000000002',
  'aktiv',
  jsonb_build_object('formatVersion', 2, 'enabled', true, 'art', 'niedrig_ist_schlecht', 'einheit', 'EUR', 'warnung', 50000),
  1, 0
);

SELECT is(
  (SELECT status FROM public.dashboard_alarm_rules WHERE id = 'ee690000-0000-0000-0000-000000000020'),
  'aktiv',
  'Alarmregel ist vor Dashboard-Update aktiv'
);

-- Update Dashboard: Kachel erhält gleitenden Durchschnitt (nicht alarmfähig)
UPDATE public.dashboards
SET config = pg_temp.base_config(
  jsonb_build_array(
    jsonb_build_object(
      'id', 'tile-alarm-1',
      'catalogId', 'live.mrr',
      'title', 'MRR Kachel',
      'presentation', 'linie',
      'layouts', jsonb_build_object(
        'desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 6, 'h', 4),
        'tablet', jsonb_build_object('x', 0, 'y', 0, 'w', 4, 'h', 4),
        'mobile', jsonb_build_object('x', 0, 'y', 0, 'w', 1, 'h', 4)
      ),
      'query', jsonb_build_object(
        'metricId', 'live.mrr',
        'transformations', jsonb_build_array(
          jsonb_build_object('art', 'gleitender_durchschnitt', 'fenster', 5)
        )
      )
    )
  )
)
WHERE id = 'ee690000-0000-0000-0000-000000000010';

SELECT is(
  (SELECT status FROM public.dashboard_alarm_rules WHERE id = 'ee690000-0000-0000-0000-000000000020'),
  'pausiert',
  'Trigger pausiert Alarmregel automatisch bei nicht alarmfähiger Transformation'
);

SELECT is(
  (SELECT pause_grund FROM public.dashboard_alarm_rules WHERE id = 'ee690000-0000-0000-0000-000000000020'),
  'kennzahl_nicht_alarmfaehig',
  'Pause-Grund ist kennzahl_nicht_alarmfaehig'
);

-- ============================================================================
-- 5. Kachelspezifische Alarmauswertung mit unterschiedlichen Einheiten
-- ============================================================================

-- Live-Feed Datensatz einfügen
INSERT INTO public.live_kpi_public_feed (organization_id, kpi_id, value, unit, occurred_at, quality_status, source_system, ingested_at)
VALUES ('ee690000-0000-0000-0000-000000000001', 'mrr', 100000, 'EUR', now(), 'clean', 'test', now());

-- Dashboard mit zwei Kacheln gleicher Kennzahl, aber unterschiedlicher Einheit:
-- Kachel A: Rohwert (EUR)
-- Kachel B: Umgerechnet in Tsd. EUR (100000 EUR -> 100 Tsd. EUR)
INSERT INTO public.dashboards (id, organization_id, user_id, created_by_user_id, title, scope, revision, config)
VALUES (
  'ee690000-0000-0000-0000-000000000030',
  'ee690000-0000-0000-0000-000000000001',
  'ee690000-0000-0000-0000-000000000002',
  'ee690000-0000-0000-0000-000000000002',
  'Dashboard Parität Dual Unit',
  'personal',
  1,
  pg_temp.base_config(
    jsonb_build_array(
      jsonb_build_object(
        'id', 'tile-eur',
        'catalogId', 'live.mrr',
        'title', 'MRR in EUR',
        'presentation', 'zahl',
        'layouts', jsonb_build_object(
          'desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 6, 'h', 4),
          'tablet', jsonb_build_object('x', 0, 'y', 0, 'w', 4, 'h', 4),
          'mobile', jsonb_build_object('x', 0, 'y', 0, 'w', 1, 'h', 4)
        ),
        'query', jsonb_build_object('metricId', 'live.mrr')
      ),
      jsonb_build_object(
        'id', 'tile-tsd-eur',
        'catalogId', 'live.mrr',
        'title', 'MRR in Tsd EUR',
        'presentation', 'zahl',
        'layouts', jsonb_build_object(
          'desktop', jsonb_build_object('x', 6, 'y', 0, 'w', 6, 'h', 4),
          'tablet', jsonb_build_object('x', 4, 'y', 0, 'w', 4, 'h', 4),
          'mobile', jsonb_build_object('x', 0, 'y', 4, 'w', 1, 'h', 4)
        ),
        'query', jsonb_build_object(
          'metricId', 'live.mrr',
          'transformations', jsonb_build_array(
            jsonb_build_object('art', 'einheit_umrechnen', 'von', 'EUR', 'zu', 'Tsd. EUR')
          )
        )
      )
    )
  )
);

-- Regel A für tile-eur: Warngrenze 150.000 EUR -> Messwert 100.000 EUR -> WARNUNG!
INSERT INTO public.dashboard_alarm_rules (
  id, organization_id, dashboard_id, tile_id, catalog_id, created_by, responsible_user_id, status,
  rule_config, mindestdauer_laeufe, abklingzeit_sekunden
)
VALUES (
  'ee690000-0000-0000-0000-000000000031',
  'ee690000-0000-0000-0000-000000000001',
  'ee690000-0000-0000-0000-000000000030',
  'tile-eur',
  'live.mrr',
  'ee690000-0000-0000-0000-000000000002',
  'ee690000-0000-0000-0000-000000000002',
  'aktiv',
  jsonb_build_object('formatVersion', 2, 'enabled', true, 'art', 'niedrig_ist_schlecht', 'einheit', 'EUR', 'warnung', 150000),
  1, 0
);

-- Regel B für tile-tsd-eur: Warngrenze 50 Tsd. EUR -> Messwert 100 Tsd. EUR -> NORMAL!
INSERT INTO public.dashboard_alarm_rules (
  id, organization_id, dashboard_id, tile_id, catalog_id, created_by, responsible_user_id, status,
  rule_config, mindestdauer_laeufe, abklingzeit_sekunden
)
VALUES (
  'ee690000-0000-0000-0000-000000000032',
  'ee690000-0000-0000-0000-000000000001',
  'ee690000-0000-0000-0000-000000000030',
  'tile-tsd-eur',
  'live.mrr',
  'ee690000-0000-0000-0000-000000000002',
  'ee690000-0000-0000-0000-000000000002',
  'aktiv',
  jsonb_build_object('formatVersion', 2, 'enabled', true, 'art', 'niedrig_ist_schlecht', 'einheit', 'Tsd. EUR', 'warnung', 50),
  1, 0
);

-- Worker ausführen
SELECT public.evaluate_dashboard_alarms(now());

-- Regel A Messwert und Stufe prüfen
SELECT is(
  (SELECT letzter_messwert FROM public.dashboard_alarm_state WHERE rule_id = 'ee690000-0000-0000-0000-000000000031'),
  100000::NUMERIC,
  'Kachel A (EUR) misst Rohwert 100.000 EUR'
);

SELECT is(
  (SELECT beobachtete_stufe FROM public.dashboard_alarm_state WHERE rule_id = 'ee690000-0000-0000-0000-000000000031'),
  'warnung',
  'Kachel A löst Warnung aus (100.000 < 150.000)'
);

-- Regel B Messwert und Stufe prüfen
SELECT is(
  (SELECT letzter_messwert FROM public.dashboard_alarm_state WHERE rule_id = 'ee690000-0000-0000-0000-000000000032'),
  100::NUMERIC,
  'Kachel B (Tsd. EUR) misst transformierten Wert 100 Tsd. EUR'
);

SELECT is(
  (SELECT beobachtete_stufe FROM public.dashboard_alarm_state WHERE rule_id = 'ee690000-0000-0000-0000-000000000032'),
  'normal',
  'Kachel B ist normal (100 >= 50 Tsd. EUR)'
);

SELECT * FROM finish();
ROLLBACK;
