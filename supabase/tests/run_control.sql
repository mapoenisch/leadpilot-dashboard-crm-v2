-- 067Q / G63: Run-Steuerung — Pausen-Snapshots nur für Admin/Manager der
-- eigenen Organisation, keine direkten Schreibrechte, atomare Bereinigung beim
-- Abschluss, Audit ohne PII. Vor der Migration 20261001 rot (Schema fehlt).
-- Ausführung: supabase test db (lokal) bzw. psql mit pgTAP.

BEGIN;

SELECT plan(24);

-- ---------------------------------------------------------------- Setup --
DELETE FROM public.simulation_run_pauses;
DELETE FROM public.organization_members WHERE user_id IN (
  '81111111-1111-1111-1111-111111111111',
  '82222222-2222-2222-2222-222222222222',
  '83333333-3333-3333-3333-333333333333',
  '84444444-4444-4444-4444-444444444444'
);
DELETE FROM public.organizations WHERE id IN (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'ffffffff-ffff-ffff-ffff-ffffffffffff'
);
DELETE FROM auth.users WHERE email LIKE '%@runctl-test.local';

INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
VALUES
  ('81111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'manager-ra@runctl-test.local', 'x', now()),
  ('82222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'viewer-ra@runctl-test.local', 'x', now()),
  ('83333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'admin-rb@runctl-test.local', 'x', now()),
  ('84444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'admin-ra@runctl-test.local', 'x', now());

INSERT INTO public.organizations (id, name, mode, status)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Org RA (RunCtl-Test)', 'synthetic', 'active'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Org RB (RunCtl-Test)', 'synthetic', 'active');

INSERT INTO public.organization_members (user_id, organization_id, role)
VALUES
  ('81111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'manager'),
  ('82222222-2222-2222-2222-222222222222', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'viewer'),
  ('83333333-3333-3333-3333-333333333333', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'admin'),
  ('84444444-4444-4444-4444-444444444444', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'admin');

CREATE TEMP TABLE snap AS
SELECT jsonb_build_object(
  'schema', 'run-resume-snapshot/1',
  'runId', 'run-ra-1',
  'organizationId', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'scenarioVersionId', 'ver-ra-1',
  'tick', 10,
  'targetTicks', 50,
  'correlationId', 'corr-ra-1',
  'snapshotHash', repeat('a', 64)
) AS body;
GRANT SELECT ON snap TO authenticated;

-- Manager von Org RA.
SELECT set_config('request.jwt.claims', '{"sub":"81111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SET ROLE authenticated;

-- ------------------------------------------------ 1..4: Pause speichern --
SELECT lives_ok(
  $$SELECT public.save_run_pause('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'run-ra-1', (SELECT body FROM snap), repeat('a', 64))$$,
  'Manager RA speichert Pausen-Snapshot'
);
SELECT is((SELECT count(*) FROM public.simulation_run_pauses), 1::bigint, 'genau ein Pausen-Snapshot');
SELECT is((SELECT tick FROM public.simulation_run_pauses WHERE run_id = 'run-ra-1'), 10, 'Tick gespeichert');
SELECT lives_ok(
  $$SELECT public.save_run_pause('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'run-ra-1', (SELECT body FROM snap), repeat('a', 64))$$,
  'erneute Pause desselben Runs ist idempotent (Upsert)'
);

-- ------------------------------------- 5..8: ungültige Snapshots --
SELECT throws_ok(
  $$SELECT public.save_run_pause('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'run-ra-1', (SELECT body FROM snap), repeat('b', 64))$$,
  '22023', NULL, 'Hash-Parameter passt nicht zum Snapshot'
);
SELECT throws_ok(
  $$SELECT public.save_run_pause('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'run-ra-2', (SELECT body FROM snap), repeat('a', 64))$$,
  '22023', NULL, 'Run-ID passt nicht zum Snapshot'
);
SELECT throws_ok(
  $$SELECT public.save_run_pause('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'run-ra-1',
    (SELECT body || '{"organizationId":"ffffffff-ffff-ffff-ffff-ffffffffffff"}'::jsonb FROM snap), repeat('a', 64))$$,
  '22023', NULL, 'Snapshot einer fremden Organisation wird abgelehnt'
);
SELECT throws_ok(
  $$SELECT public.save_run_pause('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'run-ra-1',
    (SELECT body || '{"tick":50}'::jsonb FROM snap), repeat('a', 64))$$,
  '23514', NULL, 'Tick am Laufende verletzt die Tick-Grenze'
);

-- ------------------------------------- 9..10: keine direkten Schreibrechte --
SELECT throws_ok(
  $$INSERT INTO public.simulation_run_pauses (run_id, organization_id, scenario_version_id, tick, target_ticks, snapshot, snapshot_hash)
    VALUES ('run-direct', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'v', 1, 2, '{}'::jsonb, repeat('c', 64))$$,
  '42501', NULL, 'direkter INSERT ist gesperrt'
);
SELECT throws_ok(
  $$DELETE FROM public.simulation_run_pauses WHERE run_id = 'run-ra-1'$$,
  '42501', NULL, 'direkter DELETE ist gesperrt'
);

-- ------------------------------------------- 11..14: Viewer RA --
SELECT set_config('request.jwt.claims', '{"sub":"82222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM public.simulation_run_pauses), 1::bigint, 'Viewer RA darf Pausen der eigenen Org lesen');
SELECT throws_ok(
  $$SELECT public.save_run_pause('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'run-ra-1', (SELECT body FROM snap), repeat('a', 64))$$,
  '42501', NULL, 'Viewer darf nicht pausieren'
);
SELECT throws_ok(
  $$SELECT public.discard_run_pause('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'run-ra-1')$$,
  '42501', NULL, 'Viewer darf nicht abbrechen'
);
SELECT throws_ok(
  $$SELECT public.record_run_control('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'run-ra-1', 'resumed', 'c')$$,
  '42501', NULL, 'Viewer darf nicht fortsetzen'
);

-- ------------------------------------------- 15..17: Fremdmandant RB --
SELECT set_config('request.jwt.claims', '{"sub":"83333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM public.simulation_run_pauses), 0::bigint, 'Admin RB sieht keine RA-Pausen');
SELECT throws_ok(
  $$SELECT public.discard_run_pause('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'run-ra-1')$$,
  '42501', NULL, 'Admin RB kann RA-Pause nicht verwerfen'
);
SELECT throws_ok(
  $$SELECT public.save_run_pause('ffffffff-ffff-ffff-ffff-ffffffffffff', 'run-ra-1', (SELECT body FROM snap), repeat('a', 64))$$,
  '22023', NULL, 'Admin RB kann RA-Snapshot nicht unter eigener Org speichern'
);

-- ------------------------------------------- 18..20: Audit + Verwerfen --
SELECT set_config('request.jwt.claims', '{"sub":"84444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT public.record_run_control('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'run-ra-1', 'resumed', 'corr-ra-1')$$,
  'Admin RA protokolliert Fortsetzen'
);
SELECT ok(
  (SELECT public.discard_run_pause('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'run-ra-1')),
  'Admin RA verwirft die Pause (Abbruch)'
);
SELECT is(
  (SELECT array_agg(action ORDER BY action) FROM public.audit_log
    WHERE target_id = 'run-ra-1' AND organization_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
  ARRAY['scenario.run_cancelled', 'scenario.run_paused', 'scenario.run_paused', 'scenario.run_resumed']::text[],
  'Audit: pausiert (2x), fortgesetzt, abgebrochen — ohne PII-Felder'
);

-- ------------------------------ 21..22: Abschluss löscht Pause atomar --
SELECT lives_ok(
  $$SELECT public.save_run_pause('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'run-ra-1', (SELECT body FROM snap), repeat('a', 64))$$,
  'erneute Pause vor Abschluss'
);
SELECT public.persist_completed_run(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '{"id":"scen-ra-1","name":"Szenario RA","status":"ACTIVE","currentVersionId":"ver-ra-1","isProtected":false}'::jsonb,
  '{"id":"ver-ra-1","scenarioId":"scen-ra-1","versionNumber":1,"parameters":{}}'::jsonb,
  '{"runId":"run-ra-1","seed":1,"status":"COMPLETED","manifest":{"runId":"run-ra-1"},"correlationId":"corr-ra-1"}'::jsonb,
  '[]'::jsonb, '[]'::jsonb, '[]'::jsonb
);
SELECT is(
  (SELECT count(*) FROM public.simulation_run_pauses WHERE run_id = 'run-ra-1'),
  0::bigint,
  'Abschluss des Runs löscht den Pausen-Snapshot in derselben Transaktion'
);

-- ---------------- 23..24: Konflikt-Update ist mandantengebunden (Race-Schutz) --
-- Simuliert den Wettlauf ohne Vorprüfung: Org B hält run-race, Org A upsertet
-- dieselbe run_id mit exakt dem Konfliktziel und der WHERE-Bedingung der RPC.
RESET ROLE;
INSERT INTO public.simulation_run_pauses (run_id, organization_id, scenario_version_id, tick, target_ticks, snapshot, snapshot_hash)
VALUES ('run-race', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'v', 3, 50, '{"owner":"B"}'::jsonb, repeat('b', 64));

INSERT INTO public.simulation_run_pauses (run_id, organization_id, scenario_version_id, tick, target_ticks, snapshot, snapshot_hash)
VALUES ('run-race', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'v', 9, 50, '{"owner":"A"}'::jsonb, repeat('a', 64))
ON CONFLICT (run_id) DO UPDATE SET
  tick = EXCLUDED.tick, snapshot = EXCLUDED.snapshot, snapshot_hash = EXCLUDED.snapshot_hash
WHERE public.simulation_run_pauses.organization_id = EXCLUDED.organization_id;

SELECT is(
  (SELECT snapshot ->> 'owner' FROM public.simulation_run_pauses WHERE run_id = 'run-race'),
  'B',
  'Konflikt-Update aus Org A überschreibt den Snapshot von Org B nicht'
);
SELECT is(
  (SELECT organization_id FROM public.simulation_run_pauses WHERE run_id = 'run-race'),
  'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
  'Organisation des Datensatzes bleibt unverändert'
);

SELECT * FROM finish();
ROLLBACK;
