-- 067F / G49 (Auftrag 067D-Teilauftrag 067F, Step 1): Persistenz-Nachweise für
-- Szenarien, Versionen, Runs, Events, Zeitreihen und Snapshots.
-- Atomarer Serverpfad (alles oder nichts), Rollback bei Eventfehler,
-- Fremdorganisation und direkte Schreibsperre. Vor der
-- 20260919-Migration rot (Schema fehlt), danach grün.
-- Ausführung: supabase test db (lokal) bzw. psql mit pgTAP.

BEGIN;

SELECT plan(22);

-- ---------------------------------------------------------------- Setup --
DELETE FROM public.simulation_snapshots;
DELETE FROM public.simulation_timeseries;
DELETE FROM public.simulation_events;
DELETE FROM public.simulation_runs;
DELETE FROM public.simulation_scenario_versions;
DELETE FROM public.simulation_scenarios;
DELETE FROM public.organization_members WHERE user_id IN (
  '71111111-1111-1111-1111-111111111111',
  '72222222-2222-2222-2222-222222222222',
  '73333333-3333-3333-3333-333333333333',
  '74444444-4444-4444-4444-444444444444'
);
DELETE FROM public.organizations WHERE id IN (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
);
DELETE FROM auth.users WHERE email LIKE '%@persist-test.local';

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('71111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'admin-pa@persist-test.local', 'x', now()),
  ('72222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'viewer-pa@persist-test.local', 'x', now()),
  ('73333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'admin-pb@persist-test.local', 'x', now()),
  ('74444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'nomember-p@persist-test.local', 'x', now());

INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Org PA (Persist-Test)', 'synthetic', 'active'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Org PB (Persist-Test)', 'synthetic', 'active');

INSERT INTO public.organization_members (user_id, organization_id, role)
VALUES
  ('71111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'admin'),
  ('72222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'viewer'),
  ('73333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'admin');

-- Als Admin von Org PA einloggen.
SELECT set_config('request.jwt.claims', '{"sub":"71111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SET ROLE authenticated;

-- ------------------------------------------- 1..7: atomarer Erfolg --
SELECT lives_ok(
  $$SELECT public.persist_completed_run(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '{"id":"scen-pa-1","name":"Szenario PA","status":"ACTIVE","currentVersionId":"ver-pa-1","isProtected":false}'::jsonb,
    '{"id":"ver-pa-1","scenarioId":"scen-pa-1","versionNumber":1,"parameters":{"marketingBudgetYearly":65000}}'::jsonb,
    '{"runId":"run-pa-1","seed":777001,"status":"COMPLETED","manifest":{"runId":"run-pa-1"},"correlationId":"corr-pa-1"}'::jsonb,
    '[{"tick":0,"eventType":"SYSTEM_INFO","title":"Start"},{"tick":1,"eventType":"NEW_LEAD","title":"Lead"}]'::jsonb,
    '[{"tick":0,"metrics":{"arr":411840}},{"tick":1,"metrics":{"arr":412000}},{"tick":2,"metrics":{"arr":413000}}]'::jsonb,
    '[{"snapshotId":"run-pa-1_tick_2","tickId":2,"state":{},"projection":{}}]'::jsonb
  )$$,
  'Admin PA persistiert Run-Bundle atomar'
);

SELECT is((SELECT count(*) FROM public.simulation_runs), 1::bigint, 'genau ein Run gespeichert');
SELECT is((SELECT count(*) FROM public.simulation_events), 2::bigint, 'beide Events gespeichert');
SELECT is((SELECT count(*) FROM public.simulation_timeseries), 3::bigint, 'alle Zeitreihenpunkte gespeichert');
SELECT is((SELECT count(*) FROM public.simulation_snapshots), 1::bigint, 'Snapshot gespeichert');
SELECT is((SELECT count(*) FROM public.simulation_scenarios), 1::bigint, 'Szenario gespeichert');
SELECT is((SELECT count(*) FROM public.simulation_scenario_versions), 1::bigint, 'Version gespeichert');

-- ------------------------------------- 8..12: Rollback bei Eventfehler --
SELECT throws_ok(
  $$SELECT public.persist_completed_run(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '{"id":"scen-pa-1","name":"Szenario PA","status":"ACTIVE","currentVersionId":"ver-pa-1","isProtected":false}'::jsonb,
    '{"id":"ver-pa-1","scenarioId":"scen-pa-1","versionNumber":1,"parameters":{}}'::jsonb,
    '{"runId":"run-pa-broken","seed":1,"status":"COMPLETED","manifest":{},"correlationId":"corr-broken"}'::jsonb,
    '[{"tick":-1,"eventType":"BROKEN","title":"Ungueltig"}]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  )$$,
  NULL,
  'Event mit negativem Tick bricht den Bundle-Persist ab'
);

SELECT is((SELECT count(*) FROM public.simulation_runs), 1::bigint, 'Rollback: kein partieller Run');
SELECT is((SELECT count(*) FROM public.simulation_events), 2::bigint, 'Rollback: keine partiellen Events');
SELECT is((SELECT count(*) FROM public.simulation_timeseries), 3::bigint, 'Rollback: keine partiellen Zeitreihen');
SELECT is((SELECT count(*) FROM public.simulation_snapshots), 1::bigint, 'Rollback: kein partieller Snapshot');

-- ----------------------------------------- 13..15: Fremdorganisation --
SELECT set_config('request.jwt.claims', '{"sub":"73333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT public.persist_completed_run(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '{"id":"scen-pa-x","name":"Angriff","status":"ACTIVE","currentVersionId":"ver-pa-x","isProtected":false}'::jsonb,
    '{"id":"ver-pa-x","scenarioId":"scen-pa-x","versionNumber":1,"parameters":{}}'::jsonb,
    '{"runId":"run-pa-attack","seed":1,"status":"COMPLETED","manifest":{},"correlationId":"corr-x"}'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  )$$,
  NULL,
  'Admin PB kann nicht in Org PA persistieren'
);

SELECT set_config('request.jwt.claims', '{"sub":"71111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

SELECT is((SELECT count(*) FROM public.simulation_runs), 1::bigint, 'Angriff hinterlässt keinen Run (PA-Sicht)');
SELECT is((SELECT count(*) FROM public.simulation_scenarios WHERE id = 'scen-pa-x'), 0::bigint, 'Angriff hinterlässt kein Szenario');

SELECT set_config('request.jwt.claims', '{"sub":"73333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

SELECT is((SELECT count(*) FROM public.simulation_runs), 0::bigint, 'Admin PB sieht keine PA-Runs');

-- ------------------------------------------- 16..17: Viewer eigene Org --
SELECT set_config('request.jwt.claims', '{"sub":"72222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

SELECT lives_ok(
  $$SELECT public.persist_completed_run(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '{"id":"scen-pa-1","name":"Szenario PA","status":"ACTIVE","currentVersionId":"ver-pa-1","isProtected":false}'::jsonb,
    '{"id":"ver-pa-1","scenarioId":"scen-pa-1","versionNumber":1,"parameters":{}}'::jsonb,
    '{"runId":"run-pa-2","seed":2,"status":"COMPLETED","manifest":{},"correlationId":"corr-pa-2"}'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  )$$,
  'Viewer PA darf eigene Org-Bundles persistieren (Mitgliedschaft)'
);

SELECT is((SELECT count(*) FROM public.simulation_runs), 2::bigint, 'Viewer-Run gespeichert');

-- ------------------------------------------------ 18: ohne Mitgliedschaft --
SELECT set_config('request.jwt.claims', '{"sub":"74444444-4444-4444-4444-444444444444","role":"authenticated"}', true);

SELECT throws_ok(
  $$SELECT public.persist_completed_run(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '{"id":"scen-pa-y","name":"Angriff","status":"ACTIVE","currentVersionId":"ver-pa-y","isProtected":false}'::jsonb,
    '{"id":"ver-pa-y","scenarioId":"scen-pa-y","versionNumber":1,"parameters":{}}'::jsonb,
    '{"runId":"run-pa-attack2","seed":1,"status":"COMPLETED","manifest":{},"correlationId":"corr-y"}'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  )$$,
  NULL,
  'Ohne Mitgliedschaft kein Persist'
);

-- --------------------------------------- 19: kein direkter Schreibzugriff --
SELECT set_config('request.jwt.claims', '{"sub":"71111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

SELECT throws_ok(
  $$INSERT INTO public.simulation_runs (run_id, scenario_id, scenario_version_id, organization_id, seed, status, manifest, correlation_id)
    VALUES ('run-direct','scen-pa-1','ver-pa-1','cccccccc-cccc-cccc-cccc-cccccccccccc',1,'COMPLETED','{}','corr-direct')$$,
  NULL,
  'Direktes INSERT ist selbst für Admins gesperrt (nur RPC-Pfad)'
);

-- --------------------------------- 20..21: große PRNG-Zustände (BIGINT) --
SELECT lives_ok(
  $$SELECT public.persist_completed_run(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '{"id":"scen-pa-1","name":"Szenario PA","status":"ACTIVE","currentVersionId":"ver-pa-1","isProtected":false}'::jsonb,
    '{"id":"ver-pa-1","scenarioId":"scen-pa-1","versionNumber":1,"parameters":{}}'::jsonb,
    '{"runId":"run-pa-bigseed","seed":1527526,"rngState":1527526101518,"status":"COMPLETED","manifest":{},"correlationId":"corr-big"}'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb,
    '[]'::jsonb
  )$$,
  'PRNG-Endzustand jenseits INTEGER wird persistiert (BIGINT)'
);

SELECT is(
  (SELECT rng_state FROM public.simulation_runs WHERE run_id = 'run-pa-bigseed'),
  1527526101518::bigint,
  'Großer rng_state steht verlustfrei'
);

SELECT * FROM finish();

ROLLBACK;
