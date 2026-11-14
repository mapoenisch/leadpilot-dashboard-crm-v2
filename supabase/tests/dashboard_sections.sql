-- Auftrag 157 (P09a): Dashboard-Editor: Sektionen und einklappbare Gruppen
-- Tests für:
-- 1. Strukturprüfung von sections in dashboard_config_v2_invalid_reason
-- 2. Ungültige Sektionen blockieren save_dashboard_v2 ohne Revisionserstellung
-- 3. Wiederherstellung älterer Revisionen ohne sections

BEGIN;

SELECT plan(20);

-- ---------------------------------------------------------------- Setup --
DELETE FROM public.dashboard_revisions WHERE dashboard_id IN (
  SELECT id FROM public.dashboards WHERE title LIKE '157-Test%'
);
DELETE FROM public.dashboards WHERE title LIKE '157-Test%';
DELETE FROM public.organization_members WHERE user_id = '91570000-0000-0000-0000-000000000001';
DELETE FROM auth.users WHERE email = 'test-user@157-test.local';
DELETE FROM public.organizations WHERE id = 'a1570000-0000-0000-0000-000000000001';

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('91570000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'test-user@157-test.local', 'x', now());

INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('a1570000-0000-0000-0000-000000000001', 'Org A (157 Test)', 'synthetic', 'active');

INSERT INTO public.organization_members (user_id, organization_id, role, status)
VALUES
  ('91570000-0000-0000-0000-000000000001', 'a1570000-0000-0000-0000-000000000001', 'admin', 'active');

-- Basis-Konfiguration
CREATE TEMP TABLE tmp_base_config AS
SELECT jsonb_build_object(
  'version', 2,
  'title', '157-Test Dashboard',
  'scope', 'personal',
  'ownerUserId', '91570000-0000-0000-0000-000000000001',
  'organizationId', 'a1570000-0000-0000-0000-000000000001',
  'globalTimeframe', 'aktuell',
  'tiles', jsonb_build_array(
    jsonb_build_object(
      'id', 't1',
      'catalogId', 'crm.pipeline_deals',
      'title', 'Deals',
      'presentation', 'zahl',
      'layouts', jsonb_build_object('desktop', jsonb_build_object('x', 0, 'y', 0, 'w', 4, 'h', 2))
    ),
    jsonb_build_object(
      'id', 't2',
      'catalogId', 'crm.pipeline_volumen',
      'title', 'Volumen',
      'presentation', 'zahl',
      'layouts', jsonb_build_object('desktop', jsonb_build_object('x', 4, 'y', 0, 'w', 4, 'h', 2))
    )
  )
) AS cfg;

-- ---------------------------------------------------------------- Teil 1: Gültige Fälle --

-- 1. Gültig: Ohne Sektionen (Legacy/Voraussetzung)
SELECT is(
  public.dashboard_config_v2_invalid_reason((SELECT cfg FROM tmp_base_config)),
  NULL,
  'Konfiguration ohne sections ist gültig'
);

-- 2. Gültig: Leeres sections Array
SELECT is(
  public.dashboard_config_v2_invalid_reason((SELECT jsonb_set(cfg, '{sections}', '[]'::jsonb) FROM tmp_base_config)),
  NULL,
  'Konfiguration mit leerem sections-Array ist gültig'
);

-- 3. Gültig: Sektionen mit Kacheln und leere Sektion
SELECT is(
  public.dashboard_config_v2_invalid_reason((SELECT jsonb_set(cfg, '{sections}', jsonb_build_array(
    jsonb_build_object('id', 's1', 'title', 'Pipeline', 'collapsed', false, 'tileIds', jsonb_build_array('t1')),
    jsonb_build_object('id', 's2', 'title', 'Finanzen', 'collapsed', true, 'tileIds', jsonb_build_array('t2')),
    jsonb_build_object('id', 's3', 'title', 'Leer', 'collapsed', false, 'tileIds', '[]'::jsonb)
  )) FROM tmp_base_config)),
  NULL,
  'Konfiguration mit validen Sektionen ist gültig'
);

-- ---------------------------------------------------------------- Teil 2: Ungültige Fälle --

-- 4. sections kein Array
SELECT is(
  public.dashboard_config_v2_invalid_reason((SELECT jsonb_set(cfg, '{sections}', '"not_an_array"'::jsonb) FROM tmp_base_config)),
  'sections muss ein Array sein',
  'sections muss ein Array sein'
);

-- 5. mehr als 12 Sektionen
SELECT is(
  public.dashboard_config_v2_invalid_reason((SELECT jsonb_set(cfg, '{sections}', (
    SELECT jsonb_agg(jsonb_build_object('id', 's'||i, 'title', 'S'||i, 'collapsed', false, 'tileIds', '[]'::jsonb))
    FROM generate_series(1, 13) AS i
  )) FROM tmp_base_config)),
  'maximal 12 Sektionen zulässig',
  'maximal 12 Sektionen zulässig'
);

-- 6. Sektion kein Objekt
SELECT is(
  public.dashboard_config_v2_invalid_reason((SELECT jsonb_set(cfg, '{sections}', '[null]'::jsonb) FROM tmp_base_config)),
  'Sektion-Eintrag ist kein Objekt',
  'Sektion-Eintrag ist kein Objekt'
);

-- 7. Unbekanntes Sektions-Feld
SELECT is(
  public.dashboard_config_v2_invalid_reason((SELECT jsonb_set(cfg, '{sections}', jsonb_build_array(
    jsonb_build_object('id', 's1', 'title', 'S1', 'collapsed', false, 'tileIds', '[]'::jsonb, 'extra', 1)
  )) FROM tmp_base_config)),
  'unbekanntes Sektions-Feld im JSON',
  'unbekanntes Sektions-Feld im JSON'
);

-- 8. Sektion-Pflichtfeld fehlt
SELECT is(
  public.dashboard_config_v2_invalid_reason((SELECT jsonb_set(cfg, '{sections}', jsonb_build_array(
    jsonb_build_object('id', 's1', 'title', 'S1', 'collapsed', false)
  )) FROM tmp_base_config)),
  'Sektion-Pflichtfeld fehlt (erwartet: id, title, collapsed, tileIds)',
  'Sektion-Pflichtfeld fehlt'
);

-- 9. Sektion-ID leer
SELECT is(
  public.dashboard_config_v2_invalid_reason((SELECT jsonb_set(cfg, '{sections}', jsonb_build_array(
    jsonb_build_object('id', '   ', 'title', 'S1', 'collapsed', false, 'tileIds', '[]'::jsonb)
  )) FROM tmp_base_config)),
  'Sektion-ID muss ein nicht-leerer String (max. 64 Zeichen) sein',
  'Sektion-ID leer abgelehnt'
);

-- 10. Sektion-IDs nicht eindeutig
SELECT is(
  public.dashboard_config_v2_invalid_reason((SELECT jsonb_set(cfg, '{sections}', jsonb_build_array(
    jsonb_build_object('id', 'dup', 'title', 'S1', 'collapsed', false, 'tileIds', '[]'::jsonb),
    jsonb_build_object('id', 'dup', 'title', 'S2', 'collapsed', false, 'tileIds', '[]'::jsonb)
  )) FROM tmp_base_config)),
  'Sektion-IDs müssen eindeutig sein',
  'Sektion-IDs doppelt abgelehnt'
);

-- 11. Sektion-Titel nach Trimmen leer
SELECT is(
  public.dashboard_config_v2_invalid_reason((SELECT jsonb_set(cfg, '{sections}', jsonb_build_array(
    jsonb_build_object('id', 's1', 'title', '   ', 'collapsed', false, 'tileIds', '[]'::jsonb)
  )) FROM tmp_base_config)),
  'Sektion-Titel muss nach dem Trimmen zwischen 1 und 80 Zeichen lang sein',
  'Sektion-Titel leer abgelehnt'
);

-- 12. Sektion-Titel zu lang (>80 Zeichen)
SELECT is(
  public.dashboard_config_v2_invalid_reason((SELECT jsonb_set(cfg, '{sections}', jsonb_build_array(
    jsonb_build_object('id', 's1', 'title', repeat('A', 81), 'collapsed', false, 'tileIds', '[]'::jsonb)
  )) FROM tmp_base_config)),
  'Sektion-Titel muss nach dem Trimmen zwischen 1 und 80 Zeichen lang sein',
  'Sektion-Titel > 80 Zeichen abgelehnt'
);

-- 13. Sektion-collapsed nicht boolesch
SELECT is(
  public.dashboard_config_v2_invalid_reason((SELECT jsonb_set(cfg, '{sections}', jsonb_build_array(
    jsonb_build_object('id', 's1', 'title', 'S1', 'collapsed', 'false', 'tileIds', '[]'::jsonb)
  )) FROM tmp_base_config)),
  'Sektion-collapsed muss ein boolescher Wert sein',
  'Sektion-collapsed nicht boolesch abgelehnt'
);

-- 14. Sektion-tileIds kein Array
SELECT is(
  public.dashboard_config_v2_invalid_reason((SELECT jsonb_set(cfg, '{sections}', jsonb_build_array(
    jsonb_build_object('id', 's1', 'title', 'S1', 'collapsed', false, 'tileIds', '"t1"'::jsonb)
  )) FROM tmp_base_config)),
  'Sektion-tileIds muss ein Array sein',
  'Sektion-tileIds kein Array abgelehnt'
);

-- 15. Kachel-ID in Sektion kein String
SELECT is(
  public.dashboard_config_v2_invalid_reason((SELECT jsonb_set(cfg, '{sections}', jsonb_build_array(
    jsonb_build_object('id', 's1', 'title', 'S1', 'collapsed', false, 'tileIds', '[123]'::jsonb)
  )) FROM tmp_base_config)),
  'Kachel-ID in Sektion muss ein String sein',
  'Kachel-ID kein String abgelehnt'
);

-- 16. Kachel-ID existiert nicht in tiles
SELECT is(
  public.dashboard_config_v2_invalid_reason((SELECT jsonb_set(cfg, '{sections}', jsonb_build_array(
    jsonb_build_object('id', 's1', 'title', 'S1', 'collapsed', false, 'tileIds', jsonb_build_array('nicht_vorhanden'))
  )) FROM tmp_base_config)),
  'Kachel-ID in Sektion existiert nicht in tiles',
  'Kachel-ID nicht in tiles abgelehnt'
);

-- 17. Kachel-ID ist mehr als einer Sektion zugeordnet
SELECT is(
  public.dashboard_config_v2_invalid_reason((SELECT jsonb_set(cfg, '{sections}', jsonb_build_array(
    jsonb_build_object('id', 's1', 'title', 'S1', 'collapsed', false, 'tileIds', jsonb_build_array('t1')),
    jsonb_build_object('id', 's2', 'title', 'S2', 'collapsed', false, 'tileIds', jsonb_build_array('t1'))
  )) FROM tmp_base_config)),
  'Kachel-ID ist mehr als einer Sektion zugeordnet',
  'Kachel-ID in mehreren Sektionen abgelehnt'
);

-- ---------------------------------------------------------------- Teil 3: save_dashboard_v2 & restore --

GRANT SELECT ON tmp_base_config TO authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"91570000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SET ROLE authenticated;

-- 18. save_dashboard_v2 mit ungültigen sections schlägt fehl (Exception)
DO $$
DECLARE
  v_res RECORD;
  v_dash_id UUID;
  v_rev INTEGER;
  v_bad_cfg JSONB;
BEGIN
  -- Erst gültiges Dashboard anlegen
  SELECT * INTO v_res FROM public.create_dashboard_v2('157-Test Dashboard', (SELECT cfg FROM tmp_base_config), 'personal');
  v_dash_id := v_res.dashboard_id;
  v_rev := v_res.revision;

  -- Ungültige Konfiguration vorbereiten
  v_bad_cfg := jsonb_set((SELECT cfg FROM tmp_base_config), '{sections}', '[{"bad": 1}]'::jsonb);

  BEGIN
    PERFORM public.save_dashboard_v2(v_dash_id, v_rev, '157-Test Ungültig', v_bad_cfg);
    RAISE EXCEPTION 'save_dashboard_v2 hätte fehlschlagen müssen!';
  EXCEPTION WHEN OTHERS THEN
    -- Erwartet: Fehler aufgetreten
    NULL;
  END;
END;
$$;

-- Prüfen, dass keine zweite Revision angelegt wurde
SELECT is(
  (SELECT count(*)::integer FROM public.dashboard_revisions r JOIN public.dashboards d ON d.id = r.dashboard_id WHERE d.title = '157-Test Dashboard'),
  1,
  'Fehlgeschlagenes Speichern erzeugt keine Revision'
);

-- 19. Speichern mit gültigen Sektionen und Wiederherstellen der Ursprungs-Revision ohne Sektionen
DO $$
DECLARE
  v_dash_id UUID;
  v_rev1 INTEGER;
  v_rev2 INTEGER;
  v_sec_cfg JSONB;
BEGIN
  SELECT id INTO v_dash_id FROM public.dashboards WHERE title = '157-Test Dashboard' LIMIT 1;
  v_rev1 := 1;

  -- Revision 2 mit Sektionen
  v_sec_cfg := jsonb_set((SELECT cfg FROM tmp_base_config), '{sections}', jsonb_build_array(
    jsonb_build_object('id', 'sec-a', 'title', 'Gruppe A', 'collapsed', false, 'tileIds', jsonb_build_array('t1'))
  ));
  SELECT revision INTO v_rev2 FROM public.save_dashboard_v2(v_dash_id, v_rev1, '157-Test Dashboard Rev 2', v_sec_cfg);

  -- Revision 1 (ohne Sektionen) wiederherstellen
  PERFORM public.restore_dashboard_revision_v2(v_dash_id, v_rev1, v_rev2);
END;
$$;

SELECT is(
  (SELECT (config ? 'sections') FROM public.dashboards WHERE title = '157-Test Dashboard' LIMIT 1),
  false,
  'Wiederhergestellte Revision 1 enthält kein sections-Feld'
);

-- 20. Bereinigung bestätigen
SELECT is(
  (SELECT count(*)::integer FROM public.dashboards WHERE title = '157-Test Dashboard'),
  1,
  'Dashboard nach Wiederherstellung intakt'
);

RESET ROLE;

ROLLBACK;
