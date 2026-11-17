BEGIN;
SELECT plan(19);

-- Hilfsfunktion für kompakte Testfälle
CREATE OR REPLACE FUNCTION pg_temp.test_window_cfg(p_window JSONB)
RETURNS TEXT LANGUAGE sql AS $$
  SELECT public.dashboard_config_v2_invalid_reason(
    jsonb_build_object(
      'version', 2,
      'title', '161-Window-Test',
      'scope', 'personal',
      'ownerUserId', '91540000-0000-0000-0000-000000000001',
      'organizationId', 'a1540000-0000-0000-0000-000000000001',
      'globalTimeframe', 'aktuell',
      'tiles', jsonb_build_array(
        jsonb_build_object(
          'id', 't1',
          'catalogId', 'crm.gewonnen_verlauf',
          'title', 'Gewonnen',
          'presentation', 'linie',
          'layouts', jsonb_build_object('desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 6, 'h', 4)),
          'query', CASE
            WHEN p_window IS NULL THEN jsonb_build_object('metricId', 'crm.gewonnen_verlauf')
            ELSE jsonb_build_object('metricId', 'crm.gewonnen_verlauf', 'window', p_window)
          END
        )
      )
    )
  );
$$;

-- 1. Gültiges window in tile.query wird akzeptiert
SELECT is(
  pg_temp.test_window_cfg(jsonb_build_object('count', 12, 'resolution', 'woche')),
  NULL,
  'Gültiges window (count 12 woche) wird akzeptiert'
);

-- 2. Fehlendes window in query wird akzeptiert (Standardfall)
SELECT is(
  pg_temp.test_window_cfg(NULL),
  NULL,
  'Fehlendes window in tile.query wird akzeptiert'
);

-- 3. Falscher Typ für window (String statt Objekt)
SELECT isnt(
  pg_temp.test_window_cfg('"30 Tage"'::jsonb),
  NULL,
  'String als window wird abgelehnt'
);

-- 4. Kommazahl in count wird abgelehnt
SELECT isnt(
  pg_temp.test_window_cfg(jsonb_build_object('count', 12.5, 'resolution', 'woche')),
  NULL,
  'Kommazahl in count wird abgelehnt'
);

-- 5. count = 0 wird abgelehnt
SELECT isnt(
  pg_temp.test_window_cfg(jsonb_build_object('count', 0, 'resolution', 'woche')),
  NULL,
  'count = 0 wird abgelehnt'
);

-- 6. count < 0 wird abgelehnt
SELECT isnt(
  pg_temp.test_window_cfg(jsonb_build_object('count', -5, 'resolution', 'woche')),
  NULL,
  'Negativer count wird abgelehnt'
);

-- 7. Überschreitung je Auflösung: stunde > 168
SELECT isnt(
  pg_temp.test_window_cfg(jsonb_build_object('count', 169, 'resolution', 'stunde')),
  NULL,
  'stunde > 168 wird abgelehnt'
);

-- 8. Höchstwert stunde = 168 ist gültig
SELECT is(
  pg_temp.test_window_cfg(jsonb_build_object('count', 168, 'resolution', 'stunde')),
  NULL,
  'stunde = 168 wird akzeptiert'
);

-- 9. Überschreitung je Auflösung: tag > 366
SELECT isnt(
  pg_temp.test_window_cfg(jsonb_build_object('count', 367, 'resolution', 'tag')),
  NULL,
  'tag > 366 wird abgelehnt'
);

-- 10. Höchstwert tag = 366 ist gültig
SELECT is(
  pg_temp.test_window_cfg(jsonb_build_object('count', 366, 'resolution', 'tag')),
  NULL,
  'tag = 366 wird akzeptiert'
);

-- 11. Überschreitung je Auflösung: woche > 260
SELECT isnt(
  pg_temp.test_window_cfg(jsonb_build_object('count', 261, 'resolution', 'woche')),
  NULL,
  'woche > 260 wird abgelehnt'
);

-- 12. Höchstwert woche = 260 ist gültig
SELECT is(
  pg_temp.test_window_cfg(jsonb_build_object('count', 260, 'resolution', 'woche')),
  NULL,
  'woche = 260 wird akzeptiert'
);

-- 13. Überschreitung je Auflösung: monat > 120
SELECT isnt(
  pg_temp.test_window_cfg(jsonb_build_object('count', 121, 'resolution', 'monat')),
  NULL,
  'monat > 120 wird abgelehnt'
);

-- 14. Höchstwert monat = 120 ist gültig
SELECT is(
  pg_temp.test_window_cfg(jsonb_build_object('count', 120, 'resolution', 'monat')),
  NULL,
  'monat = 120 wird akzeptiert'
);

-- 15. Unbekannte Auflösung
SELECT isnt(
  pg_temp.test_window_cfg(jsonb_build_object('count', 10, 'resolution', 'jahr')),
  NULL,
  'Unbekannte resolution "jahr" wird abgelehnt'
);

-- 16. Zusatzschlüssel in window
SELECT isnt(
  pg_temp.test_window_cfg(jsonb_build_object('count', 12, 'resolution', 'woche', 'extra', 'ungültig')),
  NULL,
  'Zusatzschlüssel in window wird abgelehnt'
);

-- 17. Fehlender Schlüssel count
SELECT isnt(
  pg_temp.test_window_cfg(jsonb_build_object('resolution', 'woche')),
  NULL,
  'Fehlender Schlüssel count wird abgelehnt'
);

-- 18. Fehlender Schlüssel resolution
SELECT isnt(
  pg_temp.test_window_cfg(jsonb_build_object('count', 12)),
  NULL,
  'Fehlender Schlüssel resolution wird abgelehnt'
);

-- 19. Regressionsfall: Kachel ohne query bleibt gültig
SELECT is(
  public.dashboard_config_v2_invalid_reason(
    jsonb_build_object(
      'version', 2,
      'title', 'Regression-Test',
      'scope', 'personal',
      'ownerUserId', '91540000-0000-0000-0000-000000000001',
      'organizationId', 'a1540000-0000-0000-0000-000000000001',
      'globalTimeframe', 'aktuell',
      'tiles', jsonb_build_array(
        jsonb_build_object(
          'id', 't1',
          'catalogId', 'crm.gewonnen_verlauf',
          'title', 'Gewonnen',
          'presentation', 'linie',
          'layouts', jsonb_build_object('desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 6, 'h', 4))
        )
      )
    )
  ),
  NULL,
  'Kachel ohne query bleibt uneingeschränkt gültig'
);

SELECT * FROM finish();
ROLLBACK;
